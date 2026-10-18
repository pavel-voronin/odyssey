import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,observeExistingPerson,route} from '../engine.js';
import {setModule} from '../rules.js';
import {npcDeedsTick,knownNPCDeeds,observeNPCFamilyNeeds,npcFamilyAction} from '../modules/npc-deeds.js';
import {npcDeedFixture,npcLearningDeedFixture,addWorkerRelative,npcDeedContext as ctx} from '../scripts/npc-deed-scenarios.mjs';
import {personNeeds} from '../modules/needs.js';
import {syncActiveActor} from '../actor-projection.js';
import {recruitPerson,socialTick} from '../modules/social.js';
import {npcController} from '../modules/npc-control.js';
import {npcDeedsHTML} from '../npc-deeds-sheet.js';
import {createFreight,advanceFreight} from '../modules/freight.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {createPerson} from '../modules/lineage.js';
import {observeNPCContacts} from '../modules/npc-contacts.js';
test('a visible urgent family need parks the worker\'s actual paid order while the agenda executes only its selected aid',()=>{
 const f=npcDeedFixture(),{s,p,order,parent}=f,work=p.agenda.task,progress=order.progress,heroQuests=structuredClone(s.hero.quests);npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.domain,'family');assert.equal(p.agenda.task.kind,'familyAid');const paused=Object.values(p.npcIntentions.paused);assert.equal(paused.length,1);assert.equal(paused[0].task,work);assert.equal(order.progress,progress);assert.equal(order.materials[0].state,'reserved');assert.deepEqual(s.hero.quests,heroQuests);assert.equal(parent.roadSupplies,undefined);
});
test('the helper transfers a finite actual dose once; the patient uses a separate normal action to improve health',()=>{
 const f=npcDeedFixture(),{s,p,parent}=f;npcDeedsTick(s,p,ctx);p.x=parent.x;const task=p.agenda.task,health=parent.health,energy=p.needs.energy;assert.ok(npcFamilyAction(s,p,task,ctx));assert.equal(p.roadSupplies.medicine,0);assert.equal(parent.roadSupplies.medicine,2);assert.equal(parent.health,health);assert.equal(p.needs.energy,energy-3);assert.equal(npcFamilyAction(s,p,task,ctx),false);setModule(s,'npc-needs',true);setModule(s,'npc-personal-supplies',true);assert.ok(personNeeds(s,parent,ctx));assert.equal(parent.roadSupplies.medicine,0);assert.equal(parent.health,health+25);
});
test('the still-relevant paid work resumes with its original remaining steps after actual family help',()=>{
 const f=npcDeedFixture(),{s,p,order,parent}=f;let supplied=false;for(let i=0;i<240&&order.status!=='completed';i++){step(s);supplied ||= Object.values(p.familyNeeds?.cases||{}).some(c=>c.status==='supplied');}assert.ok(supplied);assert.equal(order.status,'completed');assert.equal(order.progress,6);assert.ok(p.npcIntentions.history.some(e=>e.kind==='resumed'));assert.equal(Object.values(p.familyNeeds.cases)[0].receipt.to,parent.id);
});
test('a distant relative\'s hidden wound does not create knowledge or interrupt the actual work',()=>{
 const f=npcDeedFixture({injured:false});f.parent.area=f.a.links.find(id=>id!==f.p.area);f.parent.health=1;const task=f.p.agenda.task;observeNPCFamilyNeeds(f.s,f.p);assert.equal(f.p.familyNeeds,undefined);npcDeedsTick(f.s,f.p,ctx);assert.equal(f.p.npcIntentions.current.domain,'manufacture');assert.equal(f.p.agenda.task,task);assert.equal(f.p.npcIntentions.history.some(e=>e.kind==='resumed'),false);
});
test('a known excessive risk explains deferral without dropping or duplicating the paid work',()=>{
 const f=npcDeedFixture(),{s,p}=f;s.areas[p.area].objects.push({id:'fixture/threat',kind:'enemy',alive:true,resolved:false,x:p.x+4,hp:500,maxHp:500,attack:100});npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.domain,'manufacture');assert.equal(p.agenda.task.kind,'forgeWork');assert.ok(p.npcIntentions.history.some(e=>e.kind==='refused'&&e.reason.includes('угроза')));const before=p.npcIntentions.history.length;s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.history.length,before);
});
test('a known family need, a real order and the ordinary job are read-only simultaneous affairs',()=>{const f=npcDeedFixture();observeNPCFamilyNeeds(f.s,f.p);const raw=serialize(f.s),deeds=knownNPCDeeds(f.s,f.p);assert.ok(deeds.some(d=>d.domain==='family'));assert.ok(deeds.some(d=>d.domain==='manufacture'));assert.ok(deeds.some(d=>d.domain==='occupation'));assert.equal(serialize(f.s),raw);});
test('partial suspension and supply receipts survive an exact same-tick reload without another dose or coin transfer',()=>{const f=npcDeedFixture();npcDeedsTick(f.s,f.p,ctx);syncActiveActor(f.s);const raw=serialize(f.s),s=restore(raw);assert.equal(serialize(s),raw);const p=s.people[f.p.id],parent=s.people[f.parent.id];p.x=parent.x;assert.ok(npcFamilyAction(s,p,p.agenda.task,ctx));const after=serialize(s),r=restore(after),rp=r.people[p.id],receipt=rp.familyNeeds.cases[parent.id].receipt;assert.equal(serialize(r),after);assert.equal(npcFamilyAction(r,rp,{kind:'familyAid',target:parent.area,x:parent.x,family:receipt.from+'/family/1'},ctx),false);assert.equal(r.people[parent.id].roadSupplies.medicine,2);assert.equal(rp.forging.orders[rp.forging.active].progress,1);});
test('OFF restores only a still-relevant paused executor while keeping family knowledge and invested material',()=>{const f=npcDeedFixture();npcDeedsTick(f.s,f.p,ctx);const current=f.p.npcIntentions.current;setModule(f.s,'npc-intentions',false);f.s.tick++;npcDeedsTick(f.s,f.p,ctx);assert.equal(f.p.agenda.task.kind,'forgeWork');assert.equal(f.p.familyNeeds.cases[f.parent.id].id,current.id);assert.equal(f.p.roadSupplies.medicine,2);assert.equal(f.order.progress,1);});
test('current local medicine purchase is finite and paid once, with one supply action before the separate handoff',()=>{const f=npcDeedFixture({interior:false,carried:false}),{s,p,a,parent}=f;parent.x=p.x+6;npcDeedsTick(s,p,ctx);assert.equal(p.agenda.task.kind,'familySupply');p.x=68;const stock=a.civic.medicine,money=p.agenda.wealth,treasury=a.civic.treasury;assert.ok(npcFamilyAction(s,p,p.agenda.task,ctx));assert.equal(a.civic.medicine,stock-2);assert.equal(p.agenda.wealth,money-8);assert.equal(a.civic.treasury,treasury+8);assert.equal(p.roadSupplies.medicine,2);assert.equal(parent.roadSupplies,undefined);assert.equal(npcFamilyAction(s,p,p.agenda.task,ctx),false);s.tick++;p.x=parent.x;p.agenda.task.x=parent.x;assert.ok(npcFamilyAction(s,p,p.agenda.task,ctx));assert.equal(parent.roadSupplies.medicine,2);assert.equal(p.roadSupplies.medicine,0);});
test('known family aid, one actually started order and an actually paid lesson coexist without another registry or a reset of learning',()=>{
 const f=npcLearningDeedFixture(),{s,p,order}=f,g=p.personalJourney;for(let i=0;i<800&&g.lessons.length<1;i++)step(s);assert.equal(g.lessons.length,1);const paid=structuredClone(g.lessons),parent=addWorkerRelative(f);s.tick++;npcDeedsTick(s,p,ctx);const list=knownNPCDeeds(s,p);assert.ok(list.some(d=>d.domain==='manufacture'));assert.ok(list.some(d=>d.domain==='learning'));assert.ok(list.some(d=>d.domain==='family'));assert.equal(p.npcIntentions.current.domain,'family');assert.equal(order.progress,1);assert.deepEqual(g.lessons,paid);assert.equal(s.people[g.teacher].toolTeaching,undefined);p.x=parent.x;assert.ok(npcFamilyAction(s,p,p.agenda.task,ctx));s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.domain,'learning');assert.equal(p.agenda.task.kind,'mentorLesson');assert.deepEqual(g.lessons,paid);assert.equal(order.materials[0].state,'reserved');
});
test('observing the ordinary worker does not add another action and its interrupted order replays exactly',()=>{
 const f=npcDeedFixture(),{s,p,order}=f;npcDeedsTick(s,p,ctx);syncActiveActor(s);assert.ok(observeExistingPerson(s,p.id));const r=restore(serialize(s));for(let i=0;i<240;i++){step(s);step(r);}assert.equal(serialize(s),serialize(r));assert.equal(order.status,'completed');assert.equal(p.familyNeeds.cases[f.parent.id].receipt.medicine,2);assert.equal(order.progress,6);
});

test('a real party handoff preserves suspended affairs and prevents personal action even with the general controller module OFF',()=>{
 const f=npcDeedFixture({interior:false}),{s,p,parent,order}=f;npcDeedsTick(s,p,ctx);setModule(s,'companions',true);setModule(s,'relationships',true);s.hero.area=p.area;s.hero.x=p.x;syncActiveActor(s);assert.ok(recruitPerson(s,p.id,ctx,true));const affairs=JSON.stringify([p.npcIntentions,p.familyNeeds]),stock=p.roadSupplies.medicine;assert.equal(npcController(s,p),'party');setModule(s,'npc-control',false);s.tick++;npcDeedsTick(s,p,ctx);assert.equal(npcFamilyAction(s,p,{kind:'familyAid',family:p.familyNeeds.cases[parent.id].id,target:p.area,x:p.x},ctx),false);assert.equal(JSON.stringify([p.npcIntentions,p.familyNeeds]),affairs);assert.equal(p.roadSupplies.medicine,stock);assert.equal(order.progress,1);
 // Departure is an actual social consequence, rather than a test-only owner reset.
 s.hero.companions.find(c=>c.person===p.id).loyalty=0;socialTick(s,ctx);assert.equal(npcController(s,p),'personal');s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.agenda.task.kind,'familyAid');assert.equal(order.progress,1);assert.equal(Object.keys(p.npcIntentions.paused).length,1);
});

test('recovery and disappearance at the remembered address leave the finite medicine with its owner',()=>{
 for(const gone of [false,true]){const f=npcDeedFixture(),{s,p,parent}=f;npcDeedsTick(s,p,ctx);p.x=parent.x;const task=p.agenda.task;if(gone)parent.alive=false;else parent.health=100;assert.equal(npcFamilyAction(s,p,task,ctx),false);assert.equal(p.roadSupplies.medicine,2);assert.equal(parent.roadSupplies,undefined);assert.equal(p.familyNeeds.cases[parent.id].status,gone?'missing':'unneeded');assert.equal(p.agenda.task,null);}
});

test('poor or exhausted workers explain their own limits instead of creating free family supplies',()=>{
 for(const exhausted of [false,true]){const f=npcDeedFixture({carried:false}),{s,p,a}=f;if(exhausted)p.needs.energy=20;else p.agenda.wealth=0;const medicine=a.civic.medicine;npcDeedsTick(s,p,ctx);assert.notEqual(p.npcIntentions.current.domain,'family');assert.ok(p.npcIntentions.history.some(e=>e.kind==='refused'));assert.equal(a.civic.medicine,medicine);assert.equal(p.roadSupplies,undefined);assert.equal(f.order.progress,1);}
});

test('an obsolete paid order is not restored after family aid or manufactured a second time',()=>{
 const f=npcDeedFixture(),{s,p,parent,order}=f;npcDeedsTick(s,p,ctx);order.status='cancelled';p.forging.active=null;p.x=parent.x;assert.ok(npcFamilyAction(s,p,p.agenda.task,ctx));s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.domain,'occupation');assert.equal(p.agenda.task,null);assert.deepEqual(p.npcIntentions.paused,{});assert.equal(order.progress,1);assert.ok(p.npcIntentions.history.some(e=>e.kind==='outdated'));
});

test('the affairs sheet is a read-only escaped explanation without technical scores or duplicate quest entries',()=>{
 const f=npcDeedFixture();npcDeedsTick(f.s,f.p,ctx);f.p.familyNeeds.cases[f.parent.id].name='<script>parent</script>';const raw=serialize(f.s),escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),html=npcDeedsHTML(f.s,f.p,escape);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Материал уже оплачен'));assert.ok(!html.includes('importance'));assert.equal(serialize(f.s),raw);
});

test('optional affair records reject fabricated receipts and future action ticks without enriching an old save',()=>{
 const f=npcDeedFixture();npcDeedsTick(f.s,f.p,ctx);f.p.x=f.parent.x;npcFamilyAction(f.s,f.p,f.p.agenda.task,ctx);const raw=serialize(f.s);for(const corrupt of [s=>s.people[f.p.id].familyNeeds.cases[f.parent.id].receipt.medicine=99,s=>s.people[f.p.id].npcIntentions.lastActionTick=s.tick+1,s=>delete s.people[f.p.id].npcIntentions.paused]){const s=JSON.parse(raw);corrupt(s);assert.throws(()=>restore(JSON.stringify(s)));}const plain=npcDeedFixture({injured:false});delete plain.p.familyNeeds;delete plain.p.npcIntentions;const save=serialize(plain.s);assert.equal(serialize(restore(save)),save);
});

test('a physical caravan owns the worker until actual delivery while all suspended affairs and finite medicine survive',()=>{
 const f=npcDeedFixture({interior:false}),{s,p,a,order}=f;npcDeedsTick(s,p,ctx);setModule(s,'companions',true);setModule(s,'relationships',true);setModule(s,'npc-logistics',true);s.hero.area=p.area;syncActiveActor(s);assert.ok(recruitPerson(s,p.id,ctx,true));s.hero.companions.find(c=>c.person===p.id).loyalty=0;socialTick(s,ctx);
 const to=s.areas.a7;to.civic.food=10;to.civic.medicine=0;to.civic.treasury=30;a.civic.food=90;a.civic.medicine=50;p.agenda.duty=.8;const home=p.area;for(const id of route(s,home,to.id)){p.area=id;observeFreightActor(s,p);}p.area=home;observeFreightActor(s,p);for(const area of Object.values(s.areas))for(const e of area.objects)if(e.kind==='enemy')e.alive=false;
 s.tick++;const c=createFreight(s,a,to,ctx,p.id);assert.ok(c);const records=JSON.stringify([p.npcIntentions,p.familyNeeds]),medicine=p.roadSupplies.medicine;assert.equal(npcController(s,p),'caravan');setModule(s,'npc-control',false);for(let i=0;i<200&&s.logistics.convoys.includes(c);i++){s.tick++;npcDeedsTick(s,p,ctx);assert.equal(JSON.stringify([p.npcIntentions,p.familyNeeds]),records);assert.equal(p.roadSupplies.medicine,medicine);assert.equal(order.progress,1);advanceFreight(s,c,ctx);}assert.equal(s.logistics.history.at(-1).outcome,'delivered');assert.equal(npcController(s,p),'personal');assert.equal(p.area,to.id);assert.equal(p.npcIntentions.current.domain,'family');assert.ok(Object.values(p.npcIntentions.paused).some(r=>r.domain==='manufacture'));s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.agenda.task.kind,'familyAid');assert.equal(p.agenda.task.target,home);
});

test('a newly seen critical relative changes the actual executor rather than only the intention label',()=>{
 const f=npcDeedFixture(),{s,p,parent}=f;parent.health=65;observeNPCFamilyNeeds(s,p);npcDeedsTick(s,p,ctx);assert.equal(p.agenda.task.family,p.familyNeeds.cases[parent.id].id);const id=createPerson(s,{name:'Вторая родственница',race:p.race,role:'житель',area:p.area,x:p.x+5,alive:true},{initialJob:'farmer'});p.parents.push(id);s.people[id].health=15;observeNPCContacts(s,p);s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.id,p.familyNeeds.cases[id].id);assert.equal(p.agenda.task.family,p.npcIntentions.current.id);assert.equal(p.familyNeeds.cases[parent.id].status,'known');assert.equal(Object.keys(p.npcIntentions.paused).length,1);
});

test('a visibly closed workshop keeps the paid material but cannot resume work until access is actually available again',()=>{
 const f=npcDeedFixture(),{s,p,parent,order}=f;npcDeedsTick(s,p,ctx);p.x=parent.x;assert.ok(npcFamilyAction(s,p,p.agenda.task,ctx));f.o.closed=true;s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.domain,'occupation');assert.equal(p.agenda.task,null);assert.equal(knownNPCDeeds(s,p).find(d=>d.domain==='manufacture').available,false);assert.ok(Object.values(p.npcIntentions.paused).some(r=>r.domain==='manufacture'));assert.equal(order.progress,1);assert.equal(order.materials[0].state,'reserved');f.o.closed=false;s.tick++;npcDeedsTick(s,p,ctx);assert.equal(p.npcIntentions.current.domain,'manufacture');assert.equal(p.agenda.task.kind,'forgeWork');assert.equal(order.progress,1);
});
