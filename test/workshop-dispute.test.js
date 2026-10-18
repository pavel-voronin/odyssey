import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore,step,observeExistingPerson} from '../engine.js';
import {setModule} from '../rules.js';import {workshopAt} from '../modules/property.js';
import {workshopDisputePlan,workshopDisputeAction,npcDisputePlan,recordDisputeRepair,workshopDisputesTick} from '../modules/workshop-dispute.js';
import {commissionRepair,quoteRepair,servicePlan,acceptService} from '../modules/resident-orders.js';
import {repairProperty} from '../modules/property-damage.js';
import {initializeWorkshopRooms,npcWorkshopTarget} from '../modules/workshop-interiors.js';
import {npcToolPlan} from '../modules/workshop-tools.js';
import {npcCraftStudyPlan,craftPractice} from '../modules/craft-practice.js';
import {peopleTick} from '../modules/people.js';
import {productionSources} from '../modules/goods.js';
import {demonstrateCraft} from '../scripts/craft-respect-scenarios.mjs';
import {disputeFixture,offerDispute,agreeDispute,disputeTurn,disputeMoney,disputeContext as ctx} from '../scripts/workshop-dispute-scenarios.mjs';

test('two real original owners quote and consent on their own NPC turns without spending public stock or private money',()=>{
 const f=disputeFixture(),money=disputeMoney(f),rng=f.s.rng,r=agreeDispute(f);
 assert.equal(r.status,'agreed');assert.equal(Object.keys(r.quotes).length,2);assert.equal(Object.keys(r.votes).length,2);assert.ok(r.people.every(id=>r.votes[id].yes));assert.equal(f.a.civic.tools,1);assert.equal(disputeMoney(f),money);assert.equal(f.s.rng,rng);assert.equal(f.buildings[0].owner,f.p.id);assert.equal(f.buildings[1].owner,f.q.id);
});
test('one actual paid repair leaves the second need and frustration, with conserved money and no duplicate proof',()=>{
 const f=disputeFixture(),money=disputeMoney(f),r=agreeDispute(f);for(let i=0;i<12&&!Object.keys(r.completed).length;i++)disputeTurn(f);
 assert.equal(r.status,'partial');assert.equal(Object.keys(r.completed).length,1);assert.equal(f.a.civic.tools,0);assert.equal(f.a.civic.treasury,118);assert.equal(disputeMoney(f),money);const loser=f.owners.find(p=>!r.completed[p.id]);assert.equal(loser.workshopTalk.frustration,2);assert.equal(f.buildings.find(o=>o.owner===loser.id).state,'burned');
 const o=f.buildings.find(o=>o.state==='intact'),before=serialize(f.s);recordDisputeRepair(f.s,f.a,o,o.history.at(-1),ctx);assert.equal(serialize(f.s),before);
});
test('real replenishment permits the waiting owner to buy a separate material and finish without another promise',()=>{
 const f=disputeFixture(),money=disputeMoney(f),r=agreeDispute(f);for(let i=0;i<12&&r.status!=='partial';i++)disputeTurn(f);assert.equal(r.status,'partial');f.a.civic.tools=1; // Explicit intervention: one new physical stock, not dialogue output.
 for(let i=0;i<16&&r.status!=='finished';i++)disputeTurn(f);assert.equal(r.status,'finished');assert.equal(f.a.civic.tools,0);assert.equal(f.a.civic.treasury,136);assert.equal(disputeMoney(f),money);assert.ok(f.buildings.every(o=>o.state==='intact'));assert.ok(f.owners.every(p=>p.agenda.wealth===6));
});
test('an urgent second owner vetoes even a friendly mediator and keeps the right to act independently',()=>{
 const f=disputeFixture(),r=offerDispute(f);const first=r.people[0],second=r.people[1];f.h.relations[first]={trust:80};f.h.profession='clockmaker';f.s.people[second].agenda.duty=.9;
 assert.ok(workshopDisputePlan(f.s,ctx));assert.ok(workshopDisputeAction(f.s,ctx));assert.equal(r.first,first);for(let i=0;i<4&&r.status==='offered';i++)disputeTurn(f);
 assert.equal(r.status,'refused');assert.equal(r.refused,second);assert.equal(f.s.people[second].workshopTalk.active,undefined);assert.equal(f.a.civic.tools,1);assert.equal(f.owners[0].agenda.wealth,24);
});
test('a selfish uninvolved hero abstains; neither hero knowledge nor payment appears at a distance',()=>{
 const f=disputeFixture();f.h.area='a0';const r=offerDispute(f);assert.equal(f.h.workshopTalk,undefined);assert.equal(workshopDisputePlan(f.s,ctx),false);assert.equal(r.hero,undefined);assert.equal(f.a.civic.tools,1);
 const g=disputeFixture();offerDispute(g);g.h.personality.generosity=.1;assert.equal(workshopDisputePlan(g.s,ctx),false);assert.equal(Object.values(g.h.workshopTalk.known)[0].choice,'abstained');
});
test('two sufficient tools, an absent owner or an already funded material never create the scarcity conversation',()=>{
 for(const reason of ['sufficient','absent','funded']){const f=disputeFixture();if(reason==='sufficient')f.a.civic.tools=2;if(reason==='absent')f.q.area='a0';if(reason==='funded')f.buildings[1].repair={materials:true,payer:f.q.id,remaining:3};assert.equal(npcDisputePlan(f.s,f.p,f.buildings[0],ctx),false,reason);assert.equal(f.s.workshopDisputes,undefined);}
});
test('off releases only talk actions, preserves the conversation and cannot mint another title on observation',()=>{
 const f=disputeFixture(),r=offerDispute(f),before=JSON.stringify(r),titles=f.a.objects.filter(o=>o.kind==='workshop').map(o=>o.owner);setModule(f.s,'workshop-dispute',false);disputeTurn(f);assert.equal(JSON.stringify(r),before);assert.ok(f.owners.every(p=>!['workshopTalk','workshopWait'].includes(p.agenda.task?.kind)));for(let i=0;i<10;i++)workshopAt(f.s,f.a);assert.deepEqual(f.a.objects.filter(o=>o.kind==='workshop').map(o=>o.owner),titles);
});
test('partial conversation and real pending NPC labour replay identically after a v1 reload',()=>{
 const f=disputeFixture();agreeDispute(f);disputeTurn(f);const loaded=restore(serialize(f.s));assert.equal(serialize(loaded),serialize(f.s));for(let i=0;i<80;i++){step(f.s);step(loaded);assert.equal(serialize(f.s),serialize(loaded));}
});
test('an old accepted client escrow remains in its original service and prevents a replacement conversation',()=>{
 const f=disputeFixture({wealth:40});for(const id of ['work-orders'])setModule(f.s,id,true);setModule(f.s,'craft-respect',false);f.h.profession='clockmaker';assert.ok(commissionRepair(f.s,f.p,f.buildings[0]));const c=Object.values(f.s.workOrders)[0];quoteRepair(f.s,f.p,f.p.agenda.task,ctx);assert.ok(servicePlan(f.s,ctx));assert.ok(acceptService(f.s,ctx));const id=c.id,owner=c.client,escrow=c.escrow,money=disputeMoney(f);
 assert.equal(npcDisputePlan(f.s,f.q,f.buildings[1],ctx),false);assert.equal(f.s.workshopDisputes,undefined);assert.equal(c.escrow,escrow);assert.equal(c.client,owner);assert.ok(servicePlan(f.s,ctx));for(let i=0;i<4;i++){f.s.tick++;repairProperty(f.s,ctx);}assert.equal(c.id,id);assert.equal(c.status,'done');assert.equal(c.paid,6);assert.equal(disputeMoney(f),money);assert.equal(f.a.civic.tools,0);
});
test('a witnessed expert offers help but is paid only by the original separately accepted service after actual work',()=>{
 const f=disputeFixture({wealth:40,damaged:false});setModule(f.s,'work-orders',true);f.h.profession='clockmaker';demonstrateCraft(f);f.h.goal=null;for(const o of f.buildings)Object.assign(o,{state:'burned',damagedAt:f.s.tick,repair:null});
 const r=offerDispute(f);assert.ok(workshopDisputePlan(f.s,ctx));assert.ok(workshopDisputeAction(f.s,ctx));assert.equal(r.heroChoice,'help-first');for(let i=0;i<5&&r.status==='offered';i++)disputeTurn(f);assert.equal(r.status,'agreed');
 const client=f.s.people[r.first],o=f.buildings.find(o=>o.owner===client.id),money=disputeMoney(f);for(let i=0;i<8&&!Object.keys(f.s.workOrders).length;i++)disputeTurn(f);const c=Object.values(f.s.workOrders)[0];assert.ok(c);assert.equal(c.client,client.id);assert.equal(c.price,24);assert.equal(c.escrow,0);assert.equal(r.completed[client.id],undefined);
 f.h.x=client.x;if(c.status==='visiting')quoteRepair(f.s,client,client.agenda.task,ctx);assert.equal(c.status,'quoted');assert.ok(servicePlan(f.s,ctx));assert.ok(acceptService(f.s,ctx));assert.ok(servicePlan(f.s,ctx));f.h.x=o.x;for(let i=0;i<4;i++){f.s.tick++;repairProperty(f.s,ctx);}assert.equal(c.status,'done');assert.equal(c.paid,6);assert.equal(c.materialsPaid,18);assert.equal(disputeMoney(f),money);assert.equal(r.status,'partial');const other=f.owners.find(p=>p.id!==client.id);assert.equal(other.agenda.bonds[f.h.lineage],-1);assert.equal(client.agenda.bonds[f.h.lineage],2);
});
test('switching the observer to a participant never changes who quotes, pays or repairs',()=>{
 const f=disputeFixture();offerDispute(f);const control=restore(serialize(f.s));assert.ok(observeExistingPerson(f.s,f.p.id));for(let i=0;i<96;i++){step(f.s);step(control);}assert.deepEqual(f.s.workshopDisputes,control.workshopDisputes);for(const p of f.owners){assert.deepEqual(f.s.people[p.id].agenda,control.people[p.id].agenda);assert.deepEqual(f.s.people[p.id].workshopTalk,control.people[p.id].workshopTalk);}assert.deepEqual(f.s.randomStreams,control.randomStreams);
});
test('a real owner death expires the private arrangement while keeping any paid materials in place',()=>{
 const f=disputeFixture(),r=agreeDispute(f);let repair;for(let i=0;i<8&&!repair;i++){disputeTurn(f);repair=f.buildings.find(o=>o.repair?.materials);}assert.ok(repair);const material=structuredClone(repair.repair);f.owners.find(p=>p.id!==repair.owner).alive=false;workshopDisputesTick(f.s,ctx);assert.equal(r.status,'cancelled');assert.deepEqual(repair.repair,material);assert.equal(f.a.civic.tools,0);
});
test('a private agreement grants no public reservation: missing stock stays missing and the finite wait can expire',()=>{
 const f=disputeFixture(),r=agreeDispute(f),money=disputeMoney(f);f.a.civic.tools=0;for(let i=0;i<30;i++)disputeTurn(f);assert.equal(r.status,'expired');assert.ok(f.buildings.every(o=>o.state==='burned'));assert.equal(Object.keys(r.completed).length,0);assert.equal(disputeMoney(f),money);assert.equal(f.a.civic.tools,0);assert.ok(f.owners.every(p=>p.workshopTalk.active===undefined));
});
test('a changed title or fabricated completion cannot reward the mediator or erase the remaining damaged workshop',()=>{
 const f=disputeFixture(),r=agreeDispute(f),before=serialize(f.s);recordDisputeRepair(f.s,f.a,f.buildings[0],{actor:f.h.lineage,payer:f.p.id,damageAt:0},ctx);assert.equal(serialize(f.s),before);f.buildings[0].owner=f.h.lineage;workshopDisputesTick(f.s,ctx);assert.equal(r.status,'cancelled');assert.equal(f.buildings[1].state,'burned');assert.equal(f.a.civic.tools,1);
});
test('the waiting owners view explains its own finite agreement without claiming a live stock shortage',()=>{
 const f=disputeFixture(),r=agreeDispute(f);for(let i=0;i<12&&r.status!=='partial';i++)disputeTurn(f);const id=r.people.find(id=>!r.completed[id]);f.s.people[id].agenda.task=null;f.a.civic.tools=1;assert.ok(observeExistingPerson(f.s,id));assert.equal(f.s.hero.intent,'Ждёт своей очереди на ремонт');assert.ok(f.s.hero.reason.includes('есть срок'));assert.equal(f.a.civic.tools,1);
});
test('the second actual owner walks into its own room, consumes two raw units and wears its own clamp once',()=>{
 const f=disputeFixture({damaged:false}),{s,h,a,q}=f,o=f.buildings[1];for(const id of ['interiors','workshop-interiors','workshop-tools','goods-cycle'])setModule(s,id,true);initializeWorkshopRooms(s);f.p.agenda.due=1e9;f.p.agenda.task=null;h.goal={kind:'routeWait',area:a.id,x:42,until:1e9};
 const source=productionSources(s,a),raw=source.materials.stock,tools=a.civic.tools;assert.ok(raw>=2);q.agenda.task={kind:'work',target:a.id,x:42,remaining:3};npcWorkshopTarget(s,q);assert.equal(q.agenda.task.target,o.workshopInterior.area);assert.equal(q.agenda.task.workshop.id,o.id);
 for(let i=0;i<240&&!q.goodsWork?.quantity;i++)step(s);assert.equal(q.area,o.workshopInterior.area);assert.equal(q.goodsWork.quantity,1);assert.equal(source.materials.stock,raw-2);assert.equal(a.civic.tools,tools+1);assert.equal(o.workTool.uses,1);assert.equal(f.buildings[0].workTool,undefined);
 // A prepared break after real work: street planning must find its original.
 Object.assign(q,{area:a.id,x:o.x,status:'resident'});q.agenda.task=null;o.workTool.state='broken';o.workTool.episode++;assert.ok(npcToolPlan(s,q));assert.equal(q.agenda.task.property,o.id);assert.equal(q.agenda.task.target,a.id);
});
test('three genuine second-owner restorations enable study at its own bench without a fabricated practice ledger',()=>{
 const f=disputeFixture({damaged:false,stock:6,wealth:200}),{s,a,q}=f,o=f.buildings[1];setModule(s,'craft-practice',true);setModule(s,'workshop-dispute',false);f.p.agenda.due=1e9;
 for(let episode=0;episode<3;episode++){Object.assign(o,{state:'burned',damagedAt:s.tick,repair:null});q.agenda.task=null;q.agenda.due=s.tick;for(let n=0;n<12&&o.state!=='intact';n++){s.tick+=8-s.tick%8;peopleTick(s,ctx);}assert.equal(o.state,'intact');}
 assert.equal(craftPractice(s,q.id).total,3);assert.equal(q.agenda.wealth,146);assert.equal(a.civic.tools,3);const t=npcCraftStudyPlan(s,q);assert.equal(t.property,o.id);assert.equal(t.target,a.id);assert.equal(craftPractice(s,q.id).method,undefined);
});
