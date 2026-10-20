import test from 'node:test';import assert from 'node:assert/strict';
import {returnFixture,returnedFixture,ritualAct,exactReturn,returnContext} from '../scripts/return-ritual-scenarios.mjs';
import {serialize,restore,step,observeExistingPerson,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {returnNPCTurn} from '../modules/return-ritual.js';
import {returnedBodyTick} from '../modules/return-person.js';
import {returnSource} from '../modules/return-state.js';
import {ordinaryRecovery,biologicalDose} from '../modules/biology.js';
import {returnHTML} from '../return-sheet.js';
import {recoverHeirloom} from '../modules/inventory.js';
import {actorView} from '../actor-view.js';
import {syncNPCActors,syncActiveActor,selfDrivenActor} from '../actor-projection.js';
import {bodyRemains} from '../modules/remains.js';
import {remainsView} from '../actor-facts.js';
// PARTIAL: six groups, two fixed small configurations (seed9/seed0); <=12
// component actions or <=16 world ticks per branch, no long life or seed sweep.
test('1 rare actual healer collects one real relic and resumes the same observed dead person without undoing the archive',()=>{
 const f=returnFixture(),{s,h,b,caster,relic}=f,oldLife=structuredClone(s.lives),oldDeath=structuredClone(b.death),oldTick=s.tick,oldBorn=h.born,oldRelations=structuredClone(h.relations),oldParents=[...f.dead.parents];
 assert.ok(caster.returnRite);for(let i=0;i<3;i++)ritualAct(f);assert.equal(h.alive,false);assert.equal(relic.taken,true);assert.equal(caster.returnRite.task.prepared,2);s.tick=31;step(s);
 assert.equal(h.alive,true);assert.equal(s.hero,h);assert.equal(s.observation.person,h.lineage);assert.equal(h.lineage,b.source.id);assert.equal(s.tick,oldTick+31);assert.equal(h.born,oldBorn);assert.deepEqual(h.relations,oldRelations);assert.deepEqual(f.dead.parents,oldParents);assert.deepEqual(s.lives,oldLife);assert.deepEqual(b.death,oldDeath);assert.equal(b.stage,'returned');assert.equal(f.dead.returnEpisode.price.object,relic.id);assert.equal(caster.returnRite.relic,null);assert.equal(returnSource(s,b),false);assert.equal(h.gold,0);assert.equal(h.bag.length,0);assert.equal(h.inventory.relics,0);assert.equal(selfDrivenActor(s,h),true);assert.equal(returnNPCTurn(s,caster,returnContext),false);const oldGrave=f.a.objects.find(o=>o.kind==='grave'&&o.remainsId===b.id);assert.equal(remainsView(s,oldGrave),null);exactReturn(f);
});
test('2 untrained actual constructor and absent actual relic cannot perform the rite; local kin reason is required',()=>{
 for(const mode of ['untrained','no-resource']){const f=returnFixture({seed:mode==='untrained'?0:9}),{s,caster,relic}=f;if(mode==='untrained')assert.equal(caster.returnRite,undefined);else {relic.taken=true;f.dead.parents=[];caster.parents=[];assert.equal(returnNPCTurn(s,caster,returnContext),false);caster.parents=[f.h.lineage];}for(let i=0;i<4;i++)ritualAct(f);assert.equal(f.h.alive,false);assert.equal(caster.returnRite?.used??null,null);assert.equal(f.b.stage,'fresh');exactReturn(f);}
});
test('3 a tired specialist declines and an interrupted preparation cannot use decayed tissue; the unspent relic remains owned',()=>{
 for(const mode of ['tired','late']){const f=returnFixture();ritualAct(f);ritualAct(f);const stock=structuredClone(f.caster.returnRite.relic);if(mode==='tired')f.caster.needs.energy=20;else {f.s.tick=320;step(f.s);}ritualAct(f);assert.equal(f.h.alive,false);assert.equal(f.caster.returnRite.task,null);assert.ok(f.caster.returnRite.refusal);assert.deepEqual(f.caster.returnRite.relic,stock);assert.equal(f.caster.returnRite.used,null);exactReturn(f);}
});
test('4 another observer stays selected; real estate pickup stays with its actual holder while the returned body has one native controller',()=>{
 const f=returnFixture(),{s,h,caster,b}=f;createNextStory(s);const selected=s.hero,oldGold=selected.gold,cache=f.a.objects.find(o=>o.kind==='heirloom');assert.ok(cache);selected.area=f.a.id;selected.x=cache.x;recoverHeirloom(actorView(s,selected),cache,returnContext);syncActiveActor(s);const owned=[...selected.bag,...Object.values(selected.equipment).filter(Boolean)].map(i=>i.id),wealth=selected.gold;assert.ok(owned.length);assert.ok(wealth>oldGold);caster.x=b.position.x;
 for(let i=0;i<4;i++)ritualAct(f);assert.equal(s.hero,selected);assert.equal(s.observation.person,selected.lineage);assert.equal(h.alive,true);assert.equal(h.actorMode,'npc');assert.equal(selfDrivenActor(s,h),false);assert.equal(h.gold,0);assert.equal(h.bag.length,0);assert.deepEqual([...selected.bag,...Object.values(selected.equipment).filter(Boolean)].map(i=>i.id),owned);assert.equal(selected.gold,wealth);const before=h.hp;step(s);assert.ok(h.hp<=before);assert.equal(observeExistingPerson(s,h.lineage),true);assert.equal(s.hero,h);assert.equal(h.actorMode,'npc');exactReturn(f);
});
test('5 cohesion has a finite daily boundary and a real second death; ordinary nutrition and disabling new rituals never undo it',()=>{
 const f=returnedFixture(),{s,h,dead:p,b}=f;setModule(s,'return-ritual',false);const at=p.returnEpisode.at;s.tick=at+239;returnedBodyTick(s,returnContext);assert.equal(p.returnEpisode.cohesion,3);s.tick++;returnedBodyTick(s,returnContext);returnedBodyTick(s,returnContext);assert.equal(p.returnEpisode.cohesion,2);assert.equal(ordinaryRecovery(s,h,10),0);h.hunger=99;const dose=biologicalDose(s,h);assert.equal(dose.damage,0);assert.equal(h.hunger,0);s.tick=at+719;step(s);syncNPCActors(s);assert.equal(h.alive,false);assert.equal(p.returnEpisode.cohesion,0);assert.equal(s.lives.length,2);assert.equal(b.stage,'returned');assert.notEqual(bodyRemains(s,h).id,b.id);assert.equal(returnSource(s,bodyRemains(s,h)),false);exactReturn(f);
});
test('6 current restore is exact and pure, a retained ritual resumes once, forged price/cohesion fails and the sheet reports the actual episode',()=>{
 const f=returnFixture();ritualAct(f);ritualAct(f);const raw=exactReturn(f),copy=restore(raw);f.s=copy;f.h=copy.hero;f.caster=copy.people[f.caster.id];f.b=copy.remains.byId[f.b.id];ritualAct(f);ritualAct(f);assert.equal(f.h.alive,true);const saved=exactReturn(f);assert.match(returnHTML(copy,String),/Связность: 3\/3/);assert.equal(serialize(copy),saved);for(const key of ['cohesion','price']){const bad=JSON.parse(saved),q=bad.people[f.h.lineage].returnEpisode;if(key==='cohesion')q.cohesion=4;else q.price.quantity=2;assert.throws(()=>restore(JSON.stringify(bad)),/return-/);}const before=copy.tick;step(copy);assert.equal(copy.tick,before+1);assert.equal(f.caster.returnRite.relic,null);exactReturn(f);
});


