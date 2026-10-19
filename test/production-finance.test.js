import test from 'node:test';import assert from 'node:assert/strict';
import {financeFixture,fundFixture,manufactureFixture,financeSave,financeContext as ctx} from '../scripts/production-finance-scenarios.mjs';
import {productionFinancePlan,fundProduction,npcProductionPlan,productionSale,collectProduction} from '../modules/production-finance.js';
import {productionSources,goodsBalance,completeGoodsWork,goodsWorkReceipt} from '../modules/goods.js';
import {marketWallet} from '../modules/market.js';import {peopleTick} from '../modules/people.js';import {observeMarket} from '../modules/market-knowledge.js';
import {serialize,restore,step} from '../engine.js';import {setModule} from '../rules.js';import {setActorMoney} from '../actor-projection.js';import {goalReadiness} from '../modules/goal-readiness.js';
const exact=f=>{const raw=financeSave(f);assert.equal(serialize(restore(raw)),raw);return raw;};
const money=f=>f.h.gold+marketWallet(f.s,f.p.id)+f.a.civic.treasury+(f.c?.escrow||0);
function sell(f){f.p.area=f.a.id;f.p.x=58;f.p.agenda.task=null;f.s.tick++;assert.ok(npcProductionPlan(f.s,f.p));assert.ok(productionSale(f.s,f.p,f.p.agenda.task,ctx));return f;}
// PARTIAL: six selected groups, <=12 actual owner acts/group. Bench and counter
// positions are explicit prepared physical checkpoints, no long prefix lives.
test('one finite agreement buys real raw; three ordinary personal work acts and one actual sale precede one local payout',()=>{
 const f=financeFixture(),total=money(f),raw=productionSources(f.s,f.a).materials.stock,coins=f.h.gold;fundFixture(f);assert.equal(f.h.gold,coins-4);assert.equal(marketWallet(f.s,f.p.id),6);assert.equal(productionSources(f.s,f.a).materials.stock,raw-2);assert.equal(money(f),total);assert.equal(f.c.status,'working');exact(f);
 manufactureFixture(f);assert.equal(f.c.status,'selling');assert.equal(f.c.work.spent,3);assert.equal(f.c.material.state,'consumed');assert.equal(f.p.marketCargo.tools,1);assert.equal(f.a.civic.tools,0);assert.equal(f.h.gold,coins-4);assert.equal(money(f),total);assert.equal(goodsBalance(f.a,'tools').difference,0);exact(f);
 sell(f);assert.equal(f.a.civic.tools,1);assert.equal(f.p.marketCargo.tools,0);assert.ok(f.c.revenue>=8);assert.equal(f.h.gold,coins-4);assert.equal(f.c.escrow,Math.floor(f.c.revenue/2));assert.equal(money(f),total);exact(f);
 f.h.area=f.a.id;f.h.x=58;assert.ok(productionFinancePlan(f.s,ctx));assert.equal(f.h.goal.kind,'productionPayout');f.s.tick++;assert.ok(collectProduction(f.s,ctx));assert.equal(f.h.gold,coins-4+Math.floor(f.c.revenue/2));assert.equal(f.c.status,'done');assert.equal(money(f),total);f.h.goal={deal:f.c.id};assert.equal(collectProduction(f.s,ctx),false);exact(f);
});
test('personal knowledge, owned workshop, scarce stock and known distrust decide the proposal without remote guarantees',()=>{
 const f=financeFixture(),before=money(f);delete f.p.marketKnowledge;assert.equal(productionFinancePlan(f.s,ctx),false);assert.equal(f.s.productionDeals,undefined);observeMarket(f.s,f.p.id,{force:true});f.h.money.style='cautious';f.h.relations[f.p.id]={trust:-4,met:0,lastSeen:0,helped:0};assert.equal(productionFinancePlan(f.s,ctx),false);assert.equal(f.h.productionFinance.decisions.at(-1).reason,'known-distrust');assert.equal(money(f),before);exact(f);
 f.h.productionFinance.after=0;f.h.relations[f.p.id].trust=2;assert.ok(productionFinancePlan(f.s,ctx));const raw=productionSources(f.s,f.a).materials;raw.used+=raw.stock;raw.stock=0;assert.equal(fundProduction(f.s,ctx),false);assert.equal(money(f),before);assert.equal(f.s.productionDeals,undefined);exact(f);
});
test('the old NPC movement/body owner approaches the bench; incomplete or repeated work cannot mint financed output or wages',()=>{
 const f=fundFixture(),coins=money(f);f.p.x=f.o.x-4;f.p.agenda.task=null;f.s.tick=8;peopleTick(f.s,ctx);assert.equal(f.c.status,'working');assert.equal(f.c.work,null);assert.equal(f.p.marketCargo?.tools||0,0);assert.ok(f.p.x>f.o.x-4);assert.equal(money(f),coins);
 const t=f.p.agenda.task;assert.equal(completeGoodsWork(f.s,f.a,{id:'not-complete',actor:f.p.id,required:3,spent:2},{kind:'tools',units:1,productionDeal:f.c.id}).quantity,0);assert.equal(f.c.material.state,'reserved');exact(f);
 const g=manufactureFixture(fundFixture()),cargo=g.p.marketCargo.tools;assert.equal(completeGoodsWork(g.s,g.a,{id:g.c.work.id,actor:g.p.id,required:3,spent:3},{kind:'tools',units:1,productionDeal:g.c.id}).quantity,0);assert.equal(g.p.marketCargo.tools,cargo);assert.equal(g.c.status,'selling');exact(g);
});
test('missing buyer funds, damage and absent investor preserve finite goods or escrow and never pay from passing time',()=>{
 const f=manufactureFixture(fundFixture()),coins=f.h.gold;f.a.civic.treasury=0;f.p.x=58;f.p.agenda.task=null;f.s.tick++;assert.ok(npcProductionPlan(f.s,f.p));assert.equal(productionSale(f.s,f.p,f.p.agenda.task,ctx),false);assert.equal(f.c.status,'selling');assert.equal(f.p.marketCargo.tools,1);assert.equal(f.h.gold,coins);exact(f);
 const g=fundFixture();g.o.state='burned';g.p.agenda.task=null;g.s.tick++;assert.equal(npcProductionPlan(g.s,g.p),false);assert.equal(g.c.material.state,'reserved');assert.equal(g.h.gold,76);assert.equal(g.c.paid,0);exact(g);
 const h=sell(manufactureFixture(fundFixture()));h.h.x=0;h.h.goal={deal:h.c.id};h.s.tick++;assert.equal(collectProduction(h.s,ctx),false);assert.equal(h.c.status,'payable');assert.equal(h.c.escrow,Math.floor(h.c.revenue/2));assert.equal(h.h.gold,76);exact(h);
});
test('OFF/current144 restore preserve working, cargo and payable balances exactly, and malformed receipts are rejected',()=>{
 const f=fundFixture();setModule(f.s,'production-finance',false);const raw=exact(f);assert.equal(npcProductionPlan(f.s,f.p),false);assert.equal(fundProduction(f.s,ctx),false);assert.equal(financeSave(f),raw);setModule(f.s,'production-finance',true);manufactureFixture(f);exact(f);sell(f);exact(f);const corrupt=JSON.parse(financeSave(f));corrupt.productionDeals[f.c.id].paid=500;assert.throws(()=>restore(JSON.stringify(corrupt)),/productionDeals/);
 const old=financeFixture();delete old.s.rules['production-finance'];const baseline=exact(old);assert.equal(serialize(restore(baseline)),baseline);assert.equal(old.s.productionDeals,undefined);
});
test('new registered actions obey the common selector and one short engine act funds the same native order',()=>{
 const f=financeFixture();assert.ok(productionFinancePlan(f.s,ctx));assert.equal(goalReadiness(f.s,f.h.goal,ctx).status,'ready');f.h.goal.selectionOrder=30;step(f.s);assert.ok(Object.values(f.s.productionDeals||{}).some(c=>c.investor===f.h.lineage));assert.equal(f.h.gold,76);exact(f);
 const g=financeFixture();productionFinancePlan(g.s,ctx);g.p.x=0;g.p.area=g.s.areas[g.a.city]?.id||g.a.id;assert.equal(goalReadiness(g.s,g.h.goal,ctx).status,'blocked');
});
