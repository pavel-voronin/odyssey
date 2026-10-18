import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={profileSample:1000,profilesWithSides:0,cohort:'48 seeds with initially awake sides plus 16 without; conditional reachability, not population prevalence',seeds:64,ticks:6000,configurations:3,totalTicks:1152000,livesWithDialogue:0,dialogues:0,changedPriorities:0,divergence:0};
const awake=[],ordinary=[];for(let seed=0;seed<1000;seed++){if(createWorld(seed).hero.innerLife.facets.length){report.profilesWithSides++;awake.push(seed);}else ordinary.push(seed);}
const seeds=[...awake.slice(0,48),...ordinary.slice(0,16)];let samples=0,diff=0,saved=false;
const signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${s.hero.weapon}/${s.hero.quests.filter(q=>q.status==='done').length}/${Math.round(s.hero.gold)}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'inner-life',false);const seen=new Set(),speakers=new Set();
 for(let i=0;i<6000;i++){
  step(a);step(b);step(off);const h=a.hero,m=h.innerLife;
  for(const d of m.history){const key=a.generation+':'+d.key;if(!seen.has(key)){seen.add(key);report.dialogues++;speakers.add(a.generation);}}
  const d=m.lastAssessment;if(d&&d.baseline!==d.choice){const key=`change:${a.generation}:${d.cause}:${d.quest}:${d.baseline}:${d.choice}`;if(!seen.has(key)){seen.add(key);report.changedPriorities++;}}
  if(!saved&&m.history.length){await writeFile('artifacts/current/scenarios/inner-conflict.json',serialize(a));saved=true;}
  if(i%277===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%40===0){samples++;diff+=signature(a)!==signature(off);}
  assert.ok(m.history.length<=12&&h.hp>=0&&h.energy>=0&&h.energy<=100);
 }
 assert.equal(serialize(a),serialize(b));report.livesWithDialogue+=speakers.size;console.log('seed',seed,'dialogues',report.dialogues,'changes',report.changedPriorities);
}
report.divergence=diff/samples;
await writeFile('artifacts/current/inner-life-audit.json',JSON.stringify(report,null,2));console.log(report);assert.ok(saved&&report.changedPriorities>0);
