import test from 'node:test';import assert from 'node:assert/strict';
import {guardianFixture,untilGuardian} from '../scripts/guardian-scenarios.mjs';
import {setModule} from '../rules.js';import {step,serialize,restore} from '../engine.js';
test('a powered ward cannot supply false evidence of an idle wardens guarding stance',()=>{
 const f=guardianFixture({curiosity:.45});untilGuardian(f,f=>f.h.combat===f.enemy.id);setModule(f.s,'tactics',true);setModule(f.s,'composite-threats',true);
 // One wounded target makes the next real physical hit decisive, so no later
 // enemy reply can legitimately teach its separate guarding stance.
 f.enemy.tactic='warden';f.enemy.battle.intent='idle';f.enemy.hp=1;step(f.s);
 assert.equal(f.enemy.alive,false);assert.equal(f.node.guardianSupply.state,'on');assert.equal(f.h.guardianNotes.enemies[f.enemy.id].link.method,'hit');assert.equal(f.h.threatCompositions?.[f.enemy.id]?.facts.warden,undefined);assert.equal(serialize(restore(serialize(f.s))),serialize(f.s));
});
