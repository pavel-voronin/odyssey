import{test}from'node:test';
import assert from'node:assert/strict';
import{createWorld,step}from'../engine.js';
function combatState(){
  const s=createWorld(14),e=s.areas.a2.objects.find(o=>o.kind==='enemy');
  s.hero.area='a2';s.hero.x=e.x;s.hero.combat=e.id;s.hero.hp=s.hero.maxHp;s.hero.inventory.potions=0;e.hp=200;e.maxHp=200;e.attack=4;e.powers=['plain'];
  s.hero.magic.spells=['spark'];s.hero.magic.mana=30;s.hero.magic.cooldowns={};return{s,e};
}
test('ordinary magic allows the living enemy to act in the same simulation tick',()=>{
  const{s}=combatState();const hp=s.hero.hp;step(s);assert.ok(s.hero.hp<hp);assert.equal(s.hero.lastAction,'spell');assert.equal(s.tick,1);
});
test('borrowing a second uniquely suppresses an enemy response',()=>{
  const{s}=combatState();s.hero.magic.spells=['borrow'];const hp=s.hero.hp;step(s);assert.equal(s.hero.hp,hp);assert.ok(s.hero.magic.responseSkipped);
});
test('healing consumes an action and does not grant an unadvertised ceasefire',()=>{
  const{s}=combatState();s.hero.magic.spells=[];s.hero.hp=15;s.hero.inventory.potions=1;step(s);
  assert.equal(s.hero.inventory.potions,0);assert.ok(s.hero.hp<34);assert.ok(s.hero.hp>15);assert.equal(s.hero.lastAction,'heal');
});
