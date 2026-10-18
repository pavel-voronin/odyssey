import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
import {YEAR_TICKS} from '../calendar.js';
const seeds=[0,3,4,7,12,14,17,22],report={seeds,actualSteps:0,lives:[],pastYear:0,samples:0,different:0,maxBytes:0};
const signature=s=>`${s.hero.life.outcome}/${s.hero.area}/${s.hero.goal?.kind}/${s.hero.level}/${s.hero.gold}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);const progress=[];
 for(let i=0;i<38400;i++){
  if(i===8000)setModule(off,'lifecycle',false);
  for(const s of [a,b,off]){if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if([7999,YEAR_TICKS-1,YEAR_TICKS+79].includes(i)&&!lifeFinished(a))progress.push({tick:a.tick,profession:a.hero.profession,rank:a.hero.career.rank,level:a.hero.level,places:a.hero.memory.places.length,work:a.hero.counters.peacefulWork||0,quests:a.hero.quests.filter(q=>q.status==='done').length});
  if(seed===3&&i===YEAR_TICKS+79)await writeFile('artifacts/current/scenarios/year-old-adventure.json',serialize(a));
  if(i%80===0&&i>=8000){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)),Buffer.byteLength(serialize(off)));if(a.tick-a.hero.born>YEAR_TICKS)report.pastYear++;
 report.lives.push({seed,ticks:a.tick-a.hero.born,outcome:a.hero.life.outcome||'continuing',cause:a.lives.at(-1)?.cause,progress,offTicks:off.tick,offOutcome:off.hero.life.outcome||'continuing'});console.log(seed,a.tick,a.hero.life.outcome||'continuing');
}
assert.ok(report.pastYear>=3);const long=report.lives.find(r=>r.seed===3);assert.ok(long.progress.at(-1).work>long.progress[0].work);assert.ok(long.progress.at(-1).quests>long.progress[0].quests);assert.equal(report.lives.find(r=>r.seed===4).ticks,230);
report.divergence=report.different/report.samples;await writeFile('artifacts/current/life-continuation-audit.json',JSON.stringify(report,null,2));console.log(report);
