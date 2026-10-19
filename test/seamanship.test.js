import {rememberFerryRefusal,sameFerryRefusal} from '../modules/ferry-refusals.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {seamanshipFixture,boardCargo,departCargo,twoSecureDepartures,stormBoundary,seamanshipSave} from '../scripts/seamanship-scenarios.mjs';
import {cargoWorkReady,secureFerryCargo,confirmCargoDeparture,passengerCargoTurn,cargoHTML} from '../modules/ferry-cargo.js';
import {boardFerry} from '../modules/ferry-actions.js';import {ferryFixture} from '../scripts/ferry-scenarios.mjs';
import {restore,serialize,observeExistingPerson,observeDetailedActor} from '../engine.js';import {setModule} from '../rules.js';
import {knowsPracticalMethod} from '../modules/skill-branches.js';import {fieldCraftNodes} from '../modules/field-craft-state.js';import {acyclicSkillTree,SKILL_TREE} from '../modules/skill-tree-data.js';
// PARTIAL: six groups, <=12 isolated actions or <=16 world ticks per group.
// Storm/arrival are explicit boundary checkpoints, never long voyages/lives.
const exact=f=>{const raw=seamanshipSave(f);assert.equal(serialize(restore(raw)),raw);return raw;};
let trainedRaw;
test('actual constructor provisions and paid original rope secure one accepted cargo-work ticket, without past XP',()=>{
 const q=seamanshipFixture(),{s,h,f,material}=q,e=h.energy;assert.equal(f.cargo.loaded,8);assert.equal(f.cargo.loaded-f.cargo.consumed-f.cargo.lost,f.food);assert.equal(f.cargo.loads[0].source.before-f.cargo.loads[0].source.after,8);
 assert.equal(s.people[f.captain].skillPractice.sailing.total,0);assert.equal(s.people[h.lineage].skillPractice?.sailing,undefined);assert.equal(h.gold,0);boardCargo(q);
 assert.equal(h.energy,e-4);assert.equal(f.passengers[h.lineage].payment,'work');assert.equal(f.passengers[h.lineage].fare,0);assert.equal(f.passengers[h.lineage].workKind,'cargo');assert.equal(h.bag.includes(material),false);
 const o=s.areas[f.deck].objects.find(o=>o.id===f.cargo.id);assert.equal(o.items[0],material);assert.equal(material.rope.length,24);assert.equal(f.cargo.operations[0].status,'secured');assert.equal(s.people[h.lineage].skillPractice?.sailing,undefined);
 const energy=h.energy;assert.equal(secureFerryCargo(s,h.lineage),false);assert.equal(h.energy,energy);exact(q);
});
test('two crew-confirmed departures grant one distinct credit each, retaining the original rope and finite paid load',()=>{
 const q=twoSecureDepartures(),{s,h,f,material}=q,p=s.people[h.lineage],state=p.skillPractice.sailing;assert.ok(s.tick<=16);assert.equal(state.total,2);assert.equal(state.method.origin,'practice');assert.equal(new Set(state.operations.map(e=>e.voyage)).size,2);assert.equal(new Set(state.operations.map(e=>e.rope)).size,1);assert.equal(state.operations[0].rope,material.id);
 assert.equal(f.cargo.loaded,9);assert.equal(f.cargo.consumed,2);assert.equal(f.cargo.loads[1].amount,1);assert.equal(f.cargo.loads[1].source.kind,'port-purchase');assert.equal(s.people[f.captain].agenda.wealth,5);confirmCargoDeparture(s);assert.equal(state.total,2);assert.equal(h.level,1);trainedRaw=exact(q);
});
test('one existing storm loses only the corresponding provisions: loose two, tied one, checked zero; hull and health stay identical',()=>{
 const results=[];for(const options of [{rope:false},{},{lesson:true}]){const q=stormBoundary(departCargo(boardCargo(seamanshipFixture(options)))),{s,h,f}=q;assert.ok(s.tick<=4);results.push([h.hp,f.hull,f.pause,f.travelled,f.lastEvent.damage]);assert.equal(f.cargo.lost,options.rope===false?2:options.lesson?0:1);assert.equal(f.food,7-f.cargo.lost);assert.equal(f.cargo.loaded-f.cargo.consumed-f.cargo.lost,f.food);
  if(options.lesson){const p=s.people[h.lineage];assert.equal(p.skillPractice.sailing.method.origin,'lesson');assert.equal(p.skillPractice.sailing.total,0);assert.equal(f.cargo.secure.inspector,h.lineage);assert.equal(f.passengers[h.lineage].cargoLesson.status,'done');assert.equal(passengerCargoTurn(s,h.lineage),false);}exact(q);
 }assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});
test('absent need, material, consent, bodily readiness and actual proximity cannot spend energy or make cargo-work free',()=>{
 const q=seamanshipFixture(),{s,h,f}=q,raw=exact(q),energy=h.energy;
 for(const change of [q=>{delete q.ferry.cargo;},q=>{q.ferry.food=0;},q=>{q.hero.bag=[];},q=>{q.people[q.ferry.owner].alive=false;},q=>{q.people[q.hero.lineage].needs.sleeping=true;},q=>{q.hero.area=q.ferry.ports[1];}]){const b=restore(raw);change(b);assert.equal(cargoWorkReady(b,h.lineage),false);assert.equal(secureFerryCargo(b,h.lineage,{boarding:true}),false);assert.equal(b.hero.energy,energy);}
 const held=h.bag.splice(0);f.rigging=0;const refused=rememberFerryRefusal(s,q.to.id,'fare');assert.equal(sameFerryRefusal(s,refused),true);h.bag.push(...held);assert.equal(sameFerryRefusal(s,refused),false);
 h.x=20;assert.equal(secureFerryCargo(s,h.lineage,{boarding:true}),false);assert.equal(h.energy,energy);h.x=50;boardCargo(q);assert.equal(cargoWorkReady(s,h.lineage),false);assert.equal(h.energy,energy-4);
 const no=seamanshipFixture({rope:false});no.f.rigging=0;assert.equal(boardFerry(no.s,no.h.lineage,no.to.id,{}, {work:true}),false);assert.equal(no.h.energy,100);assert.equal(no.h.transit,null);exact(q);
});
test('a normal paid voyage keeps the same ticket, clock, passenger and wallets; an actual lesson owns the captain turn',()=>{
 const base=ferryFixture(),q=seamanshipFixture({rope:false});Object.assign(q.h,{gold:20,profession:'warrior'});q.s.tick=0;q.f.departure=3;
 for(const v of [base,q]){assert.equal(boardFerry(v.s,v.h.lineage,v.to.id),true);departCargo(v);}
 assert.equal(q.f.departure,base.f.departure);assert.equal(q.f.voyage,base.f.voyage);assert.equal(q.h.gold,base.h.gold);assert.equal(q.s.people[q.f.owner].agenda.wealth,base.s.people[base.f.owner].agenda.wealth);assert.equal(Object.keys(q.f.passengers).length,Object.keys(base.f.passengers).length);assert.equal(q.f.food,base.f.food);exact(q);
 const taught=boardCargo(seamanshipFixture({lesson:true})),cap=taught.s.people[taught.f.captain];cap.needs.energy=50;departCargo(taught);assert.equal(taught.f.passengers[taught.h.lineage].cargoLesson.granted,2);assert.equal(cap.sailingCargoTick,2);assert.equal(cap.needs.energy,53);assert.equal(taught.h.gold,0);exact(taught);
});
test('current144 optional absence/OFF/restore/observer preserve custody and proofs; invalid balance rejects, tree reads are pure',()=>{
 const s=restore(trainedRaw),h=s.hero,q={s,h,f:s.ferry};setModule(s,'skill-branches',false);const raw=exact(q);assert.equal(cargoWorkReady(s,h.lineage),false);setModule(s,'skill-branches',true);assert.ok(knowsPracticalMethod(s,h.lineage,'sailing'));const id=h.lineage;assert.equal(observeExistingPerson(s,s.ferry.captain),true);assert.equal(observeDetailedActor(s,id),true);exact(q);
 const bad=JSON.parse(raw);bad.ferry.cargo.lost++;assert.throws(()=>restore(JSON.stringify(bad)),/cargo.balance/);
 const old=ferryFixture();for(const flag of ['skill-branches','identity','equipment','navigation-tools'])setModule(old.s,flag,true);assert.equal(old.f.cargo,undefined);assert.equal(old.s.people[old.f.captain].skillPractice?.sailing,undefined);assert.equal(restore(exact(old)).ferry.cargo,undefined);
 const before=seamanshipSave(q);assert.equal(SKILL_TREE.length,8);assert.ok(acyclicSkillTree());assert.ok(fieldCraftNodes(s,id).find(n=>n.id==='check-cargo-lashing').known);assert.ok(cargoHTML(s,x=>x).includes('СУДОВАЯ ПРОВИЗИЯ'));assert.equal(serialize(s),before);
});
