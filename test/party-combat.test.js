import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';
import {setModule} from '../rules.js';
import {combatAttack} from '../modules/combat.js';
import {partyCombatFixture} from '../scripts/party-combat-scenarios.mjs';
import {planPartyCombat,aggregatePartyAttack} from '../modules/party-combat-state.js';
import {partyCombatTurn,partyCoverDamage} from '../modules/party-combat.js';
import {weaponDamageRange} from '../modules/combat-forecast.js';
import {partyCombatBriefHTML} from '../party-combat-sheet.js';
import {npcAction,canStartNPCActivity} from '../modules/npc-control.js';
import {partyTick} from '../modules/party.js';
import {releaseParty} from '../modules/social.js';

test('a real healer spends owned medicine and own action while a healthy guard covers instead of striking',()=>{
 const {s,h,e,guard,healer,ctx}=partyCombatFixture();s.tick=1;const hp=h.hp,city=s.areas.a1.civic.medicine,enemy=e.hp;
 const before=serialize(s),plan=planPartyCombat(s,e);assert.deepEqual(plan.map(a=>a.kind),['cover','heal']);assert.equal(serialize(s),before,'planning makes no facts');
 const r=partyCombatTurn(s,e,ctx);assert.equal(r.guard,guard.person.id);assert.equal(healer.person.roadSupplies.medicine,2);assert.equal(h.hp-hp,healer.person.partyCombat.healed);assert.ok(h.hp>hp);assert.equal(s.areas.a1.civic.medicine,city);assert.equal(e.hp,enemy);
 assert.equal(guard.person.needs.energy,95);assert.equal(healer.person.needs.energy,97);assert.deepEqual(guard.person.actionControl.phases,['combat']);assert.deepEqual(healer.person.actionControl.phases,['combat']);
 const done=serialize(s);partyCombatTurn(s,e,ctx);assert.equal(serialize(s),done);const loaded=restore(done);partyCombatTurn(loaded,loaded.areas.a2.objects.find(o=>o.id===e.id),ctx);assert.equal(serialize(loaded),done);
});

test('human actions remove their former aggregate attack and no forecast assumes a covering guard hit',()=>{
 const {s,h,e,guard,ctx}=partyCombatFixture({roles:['guard']});s.tick=1;
 assert.equal(aggregatePartyAttack(s),0);const damage=combatAttack(s,e,10,ctx),forecast=weaponDamageRange(s,e),party=h.companions;h.companions=[];
 assert.equal(combatAttack(s,e,10,ctx),damage);assert.deepEqual(weaponDamageRange(s,e),forecast);h.companions=party;
 setModule(s,'party-combat',false);assert.equal(aggregatePartyAttack(s),guard.companion.attack);assert.equal(combatAttack(s,e,10,ctx),damage+guard.companion.attack);
});

test('the same shared reply is split once and the covering person receives one real canonical wound',()=>{
 const {s,h,e,guard,ctx}=partyCombatFixture({roles:['guard']});s.tick=1;partyCombatTurn(s,e,ctx);const before=guard.companion.hp;
 const result=partyCoverDamage(s,e,10,ctx);assert.equal(result.received,6);assert.deepEqual(result.excluded,[guard.person.id]);assert.equal(guard.companion.hp,before-4);assert.equal(guard.person.health,Math.ceil((guard.person.maxHealth||100)*guard.companion.hp/guard.companion.maxHp));assert.equal(h.partyCombat.absorbed,4);
 const save=serialize(s);assert.deepEqual(partyCoverDamage(s,e,10,ctx),{received:10,excluded:[]});assert.equal(serialize(s),save);
});

test('without personal medicine a healer cannot borrow from a town or the hero inventory',()=>{
 const {s,h,e,healer,ctx}=partyCombatFixture({roles:['healer']});healer.person.roadSupplies.medicine=0;h.inventory.potions=2;s.tick=1;const hp=h.hp,city=s.areas.a1.civic.medicine;
 assert.deepEqual(planPartyCombat(s,e),[]);assert.equal(partyCombatTurn(s,e,ctx),null);assert.equal(h.hp,hp);assert.equal(h.inventory.potions,2);assert.equal(s.areas.a1.civic.medicine,city);
});

test('an exhausted injured ally remains a visible healing target but cannot give its own combat action',()=>{
 const {s,e,guard,healer,ctx}=partyCombatFixture();s.tick=1;guard.person.health=15;guard.companion.hp=Math.ceil(guard.companion.maxHp*.15);guard.person.needs.energy=5;
 const plan=planPartyCombat(s,e);assert.deepEqual(plan.map(a=>a.kind),['heal']);assert.equal(plan[0].target,guard.person.id);partyCombatTurn(s,e,ctx);assert.ok(guard.person.health>15);assert.equal(guard.person.needs.energy,5);assert.equal(guard.person.partyCombat,undefined);assert.equal(healer.person.roadSupplies.medicine,2);
});

test('a distant, sleeping or dead helper neither heals nor contributes a hidden human attack',()=>{
 for(const change of [p=>p.area='a1',p=>p.x+=80,p=>p.needs.sleeping=true,p=>{p.alive=false;p.health=0;}]){
  const {s,e,healer,ctx}=partyCombatFixture({roles:['healer']});s.tick=1;change(healer.person);assert.deepEqual(planPartyCombat(s,e),[]);assert.equal(partyCombatTurn(s,e,ctx),null);assert.equal(healer.person.roadSupplies.medicine,4);assert.equal(aggregatePartyAttack(s),0);
 }
});

test('guard own injury, fatigue or an actually witnessed lethal windup can refuse cover',()=>{
 for(const change of [({guard})=>{guard.person.health=40;guard.companion.hp=12;},({guard})=>guard.person.needs.energy=30,({s,h,e})=>{e.attack=40;e.tactic='charged';e.battle.intent='strike';h.defenseMemory={warnings:{[e.id]:{enemy:e.id,area:h.area,turn:0,seen:s.tick}},braces:0};}]){
  const f=partyCombatFixture({roles:['guard']});f.s.tick=1;change(f);assert.equal(planPartyCombat(f.s,f.e)[0].kind,'attack');
 }
});

test('an actual engine fight resolves two different human actions and exactly one enemy response',()=>{
 const {s,h,e,guard,healer}=partyCombatFixture();const medicine=healer.person.roadSupplies.medicine;step(s);
 assert.equal(h.partyCombat.tick,s.tick);assert.equal(h.partyCombat.replied,true);assert.equal(guard.person.partyCombat.action,'cover');assert.equal(healer.person.partyCombat.action,'heal');assert.equal(healer.person.roadSupplies.medicine,medicine-2);assert.equal(e.battle.turns,1);assert.equal(s.actorFacts.events.filter(f=>f.kind==='attack'&&f.actor===e.id&&f.target==='hero').length,1);assert.equal(s.actorFacts.events.filter(f=>f.kind==='attack'&&f.actor==='party:'+guard.person.id).length,0);
 assert.equal(guard.person.actionControl.phases.filter(p=>p==='combat').length,1);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);
});

test('hero healing leaves the guard its own strike and does not create a second enemy reply',()=>{
 const {s,h,e,guard}=partyCombatFixture({roles:['guard']});h.inventory.potions=1;const hp=e.hp;step(s);
 assert.equal(h.lastAction,'heal');assert.equal(h.inventory.potions,0);assert.equal(guard.person.partyCombat.action,'attack');assert.equal(e.hp,hp-guard.person.partyCombat.damage);assert.equal(e.battle.turns,1);assert.equal(guard.person.actionControl.phases.filter(v=>v==='combat').length,1);
});

test('borrowing time allows a separate participant action but no enemy reply and no useless cover',()=>{
 const {s,h,e,guard}=partyCombatFixture({roles:['guard']});setModule(s,'magic',true);h.magic.spells=['borrow'];h.magic.mana=h.magic.maxMana=100;const hp=h.hp;step(s);
 assert.equal(h.lastAction,'spell');assert.equal(h.magic.responseSkipped,true);assert.equal(h.hp,hp);assert.equal(guard.person.partyCombat.action,'attack');assert.ok(guard.person.partyCombat.damage>0);assert.equal(e.battle.turns,0);assert.equal(h.partyCombat.replied,true);
});

test('a participant finishing the real enemy after a hero potion leaves one body with that actual killer',()=>{
 const {s,h,e,guard}=partyCombatFixture({roles:['guard']});h.inventory.potions=1;e.hp=guard.companion.attack;step(s);
 assert.equal(h.lastAction,'heal');assert.equal(e.alive,false);assert.equal(e.battle.turns,0);assert.equal(e.defeatedBy,guard.person.id);assert.equal(h.kills,1);assert.equal(h.combat,null);assert.equal(s.remains.byId[e.remainsId].death.cause.person,guard.person.id);
 const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);assert.equal(Object.values(s.remains.byId).filter(b=>b.source.kind==='enemy'&&b.source.id===e.id).length,1);
});

test('an unexpectedly deadly actual charged reply can kill the covering guard once and the world continues',()=>{
 const {s,h,e,guard}=partyCombatFixture({roles:['guard']});e.attack=40;e.tactic='charged';e.battle.intent='strike';delete h.defenseMemory;s.rng=1600;step(s);
 assert.equal(guard.person.partyCombat.action,'cover');assert.equal(guard.person.alive,false);assert.equal(guard.person.health,0);assert.equal(guard.companion.hp,0);assert.equal(h.social.lostCompanions,1);assert.equal(e.battle.turns,1);
 assert.equal(s.actorFacts.events.filter(f=>f.kind==='death'&&f.actor==='party:'+guard.person.id).length,1);const remains=Object.values(s.remains.byId).filter(b=>b.source.kind==='person'&&b.source.id===guard.person.id);assert.equal(remains.length,1);
 const generation=s.generation,tick=s.tick,spent=guard.person.partyCombat.tick;step(s);assert.equal(s.tick,tick+1);assert.equal(s.generation,generation);assert.equal(guard.person.partyCombat.tick,spent);assert.equal(h.social.lostCompanions,1);assert.equal(Object.values(s.remains.byId).filter(b=>b.source.id===guard.person.id).length,1);
});

test('disabled cooperation preserves actual supplies and the previous aggregate without new action records',()=>{
 const {s,h,e,guard,healer}=partyCombatFixture();setModule(s,'party-combat',false);const medicine=healer.person.roadSupplies.medicine;step(s);
 assert.equal(h.partyCombat,undefined);assert.equal(guard.person.partyCombat,undefined);assert.equal(healer.person.partyCombat,undefined);assert.equal(healer.person.roadSupplies.medicine,medicine);assert.equal(e.battle.turns,1);assert.ok(aggregatePartyAttack(s)>0);
});

test('an unfinished actual cover survives exact reload and corrupted round or medicine receipts are rejected',()=>{
 const {s,e,ctx,healer}=partyCombatFixture();s.tick=1;partyCombatTurn(s,e,ctx);const raw=serialize(s),a=restore(raw),b=restore(raw),enemy=x=>x.areas.a2.objects.find(o=>o.id===e.id);
 assert.deepEqual(partyCoverDamage(a,enemy(a),9,ctx),partyCoverDamage(b,enemy(b),9,ctx));assert.equal(serialize(a),serialize(b));
 for(const corrupt of [x=>x.hero.partyCombat.people.push(x.hero.partyCombat.people[0]),x=>x.hero.partyCombat.absorbed=-1,x=>x.people[healer.person.id].partyCombat.medicine=-1,x=>x.people[healer.person.id].partyCombat.target='missing-person']){
  const x=JSON.parse(raw);corrupt(x);assert.throws(()=>restore(JSON.stringify(x)));
 }
});

test('observing a participating NPC instead of the leader does not alter the actual wound, medicine or actions',()=>{
 const {s:a,h,e,guard,healer}=partyCombatFixture(),leader=h.lineage;assert.ok(observeExistingPerson(a,guard.person.id));const b=restore(serialize(a));assert.ok(observeExistingPerson(b,healer.person.id));
 step(a);step(b);
 assert.equal(a.hero.lastAction,'guard');assert.match(a.hero.intent,/Прикрывает/);assert.equal(b.hero.lastAction,'heal');assert.match(b.hero.intent,/Перевязывает/);
 const effects=s=>({tick:s.tick,rng:s.rng,enemy:s.areas.a2.objects.find(o=>o.id===e.id),leader:{hp:s.actorStates[leader].hp,energy:s.actorStates[leader].energy,round:s.actorStates[leader].partyCombat},members:[guard.person.id,healer.person.id].map(id=>{const p=s.people[id];return {id,alive:p.alive,health:p.health,energy:p.needs.energy,medicine:p.roadSupplies.medicine,action:p.partyCombat,phases:p.actionControl};})});
 assert.deepEqual(effects(a),effects(b));for(const s of [a,b]){const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);}
});

test('party action cards are escaped, read-only and display the actual finite supply and spent action',()=>{
 const {s,e,healer,ctx}=partyCombatFixture({roles:['healer']});s.tick=1;partyCombatTurn(s,e,ctx);healer.person.partyCombat.reason='<script>not markup</script>';s.people[s.hero.lineage].name='<b>name</b>';
 const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),raw=serialize(s),html=partyCombatBriefHTML(s,healer.person,escape);
 assert.match(html,/Перевязка/);assert.match(html,/Лекарства при себе: 2/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|<button|data-action/);assert.equal(serialize(s),raw);
});

test('another accepted active party action leaves no second healing, cover or strike in that body turn',()=>{
 for(const [role,healthy]of [['guard',false],['healer',false],['guard',true]]){
  const {s,h,e,members,ctx}=partyCombatFixture({roles:[role]}),p=members[0].person;s.tick=1;if(healthy)h.hp=h.maxHp;
  assert.ok(npcAction(s,p,'party','camp-study'));p.needs.energy-=3;
  const before=JSON.stringify(p),enemy=e.hp,hp=h.hp;partyCombatTurn(s,e,ctx);
  assert.equal(JSON.stringify(p),before,'a previously accepted active operation already owns this body turn');assert.equal(e.hp,enemy);assert.equal(h.hp,hp);
 }
});

test('disabling party needs cannot refund an actual care action and spend the remaining medicine again in the same tick',()=>{
 const {s,h,e,healer,ctx}=partyCombatFixture({roles:['healer']});s.tick=8;h.combat=null;healer.person.health=30;healer.companion.hp=9;partyTick(s,ctx);
 assert.equal(healer.person.partyNeeds.activity,'medicine');assert.equal(healer.person.roadSupplies.medicine,2);assert.equal(healer.person.health,55);
 h.combat=e.id;setModule(s,'npc-party-needs',false);const before=JSON.stringify(healer.person),hp=h.hp;
 assert.equal(partyCombatTurn(s,e,ctx),null);assert.equal(JSON.stringify(healer.person),before);assert.equal(h.hp,hp);
});

test('spent cooperation blocks another active operation and a fresh departure after release, including arbiter OFF',()=>{
 for(const arbiter of [true,false]){
  const {s,h,e,guard,ctx}=partyCombatFixture({roles:['guard']});setModule(s,'npc-control',arbiter);s.tick=1;partyCombatTurn(s,e,ctx);
  assert.equal(npcAction(s,guard.person,'party','camp-study'),false,'the combat action already spent this body turn');
  releaseParty(s,ctx);h.companions=[];assert.equal(guard.person.alive,true);assert.equal(canStartNPCActivity(s,guard.person),false,'releasing a controller cannot refund the spent action');
  s.tick++;assert.equal(canStartNPCActivity(s,guard.person),true,'a later body turn is available normally');
 }
});

test('upkeep after the combat action cannot perform a second medicine action when combat has just cleared',()=>{
 for(const arbiter of [true,false]){
  const {s,h,e,healer,ctx}=partyCombatFixture({roles:['healer']});setModule(s,'npc-control',arbiter);s.tick=8;h.hp=h.maxHp;healer.person.health=30;healer.companion.hp=9;
  partyCombatTurn(s,e,ctx);assert.equal(healer.person.roadSupplies.medicine,2);assert.equal(healer.person.health,45);
  h.combat=null;partyTick(s,ctx);assert.equal(healer.person.roadSupplies.medicine,2,'upkeep may not spend the remaining medicine');assert.equal(healer.person.health,45);
 }
});

test('disabling the new combat rules does not restore the already spent guard through the former aggregate attack',()=>{
 for(const needs of [true,false]){
  const {s,h,e,guard,ctx}=partyCombatFixture({roles:['guard']});s.tick=1;partyCombatTurn(s,e,ctx);assert.equal(guard.person.partyCombat.action,'cover');
  setModule(s,'party-combat',false);setModule(s,'npc-party-needs',needs);
  const withSpent=combatAttack(s,e,10,ctx),forecast=weaponDamageRange(s,e);h.companions=[];
  assert.equal(withSpent,combatAttack(s,e,10,ctx),'changing rules cannot grant an extra old-style companion hit');assert.deepEqual(forecast,weaponDamageRange(s,e));
 }
});
