import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
test('short release smoke: seeded world, actual ticks and exact save replay',()=>{
 for(const seed of [0,1]){const s=createWorld(seed);for(let i=0;i<32;i++)step(s);const raw=serialize(s),copy=restore(raw);assert.equal(serialize(copy),raw);for(let i=0;i<16;i++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));assert.equal(s.tick,48);}
});
