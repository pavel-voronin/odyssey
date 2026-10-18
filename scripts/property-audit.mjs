import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const seeds=[...Array(12).keys(),44,56,68,78,91];
const report={ordinarySeeds:12,additionalCraftSeeds:[44,56,68,78,91],limit:12000,actualSteps:0,maxBytes:0,samples:0,different:0,purchases:0,leases:0,lives:[]};let saved=false;
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'property',false);const bought=new Set(),leased=new Set();
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  const receipt=a.hero.goal?.workspace;if(receipt?.kind==='lease')leased.add(receipt.id+':'+receipt.paid);
  for(const [id,k]of Object.entries(a.hero.property.known)){
    const o=a.areas[k.area].objects.find(o=>o.id===id);if(o?.owner!==a.hero.lineage)continue;
    bought.add(id);assert.equal(o.history.filter(e=>e.kind==='purchase'&&e.owner===a.hero.lineage).length,1);
    if(!saved){await writeFile('artifacts/current/scenarios/owned-workshop.json',serialize(a));saved=true;}
  }
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 for(const area of Object.values(a.areas))for(const o of area.objects.filter(o=>o.kind==='workshop'))assert.ok(a.people[o.owner]);
 report.purchases+=bought.size;report.leases+=leased.size;report.lives.push({seed,profession:a.hero.profession,ticks:a.tick,outcome:a.hero.life.outcome,places:a.hero.memory.places.length,purchases:bought.size,leases:leased.size,offTicks:off.tick});
 console.log(seed,a.tick,bought.size,leased.size);
}
report.divergence=report.different/report.samples;await writeFile('artifacts/current/property-audit.json',JSON.stringify(report,null,2));console.log(report);
