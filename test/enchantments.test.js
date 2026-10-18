import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,observeExistingPerson} from '../engine.js';
import {setModule} from '../rules.js';
import {stat} from '../modules/common.js';
import {itemBearer,initializeItemMemory,enchantmentStrength,enchantedAttack,enchantedDefense,enchantedRest,enchantedVictory,enchantmentTick,enchantedTrust,enchantedDiscovery} from '../modules/enchantments.js';
import {castInCombat} from '../modules/magic.js';
import {makeItem} from '../modules/inventory.js';
import {createPerson} from '../modules/lineage.js';
import {combatResponse} from '../modules/combat.js';
const ctx={random:()=>.2,log:()=>{},gainXp:()=>{},defeatEnemy:()=>{}};
function equip(s,modifier,stat='defense',power=2){const item={id:'tested-item',name:'Испытуемая вещь',slot:'charm',modifier,stat,power,history:[],value:16};initializeItemMemory(item);itemBearer(s,item);s.hero.equipment.charm=item;return item;}
test('charm attributes affect real character stats and stop when equipment is disabled',()=>{
  const s=createWorld(1),base=stat(s.hero,'wit');equip(s,'plain','wit',4);assert.equal(stat(s.hero,'wit'),base+4);setModule(s,'equipment',false);assert.equal(stat(s.hero,'wit'),base);
});
test('blessing, healing and greed have bounded physical effects and recorded use',()=>{
  const s=createWorld(1),item=equip(s,'blessing');assert.equal(enchantedDefense(s,7,ctx),6);assert.equal(enchantedDefense(s,1,ctx),1);assert.equal(item.enchantment.uses,1);
  item.modifier='healing';s.hero.hp=20;enchantedRest(s,ctx);assert.equal(s.hero.hp,21);item.modifier='greed';const gold=s.hero.gold;enchantedVictory(s,{name:'Враг'},ctx);assert.equal(s.hero.gold,gold+1);assert.ok(item.history.length>=3);
});
test('time changes the actual mana requirement and cooldown without advancing world time',()=>{
  const s=createWorld(1);equip(s,'time');s.hero.magic.spells=['spark'];s.hero.magic.mana=3;const enemy={hp:100,maxHp:100,tags:[],name:'Мишень'},tick=s.tick;
  assert.equal(castInCombat(s,enemy,ctx),true);assert.equal(s.hero.magic.mana,0);assert.equal(s.tick,tick);assert.ok(s.hero.magic.cooldowns.spark>s.tick);
  assert.equal(castInCombat(s,enemy,ctx),false);
});
test('magic equipment increases actual spell power',()=>{
  const s=createWorld(1);s.hero.magic.spells=['spark'];const first={hp:100,maxHp:100,tags:[]};castInCombat(s,first,ctx);const damage=100-first.hp;
  s.hero.magic.mana=18;s.hero.magic.cooldowns={};equip(s,'plain','magic',3);const second={hp:100,maxHp:100,tags:[]};castInCombat(s,second,ctx);assert.equal(100-second.hp,damage+3);
});
test('item memory survives ownership changes and a mature inherited rune responds more strongly',()=>{
  const s=createWorld(1),item=equip(s,'spirit');for(let i=0;i<20;i++)enchantedTrust(s,'Знакомый',ctx);assert.equal(item.enchantment.resonance,1);
  const old=s.hero.lineage,newOwner=createPerson(s,{name:'Другой владелец',race:s.hero.race,role:'житель',alive:true,area:'a1',parents:[old]});
  // Transfer the original item to another person, rather than relabeling the old body.
  for(const key of Object.keys(s.hero.equipment))if(s.hero.equipment[key]===item)s.hero.equipment[key]=null;
  assert.equal(observeExistingPerson(s,newOwner),true);s.hero.equipment.charm=item;
  itemBearer({hero:{lineage:newOwner}},item);assert.equal(item.enchantment.resonance,2);assert.deepEqual(item.enchantment.owners,[old,newOwner]);assert.equal(enchantmentStrength({ruleFlags:s.rules,equipment:{[item.slot]:item}},'spirit'),2);
  const save=serialize(s);assert.equal(serialize(restore(save)),save);
});
test('disabled enchantments preserve memory but produce no extra defense, healing or coins',()=>{
  const s=createWorld(1),item=equip(s,'blessing');enchantedDefense(s,7,ctx);const memory=JSON.stringify(item.enchantment);setModule(s,'enchantments',false);assert.equal(enchantedDefense(s,7,ctx),7);assert.equal(JSON.stringify(item.enchantment),memory);
  item.modifier='healing';s.hero.hp=20;enchantedRest(s,ctx);assert.equal(s.hero.hp,20);item.modifier='greed';const gold=s.hero.gold;enchantedVictory(s,{name:'Враг'},ctx);assert.equal(s.hero.gold,gold);
});
test('item creators are living adults and exploration records a real named place',()=>{
  const s=createWorld(1),made=makeItem(s,ctx,2);if(made.creator){assert.equal(s.people[made.creator].alive,true);assert.notEqual(s.people[made.creator].role,'ребёнок');}
  const item=equip(s,'explore');assert.equal(enchantedDiscovery(s,s.areas.a2,ctx),1);assert.ok(item.history.at(-1).text.includes('Шепчущий лес'));
});
test('luck uses a reproducible separate stream and spirit recognizes the enemy type',()=>{
  const s=createWorld(1),item=equip(s,'luck');s.randomStreams.enchantments=0;assert.equal(enchantedAttack(s,{name:'Мишень',tags:[]},10,ctx),13);
  item.modifier='spirit';assert.equal(enchantedAttack(s,{name:'Дух',tags:['spirit']},10,ctx),12);assert.equal(enchantedAttack(s,{name:'Зверь',tags:['beast']},10,ctx),10);
});
test('the curse cost respects independent body and psychology switches',()=>{
  const s=createWorld(1),item=equip(s,'curse');s.tick=96;const hunger=s.hero.hunger,stress=s.hero.mind.stress;enchantmentTick(s,ctx);assert.equal(s.hero.hunger,hunger+2);assert.equal(s.hero.mind.stress,stress+2);
  setModule(s,'body',false);setModule(s,'psychology',false);const uses=item.enchantment.uses;enchantmentTick(s,ctx);assert.equal(item.enchantment.uses,uses);assert.equal(s.hero.hunger,hunger+2);
});
test('a vampire heals from damage after the blessing and magic suppresses regeneration across professions',()=>{
  const s=createWorld(1);equip(s,'blessing');setModule(s,'lineage',false);s.hero.profession='thief';s.hero.lastAction='spell';const enemy={name:'Вампир',hp:10,maxHp:30,powers:['vampire','regrowth'],stolen:0};
  const damage=combatResponse(s,enemy,7,ctx);assert.equal(damage,4);assert.equal(enemy.hp,12);
});
