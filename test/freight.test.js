import test from 'node:test';import assert from 'node:assert/strict';
import{createWorld,route,serialize,restore}from'../engine.js';import{civicArea}from'../modules/society.js';import{peopleArea,peopleTick}from'../modules/people.js';
import{launchConvoy,supplyTick,recoverCargo}from'../modules/supply.js';import{advanceFreight}from'../modules/freight.js';import{observeFreightActor,convoyView,observeConvoy,MARKET_AGE,availableFreightDriver}from'../modules/freight-memory.js';
import{caravanPlan}from'../modules/caravans.js';import{knownWorldEvent}from'../modules/background-towns.js';import{setModule}from'../rules.js';
const logs=[];let xp=0;const ctx={route,log:(s,text)=>logs.push({tick:s.tick,text}),gainXp:(s,n)=>xp+=n};
function setup(){let s=createWorld(1),a=s.areas.a4;a.type='village';civicArea(s,a);peopleArea(s,a);a.civic.food=10;a.civic.medicine=0;a.civic.treasury=60;
 const source=s.areas.a1;source.civic.food=90;source.civic.medicine=50;const id=source.population[0],p=s.people[id];
 for(const other of Object.values(s.people))if(other.agenda){other.agenda.due=100000;other.agenda.task=null;}
 Object.assign(p.agenda,{job:'merchant',duty:.8,wealth:0,task:null});p.health=p.maxHealth||100;p.needs.hunger=10;p.needs.energy=100;p.needs.sleeping=false;p.x=42;p.area=source.id;p.status='resident';
 for(const area of Object.values(s.areas)){area.discovered=false;area.visited=false;for(const e of area.objects)if(e.kind==='enemy')e.alive=false;}
 s.hero.area='a0';s.hero.combat=null;s.hero.transit=null;s.logistics.nextDispatch=100000;s.journal=[];s.hero.timeline=[];s.changes=[];logs.length=0;xp=0;
 s=restore(serialize(s));return{s,p:s.people[id],source:s.areas.a1,to:s.areas.a4};}
function remember(s,p,to){const from=p.area;for(const id of route(s,from,to.id)){p.area=id;observeFreightActor(s,p);}p.area=from;observeFreightActor(s,p);}
function finish(s,limit=200){for(let i=0;i<limit&&s.logistics.convoys.length;i++){s.tick++;supplyTick(s,ctx);}}
test('an actual known-market driver launches without hero discovery, reserves once, travels and is paid once from the destination',()=>{
 let {s,p,source,to}=setup();remember(s,p,to);const id=p.id,count=s.nextPerson;s.tick=1;s.logistics.nextDispatch=0;supplyTick(s,ctx);
 assert.equal(s.logistics.convoys.length,1);const c=s.logistics.convoys[0];assert.equal(c.person,id);assert.equal(source.civic.food,78);assert.equal(source.civic.medicine,46);assert.equal(s.nextPerson,count);assert.equal(source.population.includes(id),false);assert.equal(logs.length,0);
 const save=serialize(s);s=restore(save);assert.ok(serialize(s)===save);p=s.people[id];source=s.areas.a1;to=s.areas.a4;finish(s);
 assert.equal(p.area,to.id);assert.equal(p.status,'resident');assert.equal(to.civic.food,22);assert.equal(to.civic.medicine,4);assert.equal(p.agenda.wealth,3);assert.equal(to.civic.treasury,57);assert.equal(s.logistics.deliveries,1);assert.equal(s.logistics.history.filter(e=>e.id===c.id).length,1);assert.equal(s.nextPerson,count);
 assert.equal(to.discovered,false);assert.equal(logs.length,0);assert.ok(s.logistics.events.every(e=>!knownWorldEvent(s,e)));
 const settled=serialize(s);supplyTick(s,ctx);advanceFreight(s,c,ctx);assert.ok(serialize(s)===settled);
});
test('an unknown or expired market cannot be supplied by opening the observer map',()=>{
 const {s,p,source,to}=setup();for(const area of Object.values(s.areas))area.discovered=true;s.tick=1;s.logistics.nextDispatch=0;supplyTick(s,ctx);assert.equal(s.logistics.convoys.length,0);assert.equal(launchConvoy(s,source,to,ctx),null);assert.equal(source.civic.food,90);
 remember(s,p,to);s.tick+=MARKET_AGE+1;assert.equal(launchConvoy(s,source,to,ctx),null);assert.equal(source.civic.food,90);
});
test('stale need is not remotely corrected; an overflowing delivery leaves one real cache instead of deleting cargo',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);to.civic.food=100;to.civic.medicine=55;const c=launchConvoy(s,source,to,ctx);assert.ok(c);finish(s);
 const cache=to.objects.find(o=>o.id===c.id+'-cargo');assert.ok(cache);assert.equal(cache.food,12);assert.equal(cache.medicine,0);assert.equal(source.civic.food+to.civic.food+cache.food,190);assert.equal(source.civic.medicine+to.civic.medicine,105);
 s.hero.area=to.id;s.hero.x=cache.x;const rations=s.hero.inventory.rations;recoverCargo(s,cache,ctx);assert.equal(s.hero.inventory.rations,rations+3);const saved=serialize(s);recoverCargo(s,cache,ctx);assert.ok(serialize(s)===saved);
});
test('a broken exit returns the same carrier and reserved cargo without using an unseen shortcut or paying wages',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);const c=launchConvoy(s,source,to,ctx),next=c.path[1];source.links=source.links.filter(id=>id!==next);
 s.areas.a0.links.push(to.id);to.links.push('a0');s.edges[['a0',to.id].sort().join('|')]={mode:'road'};finish(s);
 assert.equal(p.area,source.id);assert.equal(source.civic.food,90);assert.equal(source.civic.medicine,50);assert.equal(to.civic.food,10);assert.equal(p.agenda.wealth,0);assert.equal(s.logistics.history.at(-1).outcome,'returned');assert.equal(s.logistics.deliveries,0);assert.equal(s.logistics.convoys.length,0);
});
test('an unobserved ambush is encountered physically and creates one captive and one finite cache for that same person',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.alive=true;const c=launchConvoy(s,source,to,ctx);assert.ok(c,'no telepathic enemy lookup at departure');finish(s);
 assert.equal(p.area,'a2');assert.equal(p.status,'captive');assert.equal(s.logistics.losses,1);assert.equal(source.civic.food,78);assert.equal(to.civic.food,10);assert.equal(p.agenda.wealth,0);
 assert.ok(Math.abs(p.x-enemy.x)<=8,'the carrier is intercepted at a local encounter, not teleported across the scene');
 const objects=s.areas.a2.objects;assert.equal(objects.filter(o=>o.id===c.id+'-captive'&&o.person===p.id).length,1);assert.equal(objects.filter(o=>o.id===c.id+'-cargo').length,1);assert.equal(objects.find(o=>o.id===c.id+'-cargo').food,12);
 advanceFreight(s,c,ctx);assert.equal(objects.filter(o=>o.id===c.id+'-cargo').length,1);assert.equal(logs.length,0);
});
test('an active new convoy is tick-guarded and freezes across disabling and save without discarding its driver or inventory',()=>{
 let {s,p,source,to}=setup();remember(s,p,to);let c=launchConvoy(s,source,to,ctx);s.tick++;supplyTick(s,ctx);const remaining=c.remaining,x=p.x;supplyTick(s,ctx);assert.equal(c.remaining,remaining);assert.equal(p.x,x);
 setModule(s,'npc-logistics',false);const record=JSON.stringify(c);for(let i=0;i<20;i++){s.tick++;supplyTick(s,ctx);}assert.equal(JSON.stringify(c),record);
 const saved=serialize(s);s=restore(saved);assert.ok(serialize(s)===saved);setModule(s,'npc-logistics',true);c=s.logistics.convoys.find(e=>e.id===c.id);s.tick++;supplyTick(s,ctx);assert.equal(c.remaining,remaining-1);assert.equal(s.people[c.person].status,'caravan');
});
test('seen convoy positions and quantities remain snapshots when the carrier leaves and refresh only at actual contact',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);s.hero.area=source.id;const c=launchConvoy(s,source,to,ctx);assert.ok(convoyView(s,c).here);
 while(p.area===source.id){s.tick++;supplyTick(s,ctx);}const seen=structuredClone(convoyView(s,c));assert.equal(seen.area,source.id);c.food-=4;to.name='Скрытое новое имя';s.tick++;supplyTick(s,ctx);assert.deepEqual(convoyView(s,c),seen);assert.notEqual(c.targetName,to.name);
 s.hero.area=p.area;observeConvoy(s,c);assert.equal(convoyView(s,c).food,8);assert.equal(convoyView(s,c).here,true);
});
test('one NPC cannot be double-booked and the arrival tick cannot also execute a personal job',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);p.agenda.task={kind:'work',target:source.id,x:42,remaining:3};assert.equal(launchConvoy(s,source,to,ctx),null);p.agenda.task=null;
 s.society.journeys.push({person:p.id,to:to.id,arrival:999});assert.equal(launchConvoy(s,source,to,ctx),null);s.society.journeys=[];
 const c=launchConvoy(s,source,to,ctx);assert.ok(c);assert.equal(availableFreightDriver(s,p,source),false);assert.equal(launchConvoy(s,source,to,ctx),null);finish(s);assert.equal(s.tick%8,0);
 p.agenda.due=0;const work=p.agenda.work,wealth=p.agenda.wealth;peopleTick(s,ctx);assert.equal(p.agenda.task,null);assert.equal(p.agenda.work,work);assert.equal(p.agenda.wealth,wealth);
});
test('a successful escort and the actual driver receive distinct finite wages once from the same real treasury',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);const c=launchConvoy(s,source,to,ctx);c.escort=s.hero.lineage;s.hero.caravanJob={id:c.id,role:'escort',to:to.id,started:s.tick};const gold=s.hero.gold;
 for(let i=0;i<200&&s.logistics.convoys.length;i++){s.hero.area=c.path[c.index+1]||p.area;s.tick++;supplyTick(s,ctx);}
 assert.equal(p.agenda.wealth,3);assert.equal(to.civic.treasury,57);s.hero.area=to.id;caravanPlan(s,ctx);assert.equal(s.hero.gold,gold+8);assert.equal(to.civic.treasury,49);assert.equal(xp,10);const paid=s.hero.gold;caravanPlan(s,ctx);assert.equal(s.hero.gold,paid);assert.equal(xp,10);
});
test('a previously funded destination can run out of money without creating a fictitious driver payment',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);to.civic.treasury=0;const c=launchConvoy(s,source,to,ctx);assert.ok(c);finish(s);
 assert.equal(s.logistics.deliveries,1);assert.equal(to.civic.food,22);assert.equal(p.agenda.wealth,0);assert.equal(to.civic.treasury,0);assert.equal(s.logistics.history.at(-1).wage,0);
});
test('a forever absent escort cannot freeze a finite cargo trip forever',()=>{
 const {s,p,source,to}=setup();remember(s,p,to);const c=launchConvoy(s,source,to,ctx);c.escort=s.hero.lineage;s.hero.area='a0';
 for(const id of source.population)s.people[id].status='wandering';
 finish(s,750);assert.equal(s.logistics.convoys.length,0);assert.equal(p.area,source.id);assert.equal(source.civic.food,90);assert.equal(p.agenda.wealth,0);assert.equal(s.logistics.history.at(-1).outcome,'returned');assert.ok(s.tick>480&&s.tick<720);
});
