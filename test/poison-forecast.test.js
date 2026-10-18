import {revealArea} from '../actor-atlas.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,knownRoute} from '../engine.js';
import {setModule} from '../rules.js';
import {poisonForecast,poisonDamageUntil,medicalDamageUntil,careArrival} from '../modules/poison-forecast.js';
test('poison forecast uses future divisible pulses and expires before an equal-tick pulse',()=>{
 const s=createWorld(5);s.tick=7;s.hero.hp=2;s.hero.conditions=[{id:'poison',since:1,until:24}];
 assert.deepEqual(poisonForecast(s),{period:8,until:24,remaining:17,damage:2,next:8,lethalAt:16,uncertain:false});
 s.tick=8;assert.equal(poisonDamageUntil(s,16),1);s.hero.conditions[0].until=16;assert.equal(poisonForecast(s).damage,0);assert.equal(poisonForecast(s).lethalAt,null);
});
test('existing racial resistance and independent body/lineage switches change only the forecast',()=>{
 const s=createWorld(5);s.tick=7;s.hero.race='dwarf';s.hero.hp=2;s.hero.conditions=[{id:'poison',until:40}];const before=serialize(s);
 assert.equal(poisonForecast(s).damage,2);assert.equal(poisonForecast(s).lethalAt,32);assert.equal(serialize(s),before);
 setModule(s,'lineage',false);assert.equal(poisonForecast(s).damage,4);assert.equal(poisonForecast(s).lethalAt,16);
 setModule(s,'body',false);assert.equal(poisonForecast(s).damage,0);assert.equal(poisonForecast(s).next,null);
});
test('long poison durations stay bounded and malformed old timing is explicitly uncertain',()=>{
 const s=createWorld(5);s.hero.hp=3;s.hero.conditions=[{id:'poison',until:8000000000}];assert.equal(poisonForecast(s).lethalAt,24);
 s.hero.conditions[0].until=null;assert.equal(poisonForecast(s).uncertain,true);
});
test('medical arrival also prices known starvation pulses without turning fever into invented health damage',()=>{
 const s=createWorld(5);s.tick=14;s.hero.hunger=91;s.hero.conditions=[{id:'poison',until:33},{id:'fever',until:40}];
 assert.equal(poisonDamageUntil(s,32),3);assert.equal(medicalDamageUntil(s,32),5);
 s.hero.hunger=89.8;assert.equal(medicalDamageUntil(s,16),2);
 setModule(s,'body',false);assert.equal(medicalDamageUntil(s,32),0);
});
test('a known medical route prices all scenes and the final treatment action; unknown help and transport are not invented',()=>{
 const s=createWorld(5),h=s.hero;h.area='a0';h.x=99;h.conditions=[];h.memory.places.push('a1');
 // Canonical knowledge is explicitly controlled here; production uses knownRoute.
 const path=['a0','a1','a2','a3'];for(const id of path)revealArea(s,id);
 const ctx={knownRoute:()=>path};const before=serialize(s),r=careArrival(s,'a3',68,ctx);assert.ok(r.ticks>40);assert.equal(r.path.length,4);assert.equal(serialize(s),before);
 const missing={knownRoute:()=>[]};assert.equal(careArrival(s,'missing',68,missing),null);
 s.edges[[path[1],path[2]].sort().join('|')]={mode:'sea',duration:40,cost:5};assert.equal(careArrival(s,'a3',68,ctx),null);
 assert.equal(careArrival(s,'missing',68,{knownRoute:(...args)=>knownRoute(...args)}),null);
});
