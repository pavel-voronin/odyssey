import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createWorld, step, serialize, restore } from '../engine.js';
import { MODULES, moduleRandom, setModule } from '../rules.js';
import { combatAttack, combatResponse, addCondition, encounter } from '../systems.js';
import { build } from '../scripts/build.mjs';
const context = { random: () => .1, log: () => {}, gainXp: () => {}, die: () => {}, closest: () => null, goal: () => {} };

test('module streams cannot perturb each other or the base generator', () => {
  const a = createWorld(22), b = createWorld(22), before = a.rng;
  for (let i = 0; i < 100; i++) moduleRandom(a, 'loot');
  assert.equal(moduleRandom(a, 'weather'), moduleRandom(b, 'weather')); assert.equal(a.rng, before);
});
test('disabling disease prevents new conditions and damage from stored poison', () => {
  const s = createWorld(3); setModule(s, 'body', false);
  s.hero.conditions.push({ id: 'poison', until: 90, since: 0 }); s.tick = 7; const hp = s.hero.hp;
  step(s); assert.equal(s.hero.hp, hp);
  addCondition(s, 'fever', context); assert.equal(s.hero.conditions.length, 1);
});
test('enemy and companion contracts can be disabled independently', () => {
  const s = createWorld(4), enemy = s.areas.a2.objects.find(o => o.kind === 'enemy');
  enemy.powers = ['regrowth']; enemy.hp = 5; s.hero.conditions = [];
  setModule(s, 'enemies', false); combatResponse(s, enemy, 2, context); assert.equal(enemy.hp, 5);
  s.hero.companions = [{ attack: 9, healing: 0, loyalty: 100 }];
  setModule(s, 'companions', false); const alone = combatAttack(s, enemy, 3, context);
  setModule(s, 'companions', true); assert.equal(combatAttack(s, enemy, 3, context), alone + 9);
});
test('faction and item modules do not mutate their domains while disabled', () => {
  const s = createWorld(12); s.hero.gold = 30; s.hero.personality.generosity = .9;
  setModule(s, 'factions', false); const reputation = { ...s.hero.reputation };
  encounter(s, { encounter: 'pilgrim', resolved: false }, context); assert.deepEqual(s.hero.reputation, reputation);
  setModule(s, 'equipment', false);
  encounter(s, { encounter: 'sealed', resolved: false }, context);
  assert.equal(s.hero.bag.length, 0); assert.ok(Object.values(s.hero.equipment).every(x => x === null));
});
test('module changes persist and long mixed configurations satisfy base contracts', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let s = createWorld(seed);
    for (let i = 0; i < 1500; i++) {
      if (i % 97 === 0) { const module = MODULES[(i / 97 | 0) % MODULES.length]; setModule(s, module.id, !s.rules[module.id]); }
      const tick = s.tick; step(s); assert.equal(s.tick, tick + 1);
      assert.ok(s.hero.hp >= 0 && s.hero.hp <= s.hero.maxHp);
      assert.ok(s.hero.bag.length <= 24); assert.ok(s.hero.energy >= 0 && s.hero.energy <= 100);
      assert.ok(s.hero.hunger >= 0 && s.hero.hunger <= 100);
      assert.ok(s.hero.x >= 0 && s.hero.x <= 100);
      assert.ok(Object.values(s.hero.reputation).every(Number.isFinite));
      if (i % 201 === 0) { const snapshot = serialize(s); s = restore(snapshot); assert.equal(serialize(s), snapshot); }
    }
  }
});
test('an incomplete former MVP shape is refused without enriching identity or changing its RNG', () => {
  const s=createWorld(5),rng=s.rng;delete s.hero.profession;delete s.rules;delete s.randomStreams;
  const raw=serialize(s);assert.throws(()=>restore(raw),/Повреждённое/);assert.equal(s.rng,rng);assert.equal(s.hero.profession,undefined);
});
test('static build emits every imported module with an immutable filename', async () => {
  const result = await build();
  for (const file of result.files.filter(f => f.endsWith('.js'))) {
    const content = await readFile(path.join(result.dir, file), 'utf8');
    for (const m of content.matchAll(/from\s*['"]\.\/([^'"]+)['"]/g)) assert.ok(result.files.includes(m[1]), `${file} imports ${m[1]}`);
  }
  assert.ok(!result.files.some(f => /(?:^|[./-])(?:server|deploy|test)(?:[./-]|$)/.test(f)));
});
