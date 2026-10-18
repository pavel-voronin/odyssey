import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {intentionFixture,addHerbPromises} from '../scripts/intention-scenarios.mjs';
import {knownAffairs,visibleAssaults,assessAssistance} from '../modules/intentions.js';
import {ordersTick} from '../modules/orders.js';
import {assertSameSave} from '../scripts/life-save-compare.mjs';
test('one witnessed warning pauses the real collection step and the NPC retreats with its own paid enemy reply',()=>{
 const {s,h,a,victim}=intentionFixture(),oldGoal=h.goal;
 step(s);assert.equal(s.tick,1);assert.equal(h.intentions.last.method,'warn');assert.equal(h.intentions.last.status,'warning-delivered');assert.equal(victim.safetyAdvice.status,'pending');assert.equal(h.intentions.suspended.action,oldGoal);assert.equal(oldGoal.remaining,2);assert.equal(h.inventory.rations,1);assert.equal(a.forage.stock,6);assert.equal(h.energy,99);
 const hp=victim.health;step(s);assert.equal(s.tick,2);assert.equal(victim.safetyAdvice.status,'accepted');assert.equal(victim.status,'returning');assert.equal(victim.x,28);assert.ok(victim.health<hp);assert.ok(victim.health>0);assert.equal(h.goal.remaining,1);assert.equal(h.inventory.rations,1);
 step(s);assert.equal(h.inventory.rations,4);assert.equal(a.forage.stock,3);assert.equal(h.counters.forage,2);assert.equal(h.intentions.suspended,null);assert.equal(s.generation,1);
});
test('a selfish refusal continues the original collection, without warning, a new quest or a free rescue',()=>{
 const {s,h,a,victim}=intentionFixture({method:'leave'});step(s);
 assert.equal(h.intentions.last.status,'declined');assert.equal(h.intentions.last.method,'leave');assert.equal(h.goal.remaining,1);assert.equal(victim.safetyAdvice,undefined);assert.equal(h.quests.length,0);assert.equal(a.forage.stock,6);
 step(s);assert.equal(h.inventory.rations,4);assert.equal(a.forage.stock,3);assert.equal(h.intentions.recent.length,1);
});
test('a capable hero really changes a casualty outcome through ordinary combat, while the unintervened person can die',()=>{
 const on=intentionFixture({method:'fight',enemyHp:30,enemyAttack:3,remaining:999}),off=intentionFixture({method:'fight',enemyHp:30,enemyAttack:3,remaining:999,off:true});
 const people=Object.keys(on.s.people).length;
 for(let i=0;i<12;i++){step(on.s);step(off.s);}
 assert.equal(on.enemy.alive,false);assert.equal(on.victim.alive,true);assert.equal(off.victim.alive,false);assert.equal(off.enemy.alive,true);assert.equal(on.h.kills,1);assert.equal(on.h.quests.length,0);assert.equal(Object.keys(on.s.people).length,people);assert.equal(on.h.inventory.rations,1);assert.ok(on.h.goal?.remaining<999||on.h.intentions.suspended?.action.remaining===999);
});
test('a local guard is the same person, cannot attack twice in the assignment tick and finishes without a return teleport',()=>{
 const {s,h,enemy,guard}=intentionFixture({method:'guard',enemyHp:40}),count=Object.keys(s.people).length,x=guard.x,gold=h.gold;
 guard.actionControl={tick:1,owner:'personal',phases:['act']};step(s);
 assert.equal(h.intentions.last.status,'guard-agreed');assert.equal(guard.status,'guarding');assert.equal(guard.health,100);assert.equal(guard.x,x);assert.equal(Object.keys(s.people).length,count);assert.equal(s.society.orders.filter(o=>o.person===guard.id).length,1);assert.equal(guard.actionControl.owner,'personal');
 const hp=enemy.hp;ordersTick(s,{log(){},npcVictory(){throw Error('second action');}});assert.equal(enemy.hp,hp);
 for(let i=0;i<5;i++)step(s);assert.equal(enemy.alive,false);assert.equal(guard.status,'resident');assert.equal(guard.x,x);assert.equal(s.society.orders.some(o=>o.person===guard.id),false);assert.equal(h.kills,0);assert.equal(h.gold,gold);assert.equal(guard.safetyAdvice,undefined);assert.equal(h.intentions.recent.length,1);
});
test('a guard may refuse an impossible job and a warned person may still die from the real retreat response',()=>{
 const refused=intentionFixture({method:'guard',guardAttack:1,guardDuty:.1});step(refused.s);assert.equal(refused.h.intentions.last.status,'guard-declined');assert.equal(refused.guard.status,'resident');assert.equal(refused.s.society.orders.some(o=>o.person===refused.guard.id),false);
 const fatal=intentionFixture({enemyAttack:40,victimHp:75});step(fatal.s);assert.equal(fatal.victim.safetyAdvice.status,'pending');step(fatal.s);assert.equal(fatal.victim.alive,false);assert.equal(fatal.victim.safetyAdvice.status,'accepted');assert.equal(fatal.h.kills,0);assert.equal(fatal.s.generation,1);assert.equal(fatal.h.intentions.last.status,'warning-delivered');assert.equal(fatal.a.objects.filter(o=>o.kind==='grave'&&o.name===fatal.victim.name).length,1);
});
test('full portfolios and reversed acceptance order do not suppress the same immediate situation or consume collected herbs',()=>{
 for(const reversed of [false,true]){const f=intentionFixture(),object=addHerbPromises(f,reversed),ids=f.h.quests.map(q=>q.id);step(f.s);assert.equal(f.h.intentions.last.method,'warn');assert.equal(f.h.quests.length,4);assert.deepEqual(f.h.quests.map(q=>q.id),ids);assert.equal(f.h.inventory.herbs,2);assert.equal(object.count,10);step(f.s);assert.equal(f.h.inventory.herbs,3);assert.equal(object.count,9);assert.ok(f.h.quests.every(q=>q.status==='active'));}
});
test('the interrupted action is reassessed after actual local depletion or an existing fulfilled need',()=>{
 for(const change of [f=>{f.a.forage.stock=0;},f=>{f.h.inventory.rations=4;f.h.hunger=10;}]){const f=intentionFixture();step(f.s);change(f);step(f.s);assert.equal(f.h.intentions.suspended,null);assert.notEqual(f.h.goal?.remaining,1);assert.equal(f.h.inventory.rations, f.a.forage.stock===0?1:4);}
});
test('local observation and canonical affairs are pure and do not reveal a distant assault',()=>{
 const f=intentionFixture();f.victim.x=80;f.enemy.x=88;step(f.s);assert.equal(f.h.intentions,undefined);assert.equal(f.h.goal.remaining,1);
 const before=serialize(f.s);assert.deepEqual(visibleAssaults(f.s),[]);knownAffairs(f.s);assert.equal(serialize(f.s),before);
 const local=intentionFixture();step(local.s);const snapshot=serialize(local.s);assessAssistance(local.s,visibleAssaults(local.s)[0]);assert.equal(serialize(local.s),snapshot);
});
test('saved pending advice and suspended progress replay exactly; disabling restores the old action without delivering a new warning',()=>{
 const f=intentionFixture({heroX:26});step(f.s);assert.equal(f.h.intentions.current.method,'warn');assert.equal(f.h.intentions.suspended.action.remaining,2);assert.equal(f.victim.safetyAdvice,undefined);
 const copy=restore(serialize(f.s));for(let i=0;i<12;i++){step(f.s);step(copy);assertSameSave(serialize(f.s),serialize(copy));}
 const off=intentionFixture({heroX:26});step(off.s);setModule(off.s,'intentions',false);step(off.s);assert.equal(off.h.intentions.last.status,'paused');assert.equal(off.victim.safetyAdvice,undefined);assert.equal(off.h.goal.kind,'forage');assert.equal(off.h.goal.remaining,2);step(off.s);step(off.s);assert.equal(off.h.inventory.rations,4);
});
test('a healthy duty-bound guard can reject advice rather than becoming directly controlled by the hero',()=>{
 const f=intentionFixture({victimHp:100,enemyAttack:1});step(f.s);assert.equal(f.victim.safetyAdvice.status,'pending');step(f.s);assert.equal(f.victim.safetyAdvice.status,'declined');assert.equal(f.victim.status,'guarding');assert.equal(f.victim.x,40);
});
test('with ordinary NPC needs enabled the warning changes retreat timing rather than duplicating an automatic withdrawal',()=>{
 const on=intentionFixture({victimHp:70,remaining:999}),off=intentionFixture({victimHp:70,remaining:999,off:true});
 for(const f of [on,off])for(const id of ['npc-watch-needs','npc-needs'])setModule(f.s,id,true);
 step(on.s);step(off.s);assert.equal(on.victim.status,'guarding');assert.equal(off.victim.status,'guarding');assert.equal(on.victim.health,off.victim.health);
 const hp=on.victim.health;step(on.s);step(off.s);assert.equal(on.victim.status,'returning');assert.equal(off.victim.status,'guarding');
 // Retreat omits the guard's own attack roll, so the reply roll may differ.
 // With attack5, two responses would exceed this disjoint5..7 damage range.
 for(const f of [on,off])assert.ok(hp-f.victim.health>=5&&hp-f.victim.health<=7,'exactly one paid response');
 step(on.s);step(off.s);assert.ok(on.victim.health>off.victim.health);assert.equal(on.victim.safetyAdvice.status,'accepted');
});
test('a professional guard without a legacy attack field gets a finite work-based capability; an explicit zero is not upgraded',()=>{
 const f=intentionFixture({method:'guard',enemyHp:14,enemyAttack:1});delete f.guard.attack;f.guard.agenda.work=32;step(f.s);assert.equal(f.h.intentions.last.status,'guard-agreed');assert.equal(f.guard.attack,7);
 for(let i=0;i<3;i++)step(f.s);assert.equal(f.enemy.alive,false);assert.ok(Number.isFinite(f.enemy.hp));assert.equal(f.guard.status,'resident');
 const unable=intentionFixture({method:'guard',guardAttack:0});step(unable.s);assert.equal(unable.guard.attack,0);assert.equal(unable.guard.status,'resident');assert.equal(unable.h.intentions.last.method,'warn');
 const hungry=intentionFixture({method:'guard'});hungry.guard.needs={hunger:90,energy:100,sleeping:false};step(hungry.s);assert.equal(hungry.guard.status,'resident');assert.equal(hungry.h.intentions.last.method,'warn');
});
test('accepted advice chooses retreat before a medicine action; the same NPC cannot heal and flee in one tick',()=>{
 const f=intentionFixture({victimHp:70});for(const id of ['npc-watch-needs','npc-needs'])setModule(f.s,id,true);f.s.tick=6;f.victim.roadSupplies={medicine:2,food:1};step(f.s);assert.equal(f.s.tick,7);assert.equal(f.victim.safetyAdvice.status,'pending');const hp=f.victim.health;
 step(f.s);assert.equal(f.s.tick,8);assert.equal(f.victim.status,'returning');assert.equal(f.victim.roadSupplies.medicine,2);assert.equal(f.victim.roadSupplies.food,1);assert.ok(hp-f.victim.health>=5&&hp-f.victim.health<=7);assert.equal(f.victim.watchNeeds.retreat,true);assert.equal(f.victim.watchNeeds.activity,null);assert.deepEqual(f.victim.actionControl.phases,['act']);
});
test('a cautious hero can use a known affordable finishing spell; missing mana or cooldown changes that choice',()=>{
 for(const available of [true,false]){
  const f=intentionFixture({heroX:38,enemyHp:9,enemyAttack:20,victimHp:70});setModule(f.s,'magic',true);f.h.magic={mana:available?20:0,maxMana:20,spells:['spark'],cooldowns:{},casts:0};f.s.randomStreams['npc-combat']=0;
  step(f.s);assert.equal(f.h.intentions.last?.method||f.h.intentions.current?.method,available?'fight':'warn');
  if(available){for(let i=0;i<2;i++)step(f.s);assert.equal(f.enemy.alive,false);assert.equal(f.h.magic.casts,1);assert.equal(f.h.magic.mana,16);assert.equal(f.victim.alive,true);}else assert.equal(f.h.magic.casts,0);
 }
 const cooling=intentionFixture({heroX:38,enemyHp:9,enemyAttack:20,victimHp:70});setModule(cooling.s,'magic',true);cooling.h.magic={mana:20,maxMana:20,spells:['spark'],cooldowns:{spark:100},casts:0};cooling.s.randomStreams['npc-combat']=0;step(cooling.s);assert.equal(cooling.h.intentions.last.method,'warn');assert.equal(cooling.h.magic.mana,20);
});
