import {test} from 'node:test';
import assert from 'node:assert/strict';
import {materialDeliveryFixture,materialDeliveryContext as ctx} from '../scripts/material-delivery-scenarios.mjs';
import {offerMaterialDelivery,answerMaterialOffer,workMaterialDelivery} from '../modules/material-delivery.js';
import {productionSources} from '../modules/goods.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {materialOfferTurn,expireMaterialDelivery,assessMaterialOffer} from '../modules/material-delivery.js';
import {npcDeedFixture} from '../scripts/npc-deed-scenarios.mjs';
import {serialize,restore,step,observeExistingPerson,observeDetailedActor} from '../engine.js';
import {setModule} from '../rules.js';
import {materialDeliveriesHTML,deliveryCargoHTML} from '../material-delivery-sheet.js';
import {canStartNPCActivity,npcController} from '../modules/npc-control.js';
const balance=s=>Object.values(s.people).reduce((n,p)=>n+(p.agenda?.wealth??0),0)+Object.values(s.materialDeliveries?.orders||{}).reduce((n,o)=>n+o.escrow,0);
test('a real quote reserves only customer money; answering is a separate voluntary body action',()=>{
 const {s,client,carrier,h}=materialDeliveryFixture(),before=balance(s),initial=client.agenda.wealth,gold=h.gold,recipientMemory=JSON.stringify(carrier.materialMemory);
 const o=offerMaterialDelivery(s,client,carrier,ctx);assert.ok(o);assert.equal(o.status,'quoted');assert.equal(h.gold,gold);assert.equal(client.agenda.wealth,initial-o.budget);assert.equal(balance(s),before);assert.equal(JSON.stringify(carrier.materialMemory),recipientMemory);
 s.tick++;assert.equal(answerMaterialOffer(s,carrier,ctx),true);assert.equal(o.status,'outward');assert.equal(h.gold,gold+2);assert.equal(o.advance,2);assert.equal(balance(s),before);assert.equal(answerMaterialOffer(s,carrier,ctx),false);
});
test('three finite extraction actions and an actual local handoff pay one result without printing raw or coins',()=>{
 const f=materialDeliveryFixture(),{s,client,carrier,h,source,a}=f,before=balance(s),raw=source.goodsRaw.remaining,materials=productionSources(s,a).materials.stock;
 const o=offerMaterialDelivery(s,client,carrier,ctx);s.tick++;answerMaterialOffer(s,carrier,ctx);
 // Arrange contact endpoints here; walking is exercised by the engine controls.
 h.area=source.id;h.x=42;syncActiveActor(s);for(let i=0;i<3;i++){s.tick++;assert.equal(workMaterialDelivery(s,carrier,ctx),true);assert.equal(workMaterialDelivery(s,carrier,ctx),false);}
 assert.equal(source.goodsRaw.remaining,raw-2);assert.equal(carrier.materialCargo.quantity,2);assert.equal(o.delivered,0);assert.equal(o.paid,2);
 h.area=a.id;h.x=client.x;syncActiveActor(s);s.tick++;assert.equal(workMaterialDelivery(s,carrier,ctx),true);assert.equal(o.status,'completed');assert.equal(o.delivered,2);assert.equal(o.paid,6);assert.equal(carrier.materialCargo,undefined);assert.equal(productionSources(s,a).materials.stock,materials+2);assert.equal(balance(s),before);assert.equal(workMaterialDelivery(s,carrier,ctx),false);
});
test('current saves preserve the quote, collected original batch and delivered receipt without enrichment',()=>{
 const {s,client,carrier,h,source,a}=materialDeliveryFixture(),check=()=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
 const o=offerMaterialDelivery(s,client,carrier,ctx);check();s.tick++;answerMaterialOffer(s,carrier,ctx);check();
 h.area=source.id;h.x=42;syncActiveActor(s);for(let i=0;i<3;i++){s.tick++;workMaterialDelivery(s,carrier,ctx);check();}
 h.area=a.id;h.x=client.x;syncActiveActor(s);s.tick++;workMaterialDelivery(s,carrier,ctx);check();assert.equal(o.status,'completed');
});
test('the existing actor controller physically carries the finite batch across the known roads and returns',()=>{
 const {s,client,carrier,h,source,a}=materialDeliveryFixture();setModule(s,'npc-needs',false);client.agenda.due=1000000000;
 for(const area of Object.values(s.areas))for(const o of area.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 const order=offerMaterialDelivery(s,client,carrier,ctx),start=s.tick,seen=new Set();
 while(['quoted','outward','collecting','returning'].includes(order.status)&&s.tick-start<1000){step(s);seen.add(h.area);}
 assert.equal(order.status,'completed',JSON.stringify({order,goal:h.goal,position:[h.area,h.x],client:[client.area,client.x],journal:s.journal.slice(0,4)}));assert.ok(seen.has(source.id));assert.ok(seen.has(a.id));assert.equal(order.receipt.quantity,2);assert.equal(carrier.materialCargo,undefined);assert.ok(s.tick-start>20);
});
function collectPrepared(f){const {s,client,carrier,h,source}=f,o=offerMaterialDelivery(s,client,carrier,ctx);s.tick++;assert.ok(answerMaterialOffer(s,carrier,ctx));h.area=source.id;h.x=42;syncActiveActor(s);for(let i=0;i<3;i++){s.tick++;workMaterialDelivery(s,carrier,ctx);}return o;}
test('a physically depleted source gives only one of two units and pays exactly the proportional result',()=>{
 const f=materialDeliveryFixture(),{s,client,carrier,h,source,a}=f,before=balance(s);source.goodsRaw.extracted+=source.goodsRaw.remaining-1;source.goodsRaw.remaining=1;const o=collectPrepared(f);assert.equal(carrier.materialCargo.quantity,1);assert.equal(o.quantity,2);
 h.area=a.id;h.x=client.x;syncActiveActor(s);s.tick++;workMaterialDelivery(s,carrier,ctx);assert.equal(o.status,'partial');assert.equal(o.paid,3);assert.equal(o.refunded,5);assert.equal(o.delivered,1);assert.equal(o.escrow,0);assert.equal(balance(s),before);
});
test('hidden exhaustion does not erase a remembered address; actual work discovers failure and retains the advance loss',()=>{
 const f=materialDeliveryFixture(),{s,client,carrier,source}=f,before=balance(s),wealth=client.agenda.wealth;source.goodsRaw.extracted+=source.goodsRaw.remaining;source.goodsRaw.remaining=0;const o=collectPrepared(f);
 assert.equal(o.status,'failed');assert.equal(o.work,3);assert.equal(o.paid,2);assert.equal(o.advanceDebt,2);assert.equal(client.agenda.wealth,wealth-2);assert.equal(carrier.materialCargo,undefined);assert.equal(balance(s),before);
});
test('an absent customer receives no cargo and no second payment; the original batch remains with its real holder',()=>{
 const f=materialDeliveryFixture(),{s,client,carrier,h,a}=f,before=balance(s),o=collectPrepared(f);client.area='a1';client.x=42;h.area=a.id;h.x=o.returnX;syncActiveActor(s);s.tick++;workMaterialDelivery(s,carrier,ctx);
 if(o.checkedWorkplace&&o.status==='returning'){h.area=o.workplace.area;h.x=o.workplace.x;syncActiveActor(s);s.tick++;workMaterialDelivery(s,carrier,ctx);}
 assert.equal(o.status,'unresolved');assert.equal(o.delivered,0);assert.equal(o.paid,2);assert.equal(carrier.materialCargo.quantity,2);assert.equal(carrier.materialCargo.owner,client.id);assert.equal(carrier.materialCargo.holder,carrier.id);assert.equal(balance(s),before);assert.equal(productionSources(s,a).materials.stock,0);
});
test('an unaffordable quote has no economic or body action and cannot become a free job board',()=>{
 const {s,client,carrier}=materialDeliveryFixture();setActorMoney(s,client,5);const before=serialize(s);assert.equal(offerMaterialDelivery(s,client,carrier,ctx),null);assert.equal(serialize(s),before);assert.equal(s.materialDeliveries,undefined);
});
test('the recipient can demand more for its time, but only the customer funded ceiling can pay it',()=>{
 const {s,client,carrier,h}=materialDeliveryFixture(),before=balance(s);h.personality.generosity=.1;const o=offerMaterialDelivery(s,client,carrier,ctx);s.tick++;answerMaterialOffer(s,carrier,ctx);assert.equal(o.fee,8);assert.equal(o.escrow,6);assert.equal(balance(s),before);
 const f=materialDeliveryFixture();f.h.personality.generosity=.1;setActorMoney(f.s,f.client,6);const limited=offerMaterialDelivery(f.s,f.client,f.carrier,ctx),wealth=f.client.agenda.wealth;f.s.tick++;answerMaterialOffer(f.s,f.carrier,ctx);assert.equal(limited.status,'declined');assert.equal(limited.advance,0);assert.equal(limited.paid,0);assert.equal(f.client.agenda.wealth,wealth+6);
});
test('a received offer occupies one waiting turn without moving the customer or spending the recipient turn',()=>{
 const {s,client,carrier}=materialDeliveryFixture(),o=offerMaterialDelivery(s,client,carrier,ctx),position=[client.area,client.x],wealth=carrier.agenda.wealth,recipientMemory=JSON.stringify(carrier.materialMemory);s.tick++;assert.equal(materialOfferTurn(s,client,ctx),true);assert.deepEqual([client.area,client.x],position);assert.equal(carrier.agenda.wealth,wealth);assert.equal(o.status,'quoted');assert.equal(JSON.stringify(carrier.materialMemory),recipientMemory);
});
test('disabling an invested delivery releases only unspent escrow and preserves the held physical batch',()=>{
 const f=materialDeliveryFixture(),{s,client,carrier}=f,before=balance(s),o=collectPrepared(f),cargo=JSON.stringify(carrier.materialCargo),wealth=client.agenda.wealth;setModule(s,'material-delivery',false);s.tick++;
 assert.equal(expireMaterialDelivery(s,carrier,ctx),true);assert.equal(o.status,'unresolved');assert.equal(o.paid,2);assert.equal(o.escrow,0);assert.equal(client.agenda.wealth,wealth+4);assert.equal(JSON.stringify(carrier.materialCargo),cargo);assert.equal(balance(s),before);assert.equal(expireMaterialDelivery(s,carrier,ctx),false);
});
test('current schema rejects changed escrow, a fabricated receipt or mismatched physical custody',()=>{
 const f=materialDeliveryFixture(),o=collectPrepared(f);syncActiveActor(f.s);const raw=serialize(f.s);
 for(const mutate of [s=>s.materialDeliveries.orders[o.id].escrow++,s=>s.people[f.carrier.id].materialCargo.holder=f.client.id,s=>s.materialDeliveries.orders[o.id].receipt={tick:s.tick,from:f.carrier.id,to:f.client.id,cargo:o.cargo,source:o.source,quantity:2,store:'fiction'}]){const s=JSON.parse(raw);mutate(s);assert.throws(()=>restore(JSON.stringify(s)),/Повреждённое/);}
 assert.equal(serialize(restore(raw)),raw);
});
for(const ownerMode of ['npc','actor'])test(`an autonomous ${ownerMode} customer hires an ordinary traveller who physically completes its own delivery`,()=>{
 const {s,client,carrier,source}=materialDeliveryFixture({ownerMode,carrierMode:'npc'});setModule(s,'npc-needs',false);client.agenda.due=1000000000;
 for(const area of Object.values(s.areas))for(const o of area.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 const seen=new Set();let order;while(s.tick<1100){step(s);seen.add(carrier.area);order=Object.values(s.materialDeliveries?.orders||{}).find(o=>o.client===client.id&&o.carrier===carrier.id);if(order&&!['quoted','outward','collecting','returning'].includes(order.status))break;}
 assert.equal(order?.status,'completed',JSON.stringify({order,carrier:{area:carrier.area,x:carrier.x,task:carrier.agenda.task},client:{area:client.area,x:client.x}}));assert.equal(order.delivered,2);assert.ok(seen.has(source.id));assert.equal(order.work,3);assert.ok(order.receipt.tick>order.collected);assert.equal(carrier.materialCargo,undefined);assert.equal(carrier.status,'resident');assert.equal(npcController(s,carrier),'personal');
 const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);const paid=order.paid;for(let i=0;i<32;i++)step(s);assert.equal(order.paid,paid);assert.equal(order.receipt.quantity,2);assert.equal(carrier.alive,true);assert.equal(client.alive,true);
 if(ownerMode==='actor'){const made=Object.values(client.forging?.orders||{}).find(o=>o.status==='completed'&&o.started>order.receipt.tick);assert.ok(made,'the delivered raw can fund the owners actual subsequent knife');assert.ok(made.materials.every(m=>m.source===order.receipt.store&&m.state==='consumed'));}
});
test('the read-only sheet explains actual escrow and cargo, escapes names, and creates no controls or state',()=>{
 const f=materialDeliveryFixture(),o=collectPrepared(f),{s,client,carrier}=f;client.name='<img src=x>';o.sourceName='<script>bad</script>';syncActiveActor(s);const before=serialize(s),escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),html=materialDeliveriesHTML(s,carrier,escape)+deliveryCargoHTML(s,carrier,escape);
 assert.match(html,/отложено/);assert.match(html,/Аванс|аванс/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);assert.doesNotMatch(html,/<button|data-action|material-delivery\/|<img|<script/);assert.equal(serialize(s),before);
 const ownerHTML=materialDeliveriesHTML(s,client,escape);assert.match(ownerHTML,/Ожидает заказанное сырьё/);assert.doesNotMatch(ownerHTML,/Везёт сырьё заказчику|Добывает конечную партию/);assert.equal(serialize(s),before);
});
test('an actual fatal battle keeps the batch with the same dead body and never refunds its paid advance',()=>{
 const f=materialDeliveryFixture(),{s,client,carrier,h,source}=f,o=collectPrepared(f),wealth=client.agenda.wealth,cargo=JSON.stringify(carrier.materialCargo);setModule(s,'magic',false);setModule(s,'combat-judgment',false);const enemy=source.objects.find(o=>o.kind==='enemy'&&o.alive);assert.ok(enemy);h.combat=enemy.id;h.inventory.potions=0;h.inventory.herbs=0;enemy.hp=enemy.maxHp=10000;enemy.attack=10000;
 for(let i=0;i<3&&h.alive;i++)step(s);assert.equal(h.alive,false);assert.equal(carrier.alive,false);assert.equal(s.lives.filter(l=>l.lineage===carrier.id).length,1);assert.equal(JSON.stringify(carrier.materialCargo),cargo);assert.equal(o.paid,2);
 s.tick=o.deadline+1;assert.equal(expireMaterialDelivery(s,client,ctx),true);assert.equal(o.status,'unresolved');assert.equal(o.advanceDebt,2);assert.equal(client.agenda.wealth,wealth+4);assert.equal(JSON.stringify(carrier.materialCargo),cargo);assert.equal(s.generation,h.actorGeneration);
 const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);
});
test('a known dangerous road makes the traveller refuse; the customer cannot overwrite that personal memory',()=>{
 const {s,client,carrier,h,source}=materialDeliveryFixture();h.memory.avoided[source.id]=s.tick+500;const memory=JSON.stringify(h.memory.avoided),wealth=client.agenda.wealth,o=offerMaterialDelivery(s,client,carrier,ctx);s.tick++;assert.ok(answerMaterialOffer(s,carrier,ctx));assert.equal(o.status,'declined');assert.equal(o.paid,0);assert.equal(client.agenda.wealth,wealth);assert.equal(JSON.stringify(h.memory.avoided),memory);
});
test('a worker with genuinely purchased materials and a performed knife step can refuse the competing delivery',()=>{
 const {s,p,order}=npcDeedFixture({interior:false,injured:false,carried:false});setModule(s,'material-delivery',true);assert.equal(order.progress,1);assert.ok(order.materials.every(m=>m.state==='reserved'));const before=serialize(s),answer=assessMaterialOffer(s,p,{id:'prospective',source:p.area,returnArea:p.area});assert.equal(answer.accept,false);assert.match(answer.reason,/Собственное срочное дело/);assert.equal(serialize(s),before);assert.equal(order.progress,1);
});
test('observing either ordinary party preserves the actual delivery, wallets, batch and source balance through reload',()=>{
 const {s,client,carrier,h,source,a}=materialDeliveryFixture({carrierMode:'npc'});setModule(s,'npc-needs',false);client.agenda.due=1000000000;for(const area of Object.values(s.areas))for(const o of area.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 const original=h.lineage;assert.ok(observeExistingPerson(s,client.id));assert.ok(observeExistingPerson(s,carrier.id));assert.ok(observeDetailedActor(s,original));const initial=serialize(s),results=[];
 for(const observer of [original,client.id,carrier.id]){let w=restore(initial);if(observer!==original)assert.ok(observeExistingPerson(w,observer));for(let i=0;i<640;i++){step(w);if(i%29===28){const raw=serialize(w);w=restore(raw);assert.equal(serialize(w),raw);}}
  const fields=p=>({area:p.area,x:p.x,alive:p.alive,health:p.health,needs:p.needs,wealth:p.agenda.wealth,memory:p.materialMemory,cargo:p.materialCargo});results.push({contracts:w.materialDeliveries,client:fields(w.people[client.id]),carrier:fields(w.people[carrier.id]),source:w.areas[source.id].goodsRaw,materials:productionSources(w,w.areas[a.id]).materials});
 }
 assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);assert.equal(Object.values(results[0].contracts.orders)[0].status,'completed');
});
test('an unanswered quote expires without changing the unconsenting travellers agenda, knowledge or wallet',()=>{
 const {s,client,carrier}=materialDeliveryFixture({carrierMode:'npc'}),wealth=client.agenda.wealth,o=offerMaterialDelivery(s,client,carrier,ctx),recipient=JSON.stringify(carrier);assert.equal(o.status,'quoted');s.tick=o.quoteUntil+1;
 assert.equal(expireMaterialDelivery(s,client,ctx),true);assert.equal(o.status,'declined');assert.equal(o.advance,0);assert.equal(o.paid,0);assert.equal(client.agenda.wealth,wealth);assert.equal(JSON.stringify(carrier),recipient);assert.equal(o.escrow,0);
});
test('an accepted finite delivery prevents a second transport job without creating a second body controller',()=>{
 const {s,client,carrier}=materialDeliveryFixture({carrierMode:'npc'}),o=offerMaterialDelivery(s,client,carrier,ctx);assert.equal(canStartNPCActivity(s,carrier),true);s.tick++;answerMaterialOffer(s,carrier,ctx);s.tick++;
 assert.equal(canStartNPCActivity(s,carrier),false);assert.equal(npcController(s,carrier),'personal');setModule(s,'material-delivery',false);expireMaterialDelivery(s,carrier,ctx);s.tick++;assert.equal(o.status,'unresolved');assert.equal(canStartNPCActivity(s,carrier),true);assert.equal(npcController(s,carrier),'personal');
});
