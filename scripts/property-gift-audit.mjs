import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const seeds=[0,1,2,3,44,56,68,78,91];
const report={seeds,limit:16000,actualSteps:0,maxBytes:0,samples:0,different:0,offers:0,gifts:0,declines:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'property-gifts',false);
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 const workshops=Object.values(a.areas).flatMap(area=>area.objects.filter(o=>o.kind==='workshop')),offers=workshops.filter(o=>o.gift).length,gifts=workshops.reduce((n,o)=>n+o.history.filter(e=>e.kind==='gift').length,0),declines=workshops.filter(o=>o.gift?.status==='declined').length;
 for(const o of workshops){assert.ok(a.people[o.owner]);const acts=o.history.filter(e=>e.kind==='gift');assert.equal(new Set(acts.map(e=>e.gift)).size,acts.length);for(const e of acts){assert.equal(e.cash,0);assert.equal(e.credit,0);assert.equal(e.payer,null);assert.ok(Number.isInteger(e.consent.giver));assert.ok(Number.isInteger(e.consent.recipient));}}
 report.offers+=offers;report.gifts+=gifts;report.declines+=declines;report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome,offers,gifts,declines});console.log(seed,a.tick,offers,gifts,declines);
}
report.divergence=report.different/report.samples;await writeFile('artifacts/property-gift-audit.json',JSON.stringify(report,null,2));console.log(report);
