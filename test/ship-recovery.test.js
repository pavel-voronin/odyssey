import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';import {setModule} from '../rules.js';
import {recoveryFixture,learnRecovery,recoveryContext as ctx} from '../scripts/ship-recovery-scenarios.mjs';
import {shipRecoveryChoices,startShipRecovery,shipRecoveryAction} from '../modules/ship-recovery.js';
import {shipRecoveryText} from '../modules/ship-recovery-state.js';
import {repertoireChoices,repertoirePlan,repertoireInterrupt} from '../modules/repertoire.js';
import * as expeditions from '../modules/expeditions.js';
function begin(f){const choice=shipRecoveryChoices(f.s,ctx)[0];assert.ok(choice);assert.equal(startShipRecovery(f.s,choice,ctx),true);f.h.x=82;}
test('actual failed launch leaves a witnessed intact heart and costs; no new skill means no compulsory continuation',()=>{
 const {s,h,c}=recoveryFixture();assert.equal(c.shipRecovery.failure.hpBefore,100);assert.equal(c.shipRecovery.failure.hpAfter,85);assert.equal(c.shipRecovery.failure.fuel,1);assert.equal(c.status,'failed');assert.equal(h.stories.active,null);const raw=serialize(s);assert.deepEqual(shipRecoveryChoices(s,ctx),[]);assert.ok(shipRecoveryText(c).includes('не обязательство'));assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);
});
test('three actual restorations and study enable an optional personal return; a quiet hero chooses otherwise',()=>{
 const f=learnRecovery(recoveryFixture()),{s,h}=f,raw=serialize(s);assert.equal(repertoireChoices(s,ctx)[0].line,'returnship');assert.equal(serialize(s),raw);assert.equal(repertoirePlan(s,ctx),true);assert.equal(h.goal.kind,'shipRecover');assert.equal(h.goal.repertoire.id,f.c.id);assert.equal(h.profession,'soldier');h.goal=null;h.personality.curiosity=.2;assert.deepEqual(shipRecoveryChoices(s,ctx),[]);
});
test('one paid part, three distinct actions and one new fuel open one destination without refund or repeated original prize',()=>{
 const f=learnRecovery(recoveryFixture()),{s,h,c}=f;begin(f);const hp=h.hp,gold=h.gold,bag=h.bag.length,completed=[...h.stories.completed],ended=c.ended,summary=c.summary,tools=s.people[h.lineage].marketCargo.tools,energy=h.energy,areas=Object.keys(s.areas).length;
 s.tick++;shipRecoveryAction(s,ctx);const raw=serialize(s);assert.equal(shipRecoveryAction(s,ctx),false);assert.equal(serialize(s),raw);assert.equal(s.people[h.lineage].marketCargo.tools,tools-1);
 for(let i=0;i<2;i++){s.tick++;shipRecoveryAction(s,ctx);}assert.equal(c.shipRecovery.status,'done');assert.equal(h.hp,hp);assert.equal(h.gold,gold);assert.equal(h.bag.length,bag);assert.equal(h.energy,energy-6);assert.equal(h.inventory.relics,0);assert.equal(Object.keys(s.areas).length,areas+1);assert.deepEqual(h.stories.completed,completed);assert.equal(c.status,'failed');assert.equal(c.ended,ended);assert.equal(c.summary,summary);assert.equal(c.launchResult.action,c.id+'/recovery/1');assert.equal(c.shipRecovery.attempt.steps.length,3);
 const done=serialize(s);expeditions.act(s,c,ctx);assert.equal(serialize(s),done);assert.equal(serialize(restore(done)),done);assert.deepEqual(shipRecoveryChoices(s,ctx),[]);
});
test('missing finite material or fuel rejects without spending; dismantled local heart is discovered only on arrival',()=>{
 const dismantled=recoveryFixture({dismantle:true});assert.equal(dismantled.c.shipRecovery,undefined);assert.equal(dismantled.a.objects.find(o=>o.id===dismantled.c.console).dismantled,true);const done=serialize(dismantled.s);expeditions.act(dismantled.s,dismantled.c,ctx);assert.equal(serialize(dismantled.s),done);assert.deepEqual(shipRecoveryChoices(dismantled.s,ctx),[]);
 const f=learnRecovery(recoveryFixture()),{s,h,c}=f,p=s.people[h.lineage];const tools=p.marketCargo.tools;p.marketCargo.tools=0;assert.deepEqual(shipRecoveryChoices(s,ctx),[]);p.marketCargo.tools=tools;h.inventory.relics=0;assert.deepEqual(shipRecoveryChoices(s,ctx),[]);h.inventory.relics=1;
 s.areas[h.area].objects.find(o=>o.id===c.console).dismantled=true;assert.equal(shipRecoveryChoices(s,ctx).length,1,'no remote condition oracle');begin(f);const raw=p.marketCargo.tools;s.tick++;assert.equal(shipRecoveryAction(s,ctx),false);assert.equal(p.marketCargo.tools,raw);assert.equal(h.inventory.relics,1);assert.equal(c.shipRecovery.status,'missing');
});
test('urgent promise interrupts the actual partial repair and the same installed part resumes without a second cost',()=>{
 const f=learnRecovery(recoveryFixture()),{s,h,c}=f;assert.equal(repertoirePlan(s,ctx),true);h.x=82;s.tick++;shipRecoveryAction(s,ctx);const a=c.shipRecovery.attempt;
 const q={id:'urgent',kind:'scout',status:'active',source:h.area,target:h.area,giver:f.patients[0].id,accepted:s.tick,deadline:s.tick+5,reward:1};h.quests.push(q);assert.deepEqual(repertoireChoices(s,ctx,q),[]);assert.equal(repertoireInterrupt(s,{...ctx,planQuest(world,q){world.hero.goal={kind:'quest',quest:q.id,area:q.target,x:50};}},q),true);assert.equal(h.goal.quest,q.id);assert.equal(c.shipRecovery.attempt,a);assert.equal(a.remaining,2);
 q.status='abandoned';h.goal=null;begin(f);for(let i=0;i<2;i++){s.tick++;shipRecoveryAction(s,ctx);}assert.equal(c.shipRecovery.status,'done');assert.equal(s.people[h.lineage].marketCargo.tools,0);
});
test('three isolated real engine actions replay the installed part across saves',()=>{
 const f=learnRecovery(recoveryFixture()),{s,h,c}=f;begin(f);let copy=restore(serialize(s));for(let n=0;n<3;n++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));copy=restore(serialize(copy));}assert.equal(c.shipRecovery.status,'done');assert.equal(h.inventory.relics,0);
});
test('OFF and absent current record stay inert; restore and display cannot synthesize repair knowledge',()=>{
 const f=learnRecovery(recoveryFixture()),{s,c}=f;begin(f);setModule(s,'ship-recovery',false);s.tick++;shipRecoveryAction(s,ctx);const raw=serialize(s);assert.deepEqual(shipRecoveryChoices(s,ctx),[]);assert.equal(serialize(restore(raw)),raw);setModule(s,'ship-recovery',true);delete c.shipRecovery;const absent=serialize(s);assert.equal(serialize(restore(absent)),absent);assert.deepEqual(shipRecoveryChoices(s,ctx),[]);assert.equal(shipRecoveryText(c),'');
});
test('malformed action identity, material or progress cannot be restored as a second reward',()=>{
 const f=learnRecovery(recoveryFixture()),{s,c}=f;begin(f);s.tick++;shipRecoveryAction(s,ctx);const raw=serialize(s),copy=restore(raw);copy.storyCases.find(x=>x.id===c.id).shipRecovery.attempt.material.after=99;assert.throws(()=>restore(serialize(copy)),/shipRecovery/);c.shipRecovery.attempt.id='another';assert.throws(()=>restore(serialize(s)),/shipRecovery/);
});
