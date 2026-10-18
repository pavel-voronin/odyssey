import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route} from '../engine.js';import {setModule} from '../rules.js';
import {sendGuards,ordersTick} from '../modules/orders.js';import {watchNeeds,provisionWatch} from '../modules/watch-needs.js';
import {personNeeds} from '../modules/needs.js';import {knownWorldEvent,civicObservation} from '../modules/background-towns.js';import {localContact} from '../modules/npc-contacts.js';
const logs=[];const ctx={route,log:(s,text)=>logs.push({tick:s.tick,text}),npcVictory:(s,a,e,p)=>{e.alive=false;e.hp=0;e.defeatedBy=p.id;}};
function setup(){let s=createWorld(4);for(const id of ['elements','tactics','mutations','enemies'])setModule(s,id,false);s.areas.a1.civic.food=80;s.areas.a1.civic.medicine=50;s.hero.area='a0';s.hero.transit=null;s.hero.combat=null;s.society.nextEvent=100000;s.logistics.nextDispatch=100000;logs.length=0;
 const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.hp=enemy.maxHp=100;enemy.attack=3;assert.ok(sendGuards(s,s.areas.a1,{enemy:enemy.id,area:'a2'},ctx));
 const order=s.society.orders[0];return{s,order,p:s.people[order.person],enemy,source:s.areas.a1};}
function tick(s){s.tick++;ordersTick(s,ctx);}
function arrive(s,order){while(order.stage==='marching'&&s.tick<100)tick(s);assert.equal(order.stage,'fighting');}

test('a guard reserves real food and medicine once, and legacy active orders receive no retroactive kit',()=>{
 const {s,p,source}=setup();assert.equal(source.civic.food,78);assert.equal(source.civic.medicine,48);assert.deepEqual(p.roadSupplies,{food:2,medicine:2});provisionWatch(s,p,source);assert.equal(source.civic.food,78);assert.equal(source.civic.medicine,48);assert.ok(localContact(s,p.id,source.id));assert.ok(civicObservation(s,source).witnesses.includes(p.id));assert.equal(source.objects.filter(o=>o.person===p.id).length,1);assert.equal(logs.length,0);
 s.hero.companions.push({person:p.id});assert.ok(!civicObservation(s,source).witnesses.includes(p.id),'actual party position overrides a stale guard address');
 const old=setup();delete old.p.roadSupplies;const food=old.source.civic.food,medicine=old.source.civic.medicine;setModule(old.s,'npc-watch-needs',false);tick(old.s);setModule(old.s,'npc-watch-needs',true);tick(old.s);assert.equal(old.source.civic.food,food);assert.equal(old.source.civic.medicine,medicine);assert.equal(old.p.roadSupplies,undefined);
});
test('a healing guard spends finite medicine and their action while the real enemy still replies',()=>{
 let {s,p,order,enemy}=setup();arrive(s,order);p.health=30;s.tick=15;const hp=enemy.hp;tick(s);assert.equal(p.roadSupplies.medicine,0);assert.ok(p.health>=50&&p.health<=52);assert.equal(enemy.hp,hp);assert.equal(order.stage,'fighting');assert.equal(p.watchNeeds.activity,'medicine');assert.ok(!s.actorFacts.events.some(e=>e.kind==='attack'&&e.actor===p.id));assert.ok(s.actorFacts.events.some(e=>e.kind==='hurt'&&e.actor===p.id));
 const saved=serialize(s);ordersTick(s,ctx);assert.ok(serialize(s)===saved);s=restore(saved);ordersTick(s,ctx);assert.ok(serialize(s)===saved);
});
test('a guard eating during a fight cannot strike or freeze the opponent',()=>{
 const {s,p,order,enemy}=setup();arrive(s,order);p.needs.hunger=65;s.tick=15;const health=p.health,hp=enemy.hp;tick(s);assert.equal(p.roadSupplies.food,1);assert.equal(p.needs.meals,1);assert.ok(p.health<health);assert.equal(enemy.hp,hp);assert.equal(p.watchNeeds.activity,'eat');
});
test('exhaustion starts a real retreat with an enemy response, retaining the living guard and unfinished threat',()=>{
 const {s,p,order,enemy,source}=setup();arrive(s,order);p.needs.energy=10;p.needs.sleeping=true;s.tick=15;const health=p.health,hp=enemy.hp;tick(s);
 assert.equal(order.stage,'returning');assert.equal(p.needs.sleeping,false);assert.ok(p.health<health);assert.equal(enemy.hp,hp);assert.ok(Math.abs(p.x-enemy.x)>Math.abs(40-enemy.x));assert.ok(enemy.alive);
 while(s.society.orders.length&&s.tick<200)tick(s);assert.equal(s.society.orders.length,0);assert.equal(p.alive,true);assert.equal(p.area,source.id);assert.equal(p.status,'resident');assert.ok(source.population.includes(p.id));assert.equal(p.roadSupplies.medicine,2);
});
test('the last retreating hit can kill, leaving one grave and no completed guard mission',()=>{
 const {s,p,order,enemy}=setup();arrive(s,order);p.needs.energy=10;enemy.attack=1000;s.tick=15;tick(s);assert.equal(p.alive,false);assert.equal(p.health,0);assert.equal(s.society.orders.length,0);assert.equal(enemy.hp,100);assert.equal(s.areas.a2.objects.filter(o=>o.id==='grave-'+p.id).length,1);ordersTick(s,ctx);assert.equal(s.areas.a2.objects.filter(o=>o.id==='grave-'+p.id).length,1);assert.equal(logs.length,0);
});
test('a guard sleeping outside combat keeps their route through saving and resumes without a second need update',()=>{
 let {s,p,order}=setup();p.needs.energy=5;s.tick=7;tick(s);assert.equal(p.needs.sleeping,true);const remaining=order.remaining,x=p.x;while(s.tick<40){tick(s);assert.equal(order.remaining,remaining);assert.equal(p.x,x);}
 const saved=serialize(s);s=restore(saved);assert.ok(serialize(s)===saved);p=s.people[p.id];order=s.society.orders[0];while(p.needs.sleeping&&s.tick<160)tick(s);assert.equal(p.needs.sleeping,false);tick(s);assert.equal(order.remaining,remaining-1);assert.equal(p.area,'a1');
});
test('starvation ends a guard once without a free attack, a duplicate grave or a remote obituary',()=>{
 const {s,p,order,enemy}=setup();arrive(s,order);p.health=4;p.roadSupplies={food:0,medicine:0};p.needs.hunger=100;s.tick=95;tick(s);assert.equal(p.alive,false);assert.equal(enemy.hp,100);assert.equal(s.society.orders.length,0);assert.equal(s.areas.a2.objects.filter(o=>o.id==='npc-grave-'+p.id).length,1);assert.ok(s.society.events.every(e=>!knownWorldEvent(s,e)));assert.equal(logs.length,0);
});
test('a real world guard victory remains outside the observer journal until physically witnessed',()=>{
 const {s,p,order,enemy}=setup();arrive(s,order);enemy.hp=1;const heroKills=s.hero.kills,heroXp=s.hero.xp;step(s);assert.equal(enemy.alive,false);assert.equal(enemy.defeatedBy,p.id);assert.equal(s.hero.kills,heroKills);assert.equal(s.hero.xp,heroXp);const victory=s.society.events.find(e=>e.text.includes('Это поступок другого человека.'));assert.ok(victory);assert.equal(victory.area,'a2');assert.equal(knownWorldEvent(s,victory),false);assert.ok(!s.journal.some(e=>e.text===victory.text));
});
test('personal food and medicine work after a role ends even with migrations disabled, and stock-off preserves them',()=>{
 const {s,p}=setup();s.society.orders=[];p.status='resident';p.area='a0';p.roadSupplies={food:1,medicine:2};p.health=30;p.needs.hunger=65;setModule(s,'migrations',false);s.tick=8;assert.equal(personNeeds(s,p,ctx),true);assert.equal(p.health,55);assert.equal(p.roadSupplies.medicine,0);s.tick=16;assert.equal(personNeeds(s,p,ctx),true);assert.equal(p.roadSupplies.food,0);assert.ok(p.needs.hunger<20);
 p.roadSupplies={food:1,medicine:2};p.health=30;p.needs.hunger=65;setModule(s,'supply',false);s.tick=24;personNeeds(s,p,ctx);assert.deepEqual(p.roadSupplies,{food:1,medicine:2});
});
test('watch and personal-stock switches are independent and preserve their existing inventory',()=>{
 const {s,p,order}=setup();arrive(s,order);p.health=30;p.needs.energy=10;setModule(s,'npc-watch-needs',false);s.tick=15;const kit=JSON.stringify(p.roadSupplies);tick(s);assert.equal(JSON.stringify(p.roadSupplies),kit);assert.equal(p.watchNeeds.tick,12);assert.equal(order.stage,'fighting');
 s.society.orders=[];p.area='a0';p.status='resident';p.needs.hunger=65;setModule(s,'migrations',false);setModule(s,'npc-personal-supplies',false);s.tick=24;personNeeds(s,p,ctx);assert.equal(JSON.stringify(p.roadSupplies),kit);
});
