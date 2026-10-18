import test from 'node:test';import assert from 'node:assert/strict';
import {restore,serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {planWork,workMotive,workTick} from '../modules/work.js';
import {quietPlan,quietSignals} from '../modules/residence.js';
import {commissionRepair,quoteRepair,servicePlan,acceptService} from '../modules/resident-orders.js';
import {revealArea} from '../actor-atlas.js';
import {commonFixture,commonContext as ctx} from '../scripts/common-life-scenarios.mjs';
function withoutLegacyFlags(s){const data=JSON.parse(serialize(s));delete data.hero.life.phase;delete data.hero.life.residence.nextOuting;return JSON.stringify(data);}

test('old phase and outing time cannot change the same actual body decisions or resource prefix',()=>{
 const {s}=commonFixture(),other=restore(serialize(s));s.hero.life.phase='resident';s.hero.life.residence.nextOuting=Number.MAX_SAFE_INTEGER;other.hero.life.phase='wandering';other.hero.life.residence.nextOuting=0;
 s.hero.gold=other.hero.gold=2;
 for(let i=0;i<600;i++){step(s);step(other);if(i%29===0)assert.equal(withoutLegacyFlags(s),withoutLegacyFlags(other));}
 assert.equal(withoutLegacyFlags(s),withoutLegacyFlags(other));assert.equal(s.hero.alive,true);assert.ok(s.hero.counters.peacefulWork>0);assert.equal(s.lives.length,0);
});

test('a real cash buffer permits finite paid work; a wealthy supplied master does not work just to grow a counter',()=>{
 const {s,h}=commonFixture(),before=serialize(s);assert.equal(workMotive(s,ctx),null);assert.equal(planWork(s,ctx),false);assert.equal(serialize(s),before);
 h.gold=2;assert.equal(workMotive(s,ctx).kind,'income');assert.ok(planWork(s,ctx));const coins=h.gold,energy=h.energy;while(h.goal){s.tick++;workTick(s,ctx);}assert.equal(h.gold,coins+10);assert.equal(h.energy,energy-10);assert.equal(h.counters.peacefulWork,1);
 h.gold=200;h.workAfter=0;assert.equal(planWork(s,ctx),false);assert.equal(h.counters.peacefulWork,1);
 h.life.nextMastery={profession:'clockmaker',rank:4};assert.equal(workMotive(s,ctx).kind,'learning');assert.ok(planWork(s,ctx));h.career.rank=4;h.goal=null;assert.equal(workMotive(s,ctx),null);
});

test('a customer hires the same qualified travelling master without a residence record or lifestyle permission',()=>{
 const {s,h,a,o}=commonFixture();delete h.life.residence;delete h.life.home;h.life.phase='wandering';setModule(s,'lifecycle',false);setModule(s,'work-orders',true);setModule(s,'property-damage',true);
 const p=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.area===a.id);Object.assign(p,{status:'resident',x:42});Object.assign(p.agenda,{job:'artisan',wealth:40,duty:.5,task:null});o.owner=p.id;o.state='burned';o.damagedAt=s.tick;o.offer=null;a.civic.tools=1;
 assert.ok(commissionRepair(s,p,o));quoteRepair(s,p,p.agenda.task,ctx);assert.ok(servicePlan(s,ctx));assert.ok(acceptService(s,ctx));assert.equal(p.agenda.wealth,16);assert.equal(Object.values(s.workOrders)[0].escrow,24);assert.equal(h.life.residence,undefined);
});

test('a real remembered obligation interrupts quiet time and uses the ordinary preparation plan',()=>{
 const {s,h}=commonFixture();setModule(s,'commitments',true);setModule(s,'finances',true);h.memory.merchant='a1';revealArea(s,'a1');h.weapon=1;h.memory.shopAfter=0;assert.ok(quietPlan(s,ctx));const old=h.goal.signals;
 h.commitments.personal={kind:'weapon',status:'active',target:2,since:s.tick,cause:'actual-retreat',decision:null};assert.notEqual(quietSignals(s),old);step(s);assert.equal(h.goal.kind,'trade');assert.equal(h.goal.commitment,'actual-retreat');assert.notEqual(h.lastAction,'rest');assert.equal(h.counters.peacefulWork||0,0);
});

test('an actually quoted local repair interrupts quiet time before its old twelve tick wait expires',()=>{
 const {s,h,a,o}=commonFixture();setModule(s,'work-orders',true);setModule(s,'property-damage',true);const p=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.area===a.id);p.x=42;p.status='resident';Object.assign(p.agenda,{job:'artisan',wealth:40,duty:.5,task:null});o.owner=p.id;o.state='burned';o.damagedAt=0;o.offer=null;a.civic.tools=1;assert.ok(quietPlan(s,ctx));assert.ok(commissionRepair(s,p,o));quoteRepair(s,p,p.agenda.task,ctx);step(s);assert.equal(Object.values(s.workOrders)[0].status,'active');assert.equal(h.lastAction,'talk');assert.equal(s.tick,1);
});

test('the concrete existing food shortage motivates work only while its real civic result is missing',()=>{
 const {s,h,a}=commonFixture();h.profession='merchant';setModule(s,'events',true);a.civic.food=30;assert.equal(workMotive(s,ctx).kind,'need');assert.ok(planWork(s,ctx));while(h.goal){s.tick++;workTick(s,ctx);}assert.equal(a.civic.food,35);h.workAfter=0;assert.equal(workMotive(s,ctx),null);assert.equal(planWork(s,ctx),false);
});
