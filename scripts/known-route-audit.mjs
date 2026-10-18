import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
const previousDir=new URL('../dist/8dd72577de575d09/',import.meta.url);
const oldName=(await readdir(previousDir)).find(n=>/^engine\.[a-f0-9]+\.js$/.test(n));
const old=await import(new URL(oldName,previousDir));
const report={seeds:12,limit:12000,actualSteps:0,maxBytes:0,samples:0,different:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(let seed=0;seed<report.seeds;seed++){
 let a=createWorld(seed),b=createWorld(seed),prior=old.createWorld(seed),waits=0,rests=0,run=0,maxWait=0;
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(!lifeFinished(prior)){old.step(prior);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(!lifeFinished(a)){waits+=a.hero.goal?.kind==='routeWait';rests+=a.hero.goal?.kind==='rest';run=a.hero.goal?.kind==='routeWait'?run+1:0;maxWait=Math.max(maxWait,run);}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(prior);}
  if(lifeFinished(a)&&lifeFinished(prior))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 report.lives.push({seed,ticks:a.tick,places:a.hero.memory.places.length,outcome:a.hero.life.outcome,waits,rests,maxWait,priorTicks:prior.tick,priorPlaces:prior.hero.memory.places.length});
 console.log(seed,a.tick,a.hero.memory.places.length,waits);
}
report.divergence=report.different/report.samples;
await writeFile('artifacts/known-route-audit.json',JSON.stringify(report,null,2));console.log(report);
