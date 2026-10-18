import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize} from '../engine.js';
import {activeEffects,resourceViews} from '../status.js';
import {setModule} from '../rules.js';
test('an actual effect appears above the hero on its application tick and settles next tick without changing simulation state',()=>{
  const s=createWorld(1);s.tick=12;s.hero.conditions.push({id:'poison',since:12,until:25});const before=serialize(s);
  const poison=()=>activeEffects(s).find(e=>e.id==='condition:poison');assert.equal(poison().phase,'fresh');assert.equal(serialize(s),before);
  s.tick++;assert.equal(poison().phase,'settled');s.tick=25;assert.equal(poison(),undefined);
});
test('visibility switches suppress badges without curing the condition, and unknown future conditions are ignored',()=>{
  const s=createWorld(1);s.hero.conditions=[{id:'frost',since:0,until:100},{id:'future-mystery',since:0,until:100}];
  assert.ok(activeEffects(s).some(e=>e.id==='condition:frost'));setModule(s,'body',false);assert.ok(!activeEffects(s).some(e=>e.id.startsWith('condition:')));assert.equal(s.hero.conditions.length,2);
  setModule(s,'effects',false);assert.deepEqual(activeEffects(s),[]);assert.equal(s.hero.conditions.length,2);
});
test('a mana bar belongs only to a hero who actually knows a spell and respects the magic switch',()=>{
  const s=createWorld(1);s.hero.magic.spells=[];assert.deepEqual(resourceViews(s),[]);s.hero.magic.spells=['future-spell'];assert.deepEqual(resourceViews(s),[]);
  s.hero.magic.spells=['spark'];assert.equal(resourceViews(s)[0].value,s.hero.magic.mana);setModule(s,'magic',false);assert.deepEqual(resourceViews(s),[]);assert.equal(s.hero.magic.spells[0],'spark');
});
