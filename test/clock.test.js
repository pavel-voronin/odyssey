import {advanceLife,lifeFinished} from '../playback.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClock,catchUp,registerInput,hasDue} from '../clock.js';
import {createWorld,step,serialize,restore} from '../engine.js';
test('offline elapsed seconds execute the same world prefix as foreground ticks, in bounded batches',()=>{
  const a=createWorld(89),b=restore(serialize(a)),clock=createClock(10000);
  let batches=0;while(clock.anchor<3010000){catchUp(clock,3010000,()=>advanceLife(a),250);batches++;}
  for(let i=0;i<3000;i++)advanceLife(b);
  assert.equal(serialize(a),serialize(b));assert.ok(batches<=12);assert.equal(a.generation,1);
});
test('fractional seconds and extra clicks do not lose automatic ticks; backward clock is bounded',()=>{
  const clock=createClock(1000);let ticks=0;
  assert.equal(catchUp(clock,1999,()=>ticks++),0);ticks++;
  assert.equal(catchUp(clock,2500,()=>ticks++),1);assert.equal(ticks,2);assert.equal(clock.anchor,2000);
  catchUp(clock,100,()=>ticks++);assert.equal(clock.anchor,100);assert.equal(ticks,2);
});
test('manual input suppresses automatic play for five seconds, including across a reload and offline gap',()=>{
  const clock=createClock(0);let ticks=0;registerInput(clock,1000);
  assert.equal(catchUp(clock,5999,()=>ticks++),0);
  const loaded=createClock(clock.anchor,clock.idleUntil);
  assert.equal(catchUp(loaded,6000,()=>ticks++),1);assert.equal(ticks,1);
  registerInput(loaded,6100);registerInput(loaded,6433);registerInput(loaded,6766);
  assert.equal(catchUp(loaded,11765,()=>ticks++),0);assert.equal(catchUp(loaded,13766,()=>ticks++),3);
});
test('yielding a slow batch retains every pending automatic tick before later manual input',()=>{
  const clock=createClock(0);let ticks=0;
  assert.equal(catchUp(clock,10000,()=>ticks++,250,()=>ticks>=3),3);assert.ok(hasDue(clock,10000));assert.equal(clock.anchor,3000);
  assert.equal(catchUp(clock,10000,()=>ticks++),7);assert.equal(ticks,10);assert.equal(hasDue(clock,10000),false);
});
