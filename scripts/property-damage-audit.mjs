import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const seeds=[...Array(12).keys(),44,56,68,78,91];
const report={ordinarySeeds:12,additionalCraftSeeds:[44,56,68,78,91],limit:12000,actualSteps:0,maxBytes:0,samples:0,different:0,fires:0,repairs:0,stillDamaged:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'property-damage',false);
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 let fires=0,repairs=0,damaged=0;
 for(const area of Object.values(a.areas))for(const o of area.objects.filter(o=>o.kind==='workshop')){
  const f=o.history.filter(e=>e.kind==='fire'),r=o.history.filter(e=>e.kind==='repair');assert.ok(r.length<=f.length);assert.equal(new Set(f.map(e=>e.tick)).size,f.length);
  fires+=f.length;repairs+=r.length;damaged+=o.state==='burned';assert.ok(a.people[o.owner]);
 }
 report.fires+=fires;report.repairs+=repairs;report.stillDamaged+=damaged;report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome,fires,repairs,damaged});console.log(seed,a.tick,fires,repairs,damaged);
}
report.divergence=report.different/report.samples;await writeFile('artifacts/property-damage-audit.json',JSON.stringify(report,null,2));console.log(report);
