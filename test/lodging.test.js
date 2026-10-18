import {test} from 'node:test';import assert from 'node:assert/strict';
import {lodgingFixture} from '../scripts/lodging-scenarios.mjs';import {commonContext as ctx} from '../scripts/common-life-scenarios.mjs';
import {lodgingPlan,bookRoom,lodgingTick,lodgingRest,initializeLodging,partyRoomConsent,npcLodgingPlan} from '../modules/lodging.js';
import {activeBooking,roomAdmission} from '../modules/room-state.js';import {interiorPassage} from '../modules/interiors.js';
import {step,serialize,restore,createNextStory,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {syncActiveActor,setActorMoney} from '../actor-projection.js';
test('a room is a persistent non-town pocket without new people, treasury or provisions',()=>{
 const {s,room,d,hall}=lodgingFixture(),people=Object.keys(s.people).length,rng=s.rng,save=serialize(s);assert.equal(room.interior.parent,hall.id);assert.equal(room.interior.building,d.id);assert.equal(room.civic,undefined);assert.equal(room.city,undefined);assert.equal(room.population.length,0);assert.equal(room.forage.stock,0);initializeLodging(s);assert.equal(serialize(s),save);assert.equal(Object.keys(s.people).length,people);assert.equal(s.rng,rng);assert.equal(serialize(restore(save)),save);
});
test('actual contact pays the existing host once and reserves finite capacity for an absolute duration',()=>{
 const {s,h,p,room}=lodgingFixture(),gold=h.gold,wealth=p.agenda.wealth;assert.ok(lodgingPlan(s,ctx));bookRoom(s,ctx);assert.equal(h.gold,gold-3);assert.equal(p.agenda.wealth,wealth+3);assert.equal(room.lodging.booking.until,s.tick+240);assert.deepEqual(room.lodging.booking.occupants,[h.lineage]);assert.equal(roomAdmission(s,room,h.lineage),true);assert.equal(h.counters.roomsRented,1);
 h.goal={kind:'roomBook'};bookRoom(s,ctx);assert.equal(h.gold,gold-3);assert.equal(p.agenda.wealth,wealth+3);assert.equal(h.counters.roomsRented,1);
});
test('the usual movement enters at the real inner doorway and ordinary rest takes time without curing disease',()=>{
 const {s,h,p,room,hall}=lodgingFixture();h.conditions.push({id:'fever',since:s.tick,until:s.tick+500});lodgingPlan(s,ctx);bookRoom(s,ctx);let entered=false,rested=false;
 for(let i=0;i<80;i++){const before=h.area,x=h.x,hp=h.hp;step(s);if(before===hall.id&&h.area===room.id){assert.equal(x,90);assert.equal(h.x,8);entered=true;}if(h.area===room.id&&h.lastAction==='rest'){assert.ok(h.hp-hp<=1);rested=true;}if(rested&&!h.goal)break;}
 assert.ok(entered&&rested);assert.ok(h.energy>=95);assert.ok(h.conditions.some(c=>c.id==='fever'));assert.equal(p.agenda.wealth,23);
});
test('poverty, a distant owner and another actual renter cannot produce a payment or a duplicate reservation',()=>{
 for(const mode of ['poor','distant','occupied']){const {s,h,p,room}=lodgingFixture(),wealth=p.agenda.wealth;if(mode==='poor')h.gold=2;if(mode==='distant'){p.x=10;}if(mode==='occupied'){room.lodging.booking={id:'prior',payer:p.id,occupants:[p.id],status:'booked',until:s.tick+100};}const gold=h.gold;lodgingPlan(s,ctx);bookRoom(s,ctx);assert.equal(h.gold,gold,mode);assert.equal(p.agenda.wealth,wealth,mode);if(mode==='occupied')assert.equal(room.lodging.booking.id,'prior');}
});
test('expiry, closure, off and owner death cannot lock an existing occupant inside',()=>{
 for(const mode of ['expiry','closed','off','owner-dead']){const {s,h,p,room,hall,d}=lodgingFixture();lodgingPlan(s,ctx);bookRoom(s,ctx);h.area=room.id;h.x=8;h.goal=null;syncActiveActor(s);if(mode==='expiry'){s.tick=room.lodging.booking.until;lodgingTick(s);}if(mode==='closed')d.closed=true;if(mode==='off')setModule(s,'lodging',false);if(mode==='owner-dead'){p.alive=false;p.health=0;}
  const passage=interiorPassage(s,room.id,hall.id);assert.equal(passage.allowed,true);assert.equal(passage.arrival,90);if(mode==='closed'||mode==='owner-dead'){assert.equal(roomAdmission(s,room,h.lineage),true);}else assert.equal(roomAdmission(s,room,h.lineage),false);
 }
});
test('a companion must consent and fit; adding a new follower cannot bypass a paid room token',()=>{
 const {s,h,p,room}=lodgingFixture();setModule(s,'companions',true);const people=Object.values(s.people).filter(p=>p.alive&&p.id!==h.lineage&&p.id!==s.areas.a1.objects.find(o=>o.kind==='tavern').owner);const c={person:people[0].id,hp:24,maxHp:24,loyalty:20,ethics:0};h.companions=[c];assert.equal(partyRoomConsent(s),null);assert.equal(lodgingPlan(s,ctx),false);c.loyalty=80;assert.deepEqual(partyRoomConsent(s),[h.lineage,c.person]);lodgingPlan(s,ctx);bookRoom(s,ctx);assert.ok(roomAdmission(s,room,h.lineage));h.companions.push({person:people[1].id,loyalty:80,ethics:0});assert.equal(roomAdmission(s,room,h.lineage),false);
});
test('an actual transport claim never becomes a second room-booking controller',()=>{
 const {s,p}=lodgingFixture();p.needs.energy=35;s.logistics.convoys.push({person:p.id});p.status='caravan';assert.equal(npcLodgingPlan(s,p),false);
});
test('a real NPC walks from the hall into its paid room and recovers through its one personal controller',()=>{
 const {s,h,p,room,hall}=lodgingFixture(),guest=s.people['person-2'];s.areas[guest.area].population=s.areas[guest.area].population.filter(id=>id!==guest.id);guest.area=hall.id;guest.x=76;guest.status='resident';hall.population.push(guest.id);guest.agenda.task=null;guest.agenda.due=0;guest.agenda.wealth=12;s.areas.a1.civic.treasury-=12;guest.needs.energy=50;guest.needs.hunger=10;h.goal={kind:'routeWait',area:h.area,x:h.x,until:10000};h.energy=100;h.hp=h.maxHp;
 let entered=false;for(let i=0;i<190;i++){step(s);if(guest.area===room.id)entered=true;if(entered&&guest.needs.energy>=90)break;}
 assert.ok(entered);assert.equal(room.lodging.booking.payer,guest.id);assert.equal(guest.agenda.wealth,9);assert.equal(p.agenda.wealth,23);assert.ok(guest.needs.energy>=90);assert.equal(room.lodging.nextBooking,1);
});
test('paid access survives loading and observing the owner without another fee or a new controller',()=>{
 const {s,h,p,room}=lodgingFixture();lodgingPlan(s,ctx);bookRoom(s,ctx);const save=serialize(s),loaded=restore(save),observed=restore(save);assert.equal(serialize(loaded),save);assert.ok(observeExistingPerson(observed,p.id));
 for(let i=0;i<40;i++)for(const world of [s,loaded,observed])step(world);
 for(const world of [s,loaded,observed]){assert.equal(world.people[p.id].agenda.wealth,23);assert.equal(world.actorStates[h.lineage].gold,27);assert.equal(world.areas[room.id].lodging.nextBooking,1);assert.equal(world.nextGeneration,1);}
 assert.equal(serialize(s),serialize(loaded));
});
test('a second actual renter cannot buy an occupied room; expiry allows one new paid reservation',()=>{
 const {s,h,p,hall,room}=lodgingFixture();lodgingPlan(s,ctx);bookRoom(s,ctx);const first=room.lodging.booking.id;createNextStory(s,{allowLiving:true});const next=s.hero;setActorMoney(s,s.people[h.lineage],h.gold-10);next.gold+=10;next.area=hall.id;next.x=76;next.energy=40;next.hunger=5;next.goal=null;syncActiveActor(s);assert.equal(lodgingPlan(s,ctx),false);assert.equal(room.lodging.booking.id,first);assert.equal(p.agenda.wealth,23);
 s.tick=room.lodging.booking.until;lodgingTick(s);assert.equal(lodgingPlan(s,ctx),true);bookRoom(s,ctx);assert.notEqual(room.lodging.booking.id,first);assert.equal(room.lodging.nextBooking,2);assert.equal(p.agenda.wealth,26);
});
