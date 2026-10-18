import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty,transferProperty,workspaceAccess} from '../modules/property.js';
import {propertyGiftPlan,propertyGiftTarget,propertyGiftAction,propertyGiftsTick} from '../modules/property-gifts.js';
import {peopleTick,peopleArea} from '../modules/people.js';
import {civicArea} from '../modules/society.js';
const ctx={route,knownRoute,log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};}};
function fixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['property','property-gifts','identity','finances'])setModule(s,id,true);
 const h=s.hero,a=s.areas.a6;Object.assign(h,{area:a.id,x:42,gold:50,energy:100,hp:h.maxHp,profession:'clockmaker',goal:null});h.career.path='peaceful';h.career.rank=3;h.personality.curiosity=.4;h.habits=[];h.money.style='carefree';
 const o=workshopAt(s,a),p=s.people[o.owner];p.x=42;p.health=p.maxHealth||100;p.ailment=null;Object.assign(p.agenda,{duty:.1,sociability:.8,curiosity:.2,visits:4,wealth:17,tools:1,due:0,task:null});
 for(const area of Object.values(s.areas))if(area.civic){area.civic.treasury=0;area.civic.food=100;}
 const destination=s.areas.a2;destination.type='village';destination.city=destination.id;civicArea(s,destination);peopleArea(s,destination);destination.discovered=true;destination.civic.treasury=60;for(const e of destination.objects.filter(o=>o.kind==='enemy'))e.alive=false;
 h.memory.people.push(p.id);h.relations[p.id]={trust:24,helped:2,met:0,lastSeen:0};observeProperty(s,a);
 return{s,h,a,o,p,destination};
}
function depart(f){const{s,p,destination}=f;p.status='wandering';p.agenda.task={kind:'relocate',target:destination.id,x:42,remaining:1};}
function offer(f){depart(f);assert.equal(propertyGiftPlan(f.s,ctx),true);assert.equal(propertyGiftAction(f.s,ctx),true);assert.equal(f.o.gift.status,'offered');}
test('trust or spare wealth alone never gives property; a genuine departure and familiar capable recipient are required',()=>{
 const f=fixture(),{s,h,p,o}=f;p.agenda.wealth=10000;assert.equal(propertyGiftPlan(s,ctx),false);depart(f);h.relations[p.id].helped=0;assert.equal(propertyGiftPlan(s,ctx),false);assert.equal(o.gift,undefined);
 h.relations[p.id].helped=2;h.career.rank=1;assert.equal(propertyGiftPlan(s,ctx),false);assert.equal(o.owner,p.id);
});
test('a real NPC relocation decision and autonomous hero actions transfer the same workshop once without changing money, tools or damage',()=>{
 const f=fixture(),{s,h,a,o,p,destination}=f;setModule(s,'people',true);for(const q of Object.values(s.people))if(q.id!==p.id&&q.id!==h.lineage)q.status='absent';
 s.tick=7;for(let i=0;i<20&&o.owner!==h.lineage;i++)step(s);assert.equal(p.agenda.task.kind,'relocate');assert.equal(p.agenda.task.target,destination.id);assert.equal(o.owner,h.lineage);assert.equal(o.gift.status,'done');assert.equal(o.history.filter(e=>e.kind==='gift').length,1);assert.equal(o.history.at(-1).basis,'gift');assert.equal(o.offer,null);assert.equal(h.gold,50);assert.equal(p.agenda.wealth,17);assert.equal(p.agenda.tools,1);assert.equal(a.civic.tools,3);assert.equal(a.civic.treasury,0);
 const loaded=restore(serialize(s));assert.equal(serialize(loaded),serialize(s));assert.equal(propertyGiftPlan(loaded,ctx),false);assert.equal(loaded.areas[a.id].objects.filter(o=>o.kind==='workshop').length,1);
});
test('the recipient can refuse another life commitment; the saved refusal preserves title and prevents a repeated offer',()=>{
 const f=fixture(),{s,h,o,p}=f;h.career.path='adventure';offer(f);assert.equal(o.owner,p.id);assert.equal(propertyGiftAction(s,ctx),true);assert.equal(o.gift.status,'declined');assert.equal(o.owner,p.id);assert.equal(h.gold,50);assert.equal(propertyGiftPlan(s,ctx),false);
 const loaded=restore(serialize(s));assert.equal(propertyGiftPlan(loaded,ctx),false);assert.equal(loaded.areas[f.a.id].objects.find(q=>q.id===o.id).owner,p.id);
});
test('an unaffordable damaged gift is refused; an affordable one keeps its damage and requires a real later repair',()=>{
 for(const affordable of [false,true]){const f=fixture(),{s,h,a,o,p}=f;o.state='burned';o.damagedAt=0;setModule(s,'property-damage',true);if(!affordable){a.civic.tools=0;h.gold=0;}offer(f);propertyGiftAction(s,ctx);assert.equal(o.gift.status,affordable?'done':'declined');assert.equal(o.owner,affordable?h.lineage:p.id);assert.equal(o.state,'burned');assert.equal(o.repair,undefined);assert.equal(a.civic.tools,affordable?3:0);assert.equal(h.gold,affordable?50:0);}
});
test('an offered gift survives save and disabling without executing; ordinary purchase cannot bypass its reservation',()=>{
 const f=fixture(),{s,h,o,p}=f;h.gold=200;o.offer={owner:p.id,price:120,since:0};offer(f);assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:120}),null);setModule(s,'property-gifts',false);const saved=JSON.stringify(o.gift);assert.equal(propertyGiftAction(s,ctx),false);propertyGiftsTick(s,ctx);assert.equal(JSON.stringify(o.gift),saved);assert.equal(o.owner,p.id);
 const loaded=restore(serialize(s));setModule(loaded,'property-gifts',true);assert.equal(propertyGiftPlan(loaded,ctx),true);assert.equal(propertyGiftAction(loaded,ctx),true);assert.equal(loaded.areas[f.a.id].objects.find(q=>q.id===o.id).owner,h.lineage);
});
test('death, departure, changed intent, another owner or withdrawn terms prevent a promised gift from becoming a title',()=>{
 for(const cause of ['death','left','intent','owner','quote']){const f=fixture(),{s,h,o,p,destination}=f;offer(f);if(cause==='death')p.alive=false;if(cause==='left')p.area=destination.id;if(cause==='intent')p.agenda.task=null;if(cause==='owner')o.owner='another-owner';if(cause==='quote')o.offer={owner:p.id,price:999,since:s.tick};
  propertyGiftsTick(s,ctx);if(cause==='quote')propertyGiftAction(s,ctx);else assert.equal(propertyGiftTarget(s,ctx),false);assert.equal(o.gift.status,'cancelled');assert.notEqual(o.owner,h.lineage);assert.equal(h.gold,50);assert.equal(p.agenda.wealth,17);assert.equal(o.history.filter(e=>e.kind==='gift').length,0);
 }
});
test('a repair agreement blocks a competing gift; no transfer is possible without both actual consents',()=>{
 const f=fixture(),{s,h,o,p}=f;depart(f);o.contract='prior';s.propertyContracts.prior={status:'active',buyer:'another-buyer'};assert.equal(propertyGiftPlan(s,ctx),false);o.contract=null;offer(f);assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:0,basis:'gift',gift:o.gift.id}),null);o.gift.status='accepted';assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:0,basis:'gift',gift:o.gift.id}),null);assert.equal(o.owner,p.id);assert.equal(h.gold,50);
});
test('a previously paid lease remains usable after the title gift without charging either party again',()=>{
 const f=fixture(),{s,h,o,p}=f;offer(f);propertyGiftAction(s,ctx);h.goal={kind:'work',job:'repair',workspace:{kind:'lease',id:o.id,until:s.tick+60}};const before=h.gold;assert.equal(workspaceAccess(s,ctx),'ready');assert.equal(h.gold,before);assert.equal(p.agenda.wealth,17);assert.equal(h.goal.workspace.kind,'lease');
});
test('an intact free gift needs no invented fee or spare cash, and older ownership history survives a later owner offer',()=>{
 const f=fixture(),{s,h,o,p}=f;h.gold=0;o.gift={id:'earlier-gift',from:'previous-owner',to:p.id,status:'done'};const old={id:'old-act',kind:'gift',from:'previous-owner',owner:p.id,consent:{giver:0,recipient:0},departure:'a0',gift:'earlier-gift'};o.history.push(old);const prior=JSON.stringify(old);offer(f);assert.equal(propertyGiftAction(s,ctx),true);assert.equal(o.owner,h.lineage);assert.equal(h.gold,0);assert.equal(JSON.stringify(o.history.find(e=>e.id==='old-act')),prior);assert.deepEqual(o.history.at(-1).consent,{giver:0,recipient:0});assert.equal(o.history.at(-1).departure,f.destination.id);
});
