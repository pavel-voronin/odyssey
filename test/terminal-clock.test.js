import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createClock,catchUp,registerInput,hasDue,stopClock,resumeClock,restartClock} from '../clock.js';
import {lifeFinished,advanceLife,startNextLife,runLifeBatch} from '../playback.js';
function twoHits(){const s=createWorld(1);for(const m of MODULES)setModule(s,m.id,false);const h=s.hero,e=s.areas.a2.objects.find(o=>o.kind==='enemy');h.area='a2';h.x=e.x;h.hp=152;h.maxHp=152;h.armor=0;h.personality.courage=1;h.inventory.potions=0;h.combat=e.id;e.hp=1000;e.maxHp=1000;e.attack=100;return s;}
test('death inside an offline batch stops the body but the remaining ticks belong to the same world',()=>{
 const s=twoHits(),clock=createClock(0);const n=catchUp(clock,8*3600*1000,()=>advanceLife(s),250);
 assert.equal(n,250);assert.equal(s.tick,250);assert.equal(s.generation,1);assert.equal(s.hero.alive,false);assert.equal(s.lives.length,1);assert.equal(clock.stopped,false);assert.equal(hasDue(clock,8*3600*1000),true);assert.equal(s.lives[0].ended,2);
 const loaded=restore(serialize(s)),loadedClock=createClock(clock.anchor,clock.idleUntil,clock.stopped);catchUp(clock,8*3600*1000,()=>step(s),250);catchUp(loadedClock,8*3600*1000,()=>step(loaded),250);assert.equal(s.tick,500);assert.equal(serialize(loaded),serialize(s));assert.equal(s.generation,1);assert.equal(s.graves.length,1);
});
test('an already dead saved observer advances the world without a new person or another death archive',()=>{
 const s=twoHits();runLifeBatch(s);const clock=createClock(0),person=s.hero.lineage,people=s.nextPerson;assert.equal(catchUp(clock,10000,()=>advanceLife(s)),10);assert.equal(s.tick,12);assert.equal(s.generation,1);assert.equal(s.hero.lineage,person);assert.equal(s.nextPerson,people);assert.equal(s.lives.length,1);assert.equal(s.hero.hp,0);
});
test('only an explicit next-story action changes generation and it does not add a world tick',()=>{
 const s=twoHits();runLifeBatch(s);const person=s.hero.lineage,archive=JSON.stringify(s.lives);for(let i=0;i<12;i++)assert.equal(advanceLife(s),true);assert.equal(s.hero.lineage,person);const tick=s.tick;assert.equal(startNextLife(s),true);assert.equal(s.generation,2);assert.equal(s.tick,tick);assert.equal(JSON.stringify(s.lives),archive);assert.equal(startNextLife(s),false);
 const clock=createClock(1000);restartClock(clock,100000000);assert.equal(catchUp(clock,100004999,()=>advanceLife(s)),0);assert.equal(catchUp(clock,100005000,()=>advanceLife(s)),1);assert.equal(s.tick,tick+1);
});
test('maximum-speed observation stops on actual death while ordinary world ticks can continue afterward',()=>{
 const fast=twoHits(),slow=restore(serialize(fast));assert.deepEqual(runLifeBatch(fast),{ticks:2,finished:true});while(!lifeFinished(slow))advanceLife(slow);assert.equal(serialize(fast),serialize(slow));assert.deepEqual(runLifeBatch(fast),{ticks:0,finished:true});step(slow);assert.equal(slow.tick,3);assert.equal(slow.generation,1);assert.equal(slow.hero.alive,false);
});

test('resuming an old terminal clock preserves its anchor and every owed world second',()=>{const clock=createClock(1000,0,true);resumeClock(clock);let count=0;assert.equal(clock.anchor,1000);assert.equal(catchUp(clock,6000,()=>count++,3),3);assert.equal(clock.anchor,4000);assert.equal(hasDue(clock,6000),true);assert.equal(catchUp(clock,6000,()=>count++),2);assert.equal(count,5);assert.equal(clock.anchor,6000);});
