import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:6000,configurations:3,totalTicks:432000,promises:0,retreats:0,personalGoals:0,prepareDecisions:0,promiseDecisions:0,actualPreparationPlans:0,goalsDone:0,goalsAbandoned:0,divergence:0};
const signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${s.hero.weapon}/${Math.round(s.hero.gold)}/${s.hero.quests.filter(q=>q.status==='done').length}`;
let differences=0,samples=0,saved=false;
for(let seed=0;seed<24;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);const seen=new Set();
 for(let i=0;i<6000;i++){
  if(i===2000)setModule(off,'commitments',false);
  step(a);step(b);step(off);
  const h=a.hero,c=h.commitments,p=c.personal;
  for(const m of c.memories){const key=`${a.generation}:m:${m.id}`;if(seen.has(key))continue;seen.add(key);if(m.kind==='promise')report.promises++;if(m.kind==='retreat')report.retreats++;}
  if(p){const key=`${a.generation}:p:${p.since}`;if(!seen.has(key)){seen.add(key);report.personalGoals++;}const end=key+':'+p.status;if(p.status!=='active'&&!seen.has(end)){seen.add(end);report[p.status==='done'?'goalsDone':'goalsAbandoned']++;}}
  for(const d of c.decisions){const key=`${a.generation}:d:${d.tick}:${d.choice}`;if(seen.has(key))continue;seen.add(key);report[d.choice==='prepare'?'prepareDecisions':'promiseDecisions']++;}
  if(h.goal?.commitment&&h.goal.started===a.tick){report.actualPreparationPlans++;if(!saved){await writeFile('artifacts/current/scenarios/personal-preparation.json',serialize(a));saved=true;}}
  if(i%233===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i>2000&&i%40===0){samples++;differences+=signature(a)!==signature(off);}
  assert.ok(h.hp>=0&&h.energy>=0&&h.energy<=100&&c.memories.length<=32&&c.decisions.length<=24);
  if(p?.status==='active')assert.ok(c.memories.some(m=>m.id===p.cause));
 }
 assert.equal(serialize(a),serialize(b));
}
report.divergence=differences/samples;
assert.ok(report.personalGoals>0&&report.actualPreparationPlans>0&&report.prepareDecisions>0&&report.promiseDecisions>0&&report.goalsDone>0&&report.goalsAbandoned>0);
await writeFile('artifacts/current/commitments-audit.json',JSON.stringify(report,null,2));console.log(report);
