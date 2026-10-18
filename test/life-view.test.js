import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {createYearRun,runWorldBatch,LIFE_VIEW_TICKS,requestYearCancel} from '../playback.js';
import {beginYearRun,updateYearClock,endYearRun} from '../year-clock.js';
import {savedRunNotice} from '../playback-view.js';
import {createClock,catchUp} from '../clock.js';
import {clockRecord,currentClock} from '../save-schema.js';
import {yearFixture} from '../scripts/year-scenarios.mjs';

test('same executor stops life viewing exactly on actual death two; ordinary world continues with that person',()=>{
 const {s}=yearFixture({death:true}),slow=restore(serialize(s)),clock=createClock(0),run=beginYearRun(s,clock,4000,{untilDeath:true}),person=s.observation.person;
 const result=runWorldBatch(s,run,{now:()=>0});assert.equal(result.ticks,2);assert.equal(result.finished,true);assert.equal(run.endedBy,'death');assert.equal(s.tick,2);assert.equal(run.committed,2);
 step(slow);step(slow);assert.equal(serialize(s),serialize(slow));endYearRun(clock,run,14000);assert.equal(clock.yearRun.status,'death');assert.equal(currentClock(clockRecord(s,clock),s).yearRun.remaining,191998);
 assert.equal(catchUp(clock,14000,()=>step(s),4),4);assert.equal(s.tick,6);assert.equal(s.observation.person,person);assert.equal(s.lives.length,1);assert.equal(s.generation,1);assert.equal(runWorldBatch(s,run).ticks,0);
});
test('an already dead body takes zero accelerated steps and does not create a repeat death',()=>{
 const {s}=yearFixture({death:true});step(s);step(s);const raw=serialize(s),run=createYearRun(s,{untilDeath:true});assert.equal(runWorldBatch(s,run).ticks,0);assert.equal(run.endedBy,'death');assert.equal(serialize(s),raw);
});
test('living person at the technical ten-year limit stays alive with no final; count uses only an inert stub',()=>{
 const s={tick:17,observation:{person:'same',sequence:1},hero:{alive:true}},run=createYearRun(s,{untilDeath:true});let result;
 // No world/gameplay/AI: just the finite technical counter boundary.
 do{result=runWorldBatch(s,run,{advance:v=>v.tick++,now:()=>0});assert.ok(result.ticks<=250);}while(!result.finished);
 assert.equal(s.tick,17+LIFE_VIEW_TICKS);assert.equal(run.endedBy,'limit');assert.equal(s.hero.alive,true);assert.equal(s.hero.life,undefined);assert.equal(result.remaining,0);assert.equal(runWorldBatch(s,run,{now:()=>0}).ticks,0);
 assert.match(savedRunNotice({status:'done',remaining:0,startTick:17,endTick:s.tick}),/^Жизнь продолжается/);
 const repeat=createYearRun(s,{untilDeath:true});assert.equal(repeat.endTick-s.tick,LIFE_VIEW_TICKS);assert.equal(s.tick,192017);
});
test('a living body prefix/load/cancel uses identical world steps and no acceleration debt',()=>{
 const {s}=yearFixture(),slow=restore(serialize(s)),clock=createClock(1000,6000),run=beginYearRun(s,clock,3000,{untilDeath:true});let ms=0;
 assert.equal(runWorldBatch(s,run,{now:()=>ms+=10}).ticks,2);updateYearClock(clock,run,13000);const raw=serialize(s),loaded=restore(raw),saved=currentClock(clockRecord(s,clock),loaded);
 // Persist an actual committed prefix, as the UI does after a packet.
 endYearRun(clock,run,13000);assert.equal(currentClock(clockRecord(s,clock),loaded).yearRun.remaining,191998);assert.equal(run.endedBy,null);assert.equal(saved.yearRun.committed,2);
 step(slow);step(slow);assert.equal(serialize(s),serialize(slow));assert.equal(clock.idleUntil,16000);assert.equal(s.hero.alive,true);assert.equal(s.lives.length,0);assert.equal(runWorldBatch(s,run).ticks,0);
 const next=beginYearRun(loaded,clock,13000,{untilDeath:true});requestYearCancel(next);endYearRun(clock,next,13000);assert.equal(next.committed,0);assert.equal(serialize(loaded),raw);
});
