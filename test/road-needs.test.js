import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,route,serialize,restore} from '../engine.js';import {setModule} from '../rules.js';
import {civicArea,societyTick} from '../modules/society.js';import {peopleArea} from '../modules/people.js';
import {observeFreightActor} from '../modules/freight-memory.js';import {launchConvoy,supplyTick} from '../modules/supply.js';
import {startPublicJourney,publicDestinations} from '../modules/public-journeys.js';import {roadNeeds,reserveRoadSupplies} from '../modules/road-needs.js';
import {knownWorldEvent} from '../modules/background-towns.js';
const logs=[];const ctx={route,log:(s,text)=>logs.push({tick:s.tick,text}),gainXp:()=>{}};
function setup(){let s=createWorld(1),a=s.areas.a1,to=s.areas.a4;to.type='village';civicArea(s,to);peopleArea(s,to);a.civic.food=90;a.civic.medicine=50;to.civic.food=10;to.civic.medicine=0;
 const id=a.population[0];for(const p of Object.values(s.people))if(p.agenda){p.agenda.task=null;p.agenda.due=100000;}
 const p=s.people[id];Object.assign(p,{area:a.id,x:42,status:'resident',health:100,maxHealth:100,ailment:null});Object.assign(p.agenda,{job:'merchant',duty:.8,wealth:0});Object.assign(p.needs,{hunger:10,energy:100,sleeping:false});
 for(const area of Object.values(s.areas))for(const e of area.objects)if(e.kind==='enemy')e.alive=false;
 s.hero.area='a0';s.hero.transit=null;s.hero.combat=null;s.logistics.nextDispatch=100000;s.society.nextEvent=100000;s.journal=[];s.changes=[];logs.length=0;s=restore(serialize(s));
 const person=s.people[id];for(const area of route(s,'a1','a4')){person.area=area;observeFreightActor(s,person);}person.area='a1';observeFreightActor(s,person);return{s,p:person,a:s.areas.a1,to:s.areas.a4};
}
function launch(s,p,a,to,kind){return kind==='freight'?launchConvoy(s,a,to,ctx):startPublicJourney(s,p,a,publicDestinations(s,p).find(e=>e.place.area===to.id),ctx);}
function tick(s,kind){s.tick++;if(kind==='freight')supplyTick(s,ctx);else societyTick(s,ctx);}
test('a public traveller reserves finite personal food once, without refilling existing supplies or charging a legacy arrival',()=>{
 const {s,p,a,to}=setup(),j=launch(s,p,a,to,'public');assert.ok(j);assert.equal(a.civic.food,88);assert.equal(p.roadSupplies.food,2);reserveRoadSupplies(s,p,a);assert.equal(a.civic.food,88);assert.equal(launch(s,p,a,to,'public'),null);assert.equal(a.civic.food,88);
 const old=setup();setModule(old.s,'npc-road-needs',false);assert.ok(launch(old.s,old.p,old.a,old.to,'public'));assert.equal(old.a.civic.food,90);setModule(old.s,'npc-road-needs',true);tick(old.s,'public');assert.equal(old.a.civic.food,90);assert.equal(old.p.roadSupplies,undefined);
});
test('a carrier meal consumes actual cargo and a tick, and the destination receives only the remaining food once',()=>{
 let {s,p,a,to}=setup(),c=launch(s,p,a,to,'freight');p.needs.hunger=64.8;
 while(s.tick<7)tick(s,'freight');const x=p.x,remaining=c.remaining;tick(s,'freight');assert.equal(c.food,11);assert.equal(p.needs.meals,1);assert.equal(p.x,x);assert.equal(c.remaining,remaining);assert.ok(p.needs.hunger<20);
 const saved=serialize(s);supplyTick(s,ctx);assert.ok(serialize(s)===saved);s=restore(saved);supplyTick(s,ctx);assert.ok(serialize(s)===saved);
 while(s.logistics.convoys.length&&s.tick<95)tick(s,'freight');assert.equal(s.logistics.convoys.length,0);assert.equal(s.areas[to.id].civic.food,21);assert.equal(s.areas[a.id].civic.food+s.areas[to.id].civic.food,99);assert.equal(s.logistics.deliveries,1);assert.equal(logs.length,0);
});
test('owned food is eaten before the entrusted cargo, and a saved need tick cannot consume it twice',()=>{
 const {s,p,a,to}=setup(),c=launch(s,p,a,to,'freight');p.roadSupplies={food:1,medicine:0};p.needs.hunger=65;s.tick=8;supplyTick(s,ctx);assert.equal(p.roadSupplies.food,0);assert.equal(c.food,12);assert.equal(p.needs.meals,1);
 const before=JSON.stringify(p.needs);assert.equal(roadNeeds(s,p,ctx,c),true);assert.equal(JSON.stringify(p.needs),before);assert.equal(c.food,12);
});
test('sleep holds both body and itinerary through saving, then continues from the same position after waking',()=>{
 for(const kind of ['freight','public']){
  let {s,p,a,to}=setup();let trip=launch(s,p,a,to,kind);p.needs.energy=23;s.tick=7;tick(s,kind);assert.equal(p.needs.sleeping,true);const x=p.x,remaining=trip.remaining;
  while(s.tick<40){tick(s,kind);assert.equal(p.x,x);assert.equal(trip.remaining,remaining);}const saved=serialize(s);s=restore(saved);assert.ok(serialize(s)===saved);p=s.people[p.id];trip=kind==='freight'?s.logistics.convoys[0]:s.society.journeys[0];
  while(p.needs.sleeping&&s.tick<120){tick(s,kind);assert.equal(p.x,x);}assert.equal(p.needs.sleeping,false);assert.equal(p.needs.sleeps,1);tick(s,kind);assert.ok(p.x>x);assert.equal(trip.remaining,remaining-1);assert.equal(p.area,a.id);
 }
});
test('road medicine moves from personal and entrusted stock into real recovery without free healing',()=>{
 const {s,p,a,to}=setup(),c=launch(s,p,a,to,'freight');p.roadSupplies={food:0,medicine:1};p.health=60;p.ailment='fever';s.tick=8;supplyTick(s,ctx);
 assert.equal(p.health,85);assert.equal(p.ailment,null);assert.equal(p.roadSupplies.medicine,0);assert.equal(c.medicine,3);assert.equal(c.remaining,48);
 const other=setup();other.p.health=60;other.p.ailment='fever';assert.ok(launch(other.s,other.p,other.a,other.to,'public'));assert.equal(other.a.civic.medicine,48);assert.equal(other.p.roadSupplies.medicine,2);
});
test('starvation ends a real carrier once, leaving one grave and the insufficient remaining medicine as one finite cache',()=>{
 const {s,p,a,to}=setup(),c=launch(s,p,a,to,'freight');a.civic.food+=c.food;c.food=0;a.civic.medicine+=3;c.medicine=1;c.index=1;p.area=c.path[1];p.x=55;p.health=4;p.needs.hunger=100;s.tick=95;tick(s,'freight');
 assert.equal(p.alive,false);assert.equal(p.health,0);assert.equal(s.logistics.convoys.length,0);assert.equal(s.logistics.history.length,1);assert.equal(s.logistics.losses,1);assert.equal(to.civic.food,10);
 const objects=s.areas[p.area].objects,cache=objects.find(o=>o.id===c.id+'-cargo');assert.equal(cache.medicine,1);assert.equal(objects.filter(o=>o.id==='npc-grave-'+p.id).length,1);assert.equal(a.civic.medicine+cache.medicine,50);
 supplyTick(s,ctx);assert.equal(objects.filter(o=>o.id===cache.id).length,1);assert.equal(objects.filter(o=>o.id==='npc-grave-'+p.id).length,1);
 const death=s.society.events.find(e=>e.id?.startsWith('needs-'));assert.ok(death);assert.equal(knownWorldEvent(s,death),false);assert.equal(logs.length,0);
});
test('the two need switches preserve data independently and disabling the stock model does not spend cargo',()=>{
 for(const flag of ['npc-road-needs','npc-needs']){
  const {s,p,a,to}=setup(),c=launch(s,p,a,to,'freight');p.needs.energy=10;p.needs.hunger=65;setModule(s,flag,false);const needs=JSON.stringify(p.needs);s.tick=8;supplyTick(s,ctx);assert.equal(JSON.stringify(p.needs),needs);assert.equal(c.food,12);assert.equal(c.remaining,47);
 }
 const {s,p}=setup();p.area='a2';p.needs.hunger=65;const cargo={food:2,medicine:2};setModule(s,'supply',false);s.tick=8;roadNeeds(s,p,ctx,cargo);assert.deepEqual(cargo,{food:2,medicine:2});
});
test('a hungry carrier in a stocked settlement uses actual local food instead of dying beside the store',()=>{
 const {s,p,a,to}=setup(),c=launch(s,p,a,to,'freight');c.food=0;c.medicine=1;p.health=4;p.needs.hunger=100;s.tick=7;const food=a.civic.food;tick(s,'freight');assert.equal(p.alive,true);assert.equal(p.health,4);assert.equal(a.civic.food,food-1);assert.equal(p.needs.hunger,52);assert.equal(p.needs.meals,1);assert.equal(c.remaining,48);
});
test('a public traveller can starve on the actual road without a duplicate grave or an arrival reward',()=>{
 const {s,p,a,to}=setup(),j=launch(s,p,a,to,'public');a.civic.food+=p.roadSupplies.food;p.roadSupplies.food=0;j.index=1;p.area=j.path[1];p.x=55;p.health=4;p.needs.hunger=100;s.tick=95;tick(s,'public');
 assert.equal(p.alive,false);assert.equal(p.area,'a2');assert.equal(s.society.journeys.length,0);assert.equal(s.areas.a2.objects.filter(o=>o.id==='npc-grave-'+p.id).length,1);assert.equal(p.agenda.wealth,0);assert.equal(to.civic.food,10);assert.equal(logs.length,0);assert.ok(s.society.events.filter(e=>e.id?.startsWith('needs-')).every(e=>!knownWorldEvent(s,e)));
});
test('a sleeping role still obeys the final active travel budget',()=>{
 for(const kind of ['freight','public']){
  const {s,p,a,to}=setup(),trip=launch(s,p,a,to,kind);trip.returning=true;trip.elapsed=720;p.needs.sleeping=true;p.needs.energy=0;tick(s,kind);assert.equal(kind==='freight'?s.logistics.convoys.length:s.society.journeys.length,0);assert.equal(p.area,a.id);assert.equal(p.needs.energy,0);
 }
});
