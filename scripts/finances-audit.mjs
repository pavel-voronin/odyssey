import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:32,ticks:6000,configurations:3,totalTicks:576000,styles:{},purchases:{weapon:0,armor:0,potion:0},priorities:{save:0,reserve:0,free:0},paidWorkAbove15:0,abandonedGoals:0,divergence:0};
const signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${s.hero.weapon}/${s.hero.armor}/${s.hero.inventory.potions}/${Math.round(s.hero.gold)}`;
let count=0,differences=0,saved=false;
for(let seed=0;seed<32;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'finances',false);const seen=new Set();
 for(let i=0;i<6000;i++){
  const before={generation:a.generation,gold:a.hero.gold,weapon:a.hero.weapon,armor:a.hero.armor,potions:a.hero.inventory.potions,work:a.hero.counters.peacefulWork||0};
  step(a);step(b);step(off);const h=a.hero;
  if(!seen.has('life:'+a.generation)){seen.add('life:'+a.generation);report.styles[h.money.style]=(report.styles[h.money.style]||0)+1;}
  const p=h.money.priority;if(p?.tick===a.tick)report.priorities[p.phase]++;
  if(before.generation===a.generation){
   if(h.lastAction==='trade'){if(h.weapon>before.weapon)report.purchases.weapon++;if(h.armor>before.armor)report.purchases.armor++;if(h.inventory.potions>before.potions)report.purchases.potion++;}
   if(h.counters.peacefulWork>before.work&&before.gold>15)report.paidWorkAbove15++;
   const goal=h.commitments.personal,key='abandoned:'+a.generation+':'+goal?.since;if(goal?.status==='abandoned'&&!seen.has(key)){seen.add(key);report.abandonedGoals++;}
  }
  if(!saved&&h.money.priority?.phase==='save'&&h.goal?.kind==='work'){await writeFile('artifacts/current/scenarios/saving-for-weapon.json',serialize(a));saved=true;}
  if(i%277===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%40===0){count++;differences+=signature(a)!==signature(off);}
  assert.ok(h.gold>=0&&h.hp>=0&&h.energy>=0&&h.energy<=100);
 }
 assert.equal(serialize(a),serialize(b));console.log('seed',seed,'purchases',JSON.stringify(report.purchases));
}
report.divergence=differences/count;
await writeFile('artifacts/current/finances-audit.json',JSON.stringify(report,null,2));console.log(report);assert.ok(report.purchases.weapon>0&&report.purchases.armor>0&&report.purchases.potion>0&&report.priorities.save>0&&saved);
