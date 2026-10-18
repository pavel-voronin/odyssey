import {syncActiveActor} from '../actor-projection.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,restore,serialize,route,knownRoute,step,createNextStory,observeDetailedActor,log} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty} from '../modules/property.js';
import {propertyDamageTick,repairPlan,repairProperty} from '../modules/property-damage.js';
import {peopleTick} from '../modules/people.js';
import {weatherAt} from '../modules/weather.js';
const ctx={route,knownRoute,observeProperty,random:()=>0,log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};}};
function fixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['property','property-damage','finances','weather'])setModule(s,id,true);
 const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');h.area=a.id;h.x=42;h.gold=100;h.hp=h.maxHp;h.energy=100;
 const o=workshopAt(s,a),p=s.people[o.owner];o.owner=h.lineage;observeProperty(s,a);a.civic.tools=3;a.civic.treasury=60;
 return{s,h,a,o,p};
}
function weatherDay(s,a,id){for(let t=240;t<=19200;t+=240)if(weatherAt(s,a,t).id===id){s.tick=t;return;}throw Error('No matching weather day');}
test('a real weather condition and rare draw damage one existing workshop once, preserving its title and preventing same-day re-ignition',()=>{
 const miss=fixture();weatherDay(miss.s,miss.a,'storm');propertyDamageTick(miss.s,{...ctx,random:()=>1});assert.equal(miss.o.state,'intact');
 const {s,h,a,o}=fixture(),id=o.id,count=a.objects.length;weatherDay(s,a,'storm');propertyDamageTick(s,ctx);
 assert.equal(o.state,'burned');assert.equal(o.owner,h.lineage);assert.equal(o.id,id);assert.equal(a.objects.length,count);assert.equal(o.history.filter(e=>e.kind==='fire').length,1);
 propertyDamageTick(s,ctx);assert.equal(o.history.filter(e=>e.kind==='fire').length,1);
 repairPlan(s,ctx);for(let i=0;i<4;i++)repairProperty(s,ctx);assert.equal(o.state,'intact');propertyDamageTick(s,ctx);assert.equal(o.state,'intact');
});
test('heat needs an operating forge, and distant damage is not immediately added to hero knowledge',()=>{
 const resting=fixture();weatherDay(resting.s,resting.a,'heat');resting.h.lastAction='rest';propertyDamageTick(resting.s,ctx);assert.equal(resting.o.state,'intact');
 const {s,h,a,o}=fixture();weatherDay(s,a,'heat');setModule(s,'work',true);h.goal={kind:'work',job:'repair',area:a.id,x:42,remaining:5};propertyDamageTick(s,ctx);assert.equal(o.state,'burned');assert.equal(h.property.known[o.id].state,'burned');
 const remote=fixture();weatherDay(remote.s,remote.a,'storm');remote.h.area='a1';propertyDamageTick(remote.s,ctx);
 assert.equal(remote.o.state,'burned');assert.equal(remote.h.property.known[remote.o.id].state,'intact');assert.equal(repairPlan(remote.s,ctx),false);
 remote.h.area=remote.a.id;observeProperty(remote.s,remote.a);assert.equal(repairPlan(remote.s,ctx),true);
});
test('the actual tick can ignite an operating forge despite resetting the last animation action before world simulation',()=>{
 const {s,h,a,o}=fixture();weatherDay(s,a,'heat');s.tick--;setModule(s,'work',true);h.goal={kind:'work',job:'repair',area:a.id,x:42,remaining:5,started:s.tick};
 let seed=0;while(((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296>=.035)seed++;
 s.randomStreams['property-damage']=seed;h.lastAction='idle';step(s);assert.equal(o.state,'burned');assert.equal(o.owner,h.lineage);
});

test('a real offscreen working forge has the same heat risk and all present detailed witnesses learn the damage once',()=>{
 const {s,h,a,o}=fixture();setModule(s,'work',true);h.goal={kind:'work',job:'repair',area:a.id,x:42,remaining:5};syncActiveActor(s);createNextStory(s,{allowLiving:true});s.hero.area=a.id;s.hero.x=52;syncActiveActor(s);weatherDay(s,a,'heat');const other=restore(serialize(s));observeDetailedActor(other,h.lineage);let left=0,right=0;
 propertyDamageTick(s,{...ctx,log,random:()=>{left++;return 0;}});propertyDamageTick(other,{...ctx,log,random:()=>{right++;return 0;}});
 assert.equal(o.state,'burned');assert.equal(other.areas[a.id].objects.find(p=>p.id===o.id).state,'burned');assert.equal(left,right);assert.equal(h.property.known[o.id].state,'burned');assert.equal(other.hero.property.known[o.id].state,'burned');
 const text=o.history.at(-1).text;for(const world of [s,other])for(const actor of Object.values(world.actorStates)){assert.equal(actor.actorJournal.filter(e=>e.tick===world.tick&&e.text===text).length,1);}
});
test('one finite tool, one payment and three work actions restore the same title; paid progress survives interruption and loading',()=>{
 let {s,h,a,o}=fixture();o.state='burned';observeProperty(s,a);assert.equal(repairPlan(s,ctx),true);
 repairProperty(s,ctx);assert.equal(h.gold,82);assert.equal(a.civic.treasury,78);assert.equal(a.civic.tools,2);assert.equal(o.repair.remaining,3);
 repairProperty(s,ctx);assert.equal(o.repair.remaining,2);h.goal=null;h.hp=5;assert.equal(repairPlan(s,ctx),false);
 h.hp=h.maxHp;repairPlan(s,ctx);let loaded=restore(serialize(s));repairProperty(s,ctx);repairProperty(loaded,ctx);assert.equal(serialize(s),serialize(loaded));
 repairProperty(s,ctx);assert.equal(o.state,'intact');assert.equal(o.owner,h.lineage);assert.equal(h.gold,82);assert.equal(a.civic.tools,2);assert.equal(o.history.filter(e=>e.kind==='repair').length,1);assert.equal(repairProperty(s,ctx),false);
});
test('missing materials or money cannot restore a building; disabling pauses paid progress and never restores a title or stock for free',()=>{
 for(const missing of ['tools','money']){const {s,h,a,o}=fixture();o.state='burned';observeProperty(s,a);if(missing==='tools')a.civic.tools=0;else h.gold=0;assert.equal(repairPlan(s,ctx),false);assert.equal(o.repair,undefined);assert.equal(o.state,'burned');}
 const {s,h,a,o}=fixture();o.state='burned';observeProperty(s,a);repairPlan(s,ctx);repairProperty(s,ctx);const paid=JSON.stringify(o.repair);
 setModule(s,'property-damage',false);assert.equal(repairPlan(s,ctx),false);repairProperty(s,ctx);assert.equal(JSON.stringify(o.repair),paid);assert.equal(h.gold,82);assert.equal(a.civic.tools,2);assert.equal(o.state,'burned');
 setModule(s,'property-damage',true);repairPlan(s,ctx);repairProperty(s,ctx);assert.equal(h.gold,82);assert.equal(o.repair.remaining,2);
});
test('the actual NPC action loop stops ghost wages and restores an owned workshop using its own wealth after three physical actions',()=>{
 const {s,h,a,o,p}=fixture();setModule(s,'people',true);setModule(s,'weather',false);o.owner=p.id;o.state='burned';p.area=a.id;p.x=42;p.agenda.wealth=30;p.agenda.due=0;p.agenda.task={kind:'work',target:a.id,x:42,remaining:1};p.agenda.visits=4;
 for(const q of Object.values(s.people))if(q.id!==p.id&&q.id!==h.lineage)q.status='absent';
 s.tick=8;peopleTick(s,ctx);assert.equal(p.agenda.wealth,30);assert.equal(p.agenda.task,null);
 s.tick=16;peopleTick(s,ctx);assert.equal(p.agenda.task.kind,'propertyRepair');assert.equal(p.agenda.task.remaining,2);
 setModule(s,'property-damage',false);s.tick=24;peopleTick(s,ctx);assert.equal(p.agenda.task.remaining,2);
 setModule(s,'property-damage',true);s.tick=32;peopleTick(s,ctx);s.tick=40;peopleTick(s,ctx);
 assert.equal(o.state,'intact');assert.equal(o.owner,p.id);assert.equal(p.agenda.wealth,12);assert.equal(a.civic.treasury,78);assert.equal(a.civic.tools,2);assert.equal(o.history.filter(e=>e.kind==='repair').length,1);
});

