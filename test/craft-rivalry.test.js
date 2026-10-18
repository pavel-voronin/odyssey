import test from 'node:test';import assert from 'node:assert/strict';
import {rivalryFixture,offerBoth,chooseRival,rivalryContext as ctx} from '../scripts/craft-rivalry-scenarios.mjs';
import {postKnifeOrder,applyKnifeOrder,reserveKnifeOrder,deliverKnifeOrder,rivalryTick,rivalryTurn} from '../modules/craft-rivalry.js';
import {serialize,restore,step} from '../engine.js';import {peopleTick} from '../modules/people.js';import {setModule} from '../rules.js';
import {craftRespect} from '../modules/craft-respect.js';import {guardWeapon} from '../modules/commissioned-orders.js';
import {presentItem} from '../modules/item-originals.js';import {productionSources} from '../modules/goods.js';
import {startKnife,workKnife} from '../modules/forging.js';import {workshopSite} from '../modules/workshop-place.js';
import {npcLooseItems,actorItemLocation} from '../modules/item-originals.js';import {syncActiveActor} from '../actor-projection.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
const total=f=>f.h.gold+f.p.agenda.wealth+f.client.agenda.wealth+f.a.civic.treasury+(f.client.rivalOrder?.escrow||0);
test('two real witnessed candidates apply locally, and the same client selects one proven master and one finite deposit',()=>{
 const f=rive(),money=total(f),client=f.client.agenda.wealth,q=offerBoth(f);assert.equal(q.bids.length,2);assert.equal(q.escrow,0);assert.equal(q.winner,null);assert.equal(f.client.agenda.wealth,client);assert.equal(craftRespect(f.s,f.client.id,f.p.id),12);assert.equal(craftRespect(f.s,f.client.id,f.h.lineage),6);
 f.s.tick=q.closes;assert.equal(reserveKnifeOrder(f.s,f.client,ctx),true);assert.equal(q.winner,f.p.id);assert.equal(q.escrow,10);assert.equal(f.client.agenda.wealth,client-10);assert.equal(total(f),money);assert.equal(reserveKnifeOrder(f.s,f.client,ctx),false);assert.equal(f.s.people[f.h.lineage].rivalJob.status,'lost');assert.equal(f.h.companions.length,0);exact(f.s);
});
function rive(options){return rivalryFixture(options);}
test('illness, witnessed mastery and the quoted remaining time each change who can receive that same one reservation',()=>{
 const ill=rive(),q=offerBoth(ill);ill.p.health=1;ill.s.tick=q.closes;assert.equal(reserveKnifeOrder(ill.s,ill.client,ctx),true);assert.equal(q.winner,ill.h.lineage);exact(ill.s);
 const skilled=rive({heroSkill:2,rivalSkill:1}),better=chooseRival(skilled);assert.equal(better.winner,skilled.h.lineage);exact(skilled.s);
 const late=rive(),short=offerBoth(late);late.s.tick=short.deadline-20;assert.equal(reserveKnifeOrder(late.s,late.client,ctx),true);assert.equal(short.winner,late.h.lineage);exact(late.s);
});
test('the reserved ordinary artisan really spends warehouse material and work phases, moves the same knife and receives only one payment',()=>{
 const f=rive(),q=chooseRival(f),money=total(f),gold=f.p.agenda.wealth,raw=productionSources(f.s,f.a).materials,stock=raw.stock;
 for(let n=0;n<24&&q.status==='reserved';n++){f.s.tick=Math.floor(f.s.tick/8)*8+8;peopleTick(f.s,ctx);rivalryTick(f.s);}
 assert.equal(q.status,'done');assert.equal(q.winner,f.p.id);assert.equal(q.paid,10);assert.equal(q.escrow,0);assert.equal(raw.stock,stock-2);assert.equal(f.p.agenda.wealth,gold+4);assert.equal(total(f),money);const item=guardWeapon(f.s,f.client);assert.equal(item.id,q.item);assert.equal(item.manufacture.master,f.p.id);assert.equal(presentItem(f.s,item.id).id,f.client.id);assert.equal(deliverKnifeOrder(f.s,f.p,ctx),false);exact(f.s);
});
test('the selected living hero completes an actual autonomous short forging and delivery path instead of receiving an abstract reward',()=>{
 const f=rive({heroSkill:2,rivalSkill:1}),q=chooseRival(f),gold=f.h.gold;for(let n=0,checked=false;n<32&&q.status==='reserved';n++){step(f.s);if(!checked&&f.h.goal?.kind==='rivalDelivery'){exact(f.s);checked=true;}}assert.equal(q.status,'done');assert.equal(q.winner,f.h.lineage);assert.equal(f.h.gold,gold+4);assert.equal(guardWeapon(f.s,f.client).id,q.item);exact(f.s);
});
test('the same losing artisan can resent the result and actually resumes personal work elsewhere without copying the hero level',()=>{
 const f=rive({heroSkill:2,rivalSkill:1});f.p.agenda.sociability=.2;const bond=f.p.agenda.bonds[f.h.lineage]||0,q=chooseRival(f),identity={id:f.p.id,race:f.p.race,parents:[...f.p.parents],max:f.p.maxHealth||100,job:f.p.agenda.job};assert.equal(q.winner,f.h.lineage);assert.equal(f.p.rivalHistory.at(-1).outcome,'resentment');assert.equal(f.p.agenda.bonds[f.h.lineage],bond-2);f.h.level=80;f.h.area='a1';f.h.x=42;syncActiveActor(f.s);f.s.tick+=8;peopleTick(f.s,ctx);assert.ok(f.p.forging?.active||f.p.agenda.task);assert.deepEqual({id:f.p.id,race:f.p.race,parents:f.p.parents,max:f.p.maxHealth||100,job:f.p.agenda.job},identity);assert.equal(f.h.companions.length,0);exact(f.s);
});
test('an already armed guard, a poor guard, an unknown craftsperson and distant or busy applicants do not mint a need or spend money',()=>{
 const armed=rive();assert.ok(startKnife(armed.s,armed.p,workshopSite(armed.s,armed.a,armed.o.id),ctx));for(let n=0;n<6&&armed.p.forging.active;n++){armed.s.tick++;workKnife(armed.s,armed.p,ctx);}const i=npcLooseItems(armed.s,armed.p).find(i=>i.toolKind==='knife');npcLooseItems(armed.s,armed.p).splice(npcLooseItems(armed.s,armed.p).indexOf(i),1);npcLooseItems(armed.s,armed.client).push(i);actorItemLocation(armed.s,i,armed.client.id);assert.equal(postKnifeOrder(armed.s,armed.client,ctx),null);exact(armed.s);
 const poor=rive();poor.client.agenda.wealth=15;assert.equal(postKnifeOrder(poor.s,poor.client,ctx),null);const unknown=rive({heroSkill:0,rivalSkill:0});assert.equal(postKnifeOrder(unknown.s,unknown.client,ctx),null);
 const far=rive(),q=postKnifeOrder(far.s,far.client,ctx),raw=productionSources(far.s,far.a).materials,stock=raw.stock,gold=far.h.gold;far.h.x=100;far.s.tick++;assert.equal(applyKnifeOrder(far.s,far.s.people[far.h.lineage],far.client,ctx),false);far.p.agenda.task={kind:'study',target:far.a.id,x:42,remaining:3};assert.equal(applyKnifeOrder(far.s,far.p,far.client,ctx),false);assert.equal(q.bids.length,0);assert.equal(q.escrow,0);assert.equal(raw.stock,stock);assert.equal(far.h.gold,gold);exact(far.s);
 const wait=rive(),request=postKnifeOrder(wait.s,wait.client,ctx);wait.s.tick++;assert.equal(applyKnifeOrder(wait.s,wait.s.people[wait.h.lineage],wait.client,ctx),true);wait.h.x=100;wait.s.tick=request.closes+9;rivalryTurn(wait.s,ctx);assert.equal(wait.s.people[wait.h.lineage].rivalJob.status,'withdrawn');assert.equal(wait.s.people[wait.h.lineage].rivalHistory,undefined);wait.h.x=42;assert.equal(reserveKnifeOrder(wait.s,wait.client,ctx),false);exact(wait.s);
});
test('deadline or OFF refunds only the actual deposit once and leaves the maker real costs and already forged original intact',()=>{
 const f=rive(),q=chooseRival(f),wallet=f.client.agenda.wealth,old=f.p.agenda.wealth;let item=null;for(let n=0;n<12&&!item;n++){f.s.tick=Math.floor(f.s.tick/8)*8+8;peopleTick(f.s,ctx);item=npcLooseItems(f.s,f.p).find(i=>i.toolKind==='knife');}assert.ok(item);assert.equal(q.status,'reserved');assert.equal(f.p.agenda.wealth,old-6);f.s.tick=q.deadline+1;rivalryTick(f.s);assert.equal(q.status,'cancelled');assert.equal(q.refunded,10);assert.equal(f.client.agenda.wealth,wallet+10);assert.equal(presentItem(f.s,item.id).id,f.p.id);assert.equal(f.p.agenda.wealth,old-6);const raw=serialize(f.s);rivalryTick(f.s);assert.equal(serialize(f.s),raw);exact(f.s);
 const off=rive(),r=chooseRival(off),money=total(off);setModule(off.s,'craft-rivalry',false);rivalryTick(off.s);assert.equal(r.status,'cancelled');assert.equal(r.escrow,0);assert.equal(total(off),money);exact(off.s);
});
test('a partial saved real forge resumes exactly, creates no new rival and rejects doubled payment or two winning bodies',()=>{
 const f=rive(),q=chooseRival(f),count=Object.keys(f.s.people).length;for(let n=0;n<2;n++){f.s.tick=Math.floor(f.s.tick/8)*8+8;peopleTick(f.s,ctx);}const copy=restore(serialize(f.s));for(let n=0;n<4;n++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));}assert.equal(Object.keys(f.s.people).length,count);assert.equal(q.winner,f.p.id);exact(f.s);
 const double=JSON.parse(serialize(f.s));double.people[f.client.id].rivalOrder.paid=20;assert.throws(()=>restore(JSON.stringify(double)),/rival/);const two=JSON.parse(serialize(f.s));two.people[f.client.id].rivalOrder.bids.forEach(b=>b.status='winner');assert.throws(()=>restore(JSON.stringify(two)),/rival/);
});
