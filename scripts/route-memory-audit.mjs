import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const report={seeds:12,limit:12000,actualSteps:0,maxBytes:0,samples:0,different:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(let seed=0;seed<report.seeds;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed),waits=0;setModule(off,'route-memory',false);
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(!lifeFinished(a))waits+=a.hero.goal?.kind==='routeWait';
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 report.lives.push({seed,ticks:a.tick,places:a.hero.memory.places.length,outcome:a.hero.life.outcome,waits,memories:Object.keys(a.hero.memory.rejected||{}).length,offTicks:off.tick,offPlaces:off.hero.memory.places.length});
 console.log(seed,a.tick,a.hero.memory.places.length,waits);
}
report.divergence=report.different/report.samples;
await writeFile('artifacts/route-memory-audit.json',JSON.stringify(report,null,2));console.log(report);
