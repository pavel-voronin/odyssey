import {Worker} from 'node:worker_threads';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build,root} from './build.mjs';
import {STUDY_VERSION} from './life-causal-worker.mjs';
import {SAVE_SCHEMA} from '../save-schema.js';
const directory=path.join(root,'artifacts','current','life-causal');await mkdir(directory,{recursive:true});
const deployment=JSON.parse(await readFile(path.join(root,'.deploy-state.json'),'utf8')),built=await build();assert.equal(built.revision,deployment.revision,'Read-only audit must use the actual published game revision');
const revision=built.revision,workers=[],smoke=process.argv.includes('--smoke');
const spec={freshSeeds:smoke?[4,14]:Array.from({length:64},(_,i)=>i),controlSeeds:smoke?[]:[0,3,4,7,12,14,17,22],worldSeeds:smoke?[]:[1,14,36,44],limit:19200,controlLimit:38400,workers:smoke?2:4,studyVersion:STUDY_VERSION,revision};
await writeFile(path.join(directory,smoke?'smoke-manifest.json':'manifest.json'),JSON.stringify({started:new Date().toISOString(),...spec},null,2));
function pool(jobs){
 return new Promise((resolve,reject)=>{
  const queue=[...jobs],results=[];let completed=0,failed=false;
  const fail=error=>{if(!failed){failed=true;reject(error);}};
  async function next(worker){
   if(failed)return;const job=queue.shift();if(!job){if(completed===jobs.length)resolve(results);return;}
   try{
    const cached=JSON.parse(await readFile(path.join(directory,job.id+'.json'),'utf8'));
    if(cached.revision===revision&&cached.studyVersion===STUDY_VERSION&&cached.id===job.id){if(cached.files?.state)await stat(path.join(directory,cached.files.state));results.push(cached);completed++;console.log('cached',job.id,cached.stoppedBy||cached.label);return next(worker);}
   }catch(error){if(!['ENOENT'].includes(error.code)&&!(error instanceof SyntaxError))return fail(error);}
   worker.auditJob=job;worker.postMessage(job);
  }
  for(const worker of workers){
   worker.removeAllListeners('message');worker.removeAllListeners('error');
   worker.on('error',fail);worker.on('message',message=>{
    if(message.type==='error')return fail(Error(message.id+': '+message.error));
    if(message.type==='progress'){console.log('progress',message.id,message.lifeTicks,message.tick);return;}
    if(message.type==='done'){results.push(message.result);completed++;console.log('done',message.id,message.result.stoppedBy||message.result.label,message.result.lifeTicks||message.result.worldTick);next(worker).catch(fail);}
   });next(worker).catch(fail);
  }
  if(!jobs.length)resolve([]);
 });
}
const summary=rows=>{
 const deaths=rows.filter(r=>!r.alive),alive=rows.filter(r=>r.censored),counts={};for(const r of deaths){const key=r.death?.classification||'unknown';counts[key]=(counts[key]||0)+1;}
 const values=rows.map(r=>r.lifeTicks).sort((a,b)=>a-b),median=values.length?(values[Math.floor((values.length-1)/2)]+values[Math.ceil((values.length-1)/2)])/2:null;
 return {n:rows.length,deaths:deaths.length,aliveAtLimit:alive.length,legacyEndedAlive:rows.filter(r=>r.legacyEndedAlive).length,establishedResidence:rows.filter(r=>r.end.life.residence).length,homeWish:rows.filter(r=>r.end.life.motive).length,causes:counts,deathOnRoad:deaths.filter(r=>r.death?.areaType==='road'&&!r.death.transit).length,deathInDungeon:deaths.filter(r=>r.death?.areaType==='dungeon').length,medianObservedTicks:median,medianIsFullLifespan:false,
  masteredTwoProfessions:rows.filter(r=>Object.values(r.end.records).filter(c=>c.rank>=2).length>=2).length,delveAttempts:rows.reduce((n,r)=>n+r.delve.attempts,0),attemptsAfterRefusal:rows.reduce((n,r)=>n+r.delve.attemptsAfterAnyPriorRefusal,0),poisonedDelveAttempts:rows.reduce((n,r)=>n+r.delve.poisonedAttempts,0),poisonCombatStarts:rows.reduce((n,r)=>n+r.delve.poisonCombatStarts,0),
  survivalAtDays:Object.fromEntries([1,7,20,40,80].map(day=>[day,rows.filter(r=>r.alive||r.lifeTicks>day*240).length/Math.max(1,rows.length)]))};
};
try{
 for(let i=0;i<spec.workers;i++)workers.push(new Worker(new URL('./life-causal-worker.mjs',import.meta.url),{workerData:{directory,revision,schema:SAVE_SCHEMA},resourceLimits:{maxOldGenerationSizeMb:768}}));
 const fresh=await pool(spec.freshSeeds.map(seed=>({id:'fresh-'+String(seed).padStart(2,'0'),kind:'fresh',seed})));
 const later=await pool([...spec.controlSeeds.map(seed=>({id:'control-'+String(seed).padStart(2,'0'),kind:'control',seed})),...spec.worldSeeds.map(seed=>({id:'world-'+String(seed).padStart(2,'0'),kind:'world',seed}))]);
 fresh.sort((a,b)=>Number(a.id.slice(-2))-Number(b.id.slice(-2)));const controls=later.filter(r=>r.label==='selected-control'),chains=later.filter(r=>r.label==='same-world-chain'),nextStories=chains.flatMap(r=>r.stories);
 const all=[...fresh,...controls,...nextStories],report={studyVersion:STUDY_VERSION,revision,spec,completed:new Date().toISOString(),summaries:{fresh:summary(fresh),selectedControls:summary(controls),sameWorldNextStories:summary(nextStories)},verifiedWorldSteps:all.reduce((n,r)=>n+(r.worldSteps||0),0),verifiedCheckpoints:all.reduce((n,r)=>n+(r.checks||0),0),fresh,selectedControls:controls,chains,notes:['Fresh consecutive seeds are the primary fixed cohort, not an estimate of every player.','Alive at the observation limit is right-censored, not a completed full life.','Residence, home intention and an owned workshop are separate facts, not death or invented work.','Selected old control seeds and related same-world stories are reported separately and are not pooled as independent fresh lives.','Explicit createNextStory is an audit action with zero world ticks; no successor is created by game time.','Observed lastAction occupancy is a view/state counter, not proof of every completed action.','A prior refusal followed by a delve attempt is a factual sequence, not proof the choice lacked a reason.']};
 await writeFile(path.join(directory,smoke?'smoke-report.json':'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({revision,worldSteps:report.verifiedWorldSteps,checks:report.verifiedCheckpoints,...report.summaries},null,2));
}finally{await Promise.allSettled(workers.map(w=>w.terminate()));}
