import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,createNextStory} from '../engine.js';import {setModule} from '../rules.js';
import {workshopAt} from '../modules/property.js';import {initializeWorkshopRooms} from '../modules/workshop-interiors.js';
import {workshopSite,workshopPosition} from '../modules/workshop-place.js';import {interiorPassage,interiorBuilding} from '../modules/interiors.js';
import {workshopInteriorFixture} from '../scripts/workshop-interior-scenarios.mjs';
import {productionSources} from '../modules/goods.js';
import {workspaceAccess} from '../modules/property.js';
import {craftStudyAction} from '../modules/craft-practice.js';
import {craftContext} from '../scripts/craft-respect-scenarios.mjs';
import {propertyDamageTick} from '../modules/property-damage.js';
import {weatherAt} from '../modules/weather.js';
import {sceneLights} from '../lighting.js';
import {syncActiveActor} from '../actor-projection.js';
import {paintInterior} from '../interior-view.js';
function fixture(){const s=createWorld(3),a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a);assert.ok(o);initializeWorkshopRooms(s);const room=s.areas[o.workshopInterior.area];return {s,a,o,room};}
test('each existing workshop gains exactly one empty room without duplicating title, tools, people, food or random draws',()=>{
 const s=createWorld(3),a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a),people=JSON.stringify(s.people),rng=JSON.stringify(s.randomStreams),civic=JSON.stringify(a.civic),owner=o.owner,history=JSON.stringify(o.history),count=s.nextArea,workshops=a.objects.filter(o=>o.kind==='workshop');assert.equal(workshops.length,2);initializeWorkshopRooms(s);assert.equal(s.nextArea,count+workshops.length);assert.equal(new Set(workshops.map(o=>o.workshopInterior.area)).size,workshops.length);assert.equal(JSON.stringify(s.people),people);assert.equal(JSON.stringify(s.randomStreams),rng);assert.equal(JSON.stringify(a.civic),civic);assert.equal(o.owner,owner);assert.equal(JSON.stringify(o.history),history);
 for(const object of workshops){const room=s.areas[object.workshopInterior.area];assert.equal(object.workTool,undefined);assert.equal(room.civic,undefined);assert.equal(room.goods,undefined);assert.equal(room.population.length,0);assert.equal(room.objects.filter(o=>o.kind==='workshop').length,0);assert.equal(room.forage.stock,0);assert.equal(workshopSite(s,room).object,object);assert.equal(interiorBuilding(s,room),object);}
});
test('the real door enters at8 and returns to the same original exterior coordinate, while the bench remains inside',()=>{const {s,a,o,room}=fixture();assert.deepEqual(interiorPassage(s,a.id,room.id),{x:o.x,arrival:8,allowed:true,exit:false});assert.deepEqual(interiorPassage(s,room.id,a.id),{x:8,arrival:o.x,allowed:true,exit:true});assert.deepEqual(workshopPosition(s,a,o),{area:room.id,x:68});});
test('closure, destruction, missing/dead host and disable deny entry without removing the preserved exit or resetting the property',()=>{
 for(const cause of ['closed','burned','dead','absent','off']){const {s,a,o,room}=fixture(),history=JSON.stringify(o.history);if(cause==='closed')o.closed=true;if(cause==='burned')o.state='burned';if(cause==='dead')s.people[o.owner].alive=false;if(cause==='absent')s.people[o.owner].area='a0';if(cause==='off')setModule(s,'workshop-interiors',false);assert.equal(interiorPassage(s,a.id,room.id).allowed,false,cause);assert.equal(interiorPassage(s,room.id,a.id).allowed,true,cause);initializeWorkshopRooms(s);assert.equal(s.areas[o.workshopInterior.area],room);assert.equal(JSON.stringify(o.history),history);}
});
test('repeat initialization, pure readers and actual v1 roundtrip retain exactly one room and canonical workshop',()=>{
 const f=fixture(),raw=serialize(f.s);initializeWorkshopRooms(f.s);workshopSite(f.s,f.room);workshopPosition(f.s,f.a,f.o);interiorBuilding(f.s,f.room);assert.equal(serialize(f.s),raw);const copy=restore(raw);assert.equal(serialize(copy),raw);const o=copy.areas[f.a.id].objects.find(o=>o.id===f.o.id);assert.equal(workshopSite(copy,copy.areas[o.workshopInterior.area]).object,o);
});
test('actual work pays one lease before walking through the door and to the bench, then one finite wage and one tool use',()=>{
 const f=workshopInteriorFixture(),{s,h,a,o,p,job,room}=f,wealth=p.agenda.wealth,treasury=a.civic.treasury,people=s.nextPerson;step(s);assert.equal(h.lastAction,'talk');assert.equal(h.gold,18);assert.equal(p.agenda.wealth,wealth+2);assert.equal(h.goal.remaining,job.duration);assert.equal(h.area,a.id);step(s);assert.equal(h.area,room.id);assert.equal(h.x,8);assert.equal(h.goal.remaining,job.duration);assert.equal(o.workTool,undefined);
 let walks=0;while(h.goal?.kind==='work'&&s.tick<50){const before=h.goal.remaining;step(s);if(h.lastAction==='walk'){walks++;assert.equal(h.goal.remaining,before);}if(h.lastAction==='work')assert.equal(h.area,room.id);}assert.ok(walks>=9);assert.equal(h.goal,null);assert.equal(h.gold,18+job.pay);assert.equal(a.civic.treasury,treasury-job.pay);assert.equal(p.agenda.wealth,wealth+2);assert.equal(o.workTool.uses,1);assert.equal(s.nextPerson,people);assert.equal(room.civic,undefined);assert.equal(h.workLife?.last?.area||a.id,a.id);
});
test('the owner needs no lease but still walks to the real inside station before the work counter advances',()=>{
 const {s,h,a,o,room,job}=workshopInteriorFixture({owned:true});let firstWork=null;for(let n=0;n<40&&h.goal;n++){const remain=h.goal.remaining;step(s);if(h.lastAction==='work'){firstWork??=s.tick;assert.equal(h.area,room.id);}else if(h.goal?.kind==='work')assert.equal(h.goal.remaining,remain);}assert.ok(firstWork>10);assert.equal(h.gold,20+job.pay);assert.equal(o.workTool.uses,1);assert.equal(a.objects.filter(o=>o.kind==='workshop').length,1);
});
test('fire, dead host, changed owner and disabled interiors interrupt a paid job and physically exit with no salary or duplicated workshop',()=>{
 for(const cause of ['burned','dead','owner','off','all-interiors-off']){const f=workshopInteriorFixture(),{s,h,a,o,room}=f;while(h.lastAction!=='work'&&s.tick<40)step(s);assert.equal(h.area,room.id);assert.ok(h.goal.remaining<f.job.duration);const population=s.nextPerson,areas=s.nextArea;if(cause==='burned')o.state='burned';if(cause==='dead')s.people[o.owner].alive=false;if(cause==='owner')o.owner=h.lineage;if(cause==='off')setModule(s,'workshop-interiors',false);if(cause==='all-interiors-off')setModule(s,'interiors',false);
  for(let n=0;n<35&&h.area===room.id;n++)step(s);assert.equal(h.area,a.id,cause);assert.equal(h.x,o.x,cause);assert.equal(h.gold,18,cause);assert.equal(o.workTool,undefined,cause);assert.equal(s.nextPerson,population);assert.equal(s.nextArea,areas);assert.equal(a.objects.filter(v=>v.kind==='workshop').length,1);
 }
});
test('a different plan abandons partial work and leaves by the original door without a salary or teleport',()=>{
 const {s,h,a,o,room}=workshopInteriorFixture();while(h.lastAction!=='work'&&s.tick<40)step(s);h.goal={kind:'trade',area:a.id,x:58,started:s.tick};const x=h.x;step(s);assert.equal(h.area,room.id);assert.ok(h.x<x);for(let n=0;n<25&&h.area===room.id;n++)step(s);assert.equal(h.area,a.id);assert.equal(h.x,o.x);assert.equal(h.gold,18);assert.equal(o.workTool,undefined);
});
function npcFixture(){
 const f=workshopInteriorFixture(),{s,h,p,a}=f;for(const id of ['people','npc-control','npc-needs','goods-cycle'])setModule(s,id,true);h.goal={kind:'routeWait',area:a.id,x:h.x,until:5000};for(const q of Object.values(s.people))if(q.id!==p.id&&q.id!==h.lineage)q.status='absent';Object.assign(p.agenda,{task:{kind:'work',target:a.id,x:42,remaining:3},due:0});p.needs.hunger=0;p.needs.energy=100;p.needs.sleeping=false;const sources=productionSources(s,a);Object.assign(sources.materials,{initial:2,stock:2,delivered:0,used:0});return {...f,sources};
}
test('the actual NPC controller walks its owner inside, produces from two real raw units and receives one finite local wage',()=>{
 const {s,h,p,a,o,room,sources}=npcFixture(),gold=p.agenda.wealth,stock=a.civic.tools,treasury=a.civic.treasury;let inside=false;for(let n=0;n<240&&!(o.workTool?.uses>0);n++){step(s);if(p.area===room.id)inside=true;if(p.area!==room.id)assert.equal(p.goodsWork?.quantity||0,0);}assert.ok(inside);assert.equal(p.area,room.id);assert.equal(p.x,68);assert.equal(p.goodsWork.quantity,1);assert.equal(sources.materials.used,2);assert.equal(sources.materials.stock,0);assert.equal(a.civic.tools,stock+1);assert.equal(p.agenda.wealth,gold+3);assert.equal(a.civic.treasury,treasury-3);assert.equal(o.workTool.uses,1);assert.equal(p.actionControl.owner,'personal');assert.equal(h.counters.peacefulWork||0,0);assert.equal(room.civic,undefined);
});
test('after the same inside NPC job breaks the clamp, actual tool repair returns inside and spends one existing part and three coins once',()=>{
 const {s,p,a,o,sources}=npcFixture(),stock=a.civic.tools,gold=p.agenda.wealth;
 o.workTool={version:1,id:o.id+'/clamp',kind:'clamp',state:'working',uses:23,limit:24,episode:0,origin:{kind:'existing-workshop',recorded:0}};let broken=false;for(let n=0;n<1500&&!(o.workTool.episode===1&&o.workTool.state==='working');n++){step(s);if(o.workTool.state==='broken')broken=true;}assert.ok(broken);assert.equal(o.workTool.state,'working');assert.equal(o.workTool.episode,1);assert.equal(o.workTool.uses,0);assert.equal(o.workTool.lastRepair.actor,p.id);assert.equal(o.workTool.lastRepair.part.paid,3);assert.equal(p.agenda.wealth,gold);assert.equal(a.civic.tools,stock);assert.equal(sources.materials.used,2);assert.equal(o.history.filter(x=>x.kind==='tool-break').length,1);assert.equal(o.history.filter(x=>x.kind==='tool-repair').length,1);
});
test('a mid-walk and partially worked room preserve the exact next actions on v1 reload',()=>{
 const {s,h,room}=workshopInteriorFixture();for(let n=0;n<7;n++)step(s);assert.equal(h.area,room.id);let copy=restore(serialize(s));for(let n=0;n<25;n++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));if(h.lastAction==='work')copy=restore(serialize(copy));}
});
test('lack of rent or a broken bench refuses before entry without creating a free work counter, fee or salary',()=>{
 for(const cause of ['money','tool']){const {s,h,a,o,p}=workshopInteriorFixture();if(cause==='money')h.gold=1;else o.workTool={id:o.id+'/clamp',state:'broken',episode:1,uses:24};const gold=h.gold,wealth=p.agenda.wealth;step(s);assert.equal(h.area,a.id);assert.equal(h.goal,null);assert.equal(h.gold,gold);assert.equal(p.agenda.wealth,wealth);assert.equal(h.counters.peacefulWork||0,0);}
});
test('a known clamp method repairs the same physical inside tool with one real material payment and two later fit actions',()=>{
 const {s,h,a,o,room}=workshopInteriorFixture({owned:true}),p=s.people[h.lineage],stock=a.civic.tools,money=a.civic.treasury;
 p.toolSkills={clamp:{source:'prepared-prior-lessons',learnedAt:0}};o.workTool={id:o.id+'/clamp',version:1,state:'broken',uses:24,episode:1};h.toolTask={property:o.id,area:a.id,episode:1,stage:'fit',started:s.tick};h.goal={kind:'toolFit',area:a.id,x:o.x,tool:o.id,started:s.tick};let paidTick=null,actions=0;
 for(let n=0;n<50&&o.workTool.state==='broken';n++){step(s);if(h.lastAction==='collect'){assert.equal(h.area,room.id);assert.equal(paidTick,null);paidTick=s.tick;}if(h.lastAction==='work')actions++;}
 assert.ok(paidTick>10);assert.equal(actions,2);assert.equal(o.workTool.state,'working');assert.equal(o.workTool.lastRepair.actor,h.lineage);assert.equal(h.gold,17);assert.equal(a.civic.tools,stock-1);assert.equal(a.civic.treasury,money+3);assert.equal(o.workTool.lastRepair.part.units,1);assert.equal(h.toolTask,null);assert.equal(room.civic,undefined);
});
test('a real study method uses the inside bench and owner permission, while a stale leased owner cannot grant another study step',()=>{
 const {s,h,a,o,room}=workshopInteriorFixture({owned:true});setModule(s,'craft-practice',true);setModule(s,'property-damage',true);setModule(s,'skill-branches',true);s.people[h.lineage].skillPractice={craft:{operations:[1,2,3].map(n=>({id:'prepared-repair-'+n})),total:3}};h.goal={kind:'craftStudy',area:a.id,x:o.x,property:o.id,started:s.tick};
 for(let n=0;n<40&&!s.people[h.lineage].skillPractice.craft.method;n++)step(s);const method=s.people[h.lineage].skillPractice.craft.method;assert.equal(method.id,'fit-working-part');assert.equal(h.area,room.id);assert.equal(h.gold,20);
 const f=workshopInteriorFixture();step(f.s);f.h.area=f.room.id;f.h.x=68;f.h.goal.kind='craftStudy';f.h.goal.property=f.o.id;const paid=f.h.goal.workspace;f.o.owner=f.h.lineage;setModule(f.s,'craft-practice',true);setModule(f.s,'property-damage',true);f.s.people[f.h.lineage].skillPractice={craft:{operations:[{id:'one'},{id:'two'},{id:'three'}],total:3}};assert.equal(paid.owner===f.o.owner,false);assert.equal(workspaceAccess(f.s,craftContext),'denied');assert.equal(f.s.people[f.h.lineage].skillPractice.craft.study,undefined);
});
test('the actual heat-and-working-forge hazard still sees the inside worker and burns the same workshop without regenerating its room',()=>{
 const {s,h,a,o,room}=workshopInteriorFixture();while(h.lastAction!=='work'&&s.tick<40)step(s);setModule(s,'weather',true);setModule(s,'property-damage',true);let found=false;for(let day=0;day<160;day++){s.tick=day*240;if(weatherAt(s,a).id==='heat'){found=true;break;}}assert.ok(found,'actual generated heat day');const owner=o.owner,id=room.id,count=s.nextArea,history=o.history.length;
 propertyDamageTick(s,{...craftContext,random:()=>0});assert.equal(o.state,'burned');assert.equal(o.owner,owner);assert.equal(o.history.length,history+1);assert.equal(o.history.at(-1).kind,'fire');assert.equal(o.workshopInterior.area,id);assert.equal(s.nextArea,count);assert.equal(s.areas[id],room);assert.ok(h.actorJournal.some(e=>e.type==='fire'||e.kind==='fire'));
 assert.equal(weatherAt(s,room).id,weatherAt(s,a).id);setModule(s,'lighting',true);const lights=sceneLights(s,room,{width:320,height:140,ground:120,view:{sunX:.5,sunY:.3},night:false,heroX:200});assert.ok(lights.sky);assert.equal(lights.local.some(l=>l.id==='room-lamp'),false);
});
test('a real purchase follows the living seller inside, transfers the same title once and preserves its bench/room identity',()=>{
 const {s,h,p,a,o,room}=npcFixture();while(!p.goodsWork?.quantity&&s.tick<240)step(s);assert.equal(p.area,room.id);setModule(s,'people',false);const price=120,wealth=p.agenda.wealth,id=room.id;h.gold=200;o.offer={owner:p.id,price,since:s.tick};h.goal={kind:'propertyBuy',area:a.id,x:o.x,property:o.id,seller:p.id,price,remaining:2,started:s.tick};h.property.known[o.id]={area:a.id,owner:p.id,price,state:'intact',name:o.name,seen:s.tick};syncActiveActor(s);
 for(let n=0;n<50&&o.owner!==h.lineage;n++)step(s);assert.equal(o.owner,h.lineage);assert.equal(h.area,room.id);assert.equal(h.gold,200-price);assert.equal(p.agenda.wealth,wealth+price);assert.equal(o.history.filter(e=>e.kind==='purchase').length,1);assert.equal(o.workshopInterior.area,id);assert.equal(o.workTool.uses,1);assert.equal(a.objects.filter(v=>v.kind==='workshop').length,1);
});
test('a released living observer completes its own one leased inside job under the shared world, not through the new observer controller',()=>{
 const {s,h,a,o,p,job}=workshopInteriorFixture(),wealth=p.agenda.wealth;step(s);step(s);assert.ok(createNextStory(s,{allowLiving:true}));assert.notEqual(s.hero,h);for(let n=0;n<22;n++)step(s);assert.equal(s.actorStates[h.lineage],h);assert.equal(h.gold,18+job.pay);assert.equal(o.workTool.uses,1);assert.equal(p.agenda.wealth,wealth+2);assert.equal(h.counters.peacefulWork,1);assert.equal(s.areas[a.id].objects.find(v=>v.id===o.id),o);
});
test('actual poison death inside leaves the corpse and shared world, never another work action, fee or automatic successor',()=>{
 const {s,h,a,o,room}=workshopInteriorFixture();while(h.lastAction!=='work'&&s.tick<40)step(s);const generation=s.generation,remaining=h.goal.remaining;setModule(s,'body',true);s.tick=23;h.hp=1;h.conditions=[{id:'poison',until:100}];syncActiveActor(s);step(s);assert.equal(h.alive,false);assert.equal(h.area,room.id);assert.equal(h.lastAction,'death');assert.equal(h.gold,0);assert.equal(o.workTool,undefined);const ticks=s.tick;for(let n=0;n<10;n++)step(s);assert.equal(s.tick,ticks+10);assert.equal(s.generation,generation);assert.equal(s.hero,h);assert.equal(h.lastAction,'death');assert.equal(o.workTool,undefined);assert.ok(remaining>0);assert.ok(s.graves.some(g=>g.area===room.id));assert.equal(a.objects.filter(v=>v.kind==='workshop').length,1);
});
test('the room renderer reads the same actual clamp and damaged shell with finite, language-independent strokes and no state or RNG writes',()=>{
 const {s,o,room}=workshopInteriorFixture();setModule(s,'world-signs',true);
 const record=()=>{const calls=[],ctx=new Proxy({},{get:(target,key)=>key in target?target[key]:(...args)=>calls.push([key,...args]),set:(target,key,value)=>(target[key]=value,true)});const before=serialize(s);paintInterior(ctx,room,320,150,120,s);assert.equal(serialize(s),before);for(const call of calls)for(const value of call.slice(1))if(typeof value==='number')assert.ok(Number.isFinite(value));assert.equal(calls.filter(c=>c[0]==='fillText').length,0);return calls;};
 const intact=record();o.state='burned';const burned=record();assert.notDeepEqual(burned,intact);assert.equal(o.workTool,undefined);assert.equal(s.areas[o.workshopInterior.area],room);
});
