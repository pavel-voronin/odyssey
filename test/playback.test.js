import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {runLifeBatch} from '../playback.js';
import {setModule} from '../rules.js';
test('maximum-speed playback matches the same long-lived prefix or real ending without requiring a death by a deadline',()=>{
  const horizon=process.env.ODYSSEY_SOAK==='1'?20000:500,prefix=createWorld(1);
  // Both paths consume the identical deterministic prefix. Compare the batch
  // boundary independently, without simulating that same 19,750 ticks twice.
  while(prefix.hero.alive&&!prefix.hero.life.ended&&prefix.tick<horizon-250)step(prefix);
  const raw=serialize(prefix),fast=restore(raw),slow=restore(raw),result=runLifeBatch(fast,Math.min(250,horizon-prefix.tick)),ticks=prefix.tick+result.ticks;
  assert.equal(fast.generation,1);
  for(let i=0;i<result.ticks;i++)step(slow);
  assert.equal(serialize(fast),serialize(slow));
  if(!fast.hero.alive||fast.hero.life.ended){assert.equal(runLifeBatch(fast).ticks,0);assert.ok(fast.lives[0].timeline.length>0);}else{assert.equal(ticks,horizon);assert.equal(fast.lives.length,0);assert.equal(fast.hero.life.ended,false);}
  assert.equal(serialize(restore(serialize(fast))),serialize(fast));
});
test('a yielding life batch remains bounded and retains a detailed journal even when retirement is disabled',()=>{
  const s=createWorld(5);setModule(s,'lifecycle',false);let checks=0;const result=runLifeBatch(s,250,()=>++checks>=3);
  assert.equal(result.ticks,3);assert.equal(s.tick,3);assert.ok(s.hero.timeline.length>=2);
  assert.ok(s.hero.timeline.every(e=>e.life===1));
});
