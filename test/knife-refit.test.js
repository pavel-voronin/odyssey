import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore,step,observeExistingPerson,createWorld} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';
import {acceptRefit,acquireRefitMaterial,performRefit,refitPreference,refitPlan,refitAction,npcRefitPlan,REFIT_FEE} from '../modules/knife-refit.js';
import {productionSources} from '../modules/goods.js';
import {collectionItems} from '../modules/collection-state.js';
import {npcAction} from '../modules/npc-control.js';
import {foodCapability,localFoodChoice,localFoodWork} from '../modules/local-food.js';
import {foodFixture} from '../scripts/local-food-scenarios.mjs';
import {changeProfession} from '../modules/identity.js';
import {startKnife,workKnife} from '../modules/forging.js';
import {workshopAt,workspaceAccess} from '../modules/property.js';
import {workshopSite} from '../modules/workshop-place.js';
import {knifeRefitHTML} from '../knife-refit-sheet.js';
import {refitFixture,refitContext as ctx} from '../scripts/knife-refit-scenarios.mjs';
const accept=f=>acceptRefit(f.s,f.master,f.item,ctx);
const finish=f=>{for(let i=0;i<4;i++){f.s.tick++;assert.equal(performRefit(f.s,ctx),true);}};

test('refit transfers actual payment and material once, keeps the same ID, maker, owner memory and original history',()=>{
 const f=refitFixture(),{s,h,item,master:m}=f;item.enchantment.uses=17;item.enchantment.resonance=2;const before={id:item.id,creator:item.creator,found:item.found,createdAt:item.createdAt,history:structuredClone(item.history),memory:structuredClone(item.enchantment),gold:h.gold,wealth:m.agenda.wealth,raw:productionSources(s,f.a).materials.stock};
 const o=accept(f);assert.ok(o);assert.equal(h.gold,before.gold-REFIT_FEE);assert.equal(m.agenda.wealth,before.wealth+REFIT_FEE);assert.equal(accept(f),null);assert.ok(acquireRefitMaterial(s,ctx));assert.equal(acquireRefitMaterial(s,ctx),false);assert.equal(h.gold,before.gold-15);assert.equal(productionSources(s,f.a).materials.stock,before.raw-1);
 finish(f);assert.equal(item.id,before.id);assert.equal(item.creator,before.creator);assert.equal(item.createdAt,before.createdAt);assert.equal(item.found,before.found);assert.deepEqual(item.history.slice(0,before.history.length),before.history);assert.deepEqual(item.enchantment,before.memory);assert.equal(item.power,2);assert.equal(item.refit.master,m.id);assert.equal(item.refit.finished,s.tick);assert.equal(o.material.state,'consumed');assert.equal(collectionItems(s).filter(i=>i.id===item.id).length,1);assert.equal(accept(f),null);assert.equal(performRefit(s,ctx),false);
});
test('ordinary caution may decline spending while attachment preserves the familiar knife',()=>{
 const f=refitFixture();f.h.money.style='cautious';f.h.habits=[];assert.equal(refitPreference(f.s,f.item).choice,'defer');assert.equal(accept(f),null);f.h.habits=['collector'];assert.equal(refitPreference(f.s,f.item).choice,'refit');assert.ok(accept(f));
});
test('unknown, busy, sleeping, distant or foreign-workshop master cannot charge or invent a refit',()=>{
 for(const why of ['unknown','busy','sleeping','distant','foreign']){const f=refitFixture();if(why==='unknown'){f.h.memory.people=[];f.h.relations={};}if(why==='busy')f.master.agenda.task={kind:'work'};if(why==='sleeping')f.master.needs.sleeping=true;if(why==='distant')f.master.x=90;if(why==='foreign')f.o.owner=f.h.lineage;const gold=f.h.gold,wealth=f.master.agenda.wealth;assert.equal(accept(f),null,why);assert.equal(f.h.gold,gold);assert.equal(f.master.agenda.wealth,wealth);assert.equal(f.client.knifeRefit,undefined);}
});
test('no material means no work; a paid partial order reloads exactly and resumes without a second payment',()=>{
 const f=refitFixture(),{s,h}=f,o=accept(f);assert.ok(o);assert.equal(performRefit(s,ctx),false);assert.ok(acquireRefitMaterial(s,ctx));s.tick++;assert.ok(performRefit(s,ctx));s.tick++;assert.ok(performRefit(s,ctx));syncActiveActor(s);const raw=serialize(s),r=restore(raw);assert.equal(serialize(r),raw);const gold=r.hero.gold,wealth=r.people[f.master.id].agenda.wealth;for(let i=0;i<2;i++){r.tick++;assert.ok(performRefit(r,ctx));}assert.equal(r.hero.gold,gold);assert.equal(r.people[f.master.id].agenda.wealth,wealth);assert.equal(collectionItems(r)[0].refit.actions,4);assert.equal(f.item.refit,undefined);
});
test('OFF or a broken tool pauses invested work without modifying the knife or its memory',()=>{
 for(const why of ['off','tool','owner','master']){const f=refitFixture(),o=accept(f);acquireRefitMaterial(f.s,ctx);const before=structuredClone(f.item);if(why==='off')setModule(f.s,'knife-refit',false);if(why==='tool'){setModule(f.s,'workshop-tools',true);f.o.workTool={version:1,state:'broken'};}if(why==='owner')f.o.owner=f.h.lineage;if(why==='master')f.master.alive=false;f.s.tick++;assert.equal(performRefit(f.s,ctx),false);assert.equal(o.progress,0);assert.equal(o.material.state,'reserved');assert.deepEqual(f.item,before);}
});
test('teacher/controller and persistent work stamps exclude an extra operation in the same tick',()=>{
 const f=refitFixture();setModule(f.s,'npc-control',true);f.s.tick++;assert.ok(npcAction(f.s,f.master,'personal'));assert.equal(accept(f),null);f.s.tick++;assert.ok(accept(f));assert.ok(acquireRefitMaterial(f.s,ctx));assert.equal(performRefit(f.s,ctx),false);f.s.tick++;assert.ok(performRefit(f.s,ctx));assert.equal(performRefit(f.s,ctx),false);syncActiveActor(f.s);const r=restore(serialize(f.s));assert.equal(performRefit(r,ctx),false);
});
test('precision reworks the same physical gathering knife rather than increasing magic resonance or making a spare',()=>{
 const f=refitFixture({mode:'precision'});assert.ok(accept(f));assert.ok(acquireRefitMaterial(f.s,ctx));finish(f);assert.equal(f.item.power,1);assert.equal(f.item.refit.mode,'precision');f.client.localFood={methods:{mushroom:true},tools:{knife:{id:'kit',owner:f.client.id,state:'working'}}};const capability=foodCapability(f.s,f.client,'mushroom',f.h);assert.equal(capability.tool,f.item.id);assert.equal(capability.turns,2);assert.equal(collectionItems(f.s).length,1);
});
test('an actual mastered fitting method has a finite recipe limit, not a growing resonance multiplier',()=>{
 const f=refitFixture();f.master.skillPractice={craft:{operations:[],total:3,method:{id:'fit-working-part'}}};const o=accept(f);assert.equal(o.required,3);assert.equal(o.limit,3);acquireRefitMaterial(f.s,ctx);for(let i=0;i<3;i++){f.s.tick++;performRefit(f.s,ctx);}assert.equal(f.item.power,3);assert.equal(f.item.refit.limit,3);assert.equal(accept(f),null);
});
test('plan and read-only sheet explain a real pending refit without modifying its save',()=>{
 const f=refitFixture();assert.ok(refitPlan(f.s,ctx));assert.equal(f.h.goal.kind,'refitMeet');f.s.tick++;assert.ok(refitAction(f.s,ctx));assert.equal(f.h.goal.kind,'refitMaterial');assert.equal(f.h.intent,'Найти материал для переделки');syncActiveActor(f.s);const before=serialize(f.s);assert.ok(knifeRefitHTML(f.s,String).includes('Нужен один настоящий материал'));assert.equal(serialize(f.s),before);f.s.tick++;assert.ok(refitAction(f.s,ctx));assert.equal(f.h.goal.kind,'refitWork');assert.equal(f.h.intent,'Доработать нож вместе с мастером');
});
test('both participants actually reach the workshop interior and complete the same-item service through normal simulation',()=>{
 const f=refitFixture({interior:true}),{s,h,item}=f;setModule(s,'people',true);setModule(s,'npc-control',true);assert.ok(refitPlan(s,ctx));let inside=false;
 for(let i=0;i<400&&!item.refit;i++){step(s);inside ||= Boolean(s.areas[h.area].interior?.kind==='workshop');}
 assert.ok(inside);assert.ok(item.refit);assert.equal(item.refit.master,f.master.id);assert.equal(collectionItems(s).filter(i=>i.id===item.id).length,1);syncActiveActor(s);const r=restore(serialize(s));for(let i=0;i<64;i++){step(s);step(r);}assert.equal(serialize(s),serialize(r));
});
test('death of the client releases the master appointment and cannot finish a dead body\'s knife',()=>{
 const f=refitFixture();accept(f);acquireRefitMaterial(f.s,ctx);f.h.alive=false;f.client.alive=false;assert.equal(npcRefitPlan(f.s,f.master),null);assert.equal(f.master.refitCommission,null);f.s.tick++;assert.equal(performRefit(f.s,ctx),false);assert.equal(f.item.refit,undefined);
});
test('loss of the actual knife ends that job without deleting its paid material record or locking the master forever',()=>{
 const f=refitFixture(),o=accept(f);acquireRefitMaterial(f.s,ctx);f.h.equipment.weapon=null;f.h.bag=[];f.h.goal=null;assert.equal(refitPlan(f.s,ctx),false);assert.equal(o.status,'lost-item');assert.equal(o.material.state,'reserved');assert.equal(f.client.knifeRefit.active,null);assert.equal(npcRefitPlan(f.s,f.master),null);assert.equal(f.master.refitCommission,null);
});
test('precision changes actual finite gathering from three actions to two, without free products or a second tool',()=>{
 const f=refitFixture({mode:'precision'});accept(f);acquireRefitMaterial(f.s,ctx);finish(f);const food=foodFixture();food.h.equipment.weapon=f.item;const {s,p,a,h}=food,choice=localFoodChoice(s,p,h,a),stock=a.forage.stock;assert.equal(choice.remaining,2);const task={foodSource:choice.id,remaining:choice.remaining};s.tick++;assert.equal(localFoodWork(s,p,a,task,h).finished,false);assert.equal(a.forage.stock,stock);s.tick++;const done=localFoodWork(s,p,a,task,h);assert.equal(done.finished,true);assert.equal(done.receipt.tool,f.item.id);assert.equal(a.forage.stock,stock-3);assert.equal(p.localFood.stock.mushroom,3);
});
test('malformed optional refit order is rejected before it can charge or mutate the existing knife',()=>{
 const f=refitFixture();accept(f);acquireRefitMaterial(f.s,ctx);syncActiveActor(f.s);const raw=JSON.parse(serialize(f.s)),q=raw.people[f.client.id].knifeRefit;q.orders[q.active].progress=9;assert.throws(()=>restore(JSON.stringify(raw)),/knifeRefit.progress/);
});
test('observing the working NPC keeps the client actor, paid order and exact replay under their original controllers',()=>{
 const f=refitFixture({interior:true});setModule(f.s,'people',true);setModule(f.s,'npc-control',true);accept(f);acquireRefitMaterial(f.s,ctx);f.h.goal={kind:'refitWork',area:f.a.id,x:42,property:f.o.id,master:f.master.id,started:f.s.tick};syncActiveActor(f.s);assert.ok(observeExistingPerson(f.s,f.master.id));let s=f.s,r=restore(serialize(s));for(let i=0;i<160;i++){step(s);step(r);}assert.equal(serialize(s),serialize(r));const client=s.actorStates[f.client.id];assert.ok([...client.bag,...Object.values(client.equipment).filter(Boolean)].some(i=>i.id===f.item.id&&i.refit));assert.equal(s.people[f.client.id].knifeRefit.active,null);
});
test('a born smith with no food kit can change profession and start real gathering with its actually made knife, including refit OFF',()=>{
 const s=createWorld(2),h=s.hero,p=s.people[h.lineage];assert.equal(h.profession,'smith');assert.equal(p.localFood,undefined);const birth=structuredClone(p.foodKitBirth);
 for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['identity','property','goods-cycle','supply','equipment','item-originals','forging','local-food'])setModule(s,id,true);
 const a=Object.values(s.areas).find(a=>a.district==='Мастерские');Object.assign(h,{area:a.id,x:42,hp:h.maxHp,energy:100,hunger:0,gold:100,goal:null,combat:null,transit:null});const o=workshopAt(s,a),m=s.people[o.owner];Object.assign(m,{area:a.id,x:42,status:'resident'});m.needs.sleeping=false;
 const site=workshopSite(s,a,o.id);assert.ok(startKnife(s,p,site,ctx));h.goal={kind:'forgeWork',area:a.id,x:42,property:o.id};assert.ok(['leased','ready'].includes(workspaceAccess(s,ctx)));for(let i=0;i<6;i++){s.tick++;assert.ok(workKnife(s,p,ctx));}const item=collectionItems(s).find(i=>i.toolKind==='knife');assert.ok(item);assert.equal(p.localFood,undefined);
 assert.ok(changeProfession(s,'ranger',ctx,'Новый способ добывать еду.'));assert.equal(p.localFood,undefined);assert.deepEqual(p.foodKitBirth,birth);
 const patch=Object.values(s.areas).find(a=>a.forage?.localFood?.kind==='mushroom');patch.climate='temperate';h.area=patch.id;h.x=patch.forage.x;const choice=localFoodChoice(s,p,h,patch);assert.ok(choice);assert.equal(p.localFood,undefined,'query is pure');const stock=patch.forage.stock,energy=h.energy,task=h.goal={kind:'forage',area:patch.id,x:choice.x,foodSource:choice.id,remaining:choice.remaining};s.tick++;
 assert.equal(localFoodWork(s,p,patch,task,h).finished,false);assert.equal(p.localFood.lastFoodWork,s.tick);assert.deepEqual(p.localFood.tools,{});assert.deepEqual(p.localFood.methods,{});assert.equal(h.energy,energy-1);assert.equal(localFoodWork(s,p,patch,task,h).finished,false);assert.equal(h.energy,energy-1);syncActiveActor(s);
 const loaded=restore(serialize(s));for(let i=0;i<2;i++){loaded.tick++;const result=localFoodWork(loaded,loaded.people[p.id],loaded.areas[patch.id],loaded.hero.goal,loaded.hero);assert.equal(result.finished,i===1);if(result.receipt)assert.equal(result.receipt.tool,item.id);}
 assert.equal(loaded.people[p.id].localFood.stock.mushroom,3);assert.equal(loaded.areas[patch.id].forage.stock,stock-3);assert.deepEqual(loaded.people[p.id].localFood.tools,{});assert.deepEqual(loaded.people[p.id].foodKitBirth,birth);
});
