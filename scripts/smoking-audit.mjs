import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {createWorld,serialize,restore} from '../engine.js';import {advanceLife,lifeFinished} from '../playback.js';import {setModule} from '../rules.js';
const eligible=[];for(let seed=0;seed<1000;seed++)if(createWorld(seed).hero.smoking.habit)eligible.push(seed);
const seeds=eligible.slice(0,8),report={profileSample:1000,habits:eligible.length,seeds,conditional:true,actualSteps:0,smokers:0,uses:0,stockSpent:0,maxBytes:0,samples:0,different:0};let saved=false;
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.gold}/${s.hero.energy}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'smoking',false);
 for(let i=0;i<12000;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  const p=a.hero.smoking;assert.ok(p.tobacco>=0&&p.tobacco<=3);assert.equal(p.tobacco+p.uses,3);
  if(p.uses&&!saved){await writeFile('artifacts/current/scenarios/pipe-at-camp.json',serialize(a));saved=true;}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.uses+=a.hero.smoking.uses;report.stockSpent+=3-a.hero.smoking.tobacco;report.smokers+=a.hero.smoking.uses>0;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));console.log(seed,a.hero.smoking.uses,a.tick);
}
assert.ok(saved);report.divergence=report.different/report.samples;await writeFile('artifacts/current/smoking-audit.json',JSON.stringify(report,null,2));console.log(report);
