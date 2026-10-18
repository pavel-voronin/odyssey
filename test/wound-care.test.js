import {recordLocalWound} from '../modules/wound-events.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {woundCareFixture,woundIntervals,woundContext as ctx} from '../scripts/wound-care-scenarios.mjs';
import {setModule} from '../rules.js';import {step,serialize,restore,observeExistingPerson} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';import {recordAreaVisit} from '../actor-atlas.js';
import {woundCareTurn,dressWound,woundNPCTurn} from '../modules/wound-care.js';
import {holdWoundRest,goodDressing} from '../modules/wound-care-state.js';import {woundCombatChoice} from '../modules/wound-combat.js';
import {woundSummary} from '../modules/wound-state.js';import {woundsTick} from '../modules/wound-world.js';
import {npcAction} from '../modules/npc-control.js';import {recruitPerson} from '../modules/social.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
test('actual own medicine and one actor action stop blood without HP or full-function healing; repeating the same tick spends nothing',()=>{
 const f=woundCareFixture({medicine:1}),hp=f.h.hp;step(f.s);assert.equal(f.p.roadSupplies.medicine,0);assert.equal(f.h.lastAction,'heal');assert.equal(f.w.dressing.units,1);assert.equal(f.w.bleed,0);assert.equal(f.h.hp,hp);assert.equal(f.w.function,0);assert.equal(f.p.woundCare.treatments,1);const raw=serialize(f.s);assert.equal(woundCareTurn(f.s,ctx),true);assert.equal(serialize(f.s),raw);exact(f.s);
 const herb=woundCareFixture({herbs:1});assert.equal(woundCareTurn(herb.s,ctx),true);assert.equal(herb.h.inventory.herbs,0);assert.equal(herb.w.dressing.quality,12);exact(herb.s);
});
test('the same injury has different short recovery and plans with care; a light cut without material need not visit a clinic',()=>{
 const care=woundCareFixture({medicine:1}),bare=woundCareFixture();woundCareTurn(care.s,ctx);care.s.tick++;woundCareTurn(care.s,ctx);woundCareTurn(bare.s,ctx);assert.equal(holdWoundRest(care.s),true);assert.equal(care.h.goal.kind,'rest');assert.equal(bare.h.goal.kind,'rest');woundIntervals(care,24,{rest:true});woundIntervals(bare,24,{rest:true});assert.equal(care.w.closure,100);assert.ok(care.w.function>bare.w.function);assert.ok(care.h.hp>bare.h.hp);exact(care.s);exact(bare.s);
 const light=woundCareFixture({damage:10}),goal=structuredClone(light.h.goal);assert.equal(woundCareTurn(light.s,ctx),false);assert.deepEqual(light.h.goal,goal);assert.equal(light.p.woundCare,undefined);
});
test('a known dangerous encounter uses the existing retreat choice; personality or a safe certain finisher can justify continuing',()=>{
 const fleeing=woundCareFixture();fleeing.enemy.alive=true;fleeing.h.combat=fleeing.enemy.id;step(fleeing.s);assert.equal(fleeing.h.lastAction,'flee');exact(fleeing.s);
 const f=woundCareFixture();f.enemy.alive=true;f.h.combat=f.enemy.id;assert.equal(woundCareTurn(f.s,ctx),false);assert.equal(woundCombatChoice(f.s,f.enemy,null).action,'flee');f.h.personality.courage=.9;assert.equal(woundCombatChoice(f.s,f.enemy,null),null);f.h.personality.courage=.3;f.enemy.hp=1;assert.equal(woundCombatChoice(f.s,f.enemy,null),null);exact(f.s);
});
test('a real recruited helper spends its own medicine and cannot attack in the same tick, even when general NPC-control is OFF',()=>{
 const f=woundCareFixture();setModule(f.s,'companions',true);setModule(f.s,'relationships',true);const q=Object.values(f.s.people).find(p=>p.alive&&p.id!==f.h.lineage&&p.area==='a1'&&p.agenda.job==='healer');assert.ok(q);q.agenda.sociability=.8;f.s.areas.a1.civic.medicine--;q.roadSupplies={food:0,medicine:1};f.h.area=q.area;f.h.x=q.x;syncActiveActor(f.s);assert.equal(recruitPerson(f.s,q.id,ctx,true),true);f.h.area=q.area;f.h.x=q.x;f.h.inventory.herbs=0;assert.equal(woundCareTurn(f.s,ctx),true);assert.equal(q.roadSupplies.medicine,0);assert.equal(f.w.dressing.by,q.id);assert.equal(f.w.dressing.method,'companion');assert.equal(npcAction(f.s,q,'party','combat'),false);exact(f.s);
});
test('a present clinician spends one civic material and its own action, receiving two real coins; absent stock causes bounded refusal',()=>{
 const f=woundCareFixture();f.h.area='a1';f.h.x=68;f.h.gold=10;syncActiveActor(f.s);recordAreaVisit(f.s,'a1');const healer=Object.values(f.s.people).find(p=>p.alive&&p.area==='a1'&&p.agenda.job==='healer');healer.x=68;for(const id of ['people','npc-control','service-access','supply'])setModule(f.s,id,true);const stock=f.s.areas.a1.civic.medicine,money=healer.agenda.wealth;assert.equal(woundCareTurn(f.s,ctx),true);assert.equal(f.w.dressing.method,'clinic');assert.equal(f.s.areas.a1.civic.medicine,stock-1);assert.equal(f.h.gold,8);assert.equal(healer.agenda.wealth,money+2);assert.equal(npcAction(f.s,healer,'personal'),false);exact(f.s);
 const no=woundCareFixture();no.h.area='a1';no.h.x=68;no.h.gold=10;recordAreaVisit(no.s,'a1');no.s.areas.a1.civic.medicine=0;setModule(no.s,'service-access',true);woundCareTurn(no.s,ctx);assert.equal(no.p.woundCare.failedClinic.area,'a1');assert.equal(no.h.goal.area,'a1');assert.equal(no.h.gold,10);assert.equal(no.w.dressing,undefined);assert.equal(no.p.woundCare.decision.method,'rest');exact(no.s);
});
test('load wears real dressing, closure does not restore function, and repeated load reopens that same under-recovered cut without another initial HP debit',()=>{
 const f=woundCareFixture({medicine:1});woundCareTurn(f.s,ctx);woundIntervals(f,15,{role:'leg'});assert.equal(goodDressing(f.w),false);assert.ok(f.w.dressing.remaining<=4);assert.match(woundSummary(f.p),/сменить/);exact(f.s);
 const open=woundCareFixture();woundIntervals(open,34,{rest:true});assert.equal(open.w.closure,100);assert.equal(open.w.function,0);const hp=open.h.hp;woundIntervals(open,12,{role:'leg'});assert.ok(open.w.reopened);assert.ok(open.w.closure<100);assert.equal(open.h.hp,hp);assert.equal(open.p.localWounds.active.length,1);exact(open.s);
});
test('a dressed checkpoint and eight actual steps replay exactly, world recovery is once per tick and OFF preserves optional current facts',()=>{
 const f=woundCareFixture({medicine:1});step(f.s);const copy=restore(serialize(f.s));for(let i=0;i<8;i++){step(f.s);step(copy);assert.equal(serialize(copy),serialize(f.s));}const raw=serialize(f.s);woundsTick(f.s);assert.equal(serialize(f.s),raw);setModule(f.s,'wound-care',false);const dressing=structuredClone(f.w.dressing);woundIntervals(f,8);assert.deepEqual(f.w.dressing,dressing);exact(f.s);const bad=JSON.parse(serialize(f.s));bad.people[f.p.id].localWounds.active[0].dressing.units=2;assert.throws(()=>restore(JSON.stringify(bad)),/wound/i);
});
test('ordinary unobserved residents use their existing personal phase and stock, with no second action or invented dressing on restore',()=>{
 const f=woundCareFixture(),p=Object.values(f.s.people).find(p=>p.alive&&p.id!==f.h.lineage&&p.role!=='ребёнок'&&p.agenda.job!=='student');p.area=f.h.area;p.x=f.h.x;p.health=65;p.race='human';p.anatomy={parts:['leftLeg']};f.s.areas.a1.civic.medicine--;p.roadSupplies={food:0,medicine:1};f.enemy.alive=true;const w=recordLocalWound(f.s,p,f.enemy,{before:100,after:65,maximum:100,area:p.area,controller:'npc-test'});assert.ok(w);f.enemy.alive=false;
 assert.equal(npcAction(f.s,p,'personal'),true);assert.equal(woundNPCTurn(f.s,p,ctx),true);assert.equal(p.roadSupplies.medicine,0);assert.equal(p.woundCare.treatments,1);const energy=p.needs.energy;assert.equal(woundNPCTurn(f.s,p,ctx),true);assert.equal(p.needs.energy,energy);assert.equal(npcAction(f.s,p,'personal','combat'),false);assert.equal(w.dressing.by,p.id);step(f.s);assert.equal(w.dressing.age,1);assert.ok(w.closure>0);const prior=structuredClone(p.localWounds);assert.equal(observeExistingPerson(f.s,p.id),true);assert.deepEqual(p.localWounds,prior);exact(f.s);
});
