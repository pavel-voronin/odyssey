import test from 'node:test';import assert from 'node:assert/strict';
import {careFixture,careDoctorAct,maintainedFixture,nativeCareFixture,careContext} from '../scripts/return-care-scenarios.mjs';
import {exactReturn} from '../scripts/return-ritual-scenarios.mjs';
import {careChoice,careInventory,observeReturnCare} from '../modules/return-care-state.js';
import {returnCareAction,returnCareProviderTurn} from '../modules/return-care.js';
import {step,serialize,restore,observeExistingPerson,createEnemy} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {peopleTick} from '../modules/people.js';
import {bodyRemains} from '../modules/remains.js';
import {returnSource} from '../modules/return-state.js';
import {ordinaryRecovery,biologicalDose} from '../modules/biology.js';
import {returnHTML} from '../return-sheet.js';
// PARTIAL: six groups; <=2 selected profiles/group, <=12 component actions
// or <=16 actual world ticks. Arrivals/daily loss are explicit checkpoints.
test('1 real actor collection and request use one owned relic; three registered native actions restore two cohesion without resetting the day or HP',()=>{
 const f=careFixture({offset:6}),{s,h,dead:p,caster:d}=f,q=p.returnEpisode,c=q.care,day=q.lastDay,hp=h.hp,body=structuredClone(q.material),energy=d.needs.energy;for(let i=0;i<4&&!c.request;i++)step(s);assert.equal(h.x,d.x);assert.equal(c.request.progress,0);assert.equal(h.inventory.relics,1);for(let i=0;i<3;i++)careDoctorAct(f);assert.equal(q.cohesion,3);assert.equal(q.restored,2);assert.equal(q.spent,2);assert.equal(q.lastDay,day);assert.equal(h.inventory.relics,0);assert.equal(h.hp,hp);assert.deepEqual(q.material,body);assert.equal(d.needs.energy,energy-6);assert.equal(c.receipts.length,1);assert.equal(c.receipts[0].gain,2);assert.equal(c.receipts[0].relicBefore,1);assert.equal(c.receipts[0].relicAfter,0);peopleTick(s,careContext);assert.equal(c.receipts.length,1);assert.equal(returnCareProviderTurn(s,d,careContext),false);exactReturn(f);
});
test('2 one missing point gains only one; neither absent payment nor ordinary food/recovery creates cohesion',()=>{
 for(const paid of [true,false]){const f=careFixture({paid,days:1}),{s,h,dead:p}=f,q=p.returnEpisode;if(paid){assert.ok(q.care.request);for(let i=0;i<3;i++)careDoctorAct(f);assert.equal(q.cohesion,3);assert.equal(q.restored,1);assert.equal(q.care.receipts[0].gain,1);assert.equal(h.inventory.relics,0);}else{assert.equal(q.care.request,null);assert.equal(q.care.decision.kind,'last-work');h.hunger=100;biologicalDose(s,h);assert.equal(h.hunger,0);assert.equal(ordinaryRecovery(s,h,20),0);assert.equal(q.cohesion,2);assert.equal(q.restored,undefined);assert.equal(careChoice(s,p,careContext),null);}exactReturn(f);}
});
test('3 an absent specialist is not located remotely, and a visible actual threat rejects the otherwise known short path',()=>{
 for(const mode of ['absent','danger']){const f=careFixture(),{s,h,dead:p,caster:d}=f,q=p.returnEpisode;q.care.request=null;if(mode==='absent'){const remembered=q.care.doctors.find(n=>n.person===d.id).area;d.area=f.payment.area;const g=careChoice(s,p,careContext);assert.ok(g);s.tick++;assert.equal(returnCareAction(s,p,g,careContext),false);assert.equal(careChoice(s,p,careContext),null);assert.equal(q.care.doctors.find(n=>n.person===d.id).area,remembered);assert.notEqual(remembered,d.area);}else{d.x=h.x-8;createEnemy(s,f.a,{requestedSpecies:'wolf',x:h.x-4});observeReturnCare(s,p);assert.equal(careChoice(s,p,careContext),null);}assert.equal(q.care.decision.kind,'last-work');assert.equal(h.inventory.relics,1);assert.equal(q.cohesion,1);exactReturn(f);}
});
test('4 interruption after a real preparation phase keeps the unspent relic; OFF and leaving contact never record successful maintenance',()=>{
 for(const mode of ['off','leave']){const f=careFixture(),{s,h,dead:p}=f,q=p.returnEpisode;careDoctorAct(f);assert.equal(q.care.request.progress,1);if(mode==='off')setModule(s,'return-ritual',false);else{h.x-=12;syncActiveActor(s);}step(s);assert.equal(q.care.request,null);assert.equal(q.care.receipts.length,0);assert.equal(h.inventory.relics,1);assert.equal(q.cohesion,1);assert.equal(q.restored,undefined);exactReturn(f);}
});
test('5 an unobserved native collects one real relic, transfers the same inventory on explicit observation and completes its own consent/service',()=>{
 const f=nativeCareFixture(),{s,native:p}=f;const start=p.x;careDoctorAct(f);assert.ok(p.x>start);careDoctorAct(f);assert.equal(p.returnEpisode.care.inventory.relics,1);assert.equal(f.resource.o.taken,true);const people=Object.keys(s.people);assert.equal(observeExistingPerson(s,p.id),true);assert.equal(p.returnEpisode.care.inventory,undefined);assert.equal(s.hero.inventory.relics,1);assert.deepEqual(Object.keys(s.people),people);const raw=exactReturn(f),copy=restore(raw);f.s=copy;f.native=copy.people[p.id];for(let i=0;i<4;i++)careDoctorAct(f);assert.equal(f.native.returnEpisode.cohesion,3);assert.equal(f.native.returnEpisode.care.receipts.length,1);assert.equal(careInventory(copy,f.native).relics,0);assert.equal(copy.hero.actorMode,'npc');exactReturn(f);
});
test('6 current receipts validate and render purely; a maintained skeletal body can still end for real and the world continues without another return',()=>{
 const f=maintainedFixture({skeleton:true}),{s,h,dead:p}=f,q=p.returnEpisode,raw=exactReturn(f);assert.match(returnHTML(s,String),/Последний обряд: \+2/);assert.equal(serialize(s),raw);const bad=JSON.parse(raw);bad.people[p.id].returnEpisode.care.receipts[0].gain++;assert.throws(()=>restore(JSON.stringify(bad)),/return-care/);s.tick=q.lastDay+719;step(s);assert.equal(h.alive,false);assert.equal(q.cohesion,0);assert.equal(q.spent,5);assert.equal(s.lives.length,2);assert.equal(bodyRemains(s,h).substance.flesh.remaining,0);assert.equal(returnSource(s,bodyRemains(s,h)),false);const end=s.tick;step(s);assert.equal(s.tick,end+1);assert.equal(h.alive,false);assert.equal(s.hero,h);exactReturn(f);
});

