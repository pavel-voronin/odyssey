import test from 'node:test';import assert from 'node:assert/strict';
import {pastFixture,returnPastFixture,meetOldGiver,pastContext} from '../scripts/return-past-scenarios.mjs';
import {ritualAct,exactReturn} from '../scripts/return-ritual-scenarios.mjs';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {returnPastMeet,returnPastNPCQuest} from '../modules/return-past.js';
import {actualService,rememberService,knownServiceAllows} from '../modules/service-access.js';
import {finishQuest,questAction,acceptOfferedQuest} from '../modules/quests.js';
import {recoverHeirloom} from '../modules/inventory.js';
import {createPerson} from '../modules/lineage.js';
import {setModule} from '../rules.js';
import {syncActiveActor,syncNPCActors} from '../actor-projection.js';
import {peopleTick} from '../modules/people.js';
import {returnSource} from '../modules/return-state.js';
import {returnHTML} from '../return-sheet.js';
import {personNeeds} from '../modules/needs.js';
// PARTIAL: six groups, <=2 small profiles/group; <=12 component actions or
// <=16 actual world ticks after the bounded real old-contract/death sources.
test('1 an actual old relative recognises the same person and gives two of his own coins once',()=>{
 const f=returnPastFixture({quest:false}),{s,h,caster,dead:p}=f;assert.equal(h.gold,0);assert.equal(caster.agenda.wealth,4);const parents=[...p.parents],lives=structuredClone(s.lives);step(s);const n=p.returnEpisode.past.contacts.find(n=>n.person===caster.id);assert.equal(n.stance,'welcomes');assert.equal(n.proof.kind,'kin');assert.equal(n.gift.amount,2);assert.equal(h.gold,2);assert.equal(caster.agenda.wealth,2);s.tick++;assert.equal(returnPastMeet(s,p,caster,pastContext),false);assert.equal(h.gold,2);assert.equal(caster.agenda.wealth,2);assert.deepEqual(p.parents,parents);assert.deepEqual(s.lives,lives);assert.equal(returnSource(s,f.b),false);exactReturn(f);
});
test('2 the same genuinely unpaid failed road report is renewed by a living local giver and paid once after an actual new report',()=>{
 const f=returnPastFixture(),{s,h,quest:q}=f,archive=structuredClone(s.lives),id=q.id;f.giver.status='resident';h.area=q.source;h.x=f.giver.x;syncActiveActor(s);assert.equal(acceptOfferedQuest(s,q.offer,pastContext),null);assert.equal(h.quests.length,1);meetOldGiver(f);assert.equal(q.id,id);assert.equal(q.status,'active');assert.equal(q.returnReview.decision,'renewed');assert.equal(q.returnReview.paidBefore,false);assert.deepEqual(s.lives,archive);assert.equal(h.gold,0);h.area=q.target;h.x=84;h.goal={kind:'questAction',area:q.target,x:84,quest:q.id,remaining:1,started:s.tick};syncActiveActor(s);step(s);assert.equal(q.visited,true);h.area=q.source;h.x=f.giver.x;h.goal={kind:'turnin',area:q.source,x:h.x,quest:q.id,started:s.tick};syncActiveActor(s);step(s);assert.equal(q.status,'done');assert.equal(h.gold,q.reward);assert.equal(q.returnReview.rewarded.amount,q.reward);assert.equal(s.areas[q.source].civic.completedOffers.filter(id=>id===q.offer).length,1);const gold=h.gold;finishQuest(s,q,pastContext);assert.equal(h.gold,gold);assert.equal(h.quests.filter(o=>o.id===id).length,1);exactReturn(f);
});
test('3 real old payment and gratitude remain, but an afraid service keeper refuses this returned patient only',()=>{
 const f=returnPastFixture({prepaid:true,fear:true}),{s,h,quest:q,doctor:d,dead:p}=f;setModule(s,'service-access',true);meetOldGiver(f);const n=p.returnEpisode.past.contacts.find(n=>n.person===d.id);assert.equal(n.stance,'afraid');assert.equal(n.gratitude,true);assert.ok(h.relations[d.id].helped>0);assert.equal(q.status,'done');assert.equal(q.returnReview,undefined);assert.equal(h.gold,0);assert.equal(actualService(s,f.town,'clinic').available,false);assert.equal(rememberService(s,f.town,'clinic').available,false);assert.equal(knownServiceAllows(s,f.town,'clinic'),false);const other=createPerson(s,{race:'human',area:f.town.id,x:d.x},{initialJob:'guard'});assert.equal(actualService(s,f.town,'clinic',{person:other}).available,true);finishQuest(s,q,pastContext);assert.equal(h.gold,0);const raw=exactReturn(f);assert.match(returnHTML(s,String),/узнал, но боится/);assert.equal(serialize(s),raw);
});
test('4 death or a changed personal desire prevents renewal without inventing a new recipient or reward',()=>{
 for(const mode of ['dead','declined']){const f=returnPastFixture({desire:mode!=='declined'}),{s,h,quest:q,giver,dead:p}=f;if(mode==='dead'){giver.health=1;giver.needs.hunger=100;giver.biology={tick:s.tick-8,deficit:11,loss:0};setModule(s,'npc-needs',true);assert.equal(personNeeds(s,giver,pastContext,{onlyUpkeep:true,migration:false,localFood:false}),true);setModule(s,'npc-needs',false);assert.equal(giver.alive,false);s.tick++;assert.equal(returnPastMeet(s,p,giver,pastContext),false);assert.equal(q.returnReview,undefined);}else{meetOldGiver(f);assert.equal(q.returnReview.decision,'declined');}assert.equal(q.status,'failed');assert.equal(h.gold,0);assert.equal(h.quests.length,1);exactReturn(f);}
});
test('5 actual heir pickup survives the return; the old person resumes its reviewed report through one native controller while the other observer stays selected',()=>{
 for(const expire of [false,true]){const f=pastFixture(),{s,h,giver,quest:q}=f;createNextStory(s);const heir=s.hero,cache=f.a.objects.find(o=>o.kind==='heirloom');heir.area=f.a.id;heir.x=cache.x;recoverHeirloom(s,cache,pastContext);syncActiveActor(s);const items=[...heir.bag,...Object.values(heir.equipment).filter(Boolean)].map(i=>i.id),gold=heir.gold;assert.ok(items.length);for(let i=0;i<4;i++)ritualAct(f);const p=s.people[h.lineage];assert.equal(h.actorMode,'npc');p.area=giver.area;p.x=giver.x;giver.status='resident';giver.agenda.due=1e9;giver.agenda.task=null;syncNPCActors(s);s.tick++;assert.equal(returnPastMeet(s,p,giver,pastContext),true);assert.equal(q.status,'active');s.tick=Math.floor(s.tick/8+1)*8;const x=p.x;peopleTick(s,pastContext);assert.notEqual(p.x,x);syncNPCActors(s);if(expire){s.tick=p.returnEpisode.at+719;step(s);assert.equal(p.alive,false);assert.equal(q.status,'failed');assert.equal(q.returnReview.finished,undefined);assert.equal(s.hero,heir);assert.equal(heir.gold,gold);exactReturn(f);continue;}
 p.area=q.target;p.x=84;syncNPCActors(s);s.tick+=8;peopleTick(s,pastContext);assert.equal(q.visited,true);p.area=q.source;p.x=giver.x;syncNPCActors(s);s.tick+=8;peopleTick(s,pastContext);assert.equal(q.status,'done');assert.equal(p.agenda.wealth,q.reward);assert.equal(s.hero,heir);assert.equal(s.observation.person,heir.lineage);assert.equal(heir.gold,gold);assert.deepEqual([...heir.bag,...Object.values(heir.equipment).filter(Boolean)].map(i=>i.id),items);assert.equal(h.bag.length,0);exactReturn(f);}
});
test('6 changed local circumstances and current save reject fabricated gifts or paid promise renewal',()=>{
 const f=returnPastFixture(),{s,h,giver,quest:q}=f;s.areas[q.source].civic.eventSerial++;meetOldGiver(f);assert.equal(q.status,'failed');assert.equal(q.returnReview.decision,'changed');assert.equal(h.gold,0);const paid=returnPastFixture({quest:false});step(paid.s);const raw=exactReturn(paid),bad=JSON.parse(raw),record=bad.people[paid.h.lineage].returnEpisode.past.contacts[0];record.gift.amount=3;assert.throws(()=>restore(JSON.stringify(bad)),/return-gift/);const promise=JSON.parse(exactReturn(f));promise.hero.quests[0].returnReview.decision='renewed';promise.hero.quests[0].returnReview.paidBefore=true;assert.throws(()=>restore(JSON.stringify(promise)),/return-promise/);
});


