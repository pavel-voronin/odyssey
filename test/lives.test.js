import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld,step,serialize,restore } from '../engine.js';
import { setModule } from '../rules.js';
import { ancestry,initializeLineage } from '../modules/lineage.js';
import { castInCombat } from '../modules/magic.js';
import { receiveItem } from '../modules/inventory.js';
const events=[];
const ctx={random:()=>.2,log:(s,t)=>events.push(t),gainXp:()=>{},defeatEnemy:(s,e)=>{e.alive=false;s.hero.combat=null;}};

test('racial ancestry and village families resolve to persistent people',()=>{
  for(let seed=1;seed<=20;seed++){
    const s=createWorld(seed);assert.ok(s.hero.appearance);assert.ok(ancestry(s,s.hero.lineage).length>=3);
    for(const person of Object.values(s.people))for(const id of person.parents)assert.ok(s.people[id]);
    for(const a of Object.values(s.areas))for(const id of a.population||[])assert.ok(s.people[id]);
    assert.equal(serialize(restore(serialize(s))),serialize(s));
  }
});
test('magic consumes mana, honors cooldowns and can be disabled without erasing learning',()=>{
  const s=createWorld(8),enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');
  s.hero.magic.spells=['spark'];s.hero.magic.mana=20;s.hero.hp=s.hero.maxHp;
  assert.equal(castInCombat(s,enemy,ctx),true);assert.equal(s.hero.magic.mana,16);
  assert.equal(castInCombat(s,enemy,ctx),false);
  s.tick+=3;assert.equal(castInCombat(s,enemy,ctx),true);
  setModule(s,'magic',false);s.tick+=3;assert.equal(castInCombat(s,enemy,ctx),false);assert.ok(s.hero.magic.spells.includes('spark'));
});
test('some lives earn income without combat and professions influence work',()=>{
  let lives=0,peaceful=0,casts=0;
  for(let seed=1;seed<=24;seed++){
    const s=createWorld(seed);let earnedWithoutCombat=false;for(let i=0;i<500;i++){step(s);if(s.hero.lastAction==='spell')casts++;if(s.hero.counters.peacefulWork>0&&s.hero.kills===0)earnedWithoutCombat=true;}
    lives+=s.hero.counters.peacefulWork||0;
    if(earnedWithoutCombat)peaceful++;
  }
  assert.ok(lives>0,'peaceful work occurs');assert.ok(peaceful>0,'actual wages can precede any combat victory even when that person later changes plans');assert.ok(casts>0,'autonomous spellcasting occurs');
});
test('loot has provenance and inheritance keeps its identity and history',()=>{
  const s=createWorld(4);const item=receiveItem(s,ctx,4);
  assert.ok(item.creator);assert.ok(item.history.length>=2);
  s.hero.bag=[];s.hero.equipment={weapon:null,armor:null,charm:null};
  const again=receiveItem(s,ctx,null,item);assert.equal(again.id,item.id);assert.equal(again.history.length,3);
});
