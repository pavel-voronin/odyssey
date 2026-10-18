import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';
import {actualService,serviceStaff,merchantGoods,merchantResupply,consumeMerchantGood,observeServices,rememberService,knownServiceAllows,questServiceBlocked} from '../modules/service-access.js';
import {restAmount,clinicTreatment,buyFood,supplyTick} from '../modules/supply.js';
import {buyUpgrade} from '../modules/finances.js';
import {workTick} from '../modules/work.js';
import {peopleArea} from '../modules/people.js';
import {planQuest,questAction,currentQuest} from '../modules/quests.js';
import {servicePlan} from '../modules/resident-orders.js';
import {buyServiceTool} from '../modules/work-materials.js';
import {serviceFixture,emptyServiceArea,serviceContext as ctx} from '../scripts/service-access-scenarios.mjs';
import {balanceFixture} from '../scripts/intention-balance-scenarios.mjs';
import {materialFixture,acceptMaterialFixture,materialContext} from '../scripts/materials-scenarios.mjs';
import {provisions} from '../modules/body.js';

test('legacy meal payment still reaches the existing town when supply simulation is disabled',()=>{
 const {s,h,a}=serviceFixture();setModule(s,'supply',false);const gold=h.gold,treasury=a.civic.treasury;provisions(s,ctx);assert.ok(h.gold<gold);assert.equal(a.civic.treasury-treasury,gold-h.gold);assert.equal(a.civic.food,60);
});

test('a real healer authorizes the existing exact medical cost, while a dead or departed healer cannot',()=>{
 for(const kind of ['open','dead','away']){const f=serviceFixture(),{s,h,a,doctor}=f;h.conditions=[{id:'poison',until:200}];if(kind==='dead'){doctor.alive=false;doctor.health=0;}if(kind==='away'){doctor.area='a1';doctor.status='travelling';}
  const before=a.civic.medicine;assert.equal(restAmount(s,a),kind==='open'?5:2);clinicTreatment(s,ctx);assert.equal(a.civic.medicine,kind==='open'?before-3:before);assert.equal(h.conditions.length,kind==='open'?0:1);assert.equal(actualService(s,a,'food').available,true);
 }
});

test('a missing clinic entrance blocks treatment without closing the neighbouring food handover',()=>{
 const {s,h,a}=serviceFixture();a.objects=a.objects.filter(o=>o.kind!=='rest');h.conditions=[{id:'fever',until:200}];clinicTreatment(s,ctx);assert.equal(h.conditions.length,1);assert.equal(a.civic.medicine,8);assert.equal(restAmount(s,a),2);assert.equal(actualService(s,a,'food').available,true);
});

test('enabled staff needs close an off-duty clinic, and disabling needs preserves its data while restoring availability',()=>{
 const {s,a,doctor}=serviceFixture();setModule(s,'npc-needs',true);doctor.needs.sleeping=true;assert.equal(actualService(s,a,'clinic').available,false);setModule(s,'npc-needs',false);assert.equal(actualService(s,a,'clinic').available,true);assert.equal(doctor.needs.sleeping,true);
});

test('service knowledge does not poll remote staff, and an actual return reopens its witnessed clinic',()=>{
 const {s,h,a,doctor}=serviceFixture();observeServices(s);assert.equal(knownServiceAllows(s,a,'clinic',{units:2}),true);h.area='a1';doctor.area='a1';doctor.status='travelling';assert.equal(knownServiceAllows(s,a,'clinic',{units:2}),true);assert.equal(actualService(s,a,'clinic').available,false);
 h.area=a.id;observeServices(s);assert.equal(knownServiceAllows(s,a,'clinic',{units:2}),false);doctor.area=a.id;doctor.status='resident';observeServices(s);assert.equal(knownServiceAllows(s,a,'clinic',{units:2}),true);assert.equal(a.civic.medicine,8);
});

test('an abandoned area cannot feed, heal or pay wages and repeated visits never restore its treasury or stocks',()=>{
 const f=serviceFixture(),{s,h,a,o}=f;emptyServiceArea(f);a.civic.treasury=0;h.x=42;const gold=h.gold,food=a.civic.food,medicine=a.civic.medicine,people=Object.keys(s.people).length;
 buyFood(s,ctx);assert.equal(h.gold,gold);assert.equal(a.civic.food,food);h.x=68;assert.equal(restAmount(s,a),2);h.conditions=[{id:'fever',until:100}];clinicTreatment(s,ctx);assert.equal(h.conditions.length,1);assert.equal(a.civic.medicine,medicine);
 h.x=42;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5,workplace:{id:o.id,area:a.id,owner:o.owner}};workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.gold,gold);
 for(let i=0;i<20;i++){observeServices(s);peopleArea(s,a);}const loaded=restore(serialize(s));assert.equal(loaded.areas[a.id].civic.treasury,0);assert.equal(loaded.areas[a.id].civic.food,food);assert.equal(Object.keys(loaded.people).length,people);
});

test('an actual completed job transfers one salary from existing civic funds and retains the separate real lease payment',()=>{
 const {s,h,a,o}=serviceFixture(),owner=s.people[o.owner],beforeOwner=owner.agenda.wealth,beforeGold=h.gold,beforeCity=a.civic.treasury;h.x=42;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5};let actions=0;
 while(h.goal&&actions++<8){s.tick++;workTick(s,ctx);}assert.equal(actions,6);assert.equal(h.counters.peacefulWork,1);assert.equal(h.gold,beforeGold-o.rent+10);assert.equal(owner.agenda.wealth,beforeOwner+o.rent);assert.equal(a.civic.treasury,beforeCity-10);assert.equal(h.gold+owner.agenda.wealth+a.civic.treasury,beforeGold+beforeOwner+beforeCity);
});

test('insufficient wages or a missing repair tool denies work before rent or partial salary is charged',()=>{
 for(const field of ['treasury','tools']){const {s,h,a,o}=serviceFixture();a.civic[field]=0;h.x=42;const gold=h.gold,money=s.people[o.owner].agenda.wealth;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5};workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.gold,gold);assert.equal(s.people[o.owner].agenda.wealth,money);assert.equal(h.counters.peacefulWork||0,0);}
});

test('renewed local funds update a previously closed specific job instead of leaving it blocked forever',()=>{
 const {s,h,a}=serviceFixture();h.x=42;a.civic.treasury=0;rememberService(s,a,'employment',{job:'repair'});h.goal=null;assert.equal(knownServiceAllows(s,a,'employment',{job:'repair'}),false);a.civic.treasury=40;observeServices(s);assert.equal(knownServiceAllows(s,a,'employment',{job:'repair'}),true);
});

test('meal and ration payments reach the finite local treasury while food still leaves the existing stock',()=>{
 const {s,h,a}=serviceFixture();h.x=42;const gold=h.gold,treasury=a.civic.treasury,food=a.civic.food;buyFood(s,ctx);const paid=gold-h.gold;assert.ok(paid>0);assert.equal(a.civic.treasury,treasury+paid);assert.equal(a.civic.food,food-8);assert.equal(h.inventory.rations,1);assert.equal(h.hunger,5);
});

test('current merchant stock is created once without a load-time partition, and real suppliers restock the matching finite material',()=>{
 const {s,a}=serviceFixture(),before=s.merchant.stock;assert.deepEqual(s.merchant.serviceStock,{version:1,gear:2,medicine:1});const goods=merchantGoods(s);assert.equal(goods.gear+goods.medicine,before);merchantResupply(s);const tools=a.civic.tools,medicine=a.civic.medicine,gear=merchantGoods(s).gear,med=merchantGoods(s).medicine;
 merchantResupply(s,true);assert.equal(a.civic.tools+merchantGoods(s).gear,tools+gear);assert.equal(a.civic.medicine+merchantGoods(s).medicine,medicine+med);assert.equal(s.merchant.stock,6);const saved=serialize(s);for(let i=0;i<10;i++)merchantResupply(s);assert.equal(serialize(s),saved);
});

test('an empty supplier cannot restock the travelling trader, and unavailable current stock never becomes free goods',()=>{
 const f=serviceFixture(),{s,a}=f;emptyServiceArea(f);s.merchant.stock=0;s.merchant.serviceStock={version:1,gear:0,medicine:0};delete a.civic.tools;delete a.civic.medicine;merchantResupply(s,true);assert.deepEqual(merchantGoods(s),{version:1,gear:0,medicine:0});assert.equal(a.civic.tools,undefined);assert.equal(a.civic.medicine,undefined);assert.equal(s.merchant.stock,0);
});

test('two real bodies cannot both buy the last merchant unit, and death, travel or distance never consume it',()=>{
 const {s,h,a}=serviceFixture();h.x=58;h.gold=100;h.weapon=0;s.merchant.serviceStock={version:1,gear:1,medicine:0};s.merchant.stock=1;syncActiveActor(s);assert.equal(buyUpgrade(s,ctx),true);assert.equal(h.weapon,1);assert.equal(s.merchant.stock,0);const first=h;createNextStory(s,{allowLiving:true});Object.assign(s.hero,{area:a.id,x:58,gold:100,weapon:0});syncActiveActor(s);assert.equal(buyUpgrade(s,ctx),false);assert.equal(s.hero.gold,100);assert.equal(first.weapon,1);
 s.merchant.serviceStock.gear=1;s.merchant.stock=1;for(const mode of ['dead','travel','far']){s.hero.alive=mode!=='dead';s.hero.transit=mode==='travel'?{from:a.id,to:'a1'}:null;s.hero.x=mode==='far'?0:58;assert.equal(consumeMerchantGood(s,'weapon'),false);assert.equal(s.merchant.stock,1);}
});

test('an unstaffed tool warehouse keeps the existing order escrow, cargo and last physical tool intact',()=>{
 const f=materialFixture({local:0});acceptMaterialFixture(f);const {s,h,c,source}=f;setModule(s,'service-access',true);assert.equal(servicePlan(s,materialContext),true);h.area=source.id;h.x=42;for(const id of source.population){const p=s.people[id];if(p.id!==h.lineage){p.area=f.a.id;p.status='travelling';}}const funds=c.escrow,stock=source.civic.tools;assert.equal(buyServiceTool(s,c,materialContext),false);assert.equal(c.escrow,funds);assert.equal(source.civic.tools,stock);assert.equal(c.toolPurchase,undefined);assert.equal(h.workMaterials.cargo.length,0);
});

test('a temporarily short supplier defers its existing promise and resumes the same paused work without duplicating cargo',()=>{
 const {s,h,a:q,b}=balanceFixture({urgent:true});setModule(s,'service-access',true);setModule(s,'supply',true);h.x=42;h.gold=0;const target=s.areas[q.target];target.civic.food=10;planQuest(s,q,ctx);h.goal.remaining=1;const original=h.goal;questAction(s,q,ctx);assert.equal(q.status,'active');assert.equal(h.goal,null);assert.equal(target.civic.food,10);assert.equal(h.gold,0);assert.equal(questServiceBlocked(s,q),true);assert.equal(currentQuest(h,s).id,b.id);setModule(s,'supply',false);assert.equal(questServiceBlocked(s,q),true);setModule(s,'supply',true);
 target.civic.food=60;observeServices(s);b.status='done';assert.equal(questServiceBlocked(s,q),false);planQuest(s,q,ctx);assert.equal(h.goal,original);assert.equal(h.goal.remaining,1);s.tick++;questAction(s,q,ctx);assert.equal(q.cargo,true);assert.equal(target.civic.food,52);assert.equal(Object.keys(h.questCargo).length,1);
});

test('departed population entries produce no ghost food or medicine when the world advances',()=>{
 const f=serviceFixture(),{s,a}=f;emptyServiceArea(f);a.civic.food=30;a.civic.medicine=20;a.civic.treasury=0;s.tick=192;s.logistics.nextDispatch=100000;s.logistics.convoys=[];supplyTick(s,ctx);assert.equal(a.civic.food,30);assert.equal(a.civic.medicine,20);assert.equal(a.civic.treasury,0);
});

test('capability readers are pure and module-off keeps observations and typed stock without deleting or refilling them',()=>{
 const {s,h,a}=serviceFixture(),before=serialize(s);for(let i=0;i<50;i++){actualService(s,a,'clinic');actualService(s,a,'employment',{job:'repair'});merchantGoods(s);knownServiceAllows(s,a,'clinic');serviceStaff(s,a,'clinic');}assert.equal(serialize(s),before);observeServices(s);merchantResupply(s);const memory=JSON.stringify(h.memory.services),stock=JSON.stringify(s.merchant.serviceStock);setModule(s,'service-access',false);observeServices(s);merchantResupply(s,true);assert.equal(actualService(s,a,'clinic').available,true);assert.equal(JSON.stringify(h.memory.services),memory);assert.equal(JSON.stringify(s.merchant.serviceStock),stock);const loaded=restore(serialize(s));assert.deepEqual(loaded.merchant.serviceStock,s.merchant.serviceStock);assert.equal(loaded.hero.memory.services[a.id+'/clinic'].available,true);
});

test('the actual merchant arrival transfers finite supplier stock once while a healthy waiting observer spends none of it',()=>{
 const {s,h,a}=serviceFixture();h.hp=h.maxHp;h.hunger=0;h.goal={kind:'routeWait',area:a.id,x:68,until:100000};s.merchant.area=null;s.merchant.destination=a.id;s.merchant.arrival=s.tick+1;s.merchant.stock=0;s.merchant.serviceStock={version:1,gear:0,medicine:0};step(s);assert.equal(s.merchant.area,a.id);assert.equal(s.merchant.stock,6);assert.equal(a.civic.tools,2);assert.equal(a.civic.medicine,5);const stock=s.merchant.stock;step(s);assert.equal(s.merchant.stock,stock);assert.equal(a.civic.medicine,5);
});

test('real poisoned rest claims a clinic cure only with the living healer and spends precisely that existing dose',()=>{
 for(const available of [false,true]){const {s,h,a,doctor}=serviceFixture();setModule(s,'body',true);setModule(s,'poison-care',true);h.hunger=0;h.hp=10;h.conditions=[{id:'poison',until:s.tick+80}];h.goal={kind:'rest',area:a.id,x:68};if(!available){doctor.area='a1';doctor.status='travelling';}syncActiveActor(s);step(s);assert.equal(h.conditions.some(c=>c.id==='poison'),!available);assert.equal(a.civic.medicine,available?6:8);assert.equal(h.poisonCare?.active?.method==='clinic',available);if(available){assert.equal(h.hp,10);assert.equal(h.lastAction,'heal');}}
});
