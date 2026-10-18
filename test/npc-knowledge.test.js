import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,route} from '../engine.js';
import {peopleTick,peopleArea} from '../modules/people.js';
import {observeNPCPlace,npcKnownRoute,knownEmployer,NPC_PLACE_LIMIT,NPC_ROAD_LIMIT} from '../modules/npc-knowledge.js';
import {setModule} from '../rules.js';
const ctx={route,log:()=>{},gainXp:()=>{}};
function setup(){const s=createWorld(1),p=s.people[s.areas.a1.population[0]],a=s.areas.a4;
 for(const other of Object.values(s.people))if(other.agenda)other.agenda.due=100000;
 p.area='a1';p.x=42;p.status='resident';p.ailment=null;p.health=p.maxHealth||100;p.needs.hunger=0;p.needs.energy=100;p.needs.sleeping=false;p.agenda.task=null;p.agenda.home='a1';p.agenda.job='artisan';p.agenda.due=0;p.agenda.sociability=.1;p.agenda.tools=1;p.agenda.wealth=0;
 s.areas.a1.civic.food=65;s.areas.a1.civic.treasury=0;a.type='village';a.civic={food:65,medicine:55,treasury:60};peopleArea(s,a);
 for(const area of Object.values(s.areas)){area.visited=false;area.discovered=false;for(const e of area.objects)if(e.kind==='enemy')e.alive=false;}
 p.navigation={version:1,places:[],roads:[]};const ready=restore(serialize(s));return {s:ready,p:ready.people[p.id],a:ready.areas[a.id]};}
function visitRoute(s,p){const original=p.area;for(const id of route(s,'a1','a4')){p.area=id;observeNPCPlace(s,p);}p.area=original;observeNPCPlace(s,p);}
const advance=s=>{s.tick+=8;peopleTick(s,ctx);};
test('a worker follows personally remembered work in a hidden town, keeps identity and is paid from its real treasury',()=>{
 const {s,p,a}=setup();p.agenda.job='merchant';visitRoute(s,p);const id=p.id,count=s.nextPerson,wallet=s.hero.gold;assert.ok(knownEmployer(s,p));
 let visited=false;while(s.tick<1400&&!(p.area===a.id&&p.agenda.wealth>0)){advance(s);if(p.area!==p.agenda.home)visited=true;}
 assert.equal(p.area,a.id);assert.equal(p.agenda.home,a.id);assert.ok(p.agenda.wealth>0);assert.ok(a.civic.treasury<60);assert.equal(s.nextPerson,count);assert.equal(s.people[id],p);assert.equal(s.hero.gold,wallet);assert.equal(a.discovered,false);assert.ok(visited);
 const saved=serialize(s);assert.ok(serialize(restore(saved))===saved,'real worker save roundtrip');
});
test('the observer map and unseen remote treasury cannot teach an employer or update a remembered payroll',()=>{
 const {s,p,a}=setup();observeNPCPlace(s,p);assert.equal(knownEmployer(s,p),null);for(const place of Object.values(s.areas))place.discovered=true;assert.equal(knownEmployer(s,p),null);
 advance(s);assert.notEqual(p.agenda.task?.kind,'relocate');
 visitRoute(s,p);const remembered=knownEmployer(s,p);assert.equal(remembered.area,a.id);const stamp=remembered.seen;a.civic.treasury=0;s.tick+=100;observeNPCPlace(s,p);assert.equal(knownEmployer(s,p).seen,stamp);
 p.area=a.id;observeNPCPlace(s,p);p.area='a1';assert.equal(knownEmployer(s,p),null);
});
test('a missing road is learned at the current exit, never bypassed through an unknown shortcut',()=>{
 const {s,p,a}=setup();visitRoute(s,p);const known=npcKnownRoute(p,'a1',a.id);assert.ok(known.length>=2);const next=known[1];
 s.areas.a1.links=s.areas.a1.links.filter(id=>id!==next);p.x=100;s.areas.a0.links.push(a.id);a.links.push('a0');s.edges[['a0',a.id].sort().join('|')]={mode:'road'};
 advance(s);assert.equal(p.area,'a1');assert.equal(p.agenda.task,null);assert.ok(!p.navigation.roads.some(e=>e.from==='a1'&&e.to===next||e.to==='a1'&&e.from===next));
 assert.ok(!npcKnownRoute(p,'a1',a.id).length,'shortcut beyond the visible exit was not observed');
});
test('personal observations have bounded storage, do not spend RNG and preserve data when disabled',()=>{
 const {s,p}=setup(),before=s.rng,streams=JSON.stringify(s.randomStreams);for(let i=0;i<150;i++){const id='qa-'+i;s.areas[id]={id,name:id,type:'road',era:s.areas.a1.era,realm:s.areas.a1.realm,links:['a1'],objects:[]};s.areas.a1.links.push(id);}
 observeNPCPlace(s,p);assert.ok(p.navigation.places.length<=NPC_PLACE_LIMIT);assert.ok(p.navigation.roads.length<=NPC_ROAD_LIMIT);assert.ok(p.navigation.places.some(e=>e.area===p.area));assert.equal(s.rng,before);assert.equal(JSON.stringify(s.randomStreams),streams);
 setModule(s,'npc-knowledge',false);const record=JSON.stringify(p.navigation);p.area='a4';observeNPCPlace(s,p);assert.equal(JSON.stringify(p.navigation),record);
});
test('an out-of-date employer is discovered locally and cannot mint wages from an empty treasury',()=>{
 const {s,p,a}=setup();visitRoute(s,p);a.civic.treasury=0;const remembered=knownEmployer(s,p);assert.equal(remembered.area,a.id);
 for(let i=0;i<120;i++)advance(s);assert.equal(p.area,a.id);assert.equal(p.agenda.wealth,0);assert.equal(a.civic.treasury,0);assert.equal(p.navigation.places.find(e=>e.area===a.id).payroll,false);
 assert.ok(p.agenda.knowledge.some(e=>e.text.includes('казна пуста')));
});
test('a previously unseen local threat is remembered after contact and permits retreat instead of immediate repeated departures',()=>{
 const {s,p}=setup();visitRoute(s,p);const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.alive=true;enemy.resolved=false;enemy.x=57;
 advance(s);assert.equal(p.agenda.task?.kind,'relocate','remote enemy is not read before departure');
 let warned=false;for(let i=0;i<80;i++){advance(s);warned ||= (p.navigation.places.find(e=>e.area==='a2')?.hazardUntil||0)>s.tick;if(warned&&p.area==='a1')break;}
 assert.ok(warned);assert.equal(p.area,'a1');assert.equal(knownEmployer(s,p),null);assert.ok(npcKnownRoute(p,'a1','a4').length,'physical road memory remains');
 enemy.alive=false;assert.equal(knownEmployer(s,p),null,'remote victory does not telepathically clear the warning');
 p.area='a2';observeNPCPlace(s,p);p.area='a1';assert.ok(knownEmployer(s,p),'a real visit observes the cleared way');
});
test('a worker retains identical routes and work across saving and different hero discovery flags',()=>{
 const {s:a,p}=setup();visitRoute(a,p);let b=restore(serialize(a));for(const area of Object.values(b.areas)){area.discovered=true;area.visited=true;}
 for(let i=0;i<120;i++){advance(a);advance(b);if(i===40){const saved=serialize(b);b=restore(saved);assert.ok(serialize(b)===saved);}}
 function project(s){const c=structuredClone(s);for(const area of Object.values(c.areas)){delete area.discovered;delete area.visited;}return serialize(c);}
 assert.ok(project(a)===project(b),'worker state must ignore the observer map');assert.equal(a.people[p.id].area,'a4');
});
