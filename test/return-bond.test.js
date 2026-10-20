import test from 'node:test';import assert from 'node:assert/strict';
import {bondFixture,finishBond,nativeBondAct,bondContext} from '../scripts/return-bond-scenarios.mjs';
import {exactReturn} from '../scripts/return-ritual-scenarios.mjs';
import {activeReturnBond,returnBondAdmission} from '../modules/return-bond-state.js';
import {returnBondChoice,returnBondAction,settleReturnBonds,returnBondHeroAttention} from '../modules/return-bond.js';
import {step,serialize,restore} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {methodRevision} from '../modules/goal-readiness.js';
import {commonContext} from '../scripts/common-life-scenarios.mjs';
import {setModule} from '../rules.js';
import {personNeeds} from '../modules/needs.js';
import {availableOffers} from '../modules/quests.js';
import {recruitPerson} from '../modules/social.js';
import {returnHTML} from '../return-sheet.js';
// PARTIAL: six groups, <=2 small configurations/group, <=12 component actions
// or <=16 actual world ticks. Deadline and remote arrival are prepared boundaries.
const coins=f=>f.caster.agenda.wealth+(f.bond.cargo?.remaining||0)+(f.seal?.coins||0);
test('1 the same retained memory leads to free or bound plans by the actual caster motive, without a second quest or personal wealth copy',()=>{
 const free=bondFixture({bound:false}),bound=bondFixture();assert.deepEqual(free.h.memory,bound.h.memory);assert.deepEqual(free.h.quests,bound.h.quests);assert.equal(returnBondChoice(free.s,free.dead),null);assert.equal(returnBondChoice(bound.s,bound.dead).kind,'returnBondPay');assert.equal(free.bond.seal,null);assert.equal(bound.h.gold,0);assert.equal(bound.caster.agenda.wealth,1);assert.equal(coins(bound),2);assert.equal(bound.bond.cargo.remaining,1);assert.equal(bound.seal.source,bound.b.id);assert.equal(bound.seal.relic.object,bound.relic.id);for(const f of [free,bound]){setModule(f.s,'quests',true);const town=Object.values(f.s.areas).find(a=>a.civic),giver=town.population.map(id=>f.s.people[id]).find(p=>p.alive);giver.status='resident';assert.equal(availableOffers(f.s,town).length>0,f===free);exactReturn(f);}
});
test('2 real local movement and one escrow delivery release the body before its actual deadline, without coins or a quest reward',()=>{
 const f=bondFixture(),{s,h,bond:b}=f,probe={kind:'explore',area:h.area,x:10},revision=methodRevision(s,probe),memory=structuredClone(h.memory),lives=structuredClone(s.lives);assert.equal(returnBondAdmission(s,probe).status,'blocked');assert.equal(returnBondAdmission(s,{kind:'returnCareRequest'}),null);finishBond(f);assert.equal(b.release.reason,'fulfilled');assert.equal(b.cargo.remaining,0);assert.equal(b.cargo.delivered,1);assert.equal(f.seal.coins,1);assert.equal(coins(f),2);assert.ok(b.delivered.at<b.until);assert.equal(h.gold,0);assert.equal(h.quests.length,0);assert.equal(returnBondAdmission(s,probe),null);assert.notEqual(methodRevision(s,probe),revision);assert.deepEqual(s.lives,lives);assert.deepEqual(h.memory.places,memory.places);assert.equal(returnBondAction(s,f.dead,{kind:'returnBondPay'}),false);exactReturn(f);
});
test('3 an independent body breaks the actual HP2 seal in two distinct actions, retaining the one unused reserved coin and all old possessions',()=>{
 const f=bondFixture({independent:true}),{s,h}=f,bag=h.bag.map(i=>i.id),gold=h.gold;assert.equal(returnBondChoice(s,f.dead).kind,'returnBondBreak');finishBond(f);assert.equal(f.seal.hp,0);assert.equal(f.seal.state,'broken');assert.equal(f.seal.hits.length,2);assert.ok(f.seal.hits[0].at<f.seal.hits[1].at);assert.equal(f.bond.release.reason,'seal-broken');assert.equal(f.bond.cargo.remaining,1);assert.equal(f.seal.coins,0);assert.equal(coins(f),2);assert.equal(h.gold,gold);assert.deepEqual(h.bag.map(i=>i.id),bag);assert.equal(returnBondAction(s,f.dead,{kind:'returnBondBreak'}),false);exactReturn(f);
});
test('4 the last accepted instant and actual expiry differ; an expired delivery cannot spend cargo or pretend to free the same body',()=>{
 for(const late of [false,true]){const f=bondFixture(),{s,h,bond:b,seal}=f;h.x=seal.x;syncActiveActor(s);s.tick=b.until-(late?0:1);settleReturnBonds(s);const ok=returnBondAction(s,f.dead,{kind:'returnBondPay'});assert.equal(ok,!late);if(late){assert.equal(b.state,'expired');assert.equal(b.cargo.remaining,1);assert.equal(seal.coins,0);assert.equal(activeReturnBond(f.dead),true);assert.equal(returnBondChoice(s,f.dead).kind,'returnBondBreak');}else assert.equal(b.release.reason,'fulfilled');assert.equal(coins(f),2);exactReturn(f);}
});
test('5 an unknown current caster address does not teleport anyone; an actual remote starvation death removes the link by its real event',()=>{
 const f=bondFixture(),{s,caster:d,bond:b}=f,known=structuredClone(b.knownCaster),remote=Object.values(s.areas).find(a=>a.id!==f.a.id&&a.civic);d.area=remote.id;d.x=42;const goal=returnBondChoice(s,f.dead);assert.equal(goal.area,f.a.id);assert.equal(goal.object,f.seal.id);assert.deepEqual(b.knownCaster,known);s.tick=40;d.health=1;d.needs.hunger=100;d.biology={tick:32,deficit:11,loss:0};setModule(s,'npc-needs',true);assert.equal(personNeeds(s,d,bondContext,{onlyUpkeep:true,migration:false,localFood:false}),true);setModule(s,'npc-needs',false);assert.equal(d.alive,false);step(s);assert.equal(b.state,'released');assert.equal(b.release.reason,'caster-dead');assert.deepEqual(b.knownCaster,known);assert.equal(f.h.gold,0);assert.equal(b.cargo.remaining,1);assert.equal(coins(f),2);exactReturn(f);
});
test('6 the native body owns the same short task until release while another observer stays; current restore and receipts reject forged cargo and remain pure',()=>{
 const f=bondFixture({native:true}),{s,h,observer}=f;assert.equal(recruitPerson(s,h.lineage,commonContext,true),false);const start=f.dead.x;nativeBondAct(f);assert.notEqual(f.dead.x,start);const raw=exactReturn(f),copy=restore(raw);f.s=copy;f.dead=copy.people[h.lineage];f.bond=f.dead.returnEpisode.bond;f.seal=copy.areas[f.bond.seal.area].objects.find(o=>o.id===f.bond.seal.object);for(let i=0;i<3&&activeReturnBond(f.dead);i++)nativeBondAct(f);assert.equal(f.bond.state,'released');assert.equal(f.bond.release.reason,'fulfilled');assert.equal(copy.hero.lineage,observer.lineage);assert.equal(copy.observation.person,observer.lineage);assert.equal(copy.actorStates[h.lineage].quests.length,0);const saved=exactReturn(f),bad=JSON.parse(saved);bad.people[h.lineage].returnEpisode.bond.cargo.remaining=1;assert.throws(()=>restore(JSON.stringify(bad)),/return-bond/);assert.match(returnHTML({...copy,hero:copy.actorStates[h.lineage]},String),/монета доставлена/);assert.equal(serialize(copy),saved);
});

