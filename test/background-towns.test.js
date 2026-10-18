import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,route,serialize,restore} from '../engine.js';
import {isTown} from '../modules/common.js';
import {societyTick} from '../modules/society.js';
import {peopleTick} from '../modules/people.js';
import {supplyTick} from '../modules/supply.js';
import {goodsTick} from '../modules/goods.js';
import {civicCandidates,civicDestinations,civicObservation,knownWorldEvent} from '../modules/background-towns.js';
import {setModule} from '../rules.js';
const rootTowns=s=>Object.values(s.areas).filter(a=>isTown(a)&&(!a.city||a.city===a.id));
const inhabitedTowns=s=>rootTowns(s).filter(a=>a.population?.some(id=>{const p=s.people[id];return p?.alive&&p.status==='resident'&&p.area===a.id;}));
const base=createWorld(0);while((rootTowns(base).length<3||inhabitedTowns(base).length<2)&&base.tick<5000)step(base);
assert.ok(rootTowns(base).length>=3,'autonomous world supplies existing cities');assert.ok(inhabitedTowns(base).length>=2,'two existing cities supply actual resident witnesses/workers; an empty city is not repopulated by the test');const snapshot=serialize(base);
function setup(){const s=restore(snapshot);s.hero.area='a0';s.hero.transit=null;s.hero.memory.places=[];s.changes=[];s.society.events=[];s.society.journeys=[];s.society.orders=[];s.logistics.convoys=[];s.logistics.nextDispatch=s.tick+100000;
 for(const a of Object.values(s.areas)){a.visited=false;a.discovered=false;}
 return s;}
function forceEvent(s,target,min,max){const towns=civicCandidates(s),index=towns.findIndex(a=>a.id===target.id),next=n=>(Math.imul(n,1664525)+1013904223)>>>0;
 for(let n=0;n<1000000;n++){const one=next(n),two=next(one)/4294967296;if(Math.floor(one/4294967296*towns.length)===index&&two>=min&&two<max){s.randomStreams.society=n;s.society.nextEvent=s.tick;return;}}
 throw Error('No controlled draw');}
const logs=[];const ctx={route,log:(s,text)=>logs.push(text),gainXp:()=>{},spawnEnemy(){throw Error('unexpected raid in controlled test');}};
function project(s){const c=structuredClone(s);for(const a of Object.values(c.areas)){delete a.visited;delete a.discovered;}return serialize(c);}

test('two existing undiscovered cities suffer real shortages without a hero visit or a witnessed journal entry',()=>{
 const s=setup(),towns=inhabitedTowns(s).slice(0,2),count=s.nextArea;logs.length=0;
 for(const a of towns){a.civic.food=65;a.civic.crisis=null;forceEvent(s,a,0,.15);societyTick(s,ctx);assert.equal(a.civic.food,30);assert.equal(a.civic.crisis.kind,'hunger');assert.equal(a.visited,false);assert.equal(a.discovered,false);}
 assert.equal(s.nextArea,count);assert.equal(logs.length,0);assert.equal(s.society.events.length,2);assert.ok(s.society.events.every(e=>e.witnesses.length>0&&!knownWorldEvent(s,e)));assert.ok(s.changes.every(e=>!knownWorldEvent(s,e)));
 const saved=serialize(s);assert.equal(serialize(restore(saved)),saved);
 setModule(s,'events',false);const before=serialize(s);societyTick(s,ctx);assert.equal(serialize(s),before);
});
test('opening the hero map does not switch civic events, production or two resident jobs on and off',()=>{
 const a=setup(),towns=inhabitedTowns(a).slice(0,2),workers=[];
 for(const p of Object.values(a.people))if(p.agenda)p.agenda.due=a.tick+100000;
 for(const town of towns){town.civic.food=60;town.civic.treasury=60;town.civic.crisis=null;const p=town.population.map(id=>a.people[id]).find(p=>p.alive&&p.status==='resident'&&p.area===town.id);assert.ok(p);p.x=42;p.ailment=null;p.health=p.maxHealth||100;p.needs.hunger=0;p.needs.energy=100;p.needs.sleeping=false;Object.assign(p.agenda,{job:'farmer',task:null,due:a.tick,duty:.9,curiosity:.1,tools:1});workers.push({id:p.id,work:p.agenda.work,food:town.civic.food});}
 const b=restore(serialize(a));for(const town of Object.values(b.areas)){town.visited=true;town.discovered=true;}
 logs.length=0;for(let i=0;i<240;i++){a.tick++;b.tick++;for(const s of [a,b]){goodsTick(s);peopleTick(s,ctx);supplyTick(s,ctx);}}
 assert.equal(project(a),project(b));for(const worker of workers)assert.ok(a.people[worker.id].agenda.work>worker.work);assert.ok(towns.some(t=>t.civic.food!==60));assert.equal(logs.length,0);
 for(const s of [a,b]){forceEvent(s,s.areas[towns[0].id],.16,.30);societyTick(s,ctx);}assert.equal(project(a),project(b));assert.equal(a.areas[towns[0].id].civic.crisis.kind,'epidemic');
});
test('witnesses require physical presence, not map knowledge or being in transit; legacy known history remains visible',()=>{
 const s=setup(),a=rootTowns(s)[0];s.hero.memory.places.push(a.id);a.visited=true;a.discovered=true;
 assert.deepEqual(civicObservation(s,a).knownBy,[]);s.hero.area=a.id;s.hero.transit={from:a.id,to:'a0'};assert.deepEqual(civicObservation(s,a).knownBy,[]);
 s.hero.transit=null;const event=civicObservation(s,a);assert.deepEqual(event.knownBy,[s.hero.lineage]);assert.ok(event.witnesses.includes(s.hero.lineage));assert.equal(knownWorldEvent(s,event),true);
  s.hero.alive=false;assert.deepEqual(civicObservation(s,a).knownBy,[]);s.hero.alive=true;
 const oldId=s.hero.lineage;s.hero.lineage='another-life';assert.equal(knownWorldEvent(s,event),false);s.hero.lineage=oldId;
 assert.equal(knownWorldEvent(s,{text:'Already known legacy event'}),true);
});
test('first-stage civic trips use actual neighbouring road-linked streets independent of the hero map; off preserves data',()=>{
 const s=setup(),a=s.areas.a1,hidden=civicDestinations(s,a).map(a=>a.id);assert.ok(hidden.length>0);
 for(const town of Object.values(s.areas)){town.visited=true;town.discovered=true;}assert.deepEqual(civicDestinations(s,a).map(a=>a.id),hidden);
 const b=s.areas[hidden[0]],key=[a.id,b.id].sort().join('|'),old=s.edges[key];s.edges[key]={...old,mode:'portal'};assert.ok(!civicDestinations(s,a).includes(b));s.edges[key]=old;
 const event=civicObservation(s,a),copy=JSON.stringify(event);setModule(s,'background-towns',false);for(const town of Object.values(s.areas))town.visited=false;
 assert.equal(civicCandidates(s).length,0);assert.deepEqual(civicObservation(s,a),{});assert.equal(JSON.stringify(event),copy);
});

test('a remote child and the old empty-town fallback keep local origin rather than borrowing the observer family',()=>{
 for(const empty of [false,true]){const a=setup(),town=rootTowns(a)[0];if(empty){setModule(a,'migrations',false);for(const id of town.population)a.people[id].alive=false;}
  const b=restore(serialize(a));b.hero.family='Чужая семья наблюдателя';b.hero.race='dragonkin';
  const id='person-'+a.nextPerson;for(const s of [a,b]){forceEvent(s,s.areas[town.id],.7,.75);societyTick(s,ctx);}
  assert.ok(a.people[id]);assert.deepEqual(a.people[id],b.people[id]);
 }
});
