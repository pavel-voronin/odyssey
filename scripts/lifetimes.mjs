import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {mkdir,writeFile} from 'node:fs/promises';
const seeds=Number(process.env.LIFE_SEEDS||16),limit=Number(process.env.LIFE_LIMIT||24000);
await mkdir('artifacts/scenarios',{recursive:true});
let totalTicks=0;
function lifetime(seed,interference=false){
  let s=createWorld(seed),signatures=[];
  for(let i=0;i<limit;i++){
    if(interference&&i===1000)setModule(s,'work',false);
    step(s);totalTicks++;
    if(i%96===0)signatures.push(`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.kills}/${s.hero.counters.peacefulWork||0}/${s.hero.gold}/${s.hero.life.phase}`);
    if(i%997===0){const saved=serialize(s);s=restore(saved);if(serialize(s)!==saved)throw Error(`Save diverged: ${seed}/${i}`);}
    if(s.hero.hp<0||s.hero.hp>s.hero.maxHp||s.hero.gold<0)throw Error(`Invalid state: ${seed}/${i}`);
    if(s.lives.length)break;
  }
  return {s,signatures};
}
const results=[];
for(let seed=1;seed<=seeds;seed++){
  const base=lifetime(seed),repeat=lifetime(seed),changed=lifetime(seed,true);
  if(serialize(base.s)!==serialize(repeat.s))throw Error(`Replay diverged: ${seed}`);
  const life=base.s.lives[0];
  if(life&&seed===1)await writeFile('artifacts/scenarios/life-ending.json',serialize(base.s));
  const common=Math.min(base.signatures.length,changed.signatures.length);
  const different=base.signatures.slice(0,common).filter((value,i)=>value!==changed.signatures[i]).length;
  results.push({seed,ticks:base.s.tick,outcome:life?.outcome||'unfinished',cause:life?.cause||null,profession:base.s.hero.profession,places:base.s.hero.memory.places.length,quests:base.s.hero.quests.filter(q=>q.status==='done').length,kills:base.s.hero.kills,work:base.s.hero.counters.peacefulWork||0,milestones:life?.milestones.length||0,interferenceOutcome:changed.s.lives[0]?.outcome||'unfinished',divergence:different/common});
}
const report={generatedAt:new Date().toISOString(),seeds,limit,totalTicks,ended:results.filter(r=>r.outcome!=='unfinished').length,naturalDeaths:results.filter(r=>r.outcome==='dead').length,peacefulEndings:results.filter(r=>r.outcome==='settled').length,unfinished:results.filter(r=>r.outcome==='unfinished').length,expectations:{exactReplay:true,saveConvergence:true,actualEndings:results.some(r=>r.outcome!=='unfinished'),interferenceDivergence:results.some(r=>r.divergence>0)},results};
await writeFile('artifacts/lifetimes-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(!report.expectations.actualEndings||!report.expectations.interferenceDivergence)process.exitCode=1;
