import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parentPort,workerData} from 'node:worker_threads';
import {createWorld,createNextStory,step,serialize,restore} from '../engine.js';
import {LifeRecorder,lifeContext} from './life-causal-model.mjs';
import {assertSameSave} from './life-save-compare.mjs';
import {SAVE_SCHEMA} from '../save-schema.js';
export {assertSameSave};
export const STUDY_VERSION=2;
export async function auditWindow({a,b=restore(serialize(a)),id='window',label='fresh',limit,directory=null,revision='',checkpointEvery=997,priorRefusal=null,progress=()=>{}}){
 let journalFieldOrderComparisons=assertSameSave(serialize(a),serialize(b));const recorder=new LifeRecorder(a,{priorRefusal}),person=a.hero.lineage;let checkpoint=serialize(a),steps=0,checks=0;
 while(a.hero.alive&&a.tick<limit){
  const before=lifeContext(a),head=a.journal[0];step(a);step(b);steps++;assert.equal(a.hero.lineage,person,'The audit must not create an automatic observer');recorder.after(a,before,head);
  if(steps%checkpointEvery===0){const text=serialize(b);journalFieldOrderComparisons+=assertSameSave(serialize(a),text);b=restore(text);assert.equal(serialize(b),text);checks++;if(a.hero.alive)checkpoint=text;}
  if(steps%4096===0)progress({id,tick:a.tick,lifeTicks:a.tick-a.hero.born,steps});
 }
 const final=serialize(a);journalFieldOrderComparisons+=assertSameSave(final,serialize(b));checks++;const row=recorder.finish(a,{limit});let replaySteps=0,predeath=null;
 if(!a.hero.alive){
  const replay=restore(checkpoint);while(replay.tick<a.tick-1){assert.equal(replay.hero.alive,true);step(replay);replaySteps++;}
  predeath=serialize(replay);step(replay);replaySteps++;journalFieldOrderComparisons+=assertSameSave(serialize(replay),final,'The saved prefix must reproduce the exact fatal tick');
 }
 Object.assign(row,{id,label,studyVersion:STUDY_VERSION,revision,checks,journalFieldOrderComparisons,worldSteps:steps*2+replaySteps,replaySteps,bytes:Buffer.byteLength(final)});
 if(directory){await mkdir(directory,{recursive:true});row.files={state:id+'.state.json',prefix:id+'.prefix.json',...(predeath?{predeath:id+'.predeath.json'}:{})};await Promise.all([writeFile(path.join(directory,row.files.state),final),writeFile(path.join(directory,row.files.prefix),checkpoint)]);if(predeath)await writeFile(path.join(directory,row.files.predeath),predeath);await writeFile(path.join(directory,id+'.json'),JSON.stringify(row));}
 return {a,b,row};
}
async function runJob(job){
 if(workerData.schema!==SAVE_SCHEMA)throw new Error('Current study/save schema required');
 const {directory,revision}=workerData,progress=data=>parentPort.postMessage({type:'progress',...data});
 if(job.kind==='fresh')return (await auditWindow({a:createWorld(job.seed),b:createWorld(job.seed),id:job.id,label:'fresh',limit:19200,directory,revision,progress})).row;
 const base=JSON.parse(await readFile(path.join(directory,`fresh-${String(job.seed).padStart(2,'0')}.json`),'utf8'));
 let a=restore(await readFile(path.join(directory,`fresh-${String(job.seed).padStart(2,'0')}.state.json`),'utf8')),b=restore(serialize(a));
 if(job.kind==='control'){
  if(!a.hero.alive){const row={...base,id:job.id,label:'selected-control',continued:false,sourceFresh:base.id,worldSteps:0,checks:0,replaySteps:0,additionalWindow:'none: original body already dead'};await writeFile(path.join(directory,job.id+'.json'),JSON.stringify(row));return row;}
  const out=await auditWindow({a,b,id:job.id,label:'selected-control',limit:a.hero.born+38400,directory,revision,priorRefusal:base.lastRefusal,progress});out.row.continued=true;out.row.sourceFresh=base.id;await writeFile(path.join(directory,job.id+'.json'),JSON.stringify(out.row));return out.row;
 }
 const stories=[],switches=[];for(let index=2;index<=3;index++){
  const tick=a.tick,from=a.hero.lineage,wasAlive=a.hero.alive;assert.equal(createNextStory(a,{allowLiving:wasAlive}),true);assert.equal(createNextStory(b,{allowLiving:wasAlive}),true);assert.equal(a.tick,tick);assert.equal(b.tick,tick);assert.notEqual(a.hero.lineage,from);const journalFieldOrderOnly=Boolean(assertSameSave(serialize(a),serialize(b)));
  switches.push({from,to:a.hero.lineage,worldTick:tick,previousAlive:wasAlive,automatic:false,ticksAdded:0,journalFieldOrderOnly});
  const storyId=job.id+'-'+index;
  let cached=null;try{cached=JSON.parse(await readFile(path.join(directory,storyId+'.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(cached?.revision===revision&&cached.studyVersion===STUDY_VERSION&&cached.id===storyId){
   assert.equal(cached.initial.person,a.hero.lineage);assert.equal(cached.windowStart,tick);assert.equal(cached.initial.name,a.hero.name);
   a=restore(await readFile(path.join(directory,cached.files.state),'utf8'));assert.equal(a.tick,cached.worldTick);assert.equal(a.hero.lineage,cached.initial.person);b=restore(serialize(a));stories.push(cached);continue;
  }
  const out=await auditWindow({a,b,id:job.id+'-'+index,label:'same-world-next-story',limit:a.hero.born+19200,directory,revision,progress});a=out.a;b=out.b;stories.push(out.row);
 }
 const row={id:job.id,label:'same-world-chain',studyVersion:STUDY_VERSION,revision,seed:job.seed,sourceFresh:base.id,switches,stories,worldTick:a.tick,bodyStates:Object.values(a.actorStates).map(h=>({person:h.lineage,alive:h.alive,born:h.born,actorGeneration:h.actorGeneration,area:h.area}))};await writeFile(path.join(directory,job.id+'.json'),JSON.stringify(row));return row;
}
if(parentPort)parentPort.on('message',async job=>{try{const result=await runJob(job);parentPort.postMessage({type:'done',id:job.id,result});}catch(error){parentPort.postMessage({type:'error',id:job.id,error:error.stack||String(error)});}});
