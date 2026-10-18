import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {enemyDamage,enemyReply} from '../modules/adversaries.js';
import {registerReinforcement} from '../modules/quests.js';
import {castInCombat} from '../modules/magic.js';
const ctx={log:()=>{},gainXp:()=>{},defeatEnemy:()=>{}};
function foe(s){const e=s.areas.a2.objects.find(e=>e.kind==='enemy');e.element='normal';e.tactic='simple';e.mutation='none';e.battle={turns:0,intent:'idle',summons:0,echo:0};return e;}
test('elemental resistance is learned from a hit and the next spell can use another channel',()=>{
  const s=createWorld(1),e=foe(s);e.element='fire';assert.equal(enemyDamage(s,e,20,'fire',ctx),8);assert.equal(s.hero.memory.threats[e.id].rates.fire,.4);
  s.hero.magic.spells=['bluefire','roots'];s.hero.magic.mana=30;e.hp=e.maxHp=100;s.hero.personality.generosity=0;castInCombat(s,e,ctx);assert.ok(s.hero.magic.cooldowns.roots);assert.equal(s.hero.magic.cooldowns.bluefire,undefined);
});
test('a charged strike has a harmless visible preparation and a persistent later attack',()=>{
  let s=createWorld(1),e=foe(s);e.tactic='charged';assert.equal(enemyReply(s,e,6,ctx),0);assert.equal(e.battle.intent,'strike');const saved=serialize(s);s=restore(saved);assert.equal(serialize(s),saved);e=s.areas.a2.objects.find(x=>x.id===e.id);assert.equal(enemyReply(s,e,6,ctx),18);assert.equal(e.battle.intent,'idle');
});
test('shells, mirrors and phasing operate on their specific damage channels',()=>{
  const s=createWorld(1),e=foe(s);e.mutation='shell';assert.equal(enemyDamage(s,e,10,'physical',ctx),8);assert.equal(enemyDamage(s,e,10,'fire',ctx),10);
  e.mutation='mirror';enemyDamage(s,e,20,'fire',ctx);assert.equal(e.battle.echo,5);assert.equal(enemyReply(s,e,4,ctx),9);assert.equal(e.battle.echo,0);
  e.mutation='phase';s.randomStreams.mutations=0;assert.equal(enemyDamage(s,e,10,'physical',ctx),0);assert.equal(enemyDamage(s,e,10,'fire',ctx),10);
});
test('mana draining is real and independent of mutation and ordinary power switches',()=>{
  const s=createWorld(1),e=foe(s);e.element='storm';e.tactic='leech';s.hero.magic.mana=18;enemyReply(s,e,5,ctx);assert.equal(s.hero.magic.mana,10);setModule(s,'elements',false);enemyReply(s,e,5,ctx);assert.equal(s.hero.magic.mana,6);setModule(s,'tactics',false);enemyReply(s,e,5,ctx);assert.equal(s.hero.magic.mana,6);
});
test('reinforcement expands the actual threat objective, including while the hero is away',()=>{
  const s=createWorld(1),e=foe(s);e.tactic='summoner';const q={id:'pack',kind:'wolves',status:'active',target:'a2',targets:[e.id],required:1};s.hero.quests=[q];s.hero.area='a1';
  const spawn={...ctx,combatArea:'a2',enemySpawned:registerReinforcement,spawnEnemy:(s,a,options)=>{const child={id:'child',kind:'enemy',name:'Подкрепление',baseName:'Подкрепление',alive:true,hp:20,maxHp:20,attack:3,...options};a.objects.push(child);return child;}};
  for(let i=0;i<3;i++)enemyReply(s,e,4,spawn);assert.equal(e.battle.summons,1);assert.equal(q.required,2);assert.ok(q.targets.includes('child'));assert.equal(s.areas.a2.objects.find(x=>x.id==='child').originPack,e.id);
});
test('disabling specialized layers preserves their data and suppresses their effects',()=>{
  const s=createWorld(1),e=foe(s);e.element='fire';e.mutation='shell';e.tactic='charged';for(const id of ['elements','mutations','tactics'])setModule(s,id,false);
  assert.equal(enemyDamage(s,e,10,'fire',ctx),10);assert.equal(enemyDamage(s,e,10,'physical',ctx),10);assert.equal(enemyReply(s,e,5,ctx),5);assert.equal(e.battle.turns,0);
});
test('a new generation serializes exactly before it has seen another foe',()=>{
  const s=createWorld(1);s.hero.alive=false;step(s);const save=serialize(s);assert.equal(serialize(restore(save)),save);
});
test('a hungry mutation cannot consume supplies while that resource module is disabled',()=>{
  const s=createWorld(1),e=foe(s);e.mutation='hungry';s.randomStreams.mutations=0;const food=s.hero.inventory.rations;setModule(s,'supply',false);enemyReply(s,e,4,ctx);assert.equal(s.hero.inventory.rations,food);
  setModule(s,'supply',true);enemyReply(s,e,4,ctx);assert.equal(s.hero.inventory.rations,food-1);
});
test('physical attacks do not suppress regeneration during a preparation turn',()=>{
  const hp=[];
  for(const power of ['plain','regrowth']){
    const s=createWorld(1),e=foe(s);e.tactic='charged';e.powers=[power];e.hp=e.maxHp=100;s.hero.area='a2';s.hero.x=e.x;s.hero.combat=e.id;s.hero.magic.spells=[];s.hero.profession='thief';s.hero.inventory.potions=0;
    step(s);assert.equal(e.battle.intent,'strike');assert.equal(s.hero.lastDamage,0);hp.push(e.hp);
  }
  assert.equal(hp[1],hp[0]+2);
});
