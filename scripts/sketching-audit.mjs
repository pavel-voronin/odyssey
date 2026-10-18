import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {createWorld,serialize,restore} from '../engine.js';import {advanceLife,lifeFinished} from '../playback.js';import {setModule} from '../rules.js';
const report={seeds:24,actualSteps:0,interested:0,drawings:0,artists:0,practice:0,paperSpent:0,interruptions:0,maxBytes:0,samples:0,different:0};let saved=false;
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.gold}/${s.hero.level}/${s.hero.life.outcome}`;
for(let seed=0;seed<24;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'sketching',false);report.interested+=a.hero.sketchbook.interest;let previous=0;
 for(let i=0;i<12000;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  const book=a.hero.sketchbook,count=Object.keys(book.works).length;
  assert.ok(book.paper>=0&&book.paper<=3);assert.ok(book.paper+count+(book.pending?1:0)<=3);assert.equal(book.practice,count);
  if(count>previous&&!saved){await writeFile('artifacts/current/scenarios/camp-sketch.json',serialize(a));saved=true;}
  previous=count;if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));const book=a.hero.sketchbook,works=Object.keys(book.works).length;report.drawings+=works;report.artists+=works>0;report.practice+=book.practice;report.paperSpent+=book.interest?3-book.paper:0;report.interruptions+=(book.interest?3-book.paper:0)-works-(book.pending?1:0);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));console.log(seed,works,a.tick);
}
assert.ok(saved&&report.drawings>0);report.divergence=report.different/report.samples;await writeFile('artifacts/current/sketching-audit.json',JSON.stringify(report,null,2));console.log(report);
