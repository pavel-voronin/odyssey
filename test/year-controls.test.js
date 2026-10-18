import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';
import {beginYearRun,updateYearClock,endYearRun} from '../year-clock.js';
import {createYearRun,runWorldBatch,requestYearCancel} from '../playback.js';
import {createClock,catchUp,hasDue,restartClock} from '../clock.js';
import {clockRecord,currentClock} from '../save-schema.js';
import {yearFixture} from '../scripts/year-scenarios.mjs';
const inert=()=>({tick:0,observation:{person:'one',sequence:1}});

test('cancel before/inside one atomic stub and on exact last counter step leaves only committed prefix',()=>{
 const before=inert(),a=createYearRun(before);requestYearCancel(a);assert.equal(runWorldBatch(before,a,{advance:()=>assert.fail('cancelled'),now:()=>0}).ticks,0);
 const inside=inert(),b=createYearRun(inside);const r=runWorldBatch(inside,b,{advance:s=>{s.tick++;requestYearCancel(b);},now:()=>0});assert.equal(r.ticks,1);assert.equal(r.remaining,19199);assert.equal(b.committed,1);
 // 19200 count uses only an inert technical stub, never a gameplay life.
 const last=inert(),c=createYearRun(last);let result;do{result=runWorldBatch(last,c,{advance:s=>{s.tick++;if(s.tick===19200)requestYearCancel(c);},now:()=>0});}while(!result.finished);
 assert.equal(last.tick,19200);assert.equal(result.remaining,0);assert.equal(c.committed,19200);assert.equal(runWorldBatch(last,c).ticks,0);
});
test('cancelled eight-step death prefix replays exactly; four old offline seconds survive computation and reload',()=>{
 const {s}=yearFixture({death:true}),slow=restore(serialize(s)),clock=createClock(6000),run=beginYearRun(s,clock,10000);let ms=0;
 for(let n=0;n<4;n++)runWorldBatch(s,run,{now:()=>ms+=10});
 assert.equal(s.tick,8);requestYearCancel(run);assert.deepEqual(endYearRun(clock,run,20000),{ticks:8,remaining:19192});
 for(let n=0;n<8;n++)step(slow);assert.equal(serialize(s),serialize(slow));assert.equal(s.lives.length,1);
 const loaded=restore(serialize(s)),saved=currentClock(clockRecord(s,clock),loaded);assert.ok(saved);assert.equal(saved.yearRun.remaining,19192);assert.equal(saved.yearRun.status,'cancelled');
 const otherClock=createClock(saved.anchor,saved.idleUntil,saved.stopped,saved.yearRun);assert.equal(clock.anchor,16000);
 assert.equal(catchUp(clock,20000,()=>step(s),4),4);assert.equal(catchUp(otherClock,20000,()=>step(loaded),4),4);assert.equal(s.tick,12);assert.equal(serialize(s),serialize(loaded));assert.equal(hasDue(clock,20000),false);
 assert.equal(runWorldBatch(s,run).ticks,0);assert.equal(s.lives.length,1);
});
test('clock projection preserves remaining manual suppression and persists a paused prefix without an executable run',()=>{
 const {s}=yearFixture(),clock=createClock(1000,6000),run=beginYearRun(s,clock,3000);updateYearClock(clock,run,13000);
 assert.equal(clock.anchor,11000);assert.equal(clock.idleUntil,16000);assert.equal(hasDue(clock,15999),false);
 const record=clockRecord(s,clock),loaded=restore(serialize(s));assert.equal(currentClock(record,loaded).yearRun.status,'paused');assert.equal(record.yearRun.remaining,19200);assert.equal('world' in record.yearRun,false);
 const bad=structuredClone(record);bad.yearRun.remaining--;assert.equal(currentClock(bad,loaded),null);
 assert.equal(endYearRun(clock,run,13000).ticks,0);const anchor=clock.anchor;endYearRun(clock,run,23000);updateYearClock(clock,run,23000);assert.equal(clock.anchor,anchor);
 restartClock(clock,23000);assert.equal('yearRun' in clock,false);
});
test('old run IDs/observation sequence/world revisions cannot apply; a new button action gets a full next interval',()=>{
 const s=inert(),clock=createClock(0),a=beginYearRun(s,clock,0);runWorldBatch(s,a,{advance:v=>v.tick++,now:()=>0});endYearRun(clock,a,1000);
 const b=beginYearRun(s,clock,1000);assert.notEqual(a.id,b.id);assert.equal(b.endTick-s.tick,19200);assert.equal(runWorldBatch(s,a).ticks,0);
 s.observation.sequence++;assert.equal(runWorldBatch(s,b).interrupted,true);
 const c=createYearRun(s);s.tick++;assert.deepEqual(runWorldBatch(s,c),{ticks:0,remaining:19200,finished:false,interrupted:true});
 const d=createYearRun(s),copy=structuredClone(s);assert.equal(runWorldBatch(copy,d).interrupted,true);
});
test('explicit observation switch uses the confirmed body and adds no tick; the old callback cannot advance either person',()=>{
 const {s}=yearFixture(),clock=createClock(0),run=beginYearRun(s,clock,1000),p=Object.values(s.people).find(p=>p.alive&&p.area==='a1'&&p.role!=='ребёнок');
 let ms=0;runWorldBatch(s,run,{now:()=>ms+=21});assert.equal(s.tick,1);endYearRun(clock,run,2000);
 const tick=s.tick;assert.equal(observeExistingPerson(s,p.id),true);assert.equal(s.tick,tick);const raw=serialize(s);assert.equal(runWorldBatch(s,run).ticks,0);assert.equal(serialize(s),raw);
});
