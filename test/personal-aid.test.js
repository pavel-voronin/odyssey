import test from 'node:test';import assert from 'node:assert/strict';
import {aidFixture,aidCargoFixture} from '../scripts/aid-scenarios.mjs';
import {commonContext as ctx} from '../scripts/common-life-scenarios.mjs';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {medicalKnowledge,aidAssessment,planAidRequest,finishAidRequest,performAid} from '../modules/personal-aid.js';
function until(f,predicate,limit=160){for(let i=0;i<limit&&!predicate();i++)step(f.s);assert.ok(predicate());}

test('a real wounded NPC asks through its personal action and the former healer uses one real herb without changing professions',()=>{
 const f=aidFixture(),{s,h,p}=f,coins=h.gold,rank=h.career.rank,xp=h.xp;until(f,()=>p.aidRequest?.status==='helped');
 assert.equal(h.profession,'clockmaker');assert.equal(h.career.rank,rank);assert.equal(p.health,53);assert.equal(h.inventory.herbs,0);assert.equal(h.inventory.potions,0);assert.equal(p.aidRequest.recovered,28);assert.equal(p.aidRequest.knowledge,'alchemist');assert.equal(p.aidRequest.resource,'herbs');assert.equal(h.gold,coins);assert.equal(h.xp,xp+3);assert.equal(h.counters.kindness,1);assert.equal(p.agenda.bonds[h.lineage],4);assert.equal(h.relations[p.id].trust,4);assert.equal(p.actionControl.owner,'personal');assert.ok(p.needs.hunger>10);assert.ok(p.needs.energy<90);assert.ok(h.energy<100);assert.ok(p.navigation.contacts.some(c=>c.person===h.lineage&&c.medical));
 const hp=p.health;for(let i=0;i<80;i++)step(s);assert.equal(p.health,hp);assert.equal(h.inventory.herbs,0);assert.equal(h.counters.kindness,1);
});

test('equal herbs cannot give an untrained person the same medical knowledge or a free recovery',()=>{
 const f=aidFixture({trained:false}),{s,h,p}=f,xp=h.xp;assert.equal(medicalKnowledge(s,h),null);until(f,()=>p.aidRequest?.status==='declined');assert.equal(h.inventory.herbs,1);assert.equal(p.health,25);assert.equal(h.xp,xp);assert.equal(h.counters.kindness||0,0);assert.match(p.aidRequest.reason,/знаний/);
});

test('a real available clinic handles the wound instead of inventing a request to the adventurer',()=>{
 const f=aidFixture({clinic:8}),{p,h,a}=f;until(f,()=>p.health>25);assert.equal(p.aidRequest,undefined);assert.equal(h.inventory.herbs,1);assert.ok(a.civic.medicine<8);assert.equal(h.counters.kindness||0,0);
});

test('one existing potion is an expensive available alternative without granting a profession or herbal skill',()=>{
 const f=aidFixture({trained:false}),{h,p}=f;h.inventory.potions=1;until(f,()=>p.aidRequest?.status==='helped');assert.equal(p.health,50);assert.equal(h.inventory.potions,0);assert.equal(h.inventory.herbs,1);assert.equal(p.aidRequest.knowledge,null);assert.equal(h.profession,'clockmaker');
});

test('other obligations and resources change a real decision while the assessment itself changes no state',()=>{
 const f=aidFixture(),{s,h,p}=f;assert.ok(planAidRequest(s,p));finishAidRequest(s,p,p.agenda.task,ctx);const before=serialize(s);assert.equal(aidAssessment(s,h,p).help,true);assert.equal(serialize(s),before);
 s.workOrders.test={id:'test',status:'active',helper:h.lineage,deadline:s.tick+30};h.personality.generosity=.2;assert.equal(aidAssessment(s,h,p).help,false);h.personality.generosity=1;assert.equal(aidAssessment(s,h,p).help,true);h.energy=20;assert.equal(aidAssessment(s,h,p).help,false);h.energy=100;h.inventory.herbs=0;assert.equal(aidAssessment(s,h,p).help,false);
});

test('an interrupted aid never consumes supplies after a death, disappearance or a disabled mechanism',()=>{
 for(const reason of ['gone','dead','zeroHP','role','off']){const f=aidFixture(),{s,h,p}=f;until(f,()=>p.aidRequest?.status==='agreed');const herbs=h.inventory.herbs,hp=p.health;if(reason==='gone')p.area='a1';else if(reason==='dead'){p.alive=false;p.health=0;}else if(reason==='zeroHP')p.health=0;else if(reason==='role')s.logistics.convoys.push({id:'new-carrier',person:p.id,from:p.area,to:p.area,remaining:30});else setModule(s,'personal-aid',false);const actual=p.health;assert.equal(performAid(s,ctx),false);assert.equal(h.inventory.herbs,herbs);assert.equal(p.health,actual);assert.equal(h.goal,null);assert.equal(h.counters.kindness||0,0);assert.equal(hp,25);}
});

test('a wounded caravan-owned person cannot be reassigned to a personal medical visit even with arbitration off',()=>{
 const f=aidFixture(),{s,p}=f;s.logistics.convoys.push({id:'actual-owned',person:p.id,from:p.area,to:p.area,status:'moving',remaining:30,cargo:{}});setModule(s,'npc-control',false);const task=p.agenda.task={kind:'work',remaining:2,target:p.area,x:p.x};assert.equal(planAidRequest(s,p),false);assert.equal(p.agenda.task,task);assert.equal(p.aidRequest,undefined);
});

test('a saved accepted request finishes exactly once and an NPC observer receives the same real health result',()=>{
 let f=aidFixture();until(f,()=>f.p.aidRequest?.status==='agreed');const save=serialize(f.s);let loaded=restore(save);assert.equal(serialize(loaded),save);for(let i=0;i<50;i++){step(f.s);step(loaded);}assert.equal(serialize(f.s),serialize(loaded));assert.equal(f.p.aidRequest.status,'helped');assert.equal(f.h.inventory.herbs,0);
 const other=aidFixture();assert.ok(observeExistingPerson(other.s,other.p.id));until(other,()=>other.p.aidRequest?.status==='helped');assert.equal(other.s.hero.lineage,other.p.id);assert.equal(other.s.hero.hp,53);assert.equal(other.h.inventory.herbs,0);assert.equal(other.h.counters.kindness,1);
});

test('help can interrupt a real material carrier and the same owned tool still completes the original repair',()=>{
 const f=aidCargoFixture({generosity:1}),{s,h,c,patient,p}=f,tool={...h.workMaterials.cargo[0]};until(f,()=>patient.aidRequest?.status==='helped');assert.equal(patient.health,53);assert.deepEqual(h.workMaterials.cargo,[tool]);assert.equal(c.escrow,21);assert.equal(c.status,'active');assert.equal(tool.owner,p.id);assert.equal(h.inventory.herbs,0);until(f,()=>c.status==='done');assert.equal(c.paid,6);assert.equal(c.materialsPaid,18);assert.equal(h.workMaterials.cargo.length,0);assert.equal(h.counters.customerWork,1);assert.equal(s.lives.length,0);
});

test('two real priorities diverge under a tight feasible deadline instead of deleting the old work or the cargo',()=>{
 const baseline=aidCargoFixture();setModule(baseline.s,'personal-aid',false);until(baseline,()=>baseline.c.status==='done');const deadline=baseline.s.tick+2;
 const results=[];for(const generosity of [1,.2]){const f=aidCargoFixture({generosity}),{h,c,patient,o}=f;c.deadline=deadline;until(f,()=>['done','cancelled'].includes(c.status));results.push({help:patient.aidRequest?.status,health:patient.health,status:c.status,fee:c.paid||0,refund:c.refunded||0,herbs:h.inventory.herbs,cargo:h.workMaterials.cargo.length,gold:h.gold,materials:c.materialsPaid,partial:o.repair?.remaining||0});}
 assert.deepEqual(results.map(r=>r.help),['helped','declined']);assert.deepEqual(results.map(r=>r.status),['cancelled','done']);assert.deepEqual(results.map(r=>r.fee),[0,6]);assert.deepEqual(results.map(r=>r.refund),[6,0]);assert.deepEqual(results.map(r=>r.cargo),[0,0]);assert.deepEqual(results.map(r=>r.health),[53,25]);assert.equal(results[0].materials,18);assert.ok(results[0].partial>0,'paid material and partial real work remain in the building');
});

test('the patient tries its own old medical address and cannot acquire the helper current remote coordinates',()=>{
 const f=aidFixture(),{s,h,p,a}=f;until(f,()=>p.aidRequest?.status==='helped');const contact=p.navigation.contacts.find(c=>c.person===h.lineage),address={area:contact.area,x:contact.x};h.area='a1';h.x=42;h.goal={kind:'routeWait',area:h.area,x:h.x,until:10000};syncActiveActor(s);p.health=25;p.aidAfter=0;p.agenda.due=0;p.agenda.task=null;
 until(f,()=>contact.missingAt!=null);assert.equal(contact.area,address.area);assert.equal(contact.x,address.x);assert.equal(p.area,a.id);assert.notEqual(p.area,h.area);assert.equal(p.aidRequest.status,'helped');assert.equal(p.health,25);assert.equal(h.inventory.herbs,0);assert.ok(p.agenda.knowledge.some(n=>n.text.includes('местоположение неизвестно')));
});

test('a wounded patient walks its own recorded road to the remembered helper instead of teleporting or creating another body',()=>{
 const f=aidFixture(),{s,h,p,a}=f;until(f,()=>p.aidRequest?.status==='helped');const count=s.nextPerson;p.area=a.links[0];p.x=95;s.areas[p.area].civic.medicine=0;observeNPCPlace(s,p);const origin=p.area;p.health=25;p.aidAfter=0;p.agenda.due=0;p.agenda.task=null;const first=p.aidRequest.id;
 step(s);assert.equal(p.area,origin);assert.notEqual(p.area,h.area);until(f,()=>p.aidRequest.id!==first&&p.aidRequest.status==='declined',240);assert.equal(p.area,h.area);assert.equal(p.area,a.id);assert.equal(p.health,25);assert.equal(h.inventory.herbs,0);assert.equal(s.nextPerson,count);assert.ok(p.needs.energy<90);
});

test('the same heard request cannot be paid with herbs twice or through an unrelated goal',()=>{
 const f=aidFixture(),{s,h,p}=f;until(f,()=>p.aidRequest?.status==='agreed');h.x=p.x;h.inventory.herbs=2;const original={...h.goal};h.goal.kind='trade';assert.equal(performAid(s,ctx),false);assert.equal(p.health,25);assert.equal(h.inventory.herbs,2);h.goal={...original};assert.equal(performAid(s,ctx),true);assert.equal(p.health,53);assert.equal(h.inventory.herbs,1);h.goal={...original};assert.equal(performAid(s,ctx),false);assert.equal(p.health,53);assert.equal(h.inventory.herbs,1);assert.equal(h.counters.kindness,1);
});
