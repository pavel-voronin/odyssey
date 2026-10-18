import test from 'node:test';
import assert from 'node:assert/strict';
import {blockedTraveller} from '../scripts/current-world-fixtures.mjs';
import {createWorld,knownRoute,route,step,restore,serialize,connectAreas,createEnemy} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
const fixture=blockedTraveller;
const enemyState=s=>{const {x,...combat}=s.areas.a2.objects.find(e=>e.id==='a2-wolf0');return JSON.stringify(combat);};

test('known routes reject intermediate avoided ground and take an existing bypass without inspecting unknown enemies',()=>{
  const s=fixture();s.hero.area='a1';s.hero.memory.avoided.a2=s.tick+500;
  assert.deepEqual(route(s,'a1','a4'),['a1','a2','a4']);assert.deepEqual(knownRoute(s,'a1','a4'),[]);
  connectAreas(s,'a0','a4');
  const before=serialize(s);assert.deepEqual(knownRoute(s,'a1','a4'),['a1','a0','a4']);assert.equal(serialize(s),before);
  const hidden=createEnemy(s,s.areas.a4,{x:50});hidden.hp=hidden.maxHp=99999;hidden.attack=99999;
  assert.deepEqual(knownRoute(s,'a1','a4'),['a1','a0','a4']); // No observation, no knowledge.
  s.tick=500;assert.deepEqual(knownRoute(s,'a1','a4'),route(s,'a1','a4'));
});

test('a hero actually follows the bypass to the destination and preserves the rejected enemy and replay',()=>{
  const s=fixture(),h=s.hero;h.area='a1';h.x=5;h.goal={kind:'explore',area:'a4',x:84,started:s.tick};
  h.hp=h.maxHp;h.energy=100;h.memory.avoided.a2=s.tick+500;
  connectAreas(s,'a0','a4');
  const enemy=enemyState(s);
  let replay=restore(serialize(s));const visited=new Set();
  for(let i=0;i<100&&h.area!=='a4';i++){
    step(s);step(replay);visited.add(h.area);assert.equal(serialize(s),serialize(replay));
    if(i%9===0)replay=restore(serialize(replay));
  }
  assert.equal(h.area,'a4');assert.ok(visited.has('a0'));assert.ok(!visited.has('a2'));
  assert.equal(enemyState(s),enemy);
});

test('a current weak traveller facing an overwhelming known forest threat reaches a real alternative frontier instead of endlessly resting before the same forest',()=>{
  const s=fixture(),places=new Set(),enemy=enemyState(s);let rests=0;
  for(let i=0;i<1000&&s.hero.alive&&!s.hero.life.ended;i++){step(s);places.add(s.hero.area);if(s.hero.goal?.kind==='rest')rests++;}
  assert.ok(places.has('a0'));assert.ok([...places].some(id=>Number(id.slice(1))>=5));assert.ok(rests<300);
  assert.equal(enemyState(s),enemy);
});

test('without an available exit waiting neither creates a road nor prevents necessary healing',()=>{
  const s=fixture(),h=s.hero;for(const m of MODULES)setModule(s,m.id,false);
  h.area='a1';h.x=68;h.goal=null;h.energy=100;h.hp=h.maxHp;h.memory.avoided.a2=s.tick+500;
  for(const a of Object.values(s.areas))a.expanded=true;
  const ids=Object.keys(s.areas);step(s);assert.equal(h.goal.kind,'routeWait');
  for(let i=0;i<100;i++)step(s);assert.deepEqual(Object.keys(s.areas),ids);assert.equal(h.area,'a1');assert.equal(h.hp,h.maxHp);
  const loaded=restore(serialize(s));step(s);step(loaded);assert.equal(serialize(s),serialize(loaded));
  h.hp=5;step(s);assert.equal(h.goal.kind,'rest');assert.ok(h.hp>5);
});
