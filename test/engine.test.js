import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, createNextStory, serialize, restore, route } from '../engine.js';

test('seeded worlds and their decisions are reproducible', () => {
  const a = createWorld(42), b = createWorld(42);
  for (let i = 0; i < 700; i++) { step(a); step(b); }
  assert.equal(serialize(a), serialize(b));
});
test('one call advances exactly one tick; serialization preserves future decisions', () => {
  const a = createWorld(123);
  for (let i = 0; i < 90; i++) { const tick = a.tick; step(a); assert.equal(a.tick, tick + 1); }
  const b = restore(serialize(a));
  for (let i = 0; i < 100; i++) { step(a); step(b); }
  assert.equal(serialize(a), serialize(b));
});
test('hero autonomously completes work, buys equipment, rests and discovers connected regions', () => {
  let completed = 0, equipped = 0, rested = 0, expanded = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const s = createWorld(seed);
    for (let i = 0; i < 550; i++) {
      step(s);
      completed += s.hero.quests.some(q => q.status === 'done') ? 1 : 0;
      equipped += s.hero.weapon > 0 ? 1 : 0;
      rested += s.hero.lastAction === 'rest' ? 1 : 0;
    }
    expanded += Object.keys(s.areas).length > 5 ? 1 : 0;
    for (const id of Object.keys(s.areas)) assert.ok(route(s, 'a0', id).length);
  }
  assert.ok(completed > 0, 'quests complete'); assert.ok(equipped > 0, 'equipment purchased');
  assert.ok(rested > 0, 'hero rests'); assert.ok(expanded > 0, 'procedural world grows');
});
test('dead enemies and damage persist across travel and future generations', () => {
  const s = createWorld(5), enemy = s.areas.a2.objects.find(o => o.kind === 'enemy');
  enemy.alive = false; enemy.hp = 0;
  s.hero.alive = false;
  const oldHero = s.hero;
  assert.equal(createNextStory(s),true);
  assert.equal(s.generation, 2); assert.notEqual(s.hero, oldHero); assert.equal(enemy.alive, false);
  for (let i = 0; i < 250; i++) step(s);
  assert.equal(s.areas.a2.objects.find(o => o.id === enemy.id).alive, false);
});
test('combat death leaves a grave and fails active promises, while ordinary ticks keep the same observer until an explicit new story', () => {
  const s = createWorld(33), enemy = s.areas.a2.objects.find(o => o.kind === 'enemy');
  s.hero.area = 'a2'; s.hero.x = enemy.x; s.hero.hp = 1; s.hero.energy = 100;
  s.hero.inventory.potions = 0; s.hero.combat = enemy.id; enemy.hp = 10000; enemy.attack = 100;
  s.hero.quests.push({ status: 'active' });
  for (let i = 0; i < 20 && s.hero.alive; i++) { s.hero.combat = enemy.id; step(s); }
  assert.equal(s.hero.alive, false); assert.equal(s.graves.length, 1); assert.equal(s.hero.quests[0].status, 'failed');
  const tick = s.tick; step(s); assert.equal(s.tick, tick + 1); assert.equal(s.generation,1);assert.equal(s.hero.alive,false);assert.equal(createNextStory(s),true);assert.equal(s.tick,tick+1);assert.equal(s.generation,2);assert.equal(s.hero.alive,true);
  assert.ok(s.areas.a2.objects.some(o => o.kind === 'grave'));
});
test('merchant moves between real markets on simulation ticks', () => {
  const s = createWorld(11);
  s.areas.extra = { id: 'extra', type: 'village', name: 'Новый Брод', links: ['a1'], objects: [], depth: 1 };
  s.areas.a1.links.push('extra');
  const from=s.merchant.area;s.merchant.nextMove = 1; step(s);
  assert.equal(s.merchant.area, null);const destination=s.merchant.destination;assert.ok(s.areas[destination]);assert.notEqual(destination,from);assert.ok(route(s,from,destination).length>1);
  const arrival = s.merchant.arrival;
  while (s.tick < arrival) step(s);
  assert.equal(s.merchant.area, destination);
});
test('an overlong search is abandoned instead of monopolizing the adventure', () => {
  const s = createWorld(17);
  s.tick = 200;
  s.hero.goal = { kind: 'trade', area: 'a1', x: 58, started: 0 };
  step(s);
  assert.ok(s.hero.memory.shopAfter > s.tick);
  assert.notEqual(s.hero.goal?.kind, 'trade');
  assert.ok(s.journal.some(e => e.text.includes('Поиски Савы затянулись')));
});
test('many long journeys preserve simulation invariants', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createWorld(seed);
    for (let i = 0; i < 1800; i++) {
      step(s);
      const h = s.hero;
      assert.ok(Number.isFinite(h.hp) && h.hp >= 0 && h.hp <= h.maxHp, `health seed ${seed}, tick ${s.tick}`);
      assert.ok(h.energy >= 0 && h.energy <= 100); assert.ok(h.gold >= 0);
      assert.ok(h.x >= 0 && h.x <= 100); assert.ok(s.areas[h.area]);
      assert.ok(Object.values(h.inventory).every(v => v >= 0));
    }
  }
});
test('invalid save is rejected', () => {
  assert.throws(() => restore('{}'));
  const s = createWorld(1); s.areas.a0.links.push('missing'); assert.throws(() => restore(serialize(s)));
});
