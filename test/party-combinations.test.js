import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {pairCombatFixture} from '../scripts/party-combination-scenarios.mjs';
import {pairDrill} from '../modules/party-drill.js';
import {learnedPair} from '../modules/party-combination-policy.js';
import {planPartyCombat} from '../modules/party-combat-state.js';
import {partyCombatTurn} from '../modules/party-combat.js';
import {partyCombatBriefHTML} from '../party-combat-sheet.js';
import {partyDamageRange} from '../modules/combat-forecast.js';
import {npcAction,canStartNPCActivity} from '../modules/npc-control.js';
import {partyCare} from '../modules/party-needs.js';
import {pairCombatTick} from '../modules/party-combination-state.js';

test('three actual safe shared turns teach only this pair and spend both personal energy budgets',()=>{
 const {s,h,guard,striker,ctx}=pairCombatFixture({campOnly:true});
 const before=[guard.person.needs.energy,striker.person.needs.energy],money=[guard.person.agenda.wealth,striker.person.agenda.wealth],city=s.areas.a1.civic.medicine;
 for(let i=0;i<3;i++){
  s.tick++;assert.equal(pairDrill(s,ctx),true);assert.equal(learnedPair(s,guard.person.id,striker.person.id),i===2);
  const raw=serialize(s);assert.equal(pairDrill(s,ctx),false);assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);
 }
 assert.deepEqual([guard.person.needs.energy,striker.person.needs.energy],before.map(n=>n-6));assert.deepEqual([guard.person.agenda.wealth,striker.person.agenda.wealth],money);assert.equal(s.areas.a1.civic.medicine,city);
 for(const p of [guard.person,striker.person]){const r=Object.values(p.pairPractice.partners)[0];assert.equal(r.operations.length,3);assert.equal(new Set(r.operations.map(o=>o.tick)).size,3);assert.equal(r.method,'covered-windup');assert.equal(p.actionControl.phases.filter(v=>v==='pair-drill').length,1);}
 assert.equal(h.pairDrill.status,'done');
});

test('pair refusal, actual wound, hunger, sleep, distance or another accepted action prevents a lesson',()=>{
 for(const intervene of [f=>f.guard.person.partyRelations={[f.striker.person.id]:{person:f.striker.person.id,name:f.striker.person.name,feeling:-3,events:[],last:f.s.tick}},f=>f.striker.person.health=30,f=>f.guard.person.needs.hunger=70,f=>f.guard.person.needs.sleeping=true,f=>f.striker.person.x+=90,f=>assert.ok(npcAction(f.s,f.guard.person,'party','camp-study'))]){
  const f=pairCombatFixture({campOnly:true});f.s.tick++;intervene(f);const raw=serialize(f.s);assert.equal(pairDrill(f.s,f.ctx),false);assert.equal(serialize(f.s),raw);assert.equal(f.guard.person.pairPractice,undefined);
 }
});

test('a spent practice turn cannot become medicine, a battle action or a departure even with controllers off',()=>{
 const f=pairCombatFixture({campOnly:true}),{s,guard,striker,ctx}=f;s.tick+=8-s.tick%8;assert.ok(pairDrill(s,ctx));
 for(const p of [guard.person,striker.person]){assert.equal(npcAction(s,p,'party','camp-study'),false);assert.equal(canStartNPCActivity(s,p),false);}
 setModule(s,'npc-control',false);setModule(s,'party-combinations',false);assert.equal(npcAction(s,guard.person,'party','combat'),false);
 guard.person.health=30;guard.person.roadSupplies.medicine=4;delete guard.person.partyNeeds;partyCare(s,guard.companion,ctx);assert.equal(guard.person.roadSupplies.medicine,4);
});

test('actual training changes decisions with the same attributes and pure forecasts spend nothing',()=>{
 const {s,e,guard,striker}=pairCombatFixture({trained:true});s.tick++;
 const raw=serialize(s),plan=planPartyCombat(s,e),range=partyDamageRange(s,e);assert.deepEqual(plan.map(p=>p.kind),['cover','prepare']);assert.deepEqual(range,{min:0,max:0});assert.equal(serialize(s),raw);
 delete guard.person.pairPractice;delete striker.person.pairPractice;assert.deepEqual(planPartyCombat(s,e).map(p=>p.kind),['attack','attack']);const ordinary=partyDamageRange(s,e),sum=guard.companion.attack+striker.companion.attack;assert.ok(ordinary.min>0&&ordinary.min<=sum&&ordinary.max>=sum,'unseen elemental resistance remains a range');
});

test('two real engine rounds spend four body actions for one prepared strike and two ordinary enemy replies',()=>{
 const {s,h,e,guard,striker}=pairCombatFixture({trained:true});const hp=e.hp;step(s);
 assert.equal(h.pairCombat.status,'preparing');assert.equal(striker.person.partyCombat.action,'prepare');assert.equal(striker.person.partyCombat.damage,0);assert.equal(guard.person.partyCombat.action,'cover');assert.equal(e.battle.turns,1);assert.equal(striker.person.health,100);
 const firstHeroDamage=s.actorFacts.events.filter(v=>v.kind==='hurt'&&v.actor===e.id&&v.target==='hero').reduce((n,v)=>n+v.amount,0);assert.equal(hp-e.hp,firstHeroDamage);
 const guardEnergy=guard.person.needs.energy,strikerEnergy=striker.person.needs.energy;const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);
 step(s);assert.equal(h.pairCombat.status,'released');assert.equal(striker.person.partyCombat.action,'paired-attack');assert.equal(striker.person.partyCombat.damage,3*striker.companion.attack);assert.equal(e.battle.turns,2);assert.equal(guard.person.needs.energy,guardEnergy-5);assert.equal(striker.person.needs.energy,strikerEnergy-4);
 assert.equal(e.hp,hp-firstHeroDamage-3*striker.companion.attack-(s.actorFacts.events.filter(v=>v.kind==='hurt'&&v.actor===e.id&&v.target==='hero').reduce((n,v)=>n+v.amount,0)));
 assert.equal(serialize(restore(serialize(s))),serialize(s));
});

test('a wounded preparer, departed guard, lost consent or disabled method breaks the actual pending move',()=>{
 for(const change of [f=>{f.striker.person.health--;f.striker.companion.hp--;},f=>{f.h.companions=f.h.companions.filter(c=>c.person!==f.guard.person.id);},f=>f.guard.person.partyRelations={[f.striker.person.id]:{person:f.striker.person.id,name:f.striker.person.name,feeling:-4,events:[],last:f.s.tick}},f=>setModule(f.s,'party-combinations',false)]){
  const f=pairCombatFixture({trained:true});step(f.s);assert.equal(f.h.pairCombat.status,'preparing');change(f);pairCombatTick(f.s);assert.equal(f.h.pairCombat.status,'cancelled');step(f.s);assert.notEqual(f.striker.person.partyCombat.action,'paired-attack');
 }
});

test('the pending move expires instead of granting a stored free strike and a missing partner allows solo actions',()=>{
 const f=pairCombatFixture({trained:true});step(f.s);f.s.tick+=2;pairCombatTick(f.s);assert.equal(f.h.pairCombat.status,'cancelled');assert.ok(planPartyCombat(f.s,f.e).every(a=>a.kind!=='paired-attack'));const before=f.striker.person.needs.energy;
 partyCombatTurn(f.s,f.e,f.ctx);assert.equal(f.striker.person.partyCombat.action,'attack');assert.equal(f.striker.person.needs.energy,before-2);
});

test('new optional practice and unfinished windup roundtrip exactly and malformed source records are rejected',()=>{
 const f=pairCombatFixture({trained:true});step(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);
 for(const breakSave of [w=>w.hero.pairCombat.strikerHealth=NaN,w=>w.people[f.guard.person.id].pairPractice.partners[f.striker.person.id].operations.push({}),w=>w.people[f.striker.person.id].partyCombat.action='invented',w=>w.hero.pairCombat.started=w.tick+1]){
  const w=JSON.parse(raw);breakSave(w);assert.throws(()=>restore(JSON.stringify(w)),/Повреждённое сохранение/);
 }
});

test('party details show escaped partner practice and actual preparation instead of an invented attack',()=>{
 const f=pairCombatFixture({trained:true});step(f.s);f.s.people[f.guard.person.id].name='<guard>';const html=partyCombatBriefHTML(f.s,f.striker.person,t=>String(t).replaceAll('<','&lt;').replaceAll('>','&gt;'));
 assert.match(html,/&lt;guard&gt;/);assert.match(html,/Прикрытие размаха освоено/);assert.match(html,/ход потрачен без удара/);assert.doesNotMatch(html,/<guard>/);
});

test('a real charged response can kill the protecting body, cancel the preparation and leave one death',()=>{
 const f=pairCombatFixture({trained:true}),{s,h,e,guard,striker}=f;e.attack=40;e.tactic='charged';e.battle.intent='strike';delete h.defenseMemory;s.rng=1600;
 step(s);assert.equal(guard.person.alive,false);assert.equal(h.pairCombat.status,'cancelled');assert.equal(striker.person.partyCombat.action,'prepare');assert.equal(striker.person.partyCombat.damage,0);assert.equal(Object.values(s.remains.byId).filter(b=>b.source.id===guard.person.id).length,1);
 const turn=striker.person.partyCombat.tick,next=s.nextGeneration;step(s);assert.equal(striker.person.partyCombat.tick,turn);assert.equal(s.nextGeneration,next);
});

test('a completed move cannot be repeated against the same opponent and armoured defense applies once to its own strike',()=>{
 const f=pairCombatFixture({trained:true}),{s,h,e,striker}=f;e.powers=['armored'];step(s);step(s);
 assert.equal(striker.person.partyCombat.action,'paired-attack');assert.equal(striker.person.partyCombat.damage,3*striker.companion.attack-3);
 step(s);assert.equal(h.pairCombat.status,'released');assert.equal(striker.person.partyCombat.action,'attack');assert.equal(striker.person.partyCombat.damage,1);
});

test('restoring actual unfinished camp practice continues paid steps instead of granting retroactive knowledge',()=>{
 const f=pairCombatFixture({campOnly:true});f.s.tick++;assert.ok(pairDrill(f.s,f.ctx));const raw=serialize(f.s),s=restore(raw);assert.equal(serialize(s),raw);
 assert.equal(learnedPair(s,f.guard.person.id,f.striker.person.id),false);step(s);assert.equal(learnedPair(s,f.guard.person.id,f.striker.person.id),false);step(s);assert.equal(learnedPair(s,f.guard.person.id,f.striker.person.id),true);
});

test('a hero finishing the opponent before release cancels preparation without taking another pair action',()=>{
 const f=pairCombatFixture({trained:true});step(f.s);const oldTurn=f.striker.person.partyCombat.tick,oldEnergy=f.striker.person.needs.energy;f.e.hp=1;step(f.s);
 assert.equal(f.e.alive,false);assert.equal(f.h.pairCombat.status,'cancelled');assert.equal(f.striker.person.partyCombat.tick,oldTurn);assert.equal(f.striker.person.needs.energy,oldEnergy);
});

test('losing the actual ability to strike interrupts a pending move rather than manufacturing minimum damage',()=>{
 const f=pairCombatFixture({trained:true});step(f.s);f.striker.companion.attack=0;step(f.s);assert.equal(f.h.pairCombat.status,'cancelled');assert.notEqual(f.striker.person.partyCombat.tick,f.s.tick);assert.equal(f.striker.person.partyCombat.damage,0);
});
