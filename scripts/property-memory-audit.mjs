import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const seeds=[360,402,414,10,44,56,68,78,91];
const report={seeds,conditionalCohort:true,limit:24000,actualSteps:0,maxBytes:0,samples:0,different:0,losses:0,rediscoveries:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed),priorLost=0,rediscovered=0;setModule(off,'property-memory',false);
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  const lost=Object.keys(a.hero.property.lost).length;if(lost<priorLost)rediscovered++;priorLost=lost;
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 const losses=a.hero.property.memory.losses;assert.ok(losses<=1);report.losses+=losses;report.rediscoveries+=rediscovered;
 report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome,losses,rediscovered,lost:Object.keys(a.hero.property.lost).length});console.log(seed,a.tick,losses,rediscovered);
}
report.divergence=report.different/report.samples;await writeFile('artifacts/property-memory-audit.json',JSON.stringify(report,null,2));console.log(report);
