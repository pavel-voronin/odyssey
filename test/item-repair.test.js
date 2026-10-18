import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore,step,observeExistingPerson} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';
import {acceptItemRepair,acquireItemRepairMaterial,performItemRepair,itemRepairPlan,itemRepairAction,npcItemRepairPlan,itemRepairPreference,ITEM_REPAIR_WINDOW} from '../modules/item-repair.js';
import {acceptRefit,acquireRefitMaterial,performRefit} from '../modules/knife-refit.js';
import {productionSources} from '../modules/goods.js';
import {collectionItems} from '../modules/collection-state.js';
import {npcAction} from '../modules/npc-control.js';
import {makeItem,receiveItem,sellBag} from '../modules/inventory.js';
import {presentItem} from '../modules/item-originals.js';
import {itemConditionHTML,itemRepairHTML} from '../item-condition-sheet.js';
import {repairFixture,repairContext as ctx} from '../scripts/item-wear-scenarios.mjs';
const accept=f=>acceptItemRepair(f.s,f.master,f.item,ctx);
const finish=f=>{for(let i=0;i<4;i++){f.s.tick++;assert.ok(performItemRepair(f.s,ctx));}};

test('repair pays once, consumes one real material, restores the very same original without power, XP or resonance growth',()=>{
 const f=repairFixture(),{s,h,item,master:m}=f,before=structuredClone(item),gold=h.gold,wealth=m.agenda.wealth,raw=productionSources(s,f.a).materials.stock;
 const o=accept(f);assert.ok(o);assert.equal(h.gold,gold-6);assert.equal(m.agenda.wealth,wealth+6);assert.equal(accept(f),null);assert.equal(performItemRepair(s,ctx),false);assert.ok(acquireItemRepairMaterial(s,ctx));assert.equal(acquireItemRepairMaterial(s,ctx),false);assert.equal(h.gold,gold-9);assert.equal(productionSources(s,f.a).materials.stock,raw-1);
 finish(f);assert.equal(item.durability.current,240);assert.equal(item.durability.restored,240);assert.equal(item.durability.used,240);assert.equal(item.durability.initial+item.durability.restored-item.durability.used,item.durability.current);assert.equal(item.durability.repairs,1);assert.equal(o.material.state,'consumed');assert.equal(o.status,'completed');for(const key of ['id','creator','createdAt','found','power','enchantment'])assert.deepEqual(item[key],before[key],key);assert.deepEqual(item.history.slice(0,before.history.length),before.history);assert.equal(collectionItems(s).filter(i=>i.id===item.id).length,1);assert.equal(performItemRepair(s,ctx),false);assert.equal(accept(f),null);
});
test('new repair cannot steal a busy master, unknown contact, foreign bench or unsuitable specialist',()=>{
 for(const why of ['busy','unknown','foreign','skill','sleep','distance','refit']){const f=repairFixture();if(why==='busy')f.master.agenda.task={kind:'work'};if(why==='unknown'){f.h.memory.people=[];f.h.relations={};}if(why==='foreign')f.o.owner=f.h.lineage;if(why==='skill')f.master.agenda.job='farmer';if(why==='sleep')f.master.needs.sleeping=true;if(why==='distance')f.master.x=95;if(why==='refit')f.master.refitCommission={order:'elsewhere'};const gold=f.h.gold;assert.equal(accept(f),null,why);assert.equal(f.h.gold,gold);assert.equal(f.client.itemRepair,undefined);}
});
test('joint maintenance can finish from the advertised minimum of 35 energy',()=>{const f=repairFixture();f.h.energy=f.master.needs.energy=35;assert.ok(accept(f));assert.ok(acquireItemRepairMaterial(f.s,ctx));finish(f);assert.equal(f.h.energy,27);assert.equal(f.master.needs.energy,27);});
test('disabling maintenance preserves actual invested progress and permits real remaining work after re-enabling',()=>{const f=repairFixture(),o=accept(f);acquireItemRepairMaterial(f.s,ctx);f.s.tick++;performItemRepair(f.s,ctx);const gold=f.h.gold;setModule(f.s,'item-wear',false);f.s.tick++;assert.equal(performItemRepair(f.s,ctx),false);assert.equal(o.progress,1);assert.equal(f.item.durability.current,0);setModule(f.s,'item-wear',true);for(let i=0;i<3;i++){f.s.tick++;assert.ok(performItemRepair(f.s,ctx));}assert.equal(f.h.gold,gold);assert.equal(o.progress,4);assert.equal(f.item.durability.repairs,1);});
test('partial work and persistent operation stamps restore exactly without another payment or same-tick action',()=>{
 const f=repairFixture();setModule(f.s,'npc-control',true);f.s.tick++;assert.ok(npcAction(f.s,f.master,'personal'));assert.equal(accept(f),null);f.s.tick++;assert.ok(accept(f));assert.ok(acquireItemRepairMaterial(f.s,ctx));assert.equal(performItemRepair(f.s,ctx),false);f.s.tick++;assert.ok(performItemRepair(f.s,ctx));syncActiveActor(f.s);const raw=serialize(f.s),s=restore(raw);assert.equal(serialize(s),raw);assert.equal(performItemRepair(s,ctx),false);const gold=s.hero.gold;for(let i=0;i<3;i++){s.tick++;assert.ok(performItemRepair(s,ctx));}assert.equal(s.hero.gold,gold);assert.equal(collectionItems(s)[0].durability.repairs,1);assert.equal(f.item.durability.current,0);
});
test('OFF, failed tool, loss of title, death and insufficient material cannot repair or erase the original',()=>{
 for(const why of ['off','tool','title','death','material']){const f=repairFixture(),o=accept(f);if(why==='material'){productionSources(f.s,f.a).materials.stock=0;assert.equal(acquireItemRepairMaterial(f.s,ctx),false);}else assert.ok(acquireItemRepairMaterial(f.s,ctx));if(why==='off')setModule(f.s,'item-wear',false);if(why==='tool'){setModule(f.s,'workshop-tools',true);f.o.workTool={version:1,state:'broken'};}if(why==='title')f.o.owner=f.h.lineage;if(why==='death'){f.h.alive=false;f.client.alive=false;}f.s.tick++;assert.equal(performItemRepair(f.s,ctx),false);assert.equal(o.progress,0);assert.equal(f.item.durability.current,0);assert.equal(collectionItems(f.s)[0],f.item);}
});
test('expired or lost-item orders release the master without refund duplication or a permanent life lock',()=>{
 for(const why of ['expired','lost']){const f=repairFixture(),o=accept(f);acquireItemRepairMaterial(f.s,ctx);if(why==='expired')f.s.tick+=ITEM_REPAIR_WINDOW+1;else{f.h.equipment.weapon=null;f.h.bag=[];}f.h.goal=null;assert.equal(itemRepairPlan(f.s,ctx),false);assert.equal(o.status,why==='expired'?'expired':'lost-item');assert.equal(o.material.state,'reserved');assert.equal(f.client.itemRepair.active,null);assert.equal(npcItemRepairPlan(f.s,f.master),null);assert.equal(f.master.itemRepairCommission,null);}
});
test('cautious self-sufficient owner may use a basic blade, while attachment justifies real repair',()=>{const f=repairFixture();f.h.money.style='cautious';f.h.habits=[];assert.equal(itemRepairPreference(f.s,f.item).choice,'base');assert.equal(itemRepairPlan(f.s,ctx),false);assert.equal(f.client.itemRepair.lastChoice.choice,'base');f.h.habits=['collector'];assert.equal(itemRepairPreference(f.s,f.item).choice,'repair');});
test('actual NPC room movement and autonomous client plans complete joint maintenance and replay exactly',()=>{
 const f=repairFixture({interior:true});setModule(f.s,'people',true);setModule(f.s,'npc-control',true);assert.ok(itemRepairPlan(f.s,ctx));let inside=false;for(let i=0;i<400&&!f.item.durability.repairs;i++){step(f.s);inside ||= f.s.areas[f.h.area].interior?.kind==='workshop';}assert.ok(inside);assert.equal(f.item.durability.repairs,1);syncActiveActor(f.s);const r=restore(serialize(f.s));for(let i=0;i<64;i++){step(f.s);step(r);}assert.equal(serialize(f.s),serialize(r));
});
test('observing the real master keeps the client order and original under their proper controller',()=>{
 const f=repairFixture({interior:true});setModule(f.s,'people',true);setModule(f.s,'npc-control',true);assert.ok(accept(f));acquireItemRepairMaterial(f.s,ctx);f.h.goal={kind:'itemRepairWork',area:f.a.id,x:42,property:f.o.id,master:f.master.id,started:f.s.tick};syncActiveActor(f.s);assert.ok(observeExistingPerson(f.s,f.master.id));const r=restore(serialize(f.s));for(let i=0;i<180;i++){step(f.s);step(r);}assert.equal(serialize(f.s),serialize(r));assert.equal(f.s.people[f.client.id].itemRepair.active,null);assert.equal(collectionItems(f.s,f.client.id).find(i=>i.id===f.item.id).durability.repairs,1);
});
test('paid refit can finish a subsequently broken original but cannot secretly repair it or double-book the master',()=>{
 const f=repairFixture();f.item.durability.current=1;f.item.durability.used=239;setModule(f.s,'knife-refit',true);assert.ok(acceptRefit(f.s,f.master,f.item,ctx));acquireRefitMaterial(f.s,ctx);f.item.durability.current=0;f.item.durability.used=240;assert.equal(accept(f),null);for(let i=0;i<4;i++){f.s.tick++;assert.ok(performRefit(f.s,ctx));}assert.equal(f.item.durability.current,0);assert.equal(f.item.power,2);f.s.tick++;assert.ok(accept(f));acquireItemRepairMaterial(f.s,ctx);finish(f);assert.equal(f.item.power,2);assert.equal(f.item.durability.current,240);
});
test('tracked originals survive overflow, sale and a repeated receive even with originals controller OFF',()=>{
 const f=repairFixture();setModule(f.s,'item-originals',false);f.h.habits=[];f.h.bag=[];f.h.equipment.weapon=null;for(let i=0;i<26;i++){const item=makeItem(f.s,{...ctx,random:()=>.1},1);item.modifier='plain';receiveItem(f.s,ctx,null,item);}const cache=f.a.objects.find(o=>o.itemOriginals===1);assert.ok(cache?.items.length);const item=cache.items[0];assert.equal(item.physical.holder.kind,'cache');assert.equal(receiveItem(f.s,ctx,null,item),null);assert.equal(presentItem(f.s,item.id).kind,'cache');sellBag(f.s,ctx);assert.equal(f.s.merchant.itemOriginalsVersion,1);for(const item of f.s.merchant.items)assert.equal(item.physical.holder.kind,'merchant');
});
test('condition and maintenance sheets are pure and explain broken effect and actual progress',()=>{const f=repairFixture();assert.ok(accept(f));acquireItemRepairMaterial(f.s,ctx);syncActiveActor(f.s);const raw=serialize(f.s);assert.match(itemConditionHTML(f.item,String),/Сломано: 0 \/ 240/);assert.match(itemRepairHTML(f.s,String),/Работа: 0 \/ 4/);assert.equal(serialize(f.s),raw);});
test('corrupt condition accounting, operation source and paid repair progress are rejected instead of repaired on load',()=>{
 const f=repairFixture();accept(f);acquireItemRepairMaterial(f.s,ctx);syncActiveActor(f.s);const raw=serialize(f.s);for(const why of ['current','uses','repair','source']){const b=JSON.parse(raw),item=b.hero.equipment.weapon;if(why==='current')item.durability.current=241;if(why==='uses')item.durability.used=4;if(why==='source')item.durability.lastUse.actor='nobody';if(why==='repair'){const q=b.people[f.client.id].itemRepair;q.orders[q.active].progress=10;}assert.throws(()=>restore(JSON.stringify(b)),/durability|itemRepair/,why);}
});
