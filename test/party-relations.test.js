import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {pairCampCare,pairCampWatch,pairFeeling} from '../modules/party-relations.js';
import {companionGoalsTick} from '../modules/companion-goals.js';
import {pairFixture} from '../scripts/party-relations-scenarios.mjs';
import {consumeCarriedSupplies} from '../modules/stores.js';
const ctx={log:()=>{}};
const fixture=pairFixture;
function request(f,refuse=false,kind='food'){
 f.a.needs.hunger=kind==='food'?75:10;if(kind==='medicine'){f.a.health=60;f.h.companions[0].hp=18;}
 f.b.roadSupplies[kind]=kind==='food'?2:3;
 f.b.agenda.sociability=refuse?.1:.8;f.b.agenda.duty=refuse?.1:.8;
 return pairCampCare(f.s,ctx);
}

test('real personal food is spent once and only participants remember the request, independently of hero trust',()=>{
 const f=fixture(),{s,h,a,b,absent}=f;assert.equal(request(f),true);
 assert.equal(a.needs.hunger,27);assert.equal(a.needs.meals,1);assert.equal(b.roadSupplies.food,1);assert.equal(pairFeeling(a,b.id),3);assert.equal(pairFeeling(b,a.id),1);assert.equal(absent.partyRelations,undefined);assert.equal(h.relations[a.id].trust,90);assert.equal(h.companions[0].loyalty,90);
 const saved=serialize(s);assert.equal(pairCampCare(s,ctx),false);assert.equal(serialize(s),saved);assert.equal(serialize(restore(saved)),saved);
});
test('equal hero loyalty yields actual different joint watch after help versus a real refusal',()=>{
 const helped=fixture(),refused=fixture();assert.ok(request(helped,false,'medicine'));assert.ok(request(refused,true,'medicine'));
 for(const f of [helped,refused]){for(let i=0;i<8&&!f.h.pairCamp?.watch;i++)step(f.s);assert.ok(f.h.pairCamp.watch);assert.equal(f.h.companions.length,2);assert.equal(f.h.relations[f.a.id].trust,90);}
 assert.equal(helped.h.pairCamp.watch.outcome,'together');assert.equal(helped.h.mind.stress,17);assert.equal(refused.h.pairCamp.watch.outcome,'separate');assert.equal(refused.h.mind.stress,20);assert.equal(refused.b.roadSupplies.medicine,3);assert.equal(pairFeeling(refused.a,refused.b.id),-3);
});
test('medicine comes from donor, heals only its recipient and is not a cure or a resurrected companion',()=>{
 const f=fixture();f.a.ailment='старый ожог';assert.ok(request(f,false,'medicine'));assert.equal(f.b.roadSupplies.medicine,1);assert.equal(f.a.health,85);assert.equal(f.h.companions[0].hp,26);assert.equal(f.a.ailment,'старый ожог');assert.equal(f.b.health,100);assert.equal(f.h.hp,f.h.maxHp);
});
test('absent, distant, sleeping, exhausted, dead or already occupied people never share a remote event',()=>{
 for(const reason of ['absent','distant','sleep','tired','dead','used']){const f=fixture();f.a.needs.hunger=75;f.b.roadSupplies.food=2;if(reason==='absent')f.b.area='a0';if(reason==='distant')f.b.x=1;if(reason==='sleep')f.b.needs.sleeping=true;if(reason==='tired')f.b.needs.energy=10;if(reason==='dead')f.b.alive=false;if(reason==='used')f.b.partyNeeds={tick:f.s.tick,activity:'eat'};assert.equal(pairCampCare(f.s,ctx),false,reason);assert.equal(f.b.roadSupplies.food,2);assert.equal(f.a.partyRelations,undefined);}
});
test('no actual deficit or transferable stock means no refusal, blame, gift or mandatory camp drama',()=>{
 for(const reason of ['none','empty','own']){const f=fixture();f.b.agenda.sociability=.1;f.b.agenda.duty=.1;if(reason!=='none')f.a.needs.hunger=75;if(reason!=='empty')f.b.roadSupplies.food=2;if(reason==='own')f.a.roadSupplies.food=1;assert.equal(pairCampCare(f.s,ctx),false);assert.equal(f.a.partyRelations,undefined);}
});
test('transit, combat, a non-camp, urgent personal rest and distant rest target block camp activities',()=>{
 for(const reason of ['transit','combat','place','energy','target']){const f=fixture();f.a.needs.hunger=75;f.b.roadSupplies.food=2;if(reason==='transit')f.h.transit={from:'a0',to:f.h.area};if(reason==='combat')f.h.combat='enemy';if(reason==='place')delete f.s.areas[f.h.area].temporaryCamp;if(reason==='energy')f.h.energy=10;if(reason==='target')f.h.goal.area='a0';assert.equal(pairCampCare(f.s,ctx),false,reason);assert.equal(f.a.partyRelations,undefined);}
});
test('one optional watch spends real energy, yields no XP or gold and cannot repeat per camp or after restore',()=>{
 const f=fixture(),{s,h,a,b}=f,before={level:h.level,gold:h.gold,xp:h.xp};assert.ok(pairCampWatch(s,ctx));assert.equal(a.needs.energy,77);assert.equal(b.needs.energy,77);assert.equal(h.energy,59);assert.deepEqual({level:h.level,gold:h.gold,xp:h.xp},before);assert.equal(h.campSession.activity,'pair-watch');const saved=serialize(s);assert.equal(pairCampWatch(s,ctx),false);assert.equal(serialize(s),saved);const loaded=restore(saved);assert.equal(pairCampWatch(loaded,ctx),false);assert.equal(serialize(loaded),saved);
});
test('later real help can reconcile the same pair without an automatic apology or a new person',()=>{
 const f=fixture();assert.ok(request(f,true));f.s.tick++;f.h.counters.camps++;f.a.needs.hunger=27;f.a.roadSupplies.food=1;assert.ok(consumeCarriedSupplies(f.b,null,'food',2));f.b.needs.hunger=75;assert.ok(pairCampCare(f.s,ctx));assert.equal(pairFeeling(f.a,f.b.id),-2);assert.equal(pairFeeling(f.b,f.a.id),3);f.s.tick++;assert.ok(pairCampWatch(f.s,ctx));assert.equal(f.h.pairCamp.watch.outcome,'together');assert.equal(f.a.partyRelations[f.b.id].events.filter(e=>e.kind!=='watch').length,2);
});
test('peaceful party release leaves the same living canonical people and their pair memory intact',()=>{
 const f=fixture();assert.ok(request(f,true));const memory=JSON.stringify(f.a.partyRelations);f.s.tick++;f.a.personalJourney={kind:'visitKin',person:f.h.lineage,target:'a0',origin:f.h.area,status:'active',phase:'together',since:f.s.tick-10,due:f.s.tick};companionGoalsTick(f.s,ctx);assert.equal(f.h.companions.length,1);assert.equal(f.s.people[f.a.id],f.a);assert.ok(f.a.alive&&f.b.alive);assert.equal(JSON.stringify(f.a.partyRelations),memory);assert.equal(f.a.area,f.h.area);assert.equal(f.a.personalJourney.phase,'independent');
});
test('disabled rules preserve memory and supplies without adding camp actions',()=>{
 for(const key of ['party-relations','relationships','camp-life','companions','npc-needs']){const f=fixture();assert.ok(request(f));setModule(f.s,key,false);f.s.tick++;f.h.counters.camps++;const saved=serialize(f.s);assert.equal(pairCampCare(f.s,ctx),false);assert.equal(pairCampWatch(f.s,ctx),false);assert.equal(serialize(f.s),saved);}
});
test('real engine camp actions replay and survive partial-life saves with identical people and stocks',()=>{
 const f=fixture();f.a.needs.hunger=75;f.b.roadSupplies.food=2;let copy=restore(serialize(f.s));for(let i=0;i<24;i++){step(f.s);step(copy);assert.equal(serialize(copy),serialize(f.s));if(i===5)copy=restore(serialize(copy));}assert.equal(pairFeeling(f.a,f.b.id),3);assert.equal(f.a.partyRelations[f.b.id].events.filter(e=>e.kind!=='watch').length,1);
});
test('pair memory saturates without erasing the actual last eight episodes or growing a lifetime log',()=>{
 const f=fixture();for(let i=0;i<20;i++){f.h.counters.camps++;f.s.tick++;f.a.needs.hunger=75;f.a.needs.energy=80;f.b.needs.energy=80;f.b.roadSupplies.food=1;assert.ok(pairCampCare(f.s,ctx));}const r=f.a.partyRelations[f.b.id];assert.equal(r.feeling,12);assert.equal(r.events.length,8);assert.equal(new Set(r.events.map(e=>e.id)).size,8);assert.equal(r.events.at(-1).tick,f.s.tick);
});
test('a dead observed body and a repeated participant ID cannot create a request to itself',()=>{
 const f=fixture();f.a.needs.hunger=75;f.b.roadSupplies.food=2;f.h.alive=false;assert.equal(pairCampCare(f.s,ctx),false);f.h.alive=true;f.h.companions=[f.h.companions[0],{...f.h.companions[0]}];assert.equal(pairCampCare(f.s,ctx),false);assert.equal(f.a.partyRelations,undefined);
});
test('another camp alone cannot repeat a settled proposal or displace other hobbies; a new real episode can',()=>{
 const f=fixture();assert.ok(pairCampWatch(f.s,ctx));f.s.tick++;f.h.counters.camps++;const before=serialize(f.s);assert.equal(pairCampWatch(f.s,ctx),false);assert.equal(serialize(f.s),before);f.a.needs.hunger=75;f.b.roadSupplies.food=1;assert.ok(pairCampCare(f.s,ctx));f.s.tick++;assert.ok(pairCampWatch(f.s,ctx));assert.equal(f.a.partyRelations[f.b.id].lastWatch.basis,f.h.pairCamp.care.id);
});
test('personal memory keeps at most twelve distinct partners after actual separate camp requests',()=>{
 const f=fixture(),donors=Object.values(f.s.people).filter(p=>p.alive&&p.id!==f.a.id&&p.id!==f.h.lineage&&p.role!=='ребёнок').slice(0,13);assert.equal(donors.length,13);const shape=f.h.companions[1];for(const p of donors){f.s.tick++;f.h.counters.camps++;p.status='withHero';p.area=f.h.area;p.x=f.h.x-4;p.needs={hunger:10,energy:80,sleeping:false};p.roadSupplies={food:1};p.agenda.sociability=.8;p.agenda.duty=.8;f.h.companions=[f.h.companions[0],{...shape,person:p.id,id:p.id,uid:p.id,name:p.name}];f.a.needs.hunger=75;assert.ok(pairCampCare(f.s,ctx));}assert.equal(Object.keys(f.a.partyRelations).length,12);assert.equal(f.a.partyRelations[donors[0].id],undefined);assert.equal(f.a.partyRelations[donors.at(-1).id].feeling,3);
});
test('a legacy camp without a numbered session can share and watch once through restore, without inventing past camps',()=>{
 const f=fixture();delete f.h.counters.camps;assert.equal(f.h.pairCamp,undefined);assert.ok(request(f));assert.equal(f.h.counters.camps,undefined);assert.equal(f.h.pairCamp.number,'legacy@'+f.h.area);const raw=serialize(f.s),copy=restore(raw);assert.equal(pairCampCare(copy,ctx),false);assert.equal(serialize(copy),raw);f.s.tick++;assert.ok(pairCampWatch(f.s,ctx));const saved=serialize(f.s),loaded=restore(saved);assert.equal(pairCampWatch(loaded,ctx),false);assert.equal(serialize(loaded),saved);assert.equal(f.h.counters.camps,undefined);
});
