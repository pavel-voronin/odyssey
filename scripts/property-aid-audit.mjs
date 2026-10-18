import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const seeds=[0,1,2,3,44,56,68,78,91];
const report={seeds,limit:16000,actualSteps:0,maxBytes:0,samples:0,different:0,requests:0,purchases:0,declines:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'property-aid',false);
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 const workshops=Object.values(a.areas).flatMap(area=>area.objects.filter(o=>o.kind==='workshop')),requests=workshops.filter(o=>o.aid).length,purchases=workshops.reduce((n,o)=>n+o.history.filter(e=>e.basis==='sponsored-purchase').length,0),declines=workshops.filter(o=>o.aid?.status==='declined').length;
 for(const o of workshops){assert.ok(a.people[o.owner]);const acts=o.history.filter(e=>e.basis==='sponsored-purchase');assert.equal(new Set(acts.map(e=>e.aid)).size,acts.length);for(const e of acts){assert.equal(e.cash,e.price);assert.equal(e.credit,0);assert.notEqual(e.owner,e.payer);assert.notEqual(e.owner,e.from);assert.ok(a.people[e.owner]);assert.ok(Number.isInteger(e.consent.recipient));assert.ok(Number.isInteger(e.consent.payer));}}
 report.requests+=requests;report.purchases+=purchases;report.declines+=declines;report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome,requests,purchases,declines});console.log(seed,a.tick,requests,purchases,declines);
}
report.divergence=report.different/report.samples;await writeFile('artifacts/property-aid-audit.json',JSON.stringify(report,null,2));console.log(report);
