import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,route,serialize,restore} from '../engine.js';
import {createPerson} from '../modules/lineage.js';
import {civicArea,societyTick} from '../modules/society.js';
import {peopleTick} from '../modules/people.js';
import {initializeMigrations,migrationsTick,migrationMeal} from '../modules/migrations.js';
import {setModule} from '../rules.js';
const ctx={route,log:()=>{},gainXp:()=>{}};
function setup(){const s=createWorld(0);setModule(s,'npc-needs',false);const from=s.areas.a1,to=s.areas.a4;to.type='village';civicArea(s,to);to.civic.food=60;to.civic.safety=65;to.population ||= [];
 for(const p of Object.values(s.people)){if(p.area===from.id){p.area=to.id;to.population.push(p.id);}if(p.agenda)p.agenda.due=100000;}
 from.population=[];from.civic.food=10;from.civic.medicine=10;
 for(const o of s.areas.a2.objects)if(o.kind==='enemy')o.alive=false;
 const parent=createPerson(s,{name:'Рен',role:'житель',race:'human',area:from.id,alive:true}),child=createPerson(s,{name:'Лин',role:'ребёнок',race:'human',area:from.id,alive:true,parents:[parent]});
 from.population.push(parent,child);for(const id of [parent,child]){const p=s.people[id];p.x=42;p.agenda.duty=.1;p.agenda.due=100000;}
 initializeMigrations(s);return{s,from,to,parent:s.people[parent],child:s.people[child]};}
function advance(s){s.tick+=8;migrationsTick(s,ctx);peopleTick(s,ctx);}
function start(s){while(!Object.keys(s.migrations).length&&s.tick<200)advance(s);return Object.values(s.migrations)[0];}
test('a parent and child carry finite food and reach a real refuge through actual intermediate positions',()=>{
 const {s,from,to,parent,child}=setup(),count=Object.keys(s.people).length,total=from.civic.food+to.civic.food,g=start(s);
 assert.ok(g);assert.deepEqual(g.members.sort(),[parent.id,child.id].sort());assert.equal(parent.area,from.id);assert.equal(child.area,from.id);assert.equal(from.civic.food+to.civic.food+g.cargo.food,total);
 child.needs.hunger=70;assert.equal(migrationMeal(s,child),true);const after=total-1;let walkedThrough=false;
 while(g.status==='active'&&s.tick<1800){advance(s);walkedThrough ||=parent.area==='a2';}
 assert.equal(g.status,'settled');assert.ok(walkedThrough);assert.equal(parent.area,to.id);assert.equal(child.area,to.id);assert.equal(parent.agenda.home,to.id);assert.equal(Object.keys(s.people).length,count);
 assert.equal(from.civic.food+to.civic.food+g.cargo.food+(parent.roadSupplies?.food||0),after);
 for(const p of [parent,child])assert.equal(Object.values(s.areas).filter(a=>a.population?.includes(p.id)).length,1);
});
test('recovery before the decision prevents departure; a blocked family waits and eventually abandons without teleporting',()=>{
 const calm=setup();for(let i=0;i<6;i++)advance(calm.s);calm.from.civic.food=40;for(let i=0;i<20;i++)advance(calm.s);assert.equal(Object.keys(calm.s.migrations).length,0);
 const {s,parent,child}=setup(),g=start(s);s.areas.a2.objects.push({id:'blocked',kind:'enemy',alive:true,hp:99,maxHp:99,attack:99,x:50});
 while(g.status==='active'&&s.tick<2800)advance(s);assert.equal(g.status,'abandoned');assert.equal(parent.area,'a1');assert.equal(child.area,'a1');assert.equal(parent.migration,undefined);assert.ok(parent.roadSupplies.food>0);
});
test('an interrupted family journey preserves coordinates and supplies through loading and disabling',()=>{
 let {s,parent}=setup();const g=start(s);let b=restore(serialize(s));assert.equal(serialize(s),serialize(b));for(let i=0;i<16;i++){advance(s);advance(b);}assert.equal(serialize(s),serialize(b));
 setModule(s,'migrations',false);const before={x:parent.x,area:parent.area,cargo:JSON.stringify(g.cargo)};for(let i=0;i<16;i++)advance(s);assert.equal(parent.x,before.x);assert.equal(parent.area,before.area);assert.equal(JSON.stringify(g.cargo),before.cargo);
});
test('an empty place cannot manufacture a new resident to replace the departing family',()=>{
 const {s,from}=setup();for(const id of from.population){s.people[id].area='a4';s.people[id].status='wandering';}from.population=[];from.visited=true;s.society.nextEvent=0;const count=Object.keys(s.people).length;societyTick(s,ctx);assert.equal(Object.keys(s.people).length,count);assert.equal(from.population.length,0);
});
test('a newly blocked road changes the family destination while the original departure trace remains',()=>{
 const {s,parent,child}=setup(),g=start(s),original=g.target;
 const refuge=s.areas.a0;refuge.type='village';civicArea(s,refuge);refuge.civic.food=80;refuge.civic.safety=60;const host=createPerson(s,{name:'Тир',role:'житель',race:'human',area:refuge.id,alive:true});refuge.population=[host];s.people[host].agenda.due=100000;initializeMigrations(s);
 s.areas.a2.objects.push({id:'new-block',kind:'enemy',alive:true,hp:100,maxHp:100,attack:99,x:50});
 while(g.status==='active'&&s.tick<1800)advance(s);
 assert.equal(g.status,'settled');assert.equal(g.initialTarget,original);assert.equal(g.target,refuge.id);assert.equal(parent.area,refuge.id);assert.equal(child.area,refuge.id);assert.ok(g.history.some(e=>e.text.includes('меняет направление')));
});
test('the carrier death leaves one physical cargo trace instead of delivering those supplies with a surviving child',()=>{
 const {s,from,to,parent,child}=setup(),g=start(s),cargo=g.cargo.food;parent.alive=false;parent.status='dead';parent.health=0;
 while(g.status==='active'&&s.tick<1800)advance(s);assert.equal(g.status,'settled');assert.equal(child.area,to.id);assert.ok(g.cargoLost);assert.equal(g.cargo.food,cargo);assert.equal(to.civic.food,60);assert.equal(from.objects.filter(o=>o.migration===g.id&&o.kind==='lostSupplies').length,1);
});
test('a full receiving store leaves overflow in the living carrier pack and later meals consume exactly that food',()=>{
 const {s,from,to,parent}=setup();to.civic.food=99;const total=from.civic.food+to.civic.food,g=start(s);
 while(g.status==='active'&&s.tick<1800)advance(s);assert.equal(g.status,'settled');assert.equal(to.civic.food,100);assert.ok(parent.roadSupplies.food>0);assert.equal(from.civic.food+to.civic.food+parent.roadSupplies.food,total);
 parent.needs.hunger=70;assert.equal(migrationMeal(s,parent),true);assert.equal(from.civic.food+to.civic.food+parent.roadSupplies.food,total-1);
});
