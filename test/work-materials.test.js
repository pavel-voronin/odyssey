import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {actorView} from '../actor-view.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {observeMaterials,materialSource,buyServiceTool,carriedServiceTool} from '../modules/work-materials.js';
import {commissionRepair,quoteRepair,servicePlan,acceptService,extendService,hasServiceTool,fundServiceRepair,serviceRepairAllowed,finishServiceRepair,workOrdersTick} from '../modules/resident-orders.js';
import {repairProperty} from '../modules/property-damage.js';
import {materialFixture as fixture,materialContext as ctx,acceptMaterialFixture as accept} from '../scripts/materials-scenarios.mjs';
const money=f=>f.h.gold+f.p.agenda.wealth+f.a.civic.treasury+f.source.civic.treasury+f.c.escrow;
const tools=f=>f.a.civic.tools+f.source.civic.tools+f.h.workMaterials.cargo.length+(f.c.toolConsumed===undefined?0:1);
function until(f,predicate,limit=200){for(let i=0;i<limit&&!predicate();i++)step(f.s);assert.ok(predicate());}

test('an actual journey buys, physically carries and consumes one finite tool within the original material budget and fee',()=>{
 const f=fixture(),{s,h,p,c,a,source,o}=f,coins=money(f),gold=h.gold;accept(f);assert.equal(c.escrow,24);assert.ok(servicePlan(s,ctx));assert.equal(h.goal.kind,'serviceSupply');
 until(f,()=>Boolean(c.toolPurchase));assert.equal(h.area,source.id);assert.equal(source.civic.tools,0);assert.equal(source.civic.treasury,33);assert.equal(c.escrow,21);assert.equal(h.gold,gold);assert.equal(h.workMaterials.cargo[0].owner,p.id);assert.ok(carriedServiceTool(h,c));assert.equal(money(f),coins);assert.equal(tools(f),1);
 until(f,()=>c.status==='done');assert.equal(o.state,'intact');assert.equal(o.owner,p.id);assert.equal(c.materialsPaid,18);assert.equal(c.paid,6);assert.equal(c.escrow,0);assert.equal(a.civic.tools,0);assert.equal(a.civic.treasury,75);assert.equal(h.workMaterials.cargo.length,0);assert.equal(h.gold,gold+6);assert.equal(money(f),coins);assert.equal(tools(f),1);assert.equal(h.counters.customerWork,1);assert.ok(h.energy<100);
 const after=money(f);for(let i=0;i<20;i++)step(s);assert.equal(money(f),after);assert.equal(h.counters.customerWork,1);
});

test('an unknown real stock cannot be read remotely or reserve the client money',()=>{
 const f=fixture({known:false}),{s,h,c,p,source}=f;assert.equal(source.civic.tools,1);assert.equal(materialSource(s,c,ctx),null);const coins=money(f);assert.equal(servicePlan(s,ctx),false);assert.equal(c.status,'declined');assert.equal(c.escrow,0);assert.equal(p.agenda.wealth,40);assert.equal(h.workMaterials.cargo.length,0);assert.equal(money(f),coins);
});

test('a remembered supplier who ran out sells nothing and cannot create a tool or spend the deposit',()=>{
 const f=fixture(),{s,h,c,source,p}=f;source.civic.tools=0;assert.equal(h.workMaterials.known[source.id].available,true);accept(f);const coins=money(f);assert.ok(servicePlan(s,ctx));until(f,()=>h.area===source.id&&h.workMaterials.known[source.id].available===false);
 for(let i=0;i<20;i++)step(s);assert.equal(c.escrow,24);assert.equal(c.toolPurchase,undefined);assert.equal(h.workMaterials.cargo.length,0);assert.equal(source.civic.treasury,30);assert.equal(money(f),coins);s.tick=c.deadline+1;workOrdersTick(s,ctx);assert.equal(c.status,'cancelled');assert.equal(p.agenda.wealth,40);
});

test('without a shortage the same agreement uses the existing local tool and never makes a supplier trip',()=>{
 const f=fixture({known:false,local:1}),{s,c,h,source,a}=f;accept(f);assert.ok(servicePlan(s,ctx));assert.equal(h.goal.kind,'propertyRepair');until(f,()=>c.status==='done');assert.equal(source.civic.tools,1);assert.equal(source.civic.treasury,30);assert.equal(a.civic.tools,0);assert.equal(c.toolPurchase,undefined);assert.equal(c.materialsPaid,18);assert.equal(a.civic.treasury,78);
});

test('a carried client tool survives cancellation or death without a magical cash refund or ownership transfer',()=>{
 for(const reason of ['off','helper-dead','client-dead','timeout']){
  const f=fixture(),{s,h,c,p,source}=f;accept(f);servicePlan(s,ctx);until(f,()=>Boolean(c.toolPurchase));const coins=money(f),tool={...h.workMaterials.cargo[0]};
  if(reason==='off')setModule(s,'work-orders',false);else if(reason==='helper-dead'){h.alive=false;s.people[h.lineage].alive=false;}else if(reason==='client-dead')p.alive=false;else s.tick=c.deadline+1;
  workOrdersTick(s,ctx);assert.equal(c.status,'cancelled');assert.equal(c.refunded,21);assert.equal(c.escrow,0);assert.equal(p.agenda.wealth,37);assert.deepEqual(h.workMaterials.cargo,[tool]);assert.equal(tool.owner,p.id);assert.equal(source.civic.tools,0);assert.equal(source.civic.treasury,33);assert.equal(c.paid,undefined);assert.equal(money(f),coins);assert.equal(tools(f),1);
 }
});

test('a purchased tool and its split payment survive exact save replay, including material-travel-off',()=>{
 let f=fixture();accept(f);servicePlan(f.s,ctx);until(f,()=>Boolean(f.c.toolPurchase));setModule(f.s,'work-materials',false);const save=serialize(f.s),loaded=restore(save);assert.equal(serialize(loaded),save);const id=f.c.id;
 for(let i=0;i<160&&f.c.status!=='done';i++){step(f.s);step(loaded);assert.equal(serialize(loaded),serialize(f.s));}assert.equal(f.c.status,'done');assert.equal(loaded.workOrders[id].paid,6);assert.equal(loaded.hero.workMaterials.cargo.length,0);
});

test('the real client can accept one delay or refuse it; talking does not create funds or consume a tool',()=>{
 for(const consent of [true,false]){const f=fixture(),{s,c,h,p}=f;accept(f);c.deadline=s.tick+10;p.agenda.duty=consent?.5:.8;const before=money(f);assert.ok(servicePlan(s,ctx));assert.equal(h.goal.kind,'serviceDelay');const deadline=c.deadline;
  const result=extendService(s,ctx);assert.equal(result,consent);assert.equal(money(f),before);assert.equal(f.source.civic.tools,1);if(consent){assert.ok(c.deadline>deadline);assert.equal(c.escrow,24);assert.equal(c.extension.tick,s.tick);}else{assert.equal(c.status,'cancelled');assert.equal(c.refunded,24);assert.equal(p.agenda.wealth,40);}
 }
});

test('a repeated purchase or wrong action cannot duplicate a parcel, take a second tool or debit another fee',()=>{
 const f=fixture(),{s,h,c,source}=f;accept(f);servicePlan(s,ctx);until(f,()=>Boolean(c.toolPurchase));source.civic.tools=2;const coins=money(f);h.goal={kind:'serviceSupply',service:c.id,area:source.id,x:42};assert.equal(buyServiceTool(s,c,ctx),false);assert.equal(source.civic.tools,2);assert.equal(h.workMaterials.cargo.length,1);assert.equal(c.escrow,21);assert.equal(money(f),coins);
});

test('a real lethal battle leaves the client tool with the same dead body, archives it once and never births a successor',()=>{
 const f=fixture(),{s,h,c,p}=f;accept(f);servicePlan(s,ctx);until(f,()=>Boolean(c.toolPurchase));
 const a=s.areas.a2,index=a.objects.findIndex(o=>o.kind==='enemy'),enemy=a.objects.splice(index,1)[0];s.areas[h.area].objects.push(enemy);Object.assign(enemy,{hp:10000,maxHp:10000,attack:10000,alive:true,powers:[]});h.combat=enemy.id;h.hp=h.maxHp;h.inventory.potions=0;h.inventory.herbs=0;h.personality.courage=1;const person=h.lineage,tool={...h.workMaterials.cargo[0]};
 step(s);assert.equal(h.alive,false);assert.equal(h.hp,0);assert.deepEqual(h.workMaterials.cargo,[tool]);assert.deepEqual(s.lives[0].workMaterials.cargo,[tool]);assert.equal(s.graves.length,1);for(let i=0;i<25;i++)step(s);
 assert.equal(s.hero.lineage,person);assert.equal(s.nextGeneration,1);assert.equal(s.lives.length,1);assert.equal(c.status,'cancelled');assert.equal(c.refunded,21);assert.equal(p.agenda.wealth,37);assert.deepEqual(h.workMaterials.cargo,[tool]);assert.equal(s.lives[0].outcome,'dead');assert.equal(s.graves.length,1);const save=serialize(s);assert.equal(serialize(restore(save)),save);
});

test('a remembered dangerous route is not bypassed to reach a known tool stock',()=>{
 const f=fixture(),{s,h,c,p,source}=f;h.memory.avoided[source.id]=s.tick+100;assert.equal(materialSource(s,c,ctx),null);assert.equal(servicePlan(s,ctx),false);assert.equal(c.status,'declined');assert.equal(p.agenda.wealth,40);assert.equal(source.civic.tools,1);
});

test('the ordinary preparation planner budgets strength for the material trip before spending client funds',()=>{
 const f=fixture(),{s,h,c}=f;accept(f);servicePlan(s,ctx);h.energy=30;setModule(s,'preparation',true);step(s);assert.equal(h.goal.kind,'rest');assert.equal(h.planning.last.kind,'serviceSupply');assert.equal(h.planning.last.prepared,true);assert.ok(h.planning.last.energy>30);assert.equal(c.escrow,24);assert.equal(c.toolPurchase,undefined);until(f,()=>c.status==='done',300);assert.equal(c.paid,6);
});

test('two real helpers with different clients cannot both buy the last unit from one shared warehouse',()=>{
 const f=fixture(),{s,h:first,c:one,a,o,source}=f;accept(f);servicePlan(s,ctx);createNextStory(s,{allowLiving:true});const second=s.hero;
 Object.assign(second,{profession:'clockmaker',area:source.id,x:42,gold:200});second.career.rank=3;second.personality.generosity=.8;observeMaterials(s);second.area=a.id;syncActiveActor(s);
 const learned=ctx.route(s,a.id,source.id);for(const id of learned)revealArea(s,id);for(let i=1;i<learned.length;i++)revealRoad(s,learned[i-1],learned[i]);
 const client=Object.values(s.people).find(p=>p.alive&&p.id!==first.lineage&&p.id!==second.lineage&&p.id!==f.p.id&&p.area===a.id);Object.assign(client,{status:'resident',x:42});Object.assign(client.agenda,{job:'artisan',wealth:40,duty:.5,task:null});
 const otherShop={...o,id:o.id+'-other',owner:client.id,service:null,repair:null,history:[{tick:s.tick,kind:'origin',owner:client.id,basis:'prepared-second-shop'}]};a.objects.push(otherShop);assert.ok(commissionRepair(s,client,otherShop));const two=Object.values(s.workOrders).find(c=>c.helper===second.lineage);assert.ok(two);quoteRepair(s,client,client.agenda.task,ctx);assert.ok(servicePlan(s,ctx));assert.ok(acceptService(s,ctx));assert.ok(servicePlan(s,ctx));
 const coins=money(f)+second.gold+client.agenda.wealth+two.escrow;
 first.area=second.area=source.id;first.x=second.x=42;const view=actorView(s,first);syncActiveActor(view);syncActiveActor(s);
 assert.equal(buyServiceTool(view,one,ctx),true);assert.equal(buyServiceTool(s,two,ctx),false);assert.equal(source.civic.tools,0);assert.equal(source.civic.treasury,33);assert.equal(first.workMaterials.cargo.length,1);assert.equal(second.workMaterials.cargo.length,0);assert.equal(one.escrow,21);assert.equal(two.escrow,24);assert.equal(two.toolPurchase,undefined);assert.equal(money(f)+second.gold+client.agenda.wealth+two.escrow,coins);
});

test('disabled material or service dependencies cannot spend a still pending deposit at a purchase hook',()=>{
 for(const flag of ['work-materials','work-orders','work','property','property-damage']){const f=fixture(),{s,h,c,source}=f;accept(f);servicePlan(s,ctx);h.area=source.id;h.x=42;syncActiveActor(s);setModule(s,flag,false);const coins=money(f);assert.equal(buyServiceTool(s,c,ctx),false);assert.equal(source.civic.tools,1);assert.equal(c.escrow,24);assert.equal(h.workMaterials.cargo.length,0);assert.equal(money(f),coins);}
});
