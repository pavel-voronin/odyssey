import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {craftRespect,witnessRepair,witnessRepairWork} from '../modules/craft-respect.js';
import {JOBS} from '../content.js';
import {commissionRepair,quoteRepair,servicePlan,acceptService,workOrdersTick} from '../modules/resident-orders.js';
import {repairProperty} from '../modules/property-damage.js';
import {npcRepairFinish} from '../modules/workshop-state.js';
import {recruitPerson} from '../modules/social.js';
import {craftFixture,demonstrateCraft,damageCraftRoom,craftContext as ctx} from '../scripts/craft-respect-scenarios.mjs';
const score=f=>craftRespect(f.s,f.p.id,f.h.lineage);
function quoted(f){assert.ok(commissionRepair(f.s,f.p,f.o));const c=Object.values(f.s.workOrders).at(-1);quoteRepair(f.s,f.p,f.p.agenda.task,ctx);return c;}
function accepted(f){const c=quoted(f);assert.ok(servicePlan(f.s,ctx));assert.ok(acceptService(f.s,ctx));return c;}

test('actual completed repair work creates one directional professional observation without changing personal trust',()=>{
 const f=craftFixture(),{s,h,p}=f,trust=p.agenda.bonds[h.lineage];assert.equal(score(f),0);demonstrateCraft(f);assert.equal(score(f),6);assert.equal(p.agenda.bonds[h.lineage],trust);assert.equal(craftRespect(s,h.lineage,p.id),0);
 const before=serialize(s);for(let i=0;i<20;i++)witnessRepairWork(s,JOBS.find(j=>j.id==='repair'));assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
});
test('an unpleasant proven expert receives and completes the existing paid order without gaining a free companion',()=>{
 const f=craftFixture(),{s,h,p,o}=f;setModule(s,'companions',true);h.relations[p.id]={trust:-30,met:0,lastSeen:0,helped:0};p.agenda.bonds[h.lineage]=-30;demonstrateCraft(f);damageCraftRoom(f);const c=accepted(f),gold=h.gold;assert.equal(c.basis.trust,-30);assert.equal(c.basis.kind,'witnessed-craft');assert.ok(servicePlan(s,ctx));for(let i=0;i<4;i++){s.tick++;repairProperty(s,ctx);}assert.equal(c.status,'done');assert.equal(c.paid,6);assert.equal(h.gold,gold+6);assert.equal(o.owner,p.id);assert.equal(h.companions.length,0);assert.equal(recruitPerson(s,p.id,ctx),false);assert.ok(p.agenda.bonds[h.lineage]<0);assert.ok(score(f)>=6);
});
test('affection and a profession label alone cannot replace witnessed skill or the critical rank',()=>{
 for(const learned of [false,true]){const f=craftFixture();f.p.agenda.bonds[f.h.lineage]=90;f.h.relations[f.p.id]={trust:90};if(learned){demonstrateCraft(f);f.h.career.rank=1;}damageCraftRoom(f);const gold=f.p.agenda.wealth;assert.equal(commissionRepair(f.s,f.p,f.o),false);assert.equal(f.p.agenda.wealth,gold);assert.equal(Object.keys(f.s.workOrders).length,0);}
});
test('an absent, distant, sleeping or dead person never learns another person completed a repair',()=>{
 for(const reason of ['absent','distant','sleeping','dead']){const f=craftFixture();f.p=f.a.population.map(id=>f.s.people[id]).find(p=>p.id!==f.o.owner&&p.id!==f.h.lineage);f.p.x=42;if(reason==='absent')f.p.area='a1';if(reason==='distant')f.p.x=90;if(reason==='sleeping'){setModule(f.s,'npc-needs',true);f.p.needs.sleeping=true;}if(reason==='dead'){f.p.alive=false;f.p.health=0;}demonstrateCraft(f);assert.equal(score(f),0,reason);}
});
test('a real NPC repair teaches the present observer, not a distant resident or a fabricated proof',()=>{
 const f=craftFixture(),{s,h,a,o,p}=f;damageCraftRoom(f);npcRepairFinish(s,p,{property:o.id},ctx);assert.equal(o.state,'intact');assert.equal(craftRespect(s,h.lineage,p.id),6);const proof=o.history.at(-1),before=serialize(s);witnessRepair(s,a,o,proof);assert.equal(serialize(s),before);s.tick++;witnessRepair(s,a,o,{...proof,actor:h.lineage});assert.equal(craftRespect(s,p.id,h.lineage),0);
});
test('a missed accepted deadline reduces informed client trust once while keeping witnessed skill and refunding only escrow',()=>{
 const f=craftFixture(),{s,h,p}=f;demonstrateCraft(f);damageCraftRoom(f);const c=accepted(f),respect=score(f),gold=p.agenda.wealth+c.escrow;s.tick=c.deadline+1;workOrdersTick(s,ctx);assert.equal(c.status,'cancelled');assert.equal(p.agenda.bonds[h.lineage],-4);assert.equal(score(f),respect);assert.equal(p.agenda.wealth,gold);assert.equal(c.escrow,0);const before=serialize(s);workOrdersTick(s,ctx);assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
});
test('an unaccepted proposal, rule change, helper death or changed title does not blame the helper for a broken promise',()=>{
 for(const reason of ['unaccepted','disabled','dead','title']){const f=craftFixture();demonstrateCraft(f);damageCraftRoom(f);const c=reason==='unaccepted'?quoted(f):accepted(f),trust=f.p.agenda.bonds[f.h.lineage];if(reason==='disabled')setModule(f.s,'work-orders',false);if(reason==='dead')f.h.alive=false;if(reason==='title')f.o.owner=f.h.lineage;f.s.tick=c.deadline+1;workOrdersTick(f.s,ctx);assert.equal(f.p.agenda.bonds[f.h.lineage],trust,reason);assert.equal(score(f),6);}
});
test('known mastery survives failure and later work while new genuine work is a distinct event',()=>{
 const f=craftFixture();demonstrateCraft(f);const first=f.p.craftRelations[f.h.lineage].lastWork.id;demonstrateCraft(f);assert.equal(score(f),12);assert.notEqual(f.p.craftRelations[f.h.lineage].lastWork.id,first);assert.equal(f.p.agenda.bonds[f.h.lineage],0);
});
test('disabling professional relations or personal relationships preserves memory and restores the old hiring rule',()=>{
 for(const flag of ['craft-respect','relationships']){const f=craftFixture();demonstrateCraft(f);const memory=JSON.stringify(f.p.craftRelations);setModule(f.s,flag,false);demonstrateCraft(f);assert.equal(JSON.stringify(f.p.craftRelations),memory);damageCraftRoom(f);assert.ok(commissionRepair(f.s,f.p,f.o));assert.equal(Object.values(f.s.workOrders).at(-1).basis,undefined);}
});
test('an actual autonomous work action repeats through a saved partial job with the same witness and salary',()=>{
 const f=craftFixture(),{s,h,a}=f;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5};let copy=restore(serialize(s));for(let i=0;i<6;i++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));if(i===2)copy=restore(serialize(copy));}assert.equal(score(f),6);assert.equal(h.goal,null);assert.equal(h.counters.peacefulWork,1);
});
