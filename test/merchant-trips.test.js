import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore,step} from '../engine.js';import {setModule} from '../rules.js';
import {merchantFixture,merchantContext as ctx} from '../scripts/merchant-scenarios.mjs';
import {merchantOffer} from '../modules/merchant-policy.js';import {merchantDispatch} from '../modules/merchant-freight.js';
import {heroMerchantPlan,heroMerchantAction} from '../modules/merchant-hero.js';
import {advanceFreight} from '../modules/freight.js';import {putGoods,goodsBalance} from '../modules/goods.js';
import {marketWallet} from '../modules/market.js';import {peopleTick} from '../modules/people.js';
function finish(s,c){let n=0;while(s.logistics.convoys.includes(c)&&n++<80){s.tick++;advanceFreight(s,c,ctx);}assert.ok(n<=80);assert.equal(s.logistics.convoys.includes(c),false);}
function total(f){return f.a.civic.treasury+f.b.civic.treasury+marketWallet(f.s,f.p.id);}
test('merchant purchases once, physically carries the same batch and earns actual market margin without a civic wage',()=>{
 const f=merchantFixture(),{s,a,b,p}=f,money=total(f),count=s.nextPerson,wealth=p.agenda.wealth;const before=serialize(s),offer=merchantOffer(s,p.id,ctx);assert.ok(offer);assert.equal(serialize(s),before);const c=merchantDispatch(s,ctx);assert.ok(c);assert.equal(c.tools,3);assert.equal(p.marketCargo.tools,0);assert.equal(a.civic.tools,17);assert.equal(p.agenda.wealth,wealth-c.trade.cost-c.trade.foodCost);const x=p.x;advanceFreight(s,c,ctx);assert.equal(p.x,x);finish(s,c);const r=p.tradeBook.history.at(-1);assert.equal(r.sold,3);assert.ok(r.net>0);assert.equal(p.agenda.wealth,wealth+r.net);assert.equal(b.civic.tools,3);assert.equal(s.logistics.history.at(-1).wage,0);assert.equal(total(f),money);assert.equal(s.nextPerson,count);assert.equal(goodsBalance(a,'tools').difference,0);assert.equal(goodsBalance(b,'tools').difference,0);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('an unseen competing delivery causes a loss and keeps unsold goods with the same owner',()=>{
 const f=merchantFixture(),{s,b,p}=f,c=merchantDispatch(s,ctx);putGoods(s,b,'tools',10,{reason:'other-actual-load'});assert.ok(c.trade.expected>0);finish(s,c);const r=p.tradeBook.history.at(-1);assert.equal(r.sold,0);assert.equal(r.revenue,0);assert.ok(r.net<0);assert.equal(r.remaining,3);assert.equal(p.marketCargo.tools,3);assert.equal(b.civic.tools,10);assert.equal(merchantDispatch(s,ctx),null);
});
test('a newly closed physical exit returns the real bought goods without a refund or second payment',()=>{
 const f=merchantFixture(),{s,a,b,p}=f,c=merchantDispatch(s,ctx),paid=p.agenda.wealth;a.links=[];finish(s,c);assert.equal(p.area,a.id);assert.equal(p.agenda.wealth,paid);assert.equal(p.marketCargo.tools,3);assert.equal(a.civic.tools,17);assert.equal(b.civic.tools,0);assert.equal(p.tradeBook.history.at(-1).status,'returned');assert.equal(p.tradeBook.history.at(-1).net,-c.trade.cost-c.trade.foodCost);
});
test('same known risky road is rejected by cautious or poor owner, taken by a funded willing owner; hunger comes first',()=>{
 const f=merchantFixture(),{s,b,p}=f;const place=p.navigation.places.find(k=>k.area===b.id);place.hazardUntil=100;p.agenda.curiosity=.2;assert.equal(merchantOffer(s,p.id,ctx),null);p.agenda.curiosity=.8;assert.ok(merchantOffer(s,p.id,ctx));p.agenda.wealth=15;assert.equal(merchantOffer(s,p.id,ctx),null);p.agenda.wealth=100;p.needs.hunger=70;assert.equal(merchantOffer(s,p.id,ctx),null);
});
test('paid trip survives OFF and exact engine replay, corrupt duplicate ownership is rejected',()=>{
 const f=merchantFixture(),{s}=f;const c=merchantDispatch(s,ctx);setModule(s,'merchant-trips',false);const raw=serialize(s),copy=restore(raw);assert.equal(serialize(copy),raw);for(let i=0;i<3;i++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));const bad=JSON.parse(serialize(s));bad.logistics.convoys[0].trade.owner=s.hero.lineage;assert.throws(()=>restore(JSON.stringify(bad)),/convoy.trade/);finish(s,c);assert.equal(s.people[c.person].tradeBook.history.length,1);
});
test('hero buys the same small manual batch, walks through the ordinary engine and sells once from personal cargo',()=>{
 const f=merchantFixture({hero:true}),{s,a,b,p,h}=f;assert.equal(heroMerchantPlan(s,ctx),true);assert.equal(h.goal.kind,'merchantBuy');assert.equal(heroMerchantAction(s,ctx),true);assert.equal(p.marketCargo.tools,3);assert.equal(a.civic.tools,17);assert.equal(s.logistics.convoys.length,0);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);heroMerchantPlan(s,ctx);let n=0;while(h.merchantTrip&&n++<40)step(s);assert.ok(n<=40);assert.equal(h.merchantTrip,undefined);assert.equal(h.area,b.id);assert.equal(p.marketCargo.tools,0);assert.equal(b.civic.tools,3);assert.equal(p.tradeBook.history.length,1);assert.ok(p.tradeBook.history[0].net>0);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('waiting for a profitable known route does not pay a merchant just for the role',()=>{
 const f=merchantFixture(),{s,p}=f;delete p.marketKnowledge;assert.equal(merchantOffer(s,p.id,ctx),null);setModule(s,'people',true);for(const other of Object.values(s.people))if(other.agenda){other.agenda.due=10000;other.agenda.task=null;}p.agenda.due=0;p.agenda.curiosity=.1;const money=p.agenda.wealth;s.tick=8;peopleTick(s,ctx);assert.equal(p.agenda.wealth,money);assert.equal(p.agenda.task?.kind,'marketWait');assert.equal(s.logistics.convoys.length,0);
});

test('partial actual demand pays only sold units and leaves the rest in personal cargo',()=>{
 const f=merchantFixture(),{s,b,p}=f,c=merchantDispatch(s,ctx);putGoods(s,b,'tools',2,{reason:'competing-partial-load'});finish(s,c);const r=p.tradeBook.history.at(-1);assert.equal(r.sold,1);assert.equal(r.remaining,2);assert.equal(p.marketCargo.tools,2);assert.equal(b.civic.tools,3);assert.equal(p.agenda.wealth,r.walletBefore+r.net);assert.equal(goodsBalance(b,'tools').difference,0);
});
test('paid road food is really eaten once without reducing the non-edible tool load',()=>{
 const f=merchantFixture(),{s,p}=f,c=merchantDispatch(s,ctx);setModule(s,'npc-needs',true);setModule(s,'npc-road-needs',true);p.needs.hunger=64.8;const stock=p.roadSupplies.food,wealth=p.agenda.wealth;s.tick=8;advanceFreight(s,c,ctx);assert.equal(p.roadSupplies.food,stock-1);assert.equal(p.needs.meals,1);assert.equal(c.tools,3);const record=serialize(s);advanceFreight(s,c,ctx);assert.equal(serialize(s),record);assert.equal(p.agenda.wealth,wealth);
});
