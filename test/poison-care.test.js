import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,knownRoute} from '../engine.js';
import {setModule} from '../rules.js';
import {poisonFixture} from '../scripts/poison-care-scenarios.mjs';
import {assertSameSave} from '../scripts/life-save-compare.mjs';
import {poisonCareTick} from '../modules/poison-care.js';
import {intentionFixture} from '../scripts/intention-scenarios.mjs';
import {lodgingFixture} from '../scripts/lodging-scenarios.mjs';
import {lodgingPlan,bookRoom} from '../modules/lodging.js';
import {commonContext} from '../scripts/common-life-scenarios.mjs';
test('two pitching actions precede actual recovery; poison keeps pulsing and a suspended collection resumes after real expiry',()=>{
 const {s,h,a}=poisonFixture(),old=h.goal;step(s);assert.equal(h.goal.kind,'campPitch');assert.equal(h.goal.remaining,1);assert.equal(h.poisonCare.suspended.action,old);assert.equal(h.hp,5);assert.equal(a.forage.stock,6);
 step(s);assert.ok(s.areas[h.area].temporaryCamp);assert.equal(h.hp,5);const camp=h.area;step(s);assert.equal(h.hp,8);assert.ok(h.conditions.some(c=>c.id==='poison'));
 for(let i=0;i<40;i++)step(s);assert.equal(h.hp,h.maxHp);assert.equal(h.area,camp);assert.equal(h.counters.camps,1);assert.ok(h.conditions.some(c=>c.id==='poison'));
 for(let i=0;i<30&&h.poisonCare.active;i++)step(s);assert.equal(h.alive,true);assert.equal(h.area,a.id);assert.equal(h.conditions.some(c=>c.id==='poison'),false);assert.equal(h.poisonCare.last.status,'recovered');assert.equal(h.goal,old);assert.equal(h.goal.remaining,1);assert.equal(a.forage.stock,6);step(s);assert.equal(a.forage.stock,3);assert.equal(h.inventory.rations,4);
});
test('an owned remedy is one action and restores HP without curing poison or collecting a second resource',()=>{
 const {s,h,a}=poisonFixture({hp:1,until:129,camp:false,potions:1,tick:6});const old=h.goal;step(s);assert.equal(h.inventory.potions,0);assert.equal(h.hp,20);assert.equal(h.lastAction,'heal');assert.equal(a.forage.stock,6);assert.equal(h.poisonCare.suspended.action,old);assert.ok(h.conditions.some(c=>c.id==='poison'));assert.equal(s.tick,7);
 const fatal=poisonFixture({hp:1,until:129,camp:false,tick:6});step(fatal.s);step(fatal.s);assert.equal(fatal.h.alive,false);assert.equal(fatal.s.lives[0].cause,'Отравление');assert.equal(fatal.s.generation,1);
});
test('a camp cannot rescue a body killed by the next pulse before pitching is finished',()=>{
 const {s,h}=poisonFixture({hp:1,until:129,tick:6});step(s);assert.equal(h.poisonCare?.active?.method,undefined);assert.equal(s.areas.a0.fieldCamp,undefined);step(s);assert.equal(h.alive,false);
});
test('saved care replays exactly and disabling it preserves the real condition and interrupted resource progress',()=>{
 const {s,h}=poisonFixture();step(s);const copy=restore(serialize(s));for(let i=0;i<12;i++){step(s);step(copy);assertSameSave(serialize(s),serialize(copy));}
 setModule(s,'poison-care',false);step(s);assert.ok(h.conditions.some(c=>c.id==='poison'));assert.equal(h.poisonCare.last.status,'disabled');assert.equal(h.poisonCare.suspended,null);assert.equal(h.goal.kind,'forage');assert.equal(h.goal.remaining,1);
});
test('current combat still takes its ordinary action instead of free medicine, camping or cancelling the enemy',()=>{
 const {s,h,a}=poisonFixture({hp:30,potions:1});const enemy={id:'forced',kind:'enemy',name:'Нападающий',x:h.x,hp:100,maxHp:100,attack:4,alive:true};a.objects.push(enemy);h.combat=enemy.id;step(s);assert.equal(h.lastAction,'attack');assert.equal(h.inventory.potions,1);assert.equal(h.poisonCare,undefined);assert.ok(h.hp<30);assert.equal(h.combat,enemy.id);
});
test('a healthy short poisoning does not force a life of rest and hidden remote medicine cannot create a helper',()=>{
 const normal=poisonFixture({hp:40,until:17});step(normal.s);assert.equal(normal.h.poisonCare,undefined);assert.equal(normal.h.goal.remaining,1);
 for(const medicine of [0,100]){const f=poisonFixture();f.s.areas.a3.civic={medicine};step(f.s);assert.equal(f.h.poisonCare.active.method,'camp');assert.equal(f.h.inventory.potions,0);assert.equal(Object.values(f.s.people).filter(p=>p.role==='лекарь').length,0);}
});
test('the actual local clinic spends two existing units once; an empty clinic cannot cure by resting',()=>{
 for(const medicine of [0,2]){
  const {s,h}=poisonFixture();h.area='a1';h.x=68;h.atlas.known.push('a1');h.atlas.roads.push('a0|a1');s.areas.a1.civic.medicine=medicine;
  step(s);assert.equal(s.areas.a1.civic.medicine,0);assert.equal(h.conditions.some(c=>c.id==='poison'),medicine===0);
  if(medicine===2){assert.equal(h.hp,5);assert.equal(h.lastAction,'heal');assert.equal(h.poisonCare.active.method,'clinic');assert.equal(h.inventory.potions,0);assert.equal(h.poisonCare.suspended.action.remaining,2);}
  else assert.equal(h.hp,7);
 }
});
test('remote medical stock is never read by the new decision, even for a known reachable town',()=>{
 const {s,h}=poisonFixture();h.atlas.known.push('a1');h.atlas.roads.push('a0|a1');Object.defineProperty(s.areas.a1.civic,'medicine',{get(){throw Error('Hidden remote medical stock was read');},configurable:true});
 const ctx={knownRoute,log(){},goal:(s,kind,area,x,intent,reason,extra)=>{s.hero.goal={kind,area,x,...extra};s.hero.intent=intent;s.hero.reason=reason;}};
 poisonCareTick(s,ctx);assert.equal(h.poisonCare.active.method,'camp');
});
test('an already witnessed critical rescue can finish a known one-hit threat before returning to illness care',()=>{
 const f=intentionFixture({method:'fight'});step(f.s);assert.equal(f.h.intentions.current.method,'fight');assert.equal(f.h.intentions.current.wound,'critical');
 for(const id of ['body','poison-care'])setModule(f.s,id,true);setModule(f.s,'orders',false);f.h.hp=50;f.h.maxHp=100;f.h.hunger=10;f.h.inventory.herbs=0;f.h.inventory.potions=0;f.h.conditions=[{id:'poison',until:65}];f.h.x=f.enemy.x-1;f.enemy.hp=1;
 step(f.s);assert.equal(f.h.poisonCare.last.status,'calculated-risk');assert.equal(f.h.combat,f.enemy.id);assert.equal(f.h.inventory.potions,0);
 step(f.s);assert.equal(f.enemy.alive,false);assert.equal(f.victim.alive,true);assert.equal(f.h.kills,1);assert.ok(f.h.conditions.some(c=>c.id==='poison'));
});
test('an early expiration does not fold the camp before the injured body can recover and retain its unfinished work',()=>{
 const {s,h}=poisonFixture({until:3});const original=h.goal;for(let i=0;i<3;i++)step(s);assert.equal(h.conditions.some(c=>c.id==='poison'),false);assert.ok(s.areas[h.area].temporaryCamp);assert.equal(h.goal.kind,'rest');assert.equal(h.poisonCare.suspended.action,original);
 for(let i=0;i<20&&h.poisonCare.active;i++)step(s);assert.equal(h.poisonCare.active,null);assert.ok(h.hp>=h.maxHp*.82);assert.equal(h.area,'a0');assert.equal(h.goal,original);
});
test('an existing paid room stays useful without another booking or a long walk to a distant clinic',()=>{
 const {s,h,room}=lodgingFixture();setModule(s,'poison-care',true);assert.ok(lodgingPlan(s,commonContext));bookRoom(s,commonContext);const gold=h.gold,booking=room.lodging.booking;
 h.hp=20;h.conditions=[{id:'poison',until:s.tick+60}];h.inventory.herbs=0;h.inventory.potions=0;
 let entered=false;for(let i=0;i<75&&h.alive;i++){step(s);if(h.area===room.id)entered=true;if(s.tick<85&&entered)assert.equal(h.area,room.id);if(!h.poisonCare?.active&&entered)break;}
 assert.ok(entered);assert.equal(h.alive,true);assert.equal(h.conditions.some(c=>c.id==='poison'),false);assert.equal(h.gold,gold);assert.equal(room.lodging.booking,booking);assert.equal(room.lodging.nextBooking,1);
});
test('illness cannot revive a withdrawn rescue executor; the older real collection remains available through its own intention',()=>{
 const f=intentionFixture({method:'fight',enemyHp:30,enemyAttack:3});f.a.type='cave';step(f.s);assert.equal(f.h.intentions.current.method,'fight');
 for(const id of ['body','poison-care','fieldcamp'])setModule(f.s,id,true);setModule(f.s,'orders',false);f.h.hp=5;f.h.conditions=[{id:'poison',until:65}];f.h.inventory.herbs=0;f.h.inventory.potions=0;f.h.x=f.enemy.x-29;
 const oldCollection=f.h.intentions.suspended.action;step(f.s);assert.equal(f.h.poisonCare.active.method,'camp');assert.equal(f.h.intentions.current,null);assert.equal(f.h.intentions.last.status,'withdrawn');
 for(let i=0;i<80&&f.h.poisonCare.active;i++)step(f.s);
 assert.equal(f.h.alive,true);assert.equal(f.h.poisonCare.suspended,null);assert.equal(f.h.goal,oldCollection);assert.equal(f.h.goal.kind,'forage');assert.equal(f.h.intentions.suspended,null);assert.equal(f.h.goal.intention,undefined);assert.ok(f.s.journal.some(e=>e.text.includes('срочное вмешательство уже')));
});
