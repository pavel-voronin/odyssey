import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:8000,configurations:3,totalTicks:576000,assigned:0,parted:0,reunited:0,missed:0,abandoned:0,campConversations:0,lateDivergence:0};
let differences=0,samples=0,saved=false;
const signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${s.hero.companions.map(c=>c.person||c.uid).join(',')}/${s.hero.kills}`;
for(let seed=0;seed<24;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);
 for(let i=0;i<8000;i++){
  if(i===2000)setModule(off,'companion-goals',false);
  step(a);step(b);step(off);
  if(i%277===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i>2000&&i%40===0){samples++;differences+=signature(a)!==signature(off);}
  if(!saved&&a.hero.companions.some(c=>a.people[c.person]?.personalJourney?.status==='active')){await writeFile('artifacts/current/scenarios/temporary-companion.json',serialize(a));saved=true;}
  if(i%80===0){const ids=a.hero.companions.filter(c=>c.person).map(c=>c.person);assert.equal(ids.length,new Set(ids).size);assert.ok(a.hero.hp>=0&&a.hero.energy>=0&&a.hero.energy<=100);}
 }
 assert.equal(serialize(a),serialize(b));
 for(const p of Object.values(a.people)){const g=p.personalJourney;if(!g)continue;report.assigned++;if(g.parted!==undefined)report.parted++;if(g.status==='done')report.reunited++;if(g.status==='missed')report.missed++;if(g.status==='abandoned')report.abandoned++;if(g.talkedAt!==null)report.campConversations++;}
 console.log('seed',seed,'goals',report.assigned,'reunions',report.reunited);
}
report.lateDivergence=differences/samples;
assert.ok(saved&&report.assigned>0&&report.parted>0&&report.reunited>0);
await writeFile('artifacts/current/companion-goals-audit.json',JSON.stringify(report,null,2));console.log(report);
