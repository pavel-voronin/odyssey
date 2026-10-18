import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {combatFixture} from '../scripts/combat-judgment-scenarios.mjs';
import {chooseCombatAction} from '../modules/combat-judgment.js';
import {incomingReply,weaponDamageRange} from '../modules/combat-forecast.js';
import {availableCombatSpells,castInCombat} from '../modules/magic.js';
import {enemyReply} from '../modules/adversaries.js';
import {combatResponse} from '../modules/combat.js';
import {TACTICS} from '../modules/tactics.js';
import {MUTATIONS} from '../modules/mutations.js';
const next=rng=>(Math.imul(rng,1664525)+1013904223)>>>0;

test('forecast is pure and bounds actual replies across every existing tactic/mutation and all four base rolls',()=>{
 for(const tactic of Object.keys(TACTICS))for(const mutation of Object.keys(MUTATIONS))for(const intent of ['idle','strike','guard']){
  const {s,h,enemy}=combatFixture({hp:35,attack:14,tactic,intent});h.armor=1;enemy.mutation=mutation;enemy.battle.echo=9;enemy.hp=30;enemy.maxHp=100;enemy.powers=['fury','swarm'];
  const saved=serialize(s),forecast=incomingReply(s,enemy);chooseCombatAction(s,enemy);assert.equal(serialize(s),saved);
  for(let roll=0;roll<4;roll++){
   const copy=restore(saved),e=copy.areas[copy.hero.area].objects.find(o=>o.id===enemy.id),ctx={log:()=>{},random:()=>.5},raw=enemyReply(copy,e,e.attack+roll,ctx),damage=raw?combatResponse(copy,e,Math.max(1,raw-copy.hero.armor*2),ctx):0;
   assert.ok(damage>=forecast.min&&damage<=forecast.max,`${tactic}/${mutation}/${intent}/${roll}: ${damage} within ${forecast.min}..${forecast.max}`);
  }
 }
});
test('a preparation phase is a real opportunity to use one potion, with no enemy damage or escape roll',()=>{
 const {s,h,enemy}=combatFixture({hp:8,tactic:'charged',potions:1});assert.equal(chooseCombatAction(s,enemy).action,'potion');step(s);
 assert.equal(h.hp,27);assert.equal(h.inventory.potions,0);assert.equal(enemy.hp,1000);assert.equal(enemy.battle.intent,'strike');assert.equal(h.lastDamage,0);assert.equal(h.combatJudgment.last.retreatAttempted,false);assert.equal(h.combatJudgment.last.potionsSpent,1);
});
test('a blocked retreat allows exactly one affordable time spell, not a second free retreat or a fatal weak potion',()=>{
 const {s,h,enemy}=combatFixture({hp:8,attack:44,potions:1,mana:20,spells:['borrow'],blocked:true}),rng=s.rng;step(s);
 assert.equal(h.alive,true);assert.equal(h.hp,8);assert.equal(h.inventory.potions,1);assert.equal(h.magic.mana,13);assert.equal(h.magic.casts,1);assert.equal(h.magic.cooldowns.borrow,8);assert.equal(enemy.hp,994);assert.equal(s.rng,next(rng));
 assert.equal(h.combatJudgment.last.retreatBlocked,true);assert.equal(h.combatJudgment.last.performed,'spell');assert.equal(h.combatJudgment.last.spell,'borrow');assert.equal(h.combatJudgment.last.manaSpent,7);
 assert.equal(s.journal.filter(e=>e.text.includes('Путь к отступлению перекрыт')).length,1);
});
test('unaffordable or cooling spells are not invented and an otherwise unavoidable reply can kill',()=>{
 for(const mode of ['mana','cooldown']){
  const {s,h,enemy}=combatFixture({hp:8,attack:44,potions:1,mana:mode==='mana'?6:20,spells:['borrow'],blocked:true});if(mode==='cooldown')h.magic.cooldowns.borrow=100;
  assert.equal(availableCombatSpells(s).length,0);step(s);assert.equal(h.alive,false);assert.equal(enemy.attack,44);assert.equal(h.magic.casts,0);assert.equal(h.combatJudgment.last.performed,'attack');assert.equal(h.combatJudgment.last.retreatBlocked,true);assert.equal(s.journal.some(e=>e.type==='heal'),false);
 }
});
test('healing above the duelist threshold changes the actual reply instead of reusing old low-HP damage',()=>{
 const {s,h,enemy}=combatFixture({hp:15,attack:14,tactic:'duelist',potions:1});h.maxHp=60;const choice=chooseCombatAction(s,enemy),potion=choice.options.find(o=>o.id==='potion');
 assert.equal(choice.action,'potion');assert.equal(choice.attackReply.max,26);assert.equal(potion.reply.max,17);step(s);assert.equal(h.alive,true);assert.ok(h.hp>=17&&h.hp<=20);assert.equal(h.inventory.potions,0);assert.equal(h.combatJudgment.last.retreatAttempted,false);
});
test('a brave finishing attempt remains a real lethal gamble; caution and witnessed heavy damage change it',()=>{
 const {s,h,enemy}=combatFixture({hp:8,attack:20,enemyHp:6,courage:.95});assert.equal(chooseCombatAction(s,enemy).action,'attack');assert.equal(chooseCombatAction(s,enemy).attackReply.lethalPossible,true);
 h.combatJudgment={lastHit:{enemy:enemy.id,damage:90,tick:0}};assert.equal(chooseCombatAction(s,enemy).action,'flee');h.combatJudgment.lastHit.enemy='unrelated-enemy';assert.equal(chooseCombatAction(s,enemy).action,'attack');delete h.combatJudgment;
 const cautious=restore(serialize(s));cautious.hero.personality.courage=.2;assert.equal(chooseCombatAction(cautious,cautious.areas[h.area].objects.find(o=>o.id===enemy.id)).action,'flee');step(cautious);step(s);
 assert.equal(cautious.hero.alive,true);assert.equal(cautious.hero.lastAction,'flee');assert.equal(h.alive,false);
});
test('mirror echo is dangerous even when the ordinary charged reply would be zero',()=>{
 const {s,enemy}=combatFixture({hp:5,tactic:'charged'});enemy.mutation='mirror';enemy.battle.echo=9;
 const forecast=incomingReply(s,enemy);assert.equal(forecast.min,9);assert.equal(forecast.max,9);assert.equal(forecast.lethalPossible,true);assert.equal(chooseCombatAction(s,enemy).action,'flee');
});
test('unknown outgoing resistance remains uncertain until learned and does not read the hidden element',()=>{
 const {s,enemy}=combatFixture();setModule(s,'elements',true);enemy.element='fire';const unknown=weaponDamageRange(s,enemy);enemy.element='frost';assert.deepEqual(weaponDamageRange(s,enemy),unknown);
 s.hero.memory.threats[enemy.id]={rates:{physical:.8}};const learned=weaponDamageRange(s,enemy);assert.equal(learned.knownRate,true);assert.ok(learned.max<unknown.max);
});
test('spell availability and execution use the same owned time reduction; unavailable requests spend nothing',()=>{
 const {s,h,enemy}=combatFixture({hp:8,attack:44,mana:5,spells:['borrow'],blocked:true});setModule(s,'enchantments',true);h.equipment.charm={id:'fixture-time',name:'Часы',slot:'charm',stat:'luck',power:0,modifier:'time',history:[],enchantment:{resonance:2,uses:0,owners:[],counts:{},memory:[]}};
 const spell=availableCombatSpells(s)[0];assert.equal(spell.manaCost,5);assert.equal(spell.cooldownTicks,5);step(s);assert.equal(h.magic.mana,0);assert.equal(h.magic.cooldowns.borrow,6);assert.equal(h.combatJudgment.last.manaSpent,5);
 const saved=serialize(s);assert.equal(castInCombat(s,enemy,{log:()=>{}},'borrow'),false);assert.equal(serialize(s),saved);
});
test('disabling judgment restores the existing weak-potion branch and preserves the possibility of death',()=>{
 const {s,h}=combatFixture({hp:8,attack:44,potions:1,mana:20,spells:['borrow'],blocked:true});setModule(s,'combat-judgment',false);assert.equal(chooseCombatAction(s,s.areas[h.area].objects.find(o=>o.id===h.combat)),null);step(s);
 assert.equal(h.alive,false);assert.equal(h.magic.casts,0);assert.equal(h.combatJudgment,undefined);assert.ok(s.journal.some(e=>e.type==='heal'));
});
