import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,createNextStory,restore,serialize,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty,transferProperty} from '../modules/property.js';
import {repairProperty} from '../modules/property-damage.js';
import {npcRepairPlan,npcRepairFinish} from '../modules/workshop-state.js';
import {propertyContractPlan,propertyContractTarget,propertyContractAction,propertyContractsTick,mayRepairProperty,repairMaterials,workshopRepaired,propertyLifeEnded} from '../modules/property-contracts.js';
const ctx={route,knownRoute,observeProperty,mayRepairProperty,repairMaterials,log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};},workshopRepaired:(s,a,o,proof)=>workshopRepaired(s,a,o,proof,ctx)};
function fixture(){
  const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['property','property-damage','property-contracts','finances','identity'])setModule(s,id,true);
  const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');
  Object.assign(h,{area:a.id,x:42,profession:'clockmaker',gold:200,energy:100,hp:h.maxHp,goal:null});h.career.path='peaceful';h.career.rank=3;h.personality.curiosity=.5;h.money.style='carefree';
  const o=workshopAt(s,a),p=s.people[o.owner];p.x=42;p.agenda.wealth=17;p.agenda.sociability=.8;o.state='burned';o.damagedAt=0;o.offer={owner:p.id,price:120,since:0};a.civic.tools=3;a.civic.treasury=60;observeProperty(s,a);
  return{s,h,a,o,p};
}
function sign(f){assert.equal(propertyContractPlan(f.s,ctx),true);assert.equal(f.h.goal.mode,'offer');assert.equal(propertyContractAction(f.s,ctx),true);return f.s.propertyContracts[f.h.property.contract];}
function perform(f){assert.equal(propertyContractPlan(f.s,ctx),true);for(let i=0;i<4;i++)assert.equal(repairProperty(f.s,ctx),true);}
test('agreed useful repair spends one real material and three actions, then transfers one title for accepted credit plus cash without wages',()=>{
 const f=fixture(),{s,h,a,o,p}=f,c=sign(f);assert.equal(o.owner,p.id);assert.equal(h.gold,200);assert.equal(p.agenda.wealth,17);
 perform(f);assert.equal(c.status,'credited');assert.equal(c.credit,36);assert.equal(h.gold,182);assert.equal(h.energy,94);assert.equal(a.civic.tools,2);assert.equal(a.civic.treasury,78);assert.equal(o.owner,p.id);
 assert.equal(propertyContractPlan(s,ctx),true);assert.equal(propertyContractAction(s,ctx),true);assert.equal(c.status,'done');assert.equal(h.gold,98);assert.equal(p.agenda.wealth,101);assert.equal(o.owner,h.lineage);assert.equal(o.history.filter(e=>e.kind==='purchase').length,1);assert.equal(o.history.at(-1).basis,'work-credit');assert.equal(h.property.contract,null);assert.equal(o.contract,null);
 assert.equal(h.gold+p.agenda.wealth+a.civic.treasury,277);assert.equal(propertyContractAction(s,ctx),false);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('real tick planning reaches the same bargain and transaction without direct action calls or invented damage',()=>{
 const f=fixture(),{s,h,o,p}=f;h.x=35;for(let i=0;i<60&&o.owner!==h.lineage;i++)step(s);
 assert.equal(o.owner,h.lineage);assert.equal(Object.values(s.propertyContracts)[0].status,'done');assert.equal(h.gold,98);assert.equal(p.agenda.wealth,101);assert.equal(o.history.filter(e=>e.kind==='repair').length,1);
});
test('another title buyer and the actual owner repair adapter cannot consume an active reserved agreement',()=>{
 const f=fixture(),{s,h,a,o,p}=f,c=sign(f);assert.equal(npcRepairPlan(s,p),true);assert.notEqual(p.agenda.task?.kind,'propertyRepair');npcRepairFinish(s,p,{property:o.id},ctx);assert.equal(o.state,'burned');
 perform(f);assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:120}),null);assert.equal(o.owner,p.id);
 assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:120,cash:120,credit:0,contract:c.id}),null);assert.equal(o.owner,p.id);
 c.buyer='another-person';assert.equal(transferProperty(s,ctx,{id:o.id,seller:p.id,price:120,cash:84,credit:36,contract:c.id}),null);assert.equal(h.gold,182);
});
test('material shortage, illness and module disabling postpone work; paid progress and the remaining deadline survive saves',()=>{
 const f=fixture(),{s,h,a,o}=f,c=sign(f);a.civic.tools=0;assert.equal(propertyContractPlan(s,ctx),false);assert.equal(c.nextAttempt,96);assert.equal(h.goal,null);assert.equal(h.gold,200);
 s.tick=96;a.civic.tools=3;assert.equal(propertyContractPlan(s,ctx),true);repairProperty(s,ctx);repairProperty(s,ctx);assert.equal(o.repair.remaining,2);h.goal=null;h.hp=1;assert.equal(propertyContractPlan(s,ctx),false);h.hp=h.maxHp;
 propertyContractsTick(s,ctx);const remaining=c.deadline-s.tick;setModule(s,'property-contracts',false);s.tick+=1500;propertyContractsTick(s,ctx);assert.equal(c.status,'active');assert.equal(c.deadline-s.tick,remaining);assert.equal(propertyContractPlan(s,ctx),false);
 const loaded=restore(serialize(s));setModule(loaded,'property-contracts',true);const saved=loaded.propertyContracts[c.id],room=loaded.areas[a.id].objects.find(q=>q.id===o.id);assert.equal(propertyContractPlan(loaded,ctx),true);repairProperty(loaded,ctx);repairProperty(loaded,ctx);assert.equal(saved.status,'credited');assert.equal(room.state,'intact');assert.equal(loaded.hero.gold,182);assert.equal(loaded.areas[a.id].civic.tools,2);
});
test('a changed sale quote or absent seller prevents payment; actual acceptance requires a meeting',()=>{
 const f=fixture(),{s,h,o,p}=f,c=sign(f);p.x=90;perform(f);assert.equal(c.status,'performed');assert.equal(c.accepted,false);assert.equal(propertyContractPlan(s,ctx),true);propertyContractTarget(s,ctx);assert.equal(h.goal.x,90);assert.equal(propertyContractAction(s,ctx),false);
 h.x=90;o.offer.price=140;assert.equal(propertyContractAction(s,ctx),false);assert.equal(c.status,'credited');assert.equal(h.gold,182);assert.equal(p.agenda.wealth,17);assert.equal(o.owner,p.id);
 s.tick+=96;propertyContractPlan(s,ctx);p.status='travelling';assert.equal(propertyContractTarget(s,ctx),false);assert.equal(h.goal,null);assert.equal(h.gold,182);
});
test('expiry preserves completed credit, allows one consented extension and pays a later claim only out of real seller wealth',()=>{
 const f=fixture(),{s,h,o,p}=f,c=sign(f);perform(f);s.tick=c.deadline+1;propertyContractsTick(s,ctx);assert.equal(c.status,'claim');assert.equal(c.claimAmount,36);assert.equal(o.contract,null);
 propertyContractPlan(s,ctx);assert.equal(propertyContractAction(s,ctx),true);assert.equal(c.extended,true);assert.equal(c.status,'credited');assert.equal(c.deadline,s.tick+600);assert.equal(h.gold,182);
 s.tick=c.deadline+1;propertyContractsTick(s,ctx);propertyContractPlan(s,ctx);propertyContractAction(s,ctx);assert.equal(c.status,'claim');assert.equal(c.paidClaim,17);assert.equal(p.agenda.wealth,0);assert.equal(h.gold,199);assert.equal(o.owner,p.id);
 s.tick+=480;p.agenda.wealth=30;propertyContractPlan(s,ctx);propertyContractAction(s,ctx);assert.equal(c.status,'settled');assert.equal(c.paidClaim,36);assert.equal(p.agenda.wealth,11);assert.equal(h.gold,218);assert.equal(o.history.filter(e=>e.kind==='purchase').length,0);
});
test('a different performer cannot produce the promised labor credit, while actual deposited material remains a single claim',()=>{
 const f=fixture(),{s,h,a,o,p}=f,c=sign(f);propertyContractPlan(s,ctx);repairProperty(s,ctx);assert.equal(c.materials,18);s.tick=c.deadline+1;propertyContractsTick(s,ctx);assert.equal(c.claimAmount,18);
 npcRepairFinish(s,p,{property:o.id},ctx);assert.equal(o.state,'intact');assert.equal(c.completed,undefined);assert.equal(c.credit,0);assert.equal(o.history.at(-1).actor,p.id);assert.equal(o.history.at(-1).payer,h.lineage);
 p.agenda.sociability=0;p.agenda.wealth=40;propertyContractPlan(s,ctx);propertyContractAction(s,ctx);assert.equal(c.paidClaim,18);assert.equal(h.gold,200);assert.equal(p.agenda.wealth,22);assert.equal(a.civic.tools,2);assert.equal(o.owner,p.id);
});
test('death through the actual engine archives the unpaid claim without assigning a workshop or giving it to the next hero',()=>{
 const f=fixture(),{s,h,o}=f,c=sign(f);perform(f);setModule(s,'magic',false);const e=s.areas.a2.objects.find(o=>o.kind==='enemy');h.area='a2';h.x=e.x;h.combat=e.id;h.personality.courage=1;h.inventory.potions=0;e.hp=e.maxHp=1000;e.attack=1000;
 step(s);assert.equal(h.alive,false);assert.equal(c.status,'claim');assert.equal(c.claimAmount,36);assert.equal(h.property.contract,null);assert.equal(o.contract,null);assert.ok(h.property.claims.includes(c.id));const buyer=h.lineage;
 const loaded=restore(serialize(s));createNextStory(loaded);assert.notEqual(loaded.hero.lineage,buyer);assert.equal(loaded.propertyContracts[c.id].buyer,buyer);assert.equal(loaded.propertyContracts[c.id].status,'claim');assert.deepEqual(loaded.hero.property.claims,[]);assert.notEqual(o.owner,buyer);
});
test('finished-life hook and seller death release reservations while preserving paid material for a future estate settlement',()=>{
 for(const ending of ['buyer','seller']){const f=fixture(),{s,h,o,p}=f,c=sign(f);propertyContractPlan(s,ctx);repairProperty(s,ctx);if(ending==='buyer')propertyLifeEnded(s,ctx);else{p.alive=false;propertyContractsTick(s,ctx);}assert.equal(c.status,'claim');assert.equal(c.claimAmount,18);assert.equal(o.contract,null);assert.equal(o.repair.payer,h.lineage);assert.equal(h.gold,182);assert.equal(p.agenda.wealth,17);}
});
test('settling keeps the living buyer and its performed agreement active rather than creating a claim at a fake ending',()=>{
 const f=fixture(),{s,h,a,o}=f,c=sign(f);perform(f);setModule(s,'lifecycle',true);h.life.home=a.id;h.life.motive='Остаться в городе';h.goal={kind:'settle',area:a.id,x:42,started:s.tick};
 step(s);assert.equal(h.alive,true);assert.equal(h.life.ended,false);assert.ok(h.life.residence.since>=0);assert.equal(c.status,'credited');assert.equal(h.property.contract,c.id);assert.equal(o.contract,c.id);assert.equal(s.lives.length,0);
});
test('changed ownership retains the completed result as a claim and cannot pass title or pay from a new owner',()=>{
 const f=fixture(),{s,h,o,p}=f,c=sign(f);perform(f);o.owner='another-owner';propertyContractsTick(s,ctx);assert.equal(c.status,'claim');assert.equal(c.claimAmount,36);assert.equal(o.contract,null);
 propertyContractPlan(s,ctx);propertyContractAction(s,ctx);assert.equal(o.owner,'another-owner');assert.equal(c.status,'claim');assert.equal(c.paidClaim,17);assert.equal(h.gold,199);assert.equal(p.agenda.wealth,0);
});
test('partly refunded credit cannot be resurrected in full by a later offer to extend the purchase',()=>{
 const f=fixture(),{s,h,p,o}=f,c=sign(f);perform(f);p.agenda.sociability=0;s.tick=c.deadline+1;propertyContractsTick(s,ctx);propertyContractPlan(s,ctx);propertyContractAction(s,ctx);assert.equal(c.paidClaim,17);
 s.tick+=480;p.agenda.sociability=1;p.agenda.wealth=30;propertyContractPlan(s,ctx);propertyContractAction(s,ctx);assert.equal(c.status,'settled');assert.equal(c.paidClaim,36);assert.equal(c.extended,false);assert.equal(o.owner,p.id);assert.equal(h.gold,218);
});

