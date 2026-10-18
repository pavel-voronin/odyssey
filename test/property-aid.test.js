import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,restore,serialize,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {observeProperty,workshopAt,workspaceAccess,transferProperty} from '../modules/property.js';
import {propertyAidPlan,propertyAidAction,propertyAidTarget,propertyAidTick} from '../modules/property-aid.js';
const ctx={route,knownRoute,log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};}};
function fixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['property','property-aid','identity','finances'])setModule(s,id,true);
 const h=s.hero,a=s.areas.a6;Object.assign(h,{area:a.id,x:42,gold:200,energy:100,hp:h.maxHp,goal:null});h.personality.generosity=.9;h.money.style='carefree';
 const o=workshopAt(s,a),p=s.people[o.owner],q=a.population.map(id=>s.people[id]).find(p=>p?.alive&&p.id!==o.owner&&p.id!==h.lineage&&p.role!=='ребёнок');p.x=42;p.agenda.wealth=17;o.offer={owner:p.id,price:120,since:0};
 Object.assign(q,{area:a.id,x:42,status:'resident'});Object.assign(q.agenda,{job:'artisan',work:12,tools:1,duty:.8,curiosity:.2,wealth:5,task:null});h.memory.people.push(q.id);h.relations[q.id]={trust:24,helped:2,met:0,lastSeen:0};observeProperty(s,a);
 return{s,h,a,o,p,q};
}
function ask(f){assert.equal(propertyAidPlan(f.s,ctx),true);assert.equal(propertyAidAction(f.s,ctx),true);assert.equal(f.o.aid.status,'requested');return f.o.aid;}
function agree(f){const c=ask(f);assert.equal(propertyAidAction(f.s,ctx),true);assert.equal(c.status,'agreed');return c;}
test('real need and a physical consenting recipient precede a three-party purchase, with one exact payment and no automatic payer access',()=>{
 const f=fixture(),{s,h,o,p,q}=f,c=agree(f);assert.equal(h.gold,200);assert.equal(o.owner,p.id);assert.equal(q.agenda.wealth,5);assert.equal(c.consent.recipient,0);
 assert.equal(propertyAidAction(s,ctx),true);assert.equal(o.owner,q.id);assert.equal(h.gold,80);assert.equal(p.agenda.wealth,137);assert.equal(q.agenda.wealth,5);assert.equal(o.aid.status,'done');assert.equal(o.offer,null);assert.equal(o.history.at(-1).payer,h.lineage);assert.equal(o.history.at(-1).owner,q.id);assert.equal(o.history.at(-1).basis,'sponsored-purchase');assert.equal(o.history.filter(e=>e.aid===c.id).length,1);
 h.goal={kind:'work',job:'repair',remaining:5};assert.equal(workspaceAccess(s,ctx),'leased');assert.equal(h.gold,78);assert.equal(q.agenda.wealth,7);assert.equal(h.goal.workspace.kind,'lease');assert.equal(propertyAidAction(s,ctx),false);
});
test('normal engine actions can pay for another while the payer already owns a different workshop',()=>{
 const f=fixture(),{s,h,a,o,p,q}=f;s.areas.a7.objects.push({...structuredClone(o),id:'older-owned-workshop',owner:h.lineage,offer:null,history:[]});
 for(let i=0;i<40&&o.owner!==q.id;i++)step(s);assert.equal(o.owner,q.id);assert.equal(h.gold,80);assert.equal(p.agenda.wealth,137);assert.equal(s.areas.a7.objects.find(o=>o.id==='older-owned-workshop').owner,h.lineage);assert.equal(o.history.filter(e=>e.kind==='purchase').length,1);assert.equal(s.areas[a.id].objects.filter(o=>o.kind==='workshop').length,1);
});
test('the same actual request can be refused for personality or insufficient free money without an endless repeated work target',()=>{
 for(const reason of ['character','money']){const f=fixture(),{s,h,o,p}=f,c=ask(f);if(reason==='character')h.personality.generosity=0;else h.gold=119;const before=h.gold;propertyAidAction(s,ctx);assert.equal(c.status,'declined');assert.equal(h.gold,before);assert.equal(p.agenda.wealth,17);assert.equal(o.owner,p.id);assert.equal(propertyAidPlan(s,ctx),false);assert.equal(propertyAidPlan(restore(serialize(s)),ctx),false);}
});
test('a novice, wealthy stranger, transient or existing owner cannot be used as a pretext to transfer title to another',()=>{
 for(const condition of ['novice','wealth','stranger','travelling','owner']){const f=fixture(),{s,o,q}=f;if(condition==='novice')q.agenda.work=11;if(condition==='wealth')q.agenda.wealth=120;if(condition==='stranger'){s.hero.relations[q.id].helped=0;s.people[s.hero.lineage].parents=[];q.parents=[];}if(condition==='travelling')q.status='wandering';if(condition==='owner')s.areas.a7.objects.push({...structuredClone(o),id:'recipient-workshop',owner:q.id,offer:null});assert.equal(propertyAidPlan(s,ctx),false);assert.equal(o.aid,undefined);}
});
test('seller price, title or presence and recipient life, consent or continuing need are rechecked before money moves',()=>{
 for(const cause of ['price','owner','seller-away','seller-dead','recipient-dead','recipient-away','withdrawn','new-funds','new-career','budget']){const f=fixture(),{s,h,o,p,q}=f,c=agree(f);
  if(cause==='price')o.offer.price=121;if(cause==='owner')o.owner='another-owner';if(cause==='seller-away')p.area='a1';if(cause==='seller-dead')p.alive=false;if(cause==='recipient-dead')q.alive=false;if(cause==='recipient-away')q.area='a1';if(cause==='withdrawn')c.consent.recipient=null;if(cause==='new-funds')q.agenda.wealth=120;if(cause==='new-career')q.agenda.job='scholar';if(cause==='budget')h.gold=119;
  const before=h.gold;propertyAidTick(s,ctx);propertyAidAction(s,ctx);assert.notEqual(o.owner,q.id,cause);assert.equal(h.gold,before,cause);assert.equal(p.agenda.wealth,17,cause);assert.notEqual(c.status,'done',cause);assert.equal(o.history.filter(e=>e.kind==='purchase').length,0,cause);
 }
});
test('an agreement survives saves and disabled time, then expires after only its remaining active duration',()=>{
 const f=fixture(),{s,o}=f,c=agree(f);s.tick=120;propertyAidTick(s,ctx);assert.equal(c.remaining,120);setModule(s,'property-aid',false);s.tick+=1000;propertyAidTick(s,ctx);assert.equal(c.remaining,120);assert.equal(propertyAidAction(s,ctx),false);assert.equal(c.status,'agreed');
 const loaded=restore(serialize(s));assert.equal(serialize(loaded),serialize(s));setModule(loaded,'property-aid',true);loaded.tick+=120;propertyAidTick(loaded,ctx);const room=loaded.areas[f.a.id].objects.find(q=>q.id===o.id);assert.equal(room.aid.status,'cancelled');assert.equal(loaded.hero.gold,200);assert.equal(room.owner,f.p.id);
});
test('remote or missing consent, a competing repair agreement and a direct payer title cannot bypass the shared final transfer',()=>{
 const f=fixture(),{s,h,o,p,q}=f;agree(f);let arg={id:o.id,seller:p.id,price:120,recipient:q.id,aid:o.aid.id};setModule(s,'property-aid',false);assert.equal(transferProperty(s,ctx,arg),null);setModule(s,'property-aid',true);o.aid.consent.recipient=null;assert.equal(transferProperty(s,ctx,arg),null);o.aid.consent.recipient=0;
 o.contract='competing';s.propertyContracts.competing={status:'active',buyer:'someone-else'};assert.equal(transferProperty(s,ctx,arg),null);o.contract=null;assert.equal(transferProperty(s,ctx,{...arg,recipient:h.lineage}),null);assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:120}),null);assert.equal(h.gold,200);assert.equal(o.owner,p.id);
});
