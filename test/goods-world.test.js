import {foodPrice} from '../modules/prices.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route} from '../engine.js';import {goodsTownFixture} from '../scripts/goods-scenarios.mjs';
import {goodsBalance,productionSources,initializeGoodsArea,takeGoods,putGoods} from '../modules/goods.js';import {setModule} from '../rules.js';
import {buyFood,recoverCargo,supplyTick} from '../modules/supply.js';import {finishQuest,questAction,abandonQuest} from '../modules/quests.js';
import {civicArea} from '../modules/society.js';import {peopleArea} from '../modules/people.js';import * as mysteries from '../modules/mysteries.js';
import {workTick} from '../modules/work.js';import {createClock,catchUp,hasDue} from '../clock.js';
const ctx={log(){},gainXp(){},route,goal(s,kind,area,x,intent,reason,extra){s.hero.goal={kind,area,x,...extra};}};
function check(s){for(const a of Object.values(s.areas))if(a.goods)for(const k of ['food','tools'])assert.equal(goodsBalance(a,k).difference,0,a.id+'/'+k);}
test('two actual towns produce from real workers without a travelling observed merchant; stopping all workers stops finished output',()=>{
 const {s,h,towns,workers}=goodsTownFixture();for(let i=0;i<960;i++){step(s);check(s);}assert.equal(h.area,'a0');for(const a of towns){assert.ok(a.goods.ledger.food.produced>0,a.id+' food');assert.ok(a.goods.ledger.tools.produced>0,a.id+' tools');assert.ok(a.civic.treasury>=0);assert.ok(a.goods.sources.materials.used>0);}assert.equal(s.generation,1);
 for(const p of workers)p.status='absent';const before=towns.map(a=>({...a.goods.ledger.food})),quantities=towns.map(a=>goodsBalance(a,'food').actual);for(let i=0;i<240;i++)step(s);assert.deepEqual(towns.map(a=>a.goods.ledger.food),before);assert.deepEqual(towns.map(a=>goodsBalance(a,'food').actual),quantities);check(s);
});
test('one paid farm completion debits one treasury once, consumes three real worker actions and has no second96-tick production',()=>{
 const {s,towns,workers}=goodsTownFixture(),farmer=workers[0],a=towns[0];for(const p of workers)if(p!==farmer)p.status='absent';const money=a.civic.treasury+farmer.agenda.wealth;for(let i=0;i<24;i++)step(s);assert.equal(farmer.agenda.work,1);assert.equal(a.goods.ledger.food.produced,6);assert.equal(a.civic.treasury+farmer.agenda.wealth,money);assert.ok(farmer.needs.energy<94);farmer.status='absent';const food=goodsBalance(a,'food').actual;for(let i=0;i<72;i++)step(s);assert.equal(goodsBalance(a,'food').actual,food);check(s);
});
test('an exhausted actual artisan walks to a finite known source and brings the same material home before producing again',()=>{
 const {s,towns,workers}=goodsTownFixture(),a=towns[1],p=workers.find(p=>p.area===a.id&&p.agenda.job==='artisan'),source=productionSources(s,a);source.materials.initial=2;source.materials.stock=2;for(const other of workers)if(other!==p)other.status='absent';let seenCargo=false,seenEmpty=false;
 for(let i=0;i<2000;i++){step(s);seenEmpty ||= source.materials.stock===0;seenCargo ||= p.goodsRawCargo?.quantity>0;if(source.materials.delivered>=2&&a.goods.ledger.tools.produced>=2)break;}
 assert.ok(seenEmpty);assert.ok(seenCargo);assert.ok(source.materials.delivered>=2);assert.ok(a.goods.ledger.tools.produced>=2);assert.equal(p.goodsRawCargo.quantity,0);const site=s.areas.a3.goodsRaw;assert.ok(site.extracted>=2);assert.equal(site.initial-site.extracted,site.remaining);assert.equal(source.materials.initial+source.materials.delivered-source.materials.used,source.materials.stock);check(s);
});
test('the96-tick population phase cannot eat again after the same NPC eats an already owned portion',()=>{
 const {s,towns,workers}=goodsTownFixture(),p=workers[0],a=towns[0];setModule(s,'npc-personal-supplies',true);for(const other of workers)if(other!==p)other.status='absent';p.roadSupplies={food:1,medicine:0};p.needs.hunger=65;s.tick=95;const food=a.civic.food;step(s);assert.equal(p.roadSupplies.food,0);assert.equal(p.needs.meals,1);assert.equal(a.civic.food,food);assert.equal(a.goods.ledger.food.consumed,0);assert.equal(a.goods.ledger.food.produced,0);check(s);
});
test('one local meal consumes one actual portion and leaves the other three bought portions with the same living hero',()=>{
 const s=createWorld(1),h=s.hero,a=s.areas.a1;h.area=a.id;h.x=42;h.gold=100;h.companions=[];h.inventory.rations=0;s.people[h.lineage].roadSupplies={food:0,medicine:0};a.civic.food=20;h.gold=foodPrice(s);initializeGoodsArea(s,a);buyFood(s,ctx);assert.equal(a.civic.food,16);assert.equal(s.people[h.lineage].roadSupplies.food,3);assert.equal(a.goods.ledger.food.exported,4);check(s);
});
test('cargo recovery keeps every portion, including a remainder, and the original cache cannot be collected twice',()=>{
 const s=createWorld(1),h=s.hero,p=s.people[h.lineage],o={id:'cache',food:7,medicine:2,taken:false};h.inventory.rations=0;h.inventory.herbs=0;p.roadSupplies={food:0,medicine:0};recoverCargo(s,o,ctx);assert.equal(h.inventory.rations,1);assert.equal(p.roadSupplies.food,3);assert.equal(h.inventory.herbs,2);assert.equal(o.food,0);assert.equal(o.medicine,0);const saved=serialize(s);recoverCargo(s,o,ctx);assert.equal(serialize(s),saved);
});
test('an explicit disabled interval gets a new finite opening balance, but an on-mode unexplained change is never silently repaired',()=>{
 const s=createWorld(1),a=s.areas.a1;initializeGoodsArea(s,a);takeGoods(s,a,'food',3);const sources=structuredClone(productionSources(s,a));setModule(s,'goods-cycle',false);s.tick+=240;a.civic.food+=7;setModule(s,'goods-cycle',true);assert.equal(goodsBalance(a,'food').difference,0);assert.equal(a.goods.closedPeriods[0].delta.food,7);assert.deepEqual(a.goods.sources,sources);const actual=a.civic.food;a.civic.food--;setModule(s,'goods-cycle',false);s.tick+=10;setModule(s,'goods-cycle',true);assert.equal(a.civic.food,actual-1);assert.notEqual(goodsBalance(a,'food').difference,0);assert.equal(a.goods.accountingGap.reason,'unrecorded-before-disabling');
});
test('reload preserves all production, incomplete work and cargo exactly across the same finite two-town future',()=>{
 const f=goodsTownFixture();for(let i=0;i<19;i++)step(f.s);const raw=serialize(f.s),copy=restore(raw);assert.equal(serialize(copy),raw);for(let i=0;i<240;i++){step(f.s);step(copy);}assert.equal(serialize(f.s),serialize(copy));check(copy);
});
function deliveryFixture(){const s=createWorld(1),h=s.hero,source=s.areas.a4,target=s.areas.a1;source.type='village';civicArea(s,source);peopleArea(s,source);setModule(s,'service-access',false);setModule(s,'time',false);source.civic.food=65;target.civic.food=96;h.area=source.id;h.gold=4;h.goal={kind:'quest',area:source.id,remaining:3};const q={id:'supplies',kind:'supply',source:target.id,target:source.id,status:'active',required:1,reward:0,cargo:false};h.quests=[q];return {s,h,source,target,q};}
test('a supply quest transfers its actual eight portions and four coins once, preserving the full target overflow',()=>{
 const {s,h,source,target,q}=deliveryFixture(),food=source.civic.food+target.civic.food,money=h.gold+source.civic.treasury;questAction(s,q,ctx);assert.equal(source.civic.food,57);assert.equal(q.foodCargo.quantity,8);assert.equal(h.gold+source.civic.treasury,money);questAction(s,q,ctx);assert.equal(source.civic.food,57);h.area=target.id;finishQuest(s,q,ctx);assert.equal(q.foodCargo.delivered,8);assert.equal(q.foodCargo.quantity,0);assert.equal(target.civic.food,100);assert.equal(target.goods.overflow.food,4);assert.equal(source.civic.food+target.civic.food+target.goods.overflow.food,food);check(s);const before=serialize(s);finishQuest(s,q,ctx);assert.equal(serialize(s),before);
});
test('abandoning a delivery retains the same finite food in the person pack and cannot collect it twice',()=>{
 const {s,h,q}=deliveryFixture();questAction(s,q,ctx);const p=s.people[h.lineage];p.roadSupplies={food:0,medicine:0};assert.equal(abandonQuest(s,q,ctx),true);assert.equal(p.roadSupplies.food,8);assert.equal(q.foodCargo.quantity,0);assert.equal(abandonQuest(s,q,ctx),false);assert.equal(p.roadSupplies.food,8);check(s);
});
test('a real box bought with production OFF still delivers its recorded eight portions after enabling',()=>{
 const {s,h,target,q}=deliveryFixture();setModule(s,'goods-cycle',false);questAction(s,q,ctx);assert.equal(q.foodCargo.quantity,8);setModule(s,'goods-cycle',true);target.civic.food=0;h.area=target.id;finishQuest(s,q,ctx);assert.equal(target.civic.food,8);assert.equal(q.foodCargo.delivered,8);check(s);
});
test('the stolen seal reserves real stores; a correct verdict returns those same portions and an old case cannot conjure missing stores',()=>{
 const s=createWorld(1),a=s.areas.a1,c={id:'seal-goods',source:a.id,owner:s.hero.lineage,refs:[],choices:[],effects:[],status:'active'},context={...ctx,storyFinish(_s,c,_ctx,status){c.status=status;}};const food=a.civic.food;mysteries.start(s,c,context);assert.equal(a.civic.food,food-15);assert.equal(c.sealedFood.quantity,15);c.stage='verdict';c.evidence=[{person:c.culprit}];mysteries.act(s,c,context);assert.equal(a.civic.food,food);assert.equal(c.sealedFood.quantity,0);check(s);const old={...c,id:'old-seal',status:'active',sealedFood:undefined,choices:[],effects:[]};mysteries.act(s,old,context);assert.equal(a.civic.food,food);check(s);
});
test('hero wage labour cannot create money when service checking is disabled and the actual employer can only pay part',()=>{
 const s=createWorld(1),h=s.hero,a=s.areas.a1;setModule(s,'service-access',false);h.area=a.id;h.x=42;a.civic.treasury=3;h.goal={kind:'work',job:'dock',area:a.id,x:42,remaining:1};const total=h.gold+a.civic.treasury;workTick(s,ctx);assert.equal(a.civic.treasury,0);assert.equal(h.gold+a.civic.treasury,total);assert.equal(h.goal,null);assert.equal(a.civic.food,65);
});
test('actual offline catch-up with different packets and a mid-catch-up save matches all production and controller state exactly',()=>{
 const {s}=goodsTownFixture(),raw=serialize(s);for(let i=0;i<240;i++)step(s);const expected=serialize(s);for(const limit of [13,17]){let copy=restore(raw),packets=0;const clock=createClock(0,5000);while(hasDue(clock,244000)){catchUp(clock,244000,()=>step(copy),limit);if(++packets===3)copy=restore(serialize(copy));}assert.equal(clock.anchor,244000);assert.equal(copy.tick,240);assert.equal(serialize(copy),expected);check(copy);}
});
