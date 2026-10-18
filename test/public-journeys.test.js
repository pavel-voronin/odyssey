import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,route,serialize,restore} from '../engine.js';
import {civicArea,societyTick} from '../modules/society.js';
import {peopleArea,peopleTick} from '../modules/people.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {localContact} from '../modules/npc-contacts.js';
import {availablePublicTraveller,publicDestinations,startPublicJourney,advancePublicJourney} from '../modules/public-journeys.js';
import {knownWorldEvent} from '../modules/background-towns.js';
import {setModule} from '../rules.js';
const logs=[];const ctx={route,log:(s,text)=>logs.push({tick:s.tick,text}),gainXp:()=>{}};
function setup(){
  let s=createWorld(1),to=s.areas.a4;to.type='village';civicArea(s,to);peopleArea(s,to);
  const id=s.areas.a1.population[0];
  for(const p of Object.values(s.people))if(p.agenda){p.agenda.task=null;p.agenda.due=100000;}
  for(const a of Object.values(s.areas)){a.visited=false;a.discovered=false;for(const e of a.objects)if(e.kind==='enemy')e.alive=false;}
  let p=s.people[id];p.area='a1';p.x=42;p.status='resident';p.health=p.maxHealth||100;p.agenda.wealth=17;Object.assign(p.needs,{hunger:10,energy:100,sleeping:false});
  s.hero.area='a0';s.hero.transit=null;s.hero.combat=null;s.society.nextEvent=100000;s.society.events=[];s.changes=[];logs.length=0;
  s=restore(serialize(s));return {s,p:s.people[id],source:s.areas.a1,to:s.areas.a4};
}
function remember(s,p,to){const home=p.area;for(const id of route(s,home,to.id)){p.area=id;observeNPCPlace(s,p);}p.area=home;observeNPCPlace(s,p);}
function launch(s,p,source,to){return startPublicJourney(s,p,source,publicDestinations(s,p).find(e=>e.place.area===to.id),ctx);}
function finish(s,max=800){for(let i=0;i<max&&s.society.journeys.length;i++){s.tick++;societyTick(s,ctx);}}

test('the same public traveller physically follows their own road and arrives once without minting money or revealing a hidden trip',()=>{
  let {s,p,source,to}=setup();remember(s,p,to);const count=s.nextPerson,id=p.id,j=launch(s,p,source,to);assert.ok(j);assert.equal(p.area,source.id);assert.equal(p.status,'travelling');assert.equal(source.population.includes(id),false);assert.equal(logs.length,0);
  const x=p.x;s.tick++;societyTick(s,ctx);assert.ok(p.x>x);assert.equal(p.area,source.id);assert.ok(localContact(s,id,source.id));
  const saved=serialize(s);s=restore(saved);assert.ok(serialize(s)===saved);p=s.people[id];finish(s);
  assert.equal(s.tick,60);assert.equal(p.area,to.id);assert.equal(p.status,'resident');assert.equal(p.agenda.wealth,17);assert.equal(s.nextPerson,count);assert.equal(s.society.journeys.length,0);assert.equal(s.areas[to.id].population.filter(v=>v===id).length,1);assert.equal(s.areas[to.id].objects.filter(o=>o.kind==='resident'&&o.person===id).length,1);
  assert.equal(logs.length,0);assert.ok(s.society.events.every(e=>!knownWorldEvent(s,e)));
  const before=serialize(s);advancePublicJourney(s,j,ctx);assert.ok(serialize(s)===before);
});
test('the hero map and a road sign do not turn an unknown destination into a visited market',()=>{
  const {s,p,source,to}=setup();observeNPCPlace(s,p);for(const a of Object.values(s.areas)){a.visited=true;a.discovered=true;}
  assert.equal(publicDestinations(s,p).length,0);assert.equal(launch(s,p,source,to),null);
  remember(s,p,to);assert.ok(publicDestinations(s,p).some(e=>e.place.area===to.id));
  setModule(s,'npc-knowledge',false);assert.equal(publicDestinations(s,p).length,0);assert.equal(launch(s,p,source,to),null);
});
test('a broken remembered exit returns the traveller along the traversed prefix instead of using an unknown bypass',()=>{
  const {s,p,source,to}=setup();remember(s,p,to);const j=launch(s,p,source,to),next=j.path[1];source.links=source.links.filter(id=>id!==next);
  s.areas.a0.links.push(to.id);s.edges[['a0',to.id].sort().join('|')]={mode:'road'};finish(s);
  assert.equal(p.area,source.id);assert.equal(p.status,'resident');assert.equal(p.agenda.wealth,17);assert.equal(s.society.events.filter(e=>e.text.includes('возвращается')).length,1);assert.ok(!p.navigation.roads.some(e=>e.from===source.id&&e.to===next));
});
test('an unseen local enemy is met on the road, injures once and causes a real retreat, while a fatal encounter leaves one grave',()=>{
  for(const lethal of [false,true]){
    const {s,p,source,to}=setup();remember(s,p,to);const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.alive=true;enemy.attack=lethal?1000:7;const health=p.health;
    assert.ok(launch(s,p,source,to),'departure must not inspect a remote enemy');finish(s);
    if(lethal){assert.equal(p.alive,false);assert.equal(p.area,'a2');assert.ok(Math.abs(p.x-enemy.x)<=8);assert.equal(s.areas.a2.objects.filter(o=>o.id==='journey-grave-'+p.id).length,1);}
    else{assert.equal(p.area,source.id);assert.equal(p.health,health-7);assert.ok(p.navigation.places.find(e=>e.area==='a2').hazardUntil>s.tick);}
    assert.equal(p.dangerContact.enemy,enemy.id);assert.equal(p.dangerContact.area,'a2');assert.equal(p.dangerContact.controller,'journey');assert.equal(p.dangerContact.damage,lethal?1000:7);
    assert.equal(s.society.journeys.length,0);assert.equal(p.agenda.wealth,17);assert.equal(logs.length,0);
  }
});
test('a severed return stops at the actual place rather than teleporting home',()=>{
  const {s,p,source,to}=setup();remember(s,p,to);const j=launch(s,p,source,to);
  while(p.area===source.id){s.tick++;societyTick(s,ctx);}const road=s.areas[p.area];road.links=[];finish(s);
  assert.equal(p.area,road.id);assert.equal(p.status,'resident');assert.equal(s.society.journeys.length,0);assert.ok(road.population.includes(p.id));assert.ok(s.society.events[0].text.includes('прекращает'));
});
test('a new trip is guarded per tick, pauses across disabling and save, and does not take a second personal action at arrival',()=>{
  let {s,p,source,to}=setup();remember(s,p,to);let j=launch(s,p,source,to);assert.ok(j);assert.equal(availablePublicTraveller(s,p,source),false);assert.equal(launch(s,p,source,to),null);
  s.tick++;societyTick(s,ctx);const remaining=j.remaining,x=p.x;societyTick(s,ctx);assert.equal(j.remaining,remaining);assert.equal(p.x,x);
  setModule(s,'npc-travel',false);const record=JSON.stringify(j);for(let i=0;i<4;i++){s.tick++;societyTick(s,ctx);}assert.equal(JSON.stringify(j),record);
  s=restore(serialize(s));p=s.people[p.id];setModule(s,'npc-travel',true);finish(s);const before=JSON.stringify(p);assert.equal(s.tick,64);peopleTick(s,ctx);assert.equal(JSON.stringify(p),before,'arrival cannot also perform work/needs/another personal plan; other NPCs may act');
});
test('busy, exhausted, child, party and already assigned people cannot take a second public controller',()=>{
  const {s,p,source,to}=setup();remember(s,p,to);
  p.agenda.task={kind:'work'};assert.equal(launch(s,p,source,to),null);p.agenda.task=null;
  p.needs.energy=1;assert.equal(launch(s,p,source,to),null);p.needs.energy=100;
  const role=p.role;p.role='ребёнок';assert.equal(launch(s,p,source,to),null);p.role=role;
  s.hero.companions.push({person:p.id});assert.equal(launch(s,p,source,to),null);s.hero.companions=[];
  s.society.orders.push({person:p.id});assert.equal(launch(s,p,source,to),null);s.society.orders=[];
  s.logistics.convoys.push({person:p.id});assert.equal(launch(s,p,source,to),null);s.logistics.convoys=[];assert.ok(launch(s,p,source,to));
});
test('an explicitly current timed arrival completes while physical travel is disabled',()=>{
  const {s,p,source,to}=setup();setModule(s,'npc-travel',false);p.status='travelling';p.area=null;source.population=source.population.filter(id=>id!==p.id);
  s.society.journeys.push({version:1,movement:'timed',person:p.id,from:source.id,to:to.id,arrival:3,reason:'Поездка в упрощённом режиме.'});const save=serialize(s);assert.equal(serialize(restore(save)),save);s.tick=3;societyTick(s,ctx);
  assert.equal(p.area,to.id);assert.equal(p.status,'resident');assert.equal(s.society.journeys.length,0);assert.equal(p.agenda.wealth,17);
});
test('an abnormally slow trip has a finite return attempt and a final active budget',()=>{
  for(const hardLimit of [false,true]){
    const {s,p,source,to}=setup();remember(s,p,to);const j=launch(s,p,source,to);
    j.remaining=j.segmentTicks=10000;if(hardLimit){j.returning=true;j.elapsed=720;}
    finish(s);assert.equal(s.society.journeys.length,0);assert.equal(p.area,source.id);assert.equal(p.agenda.wealth,17);assert.ok(s.tick<=721);assert.ok(s.society.events[0].text.includes(hardLimit?'прекращает':'возвращается'));
  }
});
test('a forced civic departure uses known roads independently of hero discovery',()=>{
  const {s,p,source,to}=setup();remember(s,p,to);const towns=Object.values(s.areas).filter(a=>a.civic),index=towns.findIndex(a=>a.id===source.id),next=n=>(Math.imul(n,1664525)+1013904223)>>>0;
  for(let n=0;n<1000000;n++){const one=next(n),two=next(one)/4294967296;if(Math.floor(one/4294967296*towns.length)===index&&two>=.79&&two<.9){s.randomStreams.society=n;break;}}
  s.society.nextEvent=s.tick;const b=restore(serialize(s));for(const a of Object.values(b.areas)){a.visited=true;a.discovered=true;}
  for(const state of [s,b])societyTick(state,ctx);assert.equal(s.society.journeys.length,1);assert.equal(s.society.journeys[0].person,p.id);
  const project=state=>{const c=structuredClone(state);for(const a of Object.values(c.areas)){delete a.visited;delete a.discovered;}return serialize(c);};assert.ok(project(s)===project(b));
});
