import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore,step,observeExistingPerson} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {startKnife,workKnife,learnKnife,buyKnife,forgePlan,npcForgePlan,npcForgeAction} from '../modules/forging.js';
import {productionSources} from '../modules/goods.js';
import {collectionItems} from '../modules/collection-state.js';
import {foodCapability} from '../modules/local-food.js';
import {forgingHTML} from '../forging-sheet.js';
import {forgingFixture,placeAtBench,forgingContext as ctx} from '../scripts/forging-scenarios.mjs';
import {peopleTick} from '../modules/people.js';
import {npcAction} from '../modules/npc-control.js';
const finish=f=>{placeAtBench(f);for(let i=0;i<6;i++){f.s.tick++;assert.equal(workKnife(f.s,f.worker,ctx),true);}return collectionItems(f.s,f.worker.id).find(i=>i.toolKind==='knife');};

test('real recipe spends exactly two finite units and six coins, then six physical actions create one dated original',()=>{
 const f=forgingFixture(),{s,h,worker:p,site}=f,raw=productionSources(s,f.a).materials,before={stock:raw.stock,used:raw.used,gold:h.gold,treasury:f.a.civic.treasury,energy:h.energy,xp:h.career.xp,rng:JSON.stringify(s.randomStreams)};
 const o=startKnife(s,p,site,ctx);assert.ok(o);assert.equal(raw.stock,before.stock-2);assert.equal(raw.used,before.used+2);assert.equal(h.gold,before.gold-6);assert.equal(f.a.civic.treasury,before.treasury+6);assert.equal(collectionItems(s,p.id).length,0);assert.equal(startKnife(s,p,site,ctx),null);
 const item=finish(f);assert.equal(item.id,o.id+'/knife');assert.equal(item.createdAt,s.tick);assert.equal(item.found,s.tick);assert.equal(item.creator,p.id);assert.equal(item.manufacture.actions,6);assert.equal(item.manufacture.materials.length,2);assert.ok(item.history.every(e=>e.tick===s.tick));assert.equal(h.energy,before.energy-12);assert.equal(h.career.xp,before.xp);assert.equal(JSON.stringify(s.randomStreams),before.rng);assert.equal(p.skillPractice?.craft,undefined);
 for(let i=0;i<3;i++){assert.equal(workKnife(s,p,ctx),false);s.tick++;}assert.equal(collectionItems(s,p.id).length,1);assert.equal(raw.stock,before.stock-2);assert.equal(h.gold,before.gold-6);
});
test('unknown recipe, empty raw stock, insufficient purse and distant warehouse cannot create or debit an order',()=>{
 for(const reason of ['recipe','stock','money','distance']){const f=forgingFixture(),{s,h,worker:p}=f;const raw=productionSources(s,f.a).materials;if(reason==='recipe')h.profession='ranger';if(reason==='stock')raw.stock=1;if(reason==='money')h.gold=5;if(reason==='distance')h.x=90;syncActiveActor(s);const gold=h.gold,stock=raw.stock;assert.equal(startKnife(s,p,f.site,ctx),null,reason);assert.equal(h.gold,gold);assert.equal(raw.stock,stock);assert.equal(p.forging,undefined);}
});
test('partial order and exact material identities survive interruption, current reload and module OFF without free completion',()=>{
 const f=forgingFixture(),{s,worker:p}=f,o=startKnife(s,p,f.site,ctx);placeAtBench(f);s.tick++;workKnife(s,p,ctx);s.tick++;workKnife(s,p,ctx);f.h.goal=null;syncActiveActor(s);const saved=serialize(s),loaded=restore(saved);assert.equal(serialize(loaded),saved);const lp=loaded.people[p.id];setModule(loaded,'forging',false);loaded.tick++;assert.equal(workKnife(loaded,lp,ctx),false);assert.equal(lp.forging.orders[o.id].progress,2);setModule(loaded,'forging',true);for(let i=0;i<4;i++){loaded.tick++;assert.equal(workKnife(loaded,lp,ctx),true);}const item=collectionItems(loaded,p.id)[0];assert.deepEqual(item.manufacture.materials.map(m=>m.id),o.materials.map(m=>m.id));assert.equal(item.createdAt,loaded.tick);assert.equal(o.progress,2);
});
test('foreign bench without permission, destroyed workshop, wrong room and broken clamp retain invested material',()=>{
 for(const reason of ['foreign','destroyed','position','tool']){const f=forgingFixture(),{s,worker:p}=f,o=startKnife(s,p,f.site,ctx);placeAtBench(f);if(reason==='foreign')f.o.owner=f.p.id;if(reason==='destroyed')f.o.state='burned';if(reason==='position')f.h.x=95;if(reason==='tool'){setModule(s,'workshop-tools',true);f.o.workTool={version:1,state:'broken'};}s.tick++;assert.equal(workKnife(s,p,ctx),false,reason);assert.equal(o.progress,0);assert.equal(o.materials[0].state,'reserved');assert.equal(collectionItems(s,p.id).length,0);}
});
test('one world tick cannot count twice; action completion preserves original after exact reload',()=>{
 const f=forgingFixture(),{s,worker:p}=f,o=startKnife(s,p,f.site,ctx);placeAtBench(f);s.tick++;assert.ok(workKnife(s,p,ctx));assert.equal(workKnife(s,p,ctx),false);syncActiveActor(s);const copy=restore(serialize(s));assert.equal(workKnife(copy,copy.people[p.id],ctx),false);assert.equal(copy.people[p.id].forging.orders[o.id].progress,1);
});
test('ordinary NPC uses the same materials, labour, recipe, item origin and finite sale to a nearby buyer',()=>{
 const f=forgingFixture({npc:true}),{s,h,worker:p}=f,raw=productionSources(s,f.a).materials,stock=raw.stock;const task=npcForgePlan(s,p);assert.equal(task.kind,'forgeSupply');p.agenda.task=task;assert.equal(npcForgeAction(s,p,task,ctx),true);assert.equal(task.kind,'forgeWork');const item=finish(f);assert.equal(raw.stock,stock-2);assert.equal(item.creator,p.id);assert.equal(p.agenda.wealth,94);assert.equal(p.needs.energy,88);assert.equal(p.forging.offer.item,item.id);assert.equal(npcForgePlan(s,p),null);
 h.x=p.x;h.area=p.area;syncActiveActor(s);s.tick++;const gold=h.gold;assert.equal(buyKnife(s,s.people[h.lineage],p,ctx),true);assert.equal(h.gold,gold-10);assert.equal(p.agenda.wealth,104);assert.equal(collectionItems(s,p.id).length,0);assert.equal(collectionItems(s,h.lineage).filter(i=>i.id===item.id).length,1);assert.equal(buyKnife(s,s.people[h.lineage],p,ctx),false);
});
test('three actual lessons pay once and remember the teacher; absent or busy teacher cannot grant a recipe',()=>{
 const f=forgingFixture({npc:true}),{s,h,p}=f,student=s.people[h.lineage];h.profession='ranger';h.x=p.x;syncActiveActor(s);const gold=h.gold,wealth=p.agenda.wealth;
 s.tick++;assert.equal(learnKnife(s,student,p,ctx),true);assert.equal(learnKnife(s,student,p,ctx),false);assert.equal(h.gold,gold-2);assert.equal(p.agenda.wealth,wealth+2);p.agenda.task={kind:'work'};s.tick++;assert.equal(learnKnife(s,student,p,ctx),false);p.agenda.task=null;
 syncActiveActor(s);const loaded=restore(serialize(s)),ls=loaded.people[student.id],lt=loaded.people[p.id];for(let i=0;i<2;i++){loaded.tick++;assert.equal(learnKnife(loaded,ls,lt,ctx),true);}assert.equal(ls.forging.recipes['working-knife'].teacher,p.id);assert.equal(loaded.hero.gold,gold-2);assert.equal(lt.agenda.wealth,wealth+2);assert.equal(ls.skillPractice?.craft,undefined);
});
test('crafted knife works as a physical gathering tool; OFF does not destroy the item or duplicate it in food kits',()=>{
 const f=forgingFixture(),{s,worker:p}=f;startKnife(s,p,f.site,ctx);const item=finish(f);p.localFood={methods:{mushroom:true},tools:{}};setModule(s,'forging',false);assert.deepEqual(foodCapability(s,p,'mushroom',f.h),{allowed:true,tool:item.id,method:'identify-mushrooms'});assert.deepEqual(p.localFood.tools,{});
});
test('workshop interior is a real required place; exterior work cannot skip the door',()=>{
 const f=forgingFixture({interior:true}),{s,worker:p}=f;const o=startKnife(s,p,f.site,ctx);s.tick++;assert.equal(workKnife(s,p,ctx),false);assert.equal(o.progress,0);placeAtBench(f);s.tick++;assert.ok(workKnife(s,p,ctx));assert.equal(o.progress,1);
});
test('read-only character details and unavailable optional recipe preserve current save bytes',()=>{
 const f=forgingFixture(),{s,worker:p}=f;syncActiveActor(s);const before=serialize(s);assert.equal(forgingHTML(s,String),'');assert.equal(serialize(s),before);startKnife(s,p,f.site,ctx);syncActiveActor(s);const now=serialize(s);assert.ok(forgingHTML(s,String).includes('0 / 6'));assert.equal(serialize(s),now);const r=restore(now);assert.equal(serialize(r),now);
});
test('autonomous hero walks through the actual workshop door and finishes without a scripted sequence of actions',()=>{
 const f=forgingFixture({interior:true}),{s,h,worker:p}=f;assert.equal(forgePlan(s,ctx),true);assert.equal(h.goal.kind,'forgeSupply');
 let seenInside=false,steps=0;while(!collectionItems(s,p.id).some(i=>i.manufacture)&&steps++<160){step(s);seenInside ||= h.area===f.site.room.id;}
 assert.ok(seenInside);assert.ok(collectionItems(s,p.id).some(i=>i.manufacture));assert.ok(steps>6);syncActiveActor(s);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('ordinary people controller chooses the recipe and physically completes it at its own bench',()=>{
 const f=forgingFixture({npc:true,interior:true}),{s,worker:p}=f;setModule(s,'people',true);setModule(s,'npc-control',true);p.agenda.due=0;p.agenda.tools=1;
 let started=false,inside=false;for(let i=0;i<100&&!collectionItems(s,p.id).some(i=>i.manufacture);i++){s.tick+=8;peopleTick(s,ctx);started ||= Boolean(p.forging?.active);inside ||= p.area===f.site.room.id;}
 assert.ok(started);assert.ok(inside);assert.ok(collectionItems(s,p.id).some(i=>i.manufacture));assert.equal(p.forging.orders[Object.keys(p.forging.orders)[0]].progress,6);
});
test('a corrupt optional manufacturing record is rejected before it can create an item',()=>{
 const f=forgingFixture(),{s,worker:p}=f;startKnife(s,p,f.site,ctx);syncActiveActor(s);const raw=JSON.parse(serialize(s));raw.people[p.id].forging.orders[raw.people[p.id].forging.active].progress=7;assert.throws(()=>restore(JSON.stringify(raw)),/forging.progress/);
});
test('already completed output and partial order do not drift across observation or deterministic continuation',()=>{
 const f=forgingFixture({npc:true,interior:true}),{s,worker:p}=f;startKnife(s,p,f.site,ctx);placeAtBench(f);s.tick++;workKnife(s,p,ctx);assert.equal(observeExistingPerson(s,p.id),true);const q=structuredClone(p.forging);assert.deepEqual(s.people[p.id].forging,q);const raw=serialize(s),copy=restore(raw);for(let i=0;i<96;i++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));
});
test('a teacher or seller who already spent its own action cannot perform a second operation in that tick',()=>{
 const f=forgingFixture({npc:true}),{s,h,p}=f;setModule(s,'npc-control',true);h.profession='ranger';h.x=p.x;s.tick++;assert.ok(npcAction(s,p,'personal'));const gold=h.gold;assert.equal(learnKnife(s,s.people[h.lineage],p,ctx),false);assert.equal(h.gold,gold);assert.equal(s.people[h.lineage].forging,undefined);
 s.tick++;startKnife(s,p,f.site,ctx);finish(f);s.tick++;assert.ok(npcAction(s,p,'personal'));assert.equal(buyKnife(s,s.people[h.lineage],p,ctx),false);assert.equal(h.gold,gold);assert.equal(collectionItems(s,p.id).length,1);s.tick++;assert.ok(buyKnife(s,s.people[h.lineage],p,ctx));
});
