import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished,startNextLife} from '../playback.js';
const previousDir=new URL('../dist/e1cbc01bf6296943/',import.meta.url),oldName=(await readdir(previousDir)).find(n=>/^engine\.[a-f0-9]+\.js$/.test(n)),old=await import(new URL(oldName,previousDir));
const report={profileSample:1000,initialOwners:0,seeds:[],limit:20000,actualSteps:0,maxBytes:0,samples:0,different:0,lives:[]};
for(let seed=0;seed<report.profileSample;seed++)if(createWorld(seed).hero.property.origin.granted){report.initialOwners++;report.seeds.push(seed);}
report.conditional=true;
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of report.seeds){
 let a=createWorld(seed),b=createWorld(seed),prior=old.createWorld(seed);const id=a.hero.property.origin.granted,k=a.hero.property.known[id],owner=a.hero.lineage;
 await writeFile(`artifacts/scenarios/original-owner-${seed}.json`,serialize(a));
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(!lifeFinished(prior)){old.step(prior);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(prior);}
  if(lifeFinished(a)&&lifeFinished(prior))break;
 }
 assert.equal(serialize(a),serialize(b));const o=a.areas[k.area].objects.find(o=>o.id===id);assert.equal(o.owner,owner);assert.equal(o.history.filter(e=>e.kind==='origin'&&e.basis==='adult-start').length,1);
 report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome,profession:a.hero.profession,owner:o.owner,priorTicks:prior.tick,priorOutcome:prior.hero.life.outcome});
 if(lifeFinished(a)){assert.equal(a.lives[0].property.origin.granted,id);assert.equal(startNextLife(a),true);assert.equal(a.hero.property.origin.granted,null);assert.equal(o.owner,owner);}
 console.log(seed,report.lives.at(-1));
}
report.divergence=report.different/report.samples;await writeFile('artifacts/current/property-origin-audit.json',JSON.stringify(report,null,2));console.log(report);
