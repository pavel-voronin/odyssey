import assert from 'node:assert/strict';
import {createWorld,createArea,connectAreas,knownRoute} from '../engine.js';
import {openSettlement} from '../modules/districts.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {setModule} from '../rules.js';
import {commonContext} from './common-life-scenarios.mjs';
import {workshopAt,observeProperty} from '../modules/property.js';
import {planQuest,questReady} from '../modules/quests.js';
import {workTick} from '../modules/work.js';
import {syncActiveActor} from '../actor-projection.js';
export const workLossContext={...commonContext,questReady,planQuest:(s,q)=>planQuest(s,q,commonContext)};
// Controlled current constructors: real districts, owners, relatives and stocks.
// This is a planner experiment, not a natural closure frequency sample.
export function workLossFixture({family=true,attached=false,alternative=true,off=false}={}){
 const s=createWorld(4),h=s.hero,town=createArea(s,'village','Медная Заводь',0);connectAreas(s,'a1',town);openSettlement(s,s.areas[town],{addArea:createArea,connect:connectAreas,log:()=>{}});
 for(const area of Object.values(s.areas))revealArea(s,area);for(const area of Object.values(s.areas))for(const next of area.links)revealRoad(s,area.id,next);
 const a=Object.values(s.areas).find(a=>a.city==='a1'&&a.district==='Мастерские'),b=Object.values(s.areas).find(a=>a.city===town&&a.district==='Мастерские');
 for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['work','property','identity','lineage','quests','work-loss'])setModule(s,id,true);setModule(s,'work-loss',!off);
 const o=workshopAt(s,a),other=workshopAt(s,b);assert.ok(o?.state==='intact'&&other?.state==='intact');
 Object.assign(h,{area:a.id,x:42,profession:'clockmaker',gold:200,energy:100,hp:h.maxHp,hunger:0,goal:null,workAfter:0,combat:null,transit:null,delve:null,caravanJob:null});h.career.path='peaceful';h.career.rank=attached?8:3;h.career.xp=0;h.career.records.clockmaker={rank:h.career.rank,xp:0};h.personality.generosity=attached?.1:.95;h.personality.curiosity=.1;h.counters.peacefulWork=0;h.habits=[];h.conditions=[];h.companions=[];h.quests=[];h.questCargo={};h.commitments.personal=null;h.life.nextMastery=null;h.life.ended=false;h.life.phase='wandering';delete h.life.residence;delete h.workLife;h.memory.avoided={};h.memory.rejected={};h.property.known={};h.memory.shopAfter=1000000000;
 // Safe-route control removes threats before the experiment, never in the new
 // planner. All rooms/roads remain the same genuine saved instances.
 for(const room of Object.values(s.areas))for(const object of room.objects)if(object.kind==='enemy')object.alive=false;
 const owner=s.people[o.owner];owner.area=a.id;owner.x=42;owner.status='resident';
 h.area=b.id;observeProperty(s,b);h.area=a.id;observeProperty(s,a);if(!alternative)delete h.property.known[other.id];assert.ok(knownRoute(s,a.id,b.id).length>1);
 let q=null,relative=null;
 if(family){relative=s.people[s.people[h.lineage].parents.find(id=>s.people[id]?.alive)];assert.ok(relative);relative.area='a1';relative.status='resident';relative.x=42;if(!s.areas.a1.population.includes(relative.id))s.areas.a1.population.push(relative.id);if(!h.memory.people.includes(relative.id))h.memory.people.push(relative.id);
  s.areas.a1.civic.food=20;assert.ok(s.areas.a5.civic.food>=40);q={id:'known-family-supplies',kind:'supply',title:'Еда для родного дома',source:'a1',target:'a5',giver:relative.id,required:1,reward:0,status:'active',accepted:s.tick-10,cargo:false,cause:'Дома попросили привезти еду из знакомых торговых рядов.'};h.quests.push(q);
 }
 h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5,started:s.tick,workplace:{id:o.id,area:a.id,owner:o.owner}};
 workTick(s,workLossContext);assert.ok(h.goal.workspace);s.tick++;workTick(s,workLossContext);assert.equal(h.goal.remaining,4);if(!off)assert.equal(h.workLife.last.id,o.id);syncActiveActor(s);return {s,h,a,b,o,other,owner,q,relative};
}
export function closeWorkplace(f){f.o.state='burned';f.o.history.push({tick:f.s.tick,kind:'fire',owner:f.o.owner});observeProperty(f.s,f.a);}
