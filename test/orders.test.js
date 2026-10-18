import{test}from'node:test';
import assert from'node:assert/strict';
import{createWorld,serialize,restore}from'../engine.js';
import{sendGuards,ordersTick}from'../modules/orders.js';
import{setModule}from'../rules.js';
const ctx={route:()=>['a1','a2'],log:()=>{},npcVictory:(s,a,e,p)=>{e.hp=0;e.alive=false;e.defeatedBy=p.id;}};

test('a guard travels, defeats a threat and returns without crediting hero combat',()=>{
  const s=createWorld(4),source=s.areas.a1,enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.hp=1;
  assert.ok(sendGuards(s,source,{enemy:enemy.id,area:'a2'},ctx));const id=s.society.orders[0].person;const kills=s.hero.kills,xp=s.hero.xp;
  for(let i=0;i<30;i++){s.tick++;const tick=s.tick;ordersTick(s,ctx);assert.equal(s.tick,tick,'the caller advances time, never the NPC hook');}
  assert.equal(enemy.alive,false);assert.equal(s.people[id].status,'resident');assert.ok(source.population.includes(id));
  assert.equal(s.hero.kills,kills);assert.equal(s.hero.xp,xp);assert.equal(s.tick,30);
});
test('an order can end with a dead NPC and a persistent threat',()=>{
  const s=createWorld(5),enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.hp=1000;enemy.attack=1000;
  sendGuards(s,s.areas.a1,{enemy:enemy.id,area:'a2'},ctx);const id=s.society.orders[0].person;
  for(let i=0;i<15;i++){s.tick++;ordersTick(s,ctx);}
  assert.equal(s.people[id].alive,false);assert.equal(s.people[id].health,0);assert.ok(enemy.alive);
  assert.ok(s.areas.a2.objects.some(o=>o.kind==='grave'&&o.name===s.people[id].name));
});
test('pending orders serialize exactly and pause when their mechanic is disabled',()=>{
  const s=createWorld(7),enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');sendGuards(s,s.areas.a1,{enemy:enemy.id,area:'a2'},ctx);
  const restored=restore(serialize(s));assert.equal(serialize(restored),serialize(s));setModule(restored,'orders',false);
  const remaining=restored.society.orders[0].remaining;ordersTick(restored,ctx);assert.equal(restored.society.orders[0].remaining,remaining);
});
