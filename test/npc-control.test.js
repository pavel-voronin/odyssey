import {prepareActiveWatch} from './fixtures/active-watch.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,route,restore,serialize} from '../engine.js';
import {npcController,npcAction,canStartNPCActivity} from '../modules/npc-control.js';
import {peopleTick,peopleArea} from '../modules/people.js';
import {civicArea,societyTick} from '../modules/society.js';
import {launchConvoy,supplyTick} from '../modules/supply.js';
import {ordersTick} from '../modules/orders.js';
import {socialTick,recruitPerson} from '../modules/social.js';
import {partyTick} from '../modules/party.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {publicDestinations,startPublicJourney} from '../modules/public-journeys.js';
import {migrationsTick} from '../modules/migrations.js';
import {setModule} from '../rules.js';
const ctx={route,log:()=>{},gainXp:()=>{},npcVictory:(s,a,e,p)=>{e.alive=false;e.hp=0;e.defeatedBy=p.id;}};
function setup(){const s=createWorld(1),a=s.areas.a1,to=s.areas.a4;to.type='village';civicArea(s,to);peopleArea(s,to);to.civic.food=10;to.civic.medicine=0;to.civic.treasury=60;a.civic.food=90;a.civic.medicine=50;
 const p=s.people[a.population[0]];for(const q of Object.values(s.people))if(q.agenda){q.agenda.task=null;q.agenda.due=100000;}
 p.x=42;p.area=a.id;p.status='resident';p.health=p.maxHealth||100;p.agenda.wealth=0;Object.assign(p.needs,{hunger:10,energy:100,sleeping:false});
 for(const area of Object.values(s.areas))for(const e of area.objects)if(e.kind==='enemy')e.alive=false;
 s.society.nextEvent=100000;s.logistics.nextDispatch=100000;s.hero.area=a.id;s.hero.transit=null;const clean=restore(serialize(s));return{s:clean,p:clean.people[p.id],a:clean.areas[a.id],to:clean.areas[to.id]};}
function legacyCargo(s,a,to){setModule(s,'npc-logistics',false);return launchConvoy(s,a,to,ctx);}

test('controller claims have stable priority and the index notices in-place additions and replacements within one tick',()=>{
 const {s,p}=setup();assert.equal(npcController(s,p),'personal');
 s.society.journeys.push({person:p.id});assert.equal(npcController(s,p),'journey');
 s.logistics.convoys.push({person:p.id});assert.equal(npcController(s,p),'caravan');
 s.society.orders.push({person:p.id});assert.equal(npcController(s,p),'orders');
 s.hero.companions.push({person:p.id});assert.equal(npcController(s,p),'party');
 s.hero.companions=[];assert.equal(npcController(s,p),'orders');s.society.orders=[];assert.equal(npcController(s,p),'caravan');s.logistics.convoys=[];assert.equal(npcController(s,p),'journey');s.society.journeys=[];
 s.migrations.m={status:'active',members:[p.id],arrivals:{}};p.migration='m';assert.equal(npcController(s,p),'migration');s.migrations.m.arrivals[p.id]={area:p.area};assert.equal(npcController(s,p),'personal');
 assert.equal(npcController(s,s.people[s.hero.lineage]),'actor');p.alive=false;assert.equal(npcController(s,p),'none');
});
test('a resident cannot work or consume needs twice in one tick, including after restoring that tick',()=>{
 let {s,p}=setup();p.agenda.task={kind:'work',workMode:null,target:p.area,x:42,remaining:3};s.tick=8;peopleTick(s,ctx);assert.equal(p.agenda.task.remaining,2);assert.equal(p.needs.energy,99.2);
 const saved=serialize(s);peopleTick(s,ctx);assert.ok(serialize(s)===saved);s=restore(saved);peopleTick(s,ctx);assert.ok(serialize(s)===saved);p=s.people[p.id];s.tick=16;peopleTick(s,ctx);assert.equal(p.agenda.task.remaining,1);
});
test('a new role cannot execute a second action after the previous controller acted in this tick',()=>{
 const {s,p}=setup();s.tick=8;assert.ok(npcAction(s,p,'personal'));s.hero.companions.push({id:p.id,uid:p.id,person:p.id,role:'person',hp:24,maxHp:24,ethics:0});assert.equal(npcController(s,p),'party');assert.equal(npcAction(s,p,'party','social'),false);assert.equal(canStartNPCActivity(s,p),false);
 s.tick++;assert.ok(npcAction(s,p,'party','upkeep'));assert.ok(npcAction(s,p,'party','social'));assert.equal(npcAction(s,p,'party','social'),false);assert.equal(p.actionControl.phases.length,2);
 const saved=serialize(s),copy=restore(saved);assert.equal(npcAction(copy,copy.people[p.id],'party','upkeep'),false);assert.ok(serialize(copy)===saved);
});
test('a legacy carrier arriving before the personal hook cannot also earn wages or spend a need action that tick',()=>{
 const {s,a,to}=setup(),c=legacyCargo(s,a,to),p=s.people[c.person];c.index=1;c.remaining=1;p.area=c.path[1];s.tick=8;supplyTick(s,ctx);
 assert.equal(p.area,to.id);assert.equal(p.status,'resident');const before=JSON.stringify(p),money=to.civic.treasury;peopleTick(s,ctx);assert.equal(JSON.stringify(p),before);assert.equal(to.civic.treasury,money);
 s.tick=16;peopleTick(s,ctx);assert.equal(p.actionControl.owner,'personal');assert.ok(p.needs.energy<100);
});
test('a guard and a cargo cannot advance the same person, and completion does not grant the lower role a second turn',()=>{
 const {s,a,to}=setup(),enemy=s.areas.a2.objects.find(e=>e.kind==='enemy');prepareActiveWatch(s,a,{enemy:enemy.id,area:'a2'},ctx);const order=s.society.orders[0],p=s.people[order.person],c=legacyCargo(s,a,to);c.person=p.id;
 s.tick=1;const remaining=c.remaining;supplyTick(s,ctx);assert.equal(c.remaining,remaining);const march=order.remaining;ordersTick(s,ctx);assert.equal(order.remaining,march-1);ordersTick(s,ctx);assert.equal(order.remaining,march-1);assert.equal(p.actionControl.owner,'orders');
 order.stage='returning';order.remaining=1;s.tick=2;ordersTick(s,ctx);assert.equal(s.society.orders.length,0);supplyTick(s,ctx);assert.equal(c.remaining,remaining);assert.equal(s.logistics.convoys.length,1);
 s.tick=3;supplyTick(s,ctx);assert.equal(c.remaining,remaining-1);assert.equal(p.status,'caravan');assert.equal(a.population.includes(p.id),false);
});
test('party ownership blocks stale guard and journey records, while party upkeep and social phases each run once',()=>{
 const {s,p,a}=setup();assert.ok(recruitPerson(s,p.id,ctx,true));p.personalJourney=null;const c=s.hero.companions.find(c=>c.person===p.id);c.loyalty=90;c.ethics=1;
 s.society.orders.push({person:p.id,from:a.id,to:'a2',stage:'marching',remaining:10});s.society.journeys.push({version:1,movement:'timed',person:p.id,from:a.id,to:'a4',arrival:1,reason:'Старое дело.'});
 s.hero.area='a2';s.hero.hunger=95;s.hero.alignment=-30;s.tick=40;partyTick(s,ctx);partyTick(s,ctx);assert.equal(c.loyalty,86);s.tick=64;socialTick(s,ctx);socialTick(s,ctx);assert.equal(c.loyalty,78);assert.equal(p.area,s.hero.area);
 ordersTick(s,ctx);societyTick(s,ctx);assert.equal(s.society.orders[0].remaining,10);assert.equal(s.society.journeys.length,1);assert.equal(p.area,'a2');assert.equal(p.actionControl.owner,'party');
});
test('recruitment suspends personal work and cannot give the already active resident a second party action',()=>{
 const {s,p}=setup();p.agenda.task={kind:'work',target:p.area,x:42,remaining:3};s.tick=8;peopleTick(s,ctx);assert.equal(p.actionControl.owner,'personal');assert.ok(recruitPerson(s,p.id,ctx,true));assert.equal(p.agenda.task,null);p.personalJourney=null;
 socialTick(s,ctx);assert.equal(p.actionControl.owner,'personal');s.tick++;socialTick(s,ctx);assert.equal(p.actionControl.owner,'party');
});
test('finishing personal work does not allow a new freight or public departure in the same tick',()=>{
 const {s,p,a,to}=setup();for(const id of route(s,a.id,to.id)){p.area=id;observeFreightActor(s,p);}p.area=a.id;observeFreightActor(s,p);Object.assign(p.agenda,{job:'merchant',duty:.8,task:{kind:'work',target:a.id,x:42,remaining:1}});
 s.tick=8;peopleTick(s,ctx);assert.equal(p.agenda.task,null);const food=a.civic.food;assert.equal(launchConvoy(s,a,to,ctx),null);assert.equal(startPublicJourney(s,p,a,publicDestinations(s,p).find(e=>e.place.area===to.id),ctx),null);assert.equal(a.civic.food,food);
 s.tick++;assert.ok(launchConvoy(s,a,to,ctx));assert.equal(p.actionControl.owner,'caravan');assert.deepEqual(p.actionControl.phases,['depart']);
});
test('migration maintenance cannot overwrite a member controlled by the party',()=>{
 const {s,p,a,to}=setup();assert.ok(recruitPerson(s,p.id,ctx,true));p.personalJourney=null;p.migration='m';const task={kind:'learn',target:a.id,x:42,remaining:3};p.agenda.task=task;
 s.migrations.m={id:'m',status:'active',source:a.id,target:to.id,members:[p.id],carrier:p.id,cargo:{food:2,medicine:0},arrivals:{},started:0,lastRethink:0,history:[]};s.tick=16;migrationsTick(s,ctx);assert.equal(p.status,'withHero');assert.equal(p.agenda.task,task);assert.equal(npcController(s,p),'party');
});
test('a dead legacy carrier leaves one finite actual cargo instead of moving or delivering after death',()=>{
 const {s,a,to}=setup(),c=legacyCargo(s,a,to),p=s.people[c.person];p.alive=false;p.health=0;p.status='dead';p.area='a2';s.tick=8;supplyTick(s,ctx);
 assert.equal(s.logistics.convoys.length,0);assert.equal(to.civic.food,10);const cache=s.areas.a2.objects.find(o=>o.id===c.id+'-cargo');assert.equal(cache.food,12);assert.equal(cache.medicine,4);supplyTick(s,ctx);assert.equal(s.areas.a2.objects.filter(o=>o.id===cache.id).length,1);
});
test('disabling the arbiter preserves its record and returns the previous scheduling policy',()=>{
 const {s,p}=setup();s.tick=8;assert.ok(npcAction(s,p,'personal'));const record=JSON.stringify(p.actionControl);setModule(s,'npc-control',false);assert.ok(npcAction(s,p,'personal'));assert.ok(npcAction(s,p,'personal'));assert.equal(JSON.stringify(p.actionControl),record);assert.ok(canStartNPCActivity(s,p));
});
