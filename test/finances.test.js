import {revealArea} from '../actor-atlas.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,route,step,serialize,restore} from '../engine.js';
import {moneyBudget,maySpend,needsIncome,nextPurchase,buyUpgrade} from '../modules/finances.js';
import {foodPrice,equipmentPrice} from '../modules/prices.js';
import {planWork,workTick} from '../modules/work.js';
import {buyFood} from '../modules/supply.js';
import {rememberRetreat,commitmentTick} from '../modules/commitments.js';
import {setModule} from '../rules.js';
const ctx={route,log:()=>{},gainXp:()=>{},closest:s=>s.areas.a1,goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,...extra}};
function setup(style='cautious'){const s=createWorld(1),h=s.hero;h.area='a1';h.x=58;revealArea(s,'a1');s.areas.a1.civic.food=100;h.memory.merchant='a1';h.inventory.rations=0;h.inventory.potions=1;h.money.style=style;h.hp=h.maxHp;h.armor=0;h.weapon=3;h.gold=23;return s;}
test('equal wallets produce different real discretionary purchases without introducing another purse',()=>{
 const cautious=setup(),free=restore(serialize(cautious));free.hero.money.style='carefree';const gold=cautious.hero.gold;
 assert.equal(moneyBudget(cautious,ctx).reserve,foodPrice(cautious));assert.equal(nextPurchase(cautious,ctx),null);assert.equal(buyUpgrade(cautious,ctx),false);
 assert.equal(buyUpgrade(free,ctx),true);assert.equal(free.hero.armor,1);assert.equal(free.hero.gold,gold-equipmentPrice(free,'armor'));assert.equal(cautious.hero.gold,gold);assert.equal(cautious.hero.money.gold,undefined);
 const goal=setup('purposeful');goal.hero.weapon=1;goal.hero.gold=30;rememberRetreat(goal,goal.areas.a2.objects.find(o=>o.kind==='enemy'));
 assert.equal(nextPurchase(goal,ctx),null);goal.hero.money.style='cautious';assert.equal(nextPurchase(goal,ctx).kind,'armor');
});
test('urgent food or a lifesaving potion can spend a reserve, while price estimation and debiting agree',()=>{
 const s=setup();s.hero.gold=foodPrice(s);s.hero.hunger=90;const food=s.areas.a1.civic.food;assert.equal(moneyBudget(s,ctx).reserve,foodPrice(s));buyFood(s,ctx);assert.equal(s.hero.gold,0);assert.equal(s.areas.a1.civic.food,food-4);
 const p=setup('purposeful');p.hero.hp=10;p.hero.inventory.potions=0;p.hero.gold=7;assert.equal(nextPurchase(p,ctx).kind,'potion');buyUpgrade(p,ctx);assert.equal(p.hero.gold,0);assert.equal(p.hero.inventory.potions,1);
 const t=setup('carefree');t.hero.weapon=0;t.hero.gold=50;t.areas.a1.civic.marketUntil=100;t.areas.a1.civic.tax=17;const price=equipmentPrice(t,'weapon');const money=t.hero.gold;assert.equal(nextPurchase(t,ctx).price,price);buyUpgrade(t,ctx);assert.equal(t.hero.weapon,1);assert.equal(t.hero.gold,money-price);
});
test('a reachable personal purchase permits paid work above the former threshold, but not an unknown purchase forever',()=>{
 const s=setup('purposeful'),h=s.hero;h.weapon=1;h.gold=20;h.profession='bard';h.career.path='adventure';h.workAfter=0;rememberRetreat(s,s.areas.a2.objects.find(o=>o.kind==='enemy'));
 assert.equal(needsIncome(s,ctx),true);setModule(s,'finances',false);assert.equal(planWork(s,ctx),false);setModule(s,'finances',true);assert.equal(planWork(s,ctx),true);assert.equal(h.goal.kind,'work');
 const money=h.gold;while(h.goal){s.tick++;workTick(s,ctx);}assert.ok(h.gold>money);
 h.memory.merchant='missing';assert.equal(moneyBudget(s,ctx).targetAvailable,false);assert.equal(needsIncome(s,ctx),false);assert.equal(planWork(s,ctx),false);
 s.tick=2001;commitmentTick(s,ctx);assert.equal(h.commitments.personal.status,'abandoned');
});
test('profiles and a single wallet survive switching and loading; budget readers are pure and independent of unreachable services',()=>{
 const s=setup(),before=serialize(s);moneyBudget(s,ctx);nextPurchase(s,ctx);assert.equal(serialize(s),before);
 s.hero.atlas.known=[];s.hero.atlas.roads=[];for(const a of Object.values(s.areas))a.discovered=false;assert.equal(moneyBudget(s,ctx).reserve,0);
 const gold=s.hero.gold,profile=s.hero.money.style;setModule(s,'finances',false);assert.equal(maySpend(s,'armor',22,ctx),true);assert.equal(s.hero.gold,gold);setModule(s,'finances',true);assert.equal(s.hero.money.style,profile);
 let b=restore(serialize(s));for(let i=0;i<300;i++){step(s);step(b);}assert.equal(serialize(s),serialize(b));
});
