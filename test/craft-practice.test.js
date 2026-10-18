import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {craftPractice,recordCraftRepair,craftStudyPlan,craftStudyAction} from '../modules/craft-practice.js';
import {repairProperty} from '../modules/property-damage.js';
import {workTick} from '../modules/work.js';
import {practiceFixture,threeRepairs,breakPracticeRoom,completePracticeRepair,practiceContext as ctx} from '../scripts/craft-practice-scenarios.mjs';
function learn(f){assert.ok(craftStudyPlan(f.s,ctx));for(let i=0;i<3;i++){f.s.tick++;craftStudyAction(f.s,ctx);}assert.equal(craftPractice(f.s).method.id,'fit-working-part');}

test('only distinct completed physical restorations count; a high rank or ordinary paid repair label grants no method',()=>{
 const f=practiceFixture();f.h.career.rank=9;assert.equal(craftStudyPlan(f.s,ctx),false);f.h.goal={kind:'work',area:f.a.id,x:42,job:'repair',remaining:5};for(let i=0;i<5;i++){f.s.tick++;workTick(f.s,ctx);}assert.equal(craftPractice(f.s),null);threeRepairs(f);assert.equal(craftPractice(f.s).total,3);assert.equal(new Set(craftPractice(f.s).operations.map(e=>e.id)).size,3);assert.equal(craftPractice(f.s).method,undefined);
});
test('cancelling partial work or reading its old history cannot give an operation or duplicate a completed one',()=>{
 const f=practiceFixture();breakPracticeRoom(f);f.s.tick++;repairProperty(f.s,ctx);f.h.goal=null;assert.equal(craftPractice(f.s),null);f.h.goal={kind:'propertyRepair',area:f.a.id,x:42,property:f.o.id};for(let i=0;i<3;i++){f.s.tick++;repairProperty(f.s,ctx);}assert.equal(craftPractice(f.s).total,1);const before=serialize(f.s),proof=f.o.history.at(-1);for(let i=0;i<20;i++)recordCraftRepair(f.s,f.a,f.o,proof);assert.equal(serialize(f.s),before);f.s.tick++;recordCraftRepair(f.s,f.a,f.o,proof);assert.equal(craftPractice(f.s).total,1);
});
test('three paid material restorations plus three real bench actions learn once without career, wage or material gifts',()=>{
 const f=threeRepairs(practiceFixture()),before={gold:f.h.gold,tools:f.a.civic.tools,rank:f.h.career.rank,xp:f.h.career.xp,treasury:f.a.civic.treasury},energy=f.h.energy;learn(f);assert.equal(f.h.energy,energy-6);assert.deepEqual({gold:f.h.gold,tools:f.a.civic.tools,rank:f.h.career.rank,xp:f.h.career.xp,treasury:f.a.civic.treasury},before);assert.equal(craftStudyPlan(f.s,ctx),false);assert.equal(craftPractice(f.s).method.source.length,3);
});
test('learned fitting repairs the actual paid part with one tool and the same bill but two labour actions instead of three',()=>{
 const f=threeRepairs(practiceFixture());learn(f);breakPracticeRoom(f);const gold=f.h.gold,stock=f.a.civic.tools;f.s.tick++;repairProperty(f.s,ctx);assert.equal(f.a.civic.tools,stock-1);assert.equal(f.h.gold,gold-18);assert.equal(f.o.repair.remaining,3);f.s.tick++;repairProperty(f.s,ctx);assert.equal(f.o.repair.part.state,'fitted');assert.equal(f.o.repair.remaining,1);const part=f.o.repair.part.id;f.s.tick++;repairProperty(f.s,ctx);assert.equal(f.o.state,'intact');assert.equal(f.h.goal,null);assert.equal(f.o.lastFittedPart.id,part);assert.equal(f.o.lastFittedPart.payer,f.h.lineage);assert.equal(f.h.gold,gold-18);assert.equal(f.a.civic.tools,stock-1);assert.equal(craftPractice(f.s).total,4);
});
test('no material means no fitting, repair or free completion even after mastering the method',()=>{
 const f=threeRepairs(practiceFixture());learn(f);breakPracticeRoom(f);f.a.civic.tools=0;const gold=f.h.gold;repairProperty(f.s,ctx);assert.equal(f.o.state,'burned');assert.equal(f.o.repair,null);assert.equal(f.o.lastFittedPart,undefined);assert.equal(f.h.gold,gold);assert.equal(craftPractice(f.s).total,3);
});
test('an interested rested craftsperson may study, an indifferent traveller or busy wounded person keeps other priorities',()=>{
 for(const reason of ['interested','indifferent','busy','hurt','hungry']){const f=threeRepairs(practiceFixture());if(reason==='indifferent'){f.h.career.path='adventure';f.h.personality.curiosity=.1;}if(reason==='busy')f.h.goal={kind:'work',area:f.a.id,x:42};if(reason==='hurt')f.h.hp=1;if(reason==='hungry'){setModule(f.s,'body',true);f.h.hunger=90;}assert.equal(craftStudyPlan(f.s,ctx),reason==='interested',reason);}
});
test('loss of the actual bench gives no free knowledge and partial study survives a later return and restore',()=>{
 const f=threeRepairs(practiceFixture());assert.ok(craftStudyPlan(f.s,ctx));f.s.tick++;craftStudyAction(f.s,ctx);assert.equal(craftPractice(f.s).study.remaining,2);const saved=serialize(f.s),loaded=restore(saved);assert.equal(serialize(loaded),saved);f.o.state='burned';f.s.tick++;craftStudyAction(f.s,ctx);assert.equal(craftPractice(f.s).method,undefined);assert.equal(craftPractice(f.s).study.remaining,2);assert.equal(f.h.goal,null);
 for(let i=0;i<2;i++){loaded.tick++;craftStudyAction(loaded,ctx);}assert.ok(craftPractice(loaded).method);assert.equal(craftPractice(f.s).method,undefined);
});
test('a borrowed bench uses the existing real rent, never the city salary, before any study progress',()=>{
 const f=threeRepairs(practiceFixture());f.o.owner=f.p.id;const gold=f.h.gold,wealth=f.p.agenda.wealth,treasury=f.a.civic.treasury;assert.ok(craftStudyPlan(f.s,ctx));f.s.tick++;craftStudyAction(f.s,ctx);assert.equal(craftPractice(f.s).study,undefined);assert.equal(f.h.gold,gold-2);assert.equal(f.p.agenda.wealth,wealth+2);assert.equal(f.a.civic.treasury,treasury);f.s.tick++;craftStudyAction(f.s,ctx);assert.equal(craftPractice(f.s).study.remaining,2);assert.equal(f.h.gold,gold-2);
});
test('module-off preserves records and already performed fitting but makes no new practice or method progress',()=>{
 const f=threeRepairs(practiceFixture());learn(f);const memory=JSON.stringify(craftPractice(f.s));setModule(f.s,'craft-practice',false);breakPracticeRoom(f);for(let i=0;i<4;i++){f.s.tick++;repairProperty(f.s,ctx);}assert.equal(f.o.state,'intact');assert.equal(f.o.lastFittedPart,undefined);assert.equal(JSON.stringify(craftPractice(f.s)),memory);assert.equal(craftStudyPlan(f.s,ctx),false);
});
test('the real engine learns from the saved operation ledger with exact replay and no profession replacement',()=>{
 const f=threeRepairs(practiceFixture()),profession=f.h.profession;f.h.destiny.completed=true;f.h.property.nextAttempt=100000;f.h.life.reflectAfter=100000;f.h.workAfter=100000;const copy=restore(serialize(f.s));for(let i=0;i<3;i++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));}assert.ok(craftPractice(f.s).method);assert.equal(f.h.profession,profession);assert.equal(craftPractice(f.s).total,3);
});
