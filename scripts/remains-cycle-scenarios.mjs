import assert from 'node:assert/strict';
import {createWorld,createEnemy,log,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {personNeeds} from '../modules/needs.js';
import {bodyRemains} from '../modules/remains.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeBurialPlaces} from '../modules/remains-carry.js';
import {burialTurn,buyBurialTool} from '../modules/burial-work.js';
import {npcAction} from '../modules/npc-control.js';
import {syncActiveActor,syncNPCActors} from '../actor-projection.js';
export const cycleContext={log,route,knownRoute};
export function cycleWorld(extra=[]){const flags=['travel','remains-carry','remains-cycle','remains','people','npc-control','npc-knowledge','identity','lineage','containers','geography-frame','origins','birthplaces',...extra],s=createWorld(0,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))});for(const a of Object.values(s.areas))a.objects=a.objects.filter(o=>o.kind!=='enemy');const a=s.areas[s.geographyFrame.sites.crossroads.area],town=Object.values(s.areas).find(a=>a.civic);a.length=100;s.hero.area=town.id;s.hero.x=90;s.hero.goal=null;s.hero.stories.active=null;s.hero.companions=[];syncActiveActor(s);return {s,a,town};}
export function person(f,settings={},job='guard'){const id=createPerson(f.s,{role:'житель',race:'human',alive:true,area:f.a.id,x:42,...settings},{initialJob:job}),p=f.s.people[id];p.agenda.task=null;p.agenda.due=1e9;p.agenda.duty=.9;p.needs.energy=100;p.needs.hunger=0;p.roadSupplies={food:0,medicine:0};return p;}
// Three genuine starvation deaths; elapsed clocks, nearby arrival and starting
// wealth and the current native dose11→12 are prepared boundaries, not a simulated life or a historical reader.
export function death(f,p,tick=96){const s=f.s;s.tick=tick;p.health=1;p.needs.hunger=100;p.biology={tick:tick-8,deficit:11,loss:0};setModule(s,'npc-needs',true);assert.ok(personNeeds(s,p,cycleContext,{onlyUpkeep:true,migration:false,localFood:false}));setModule(s,'npc-needs',false);assert.equal(p.alive,false);return bodyRemains(s,p);}
export function funeralFixture(){const f=cycleWorld(),{s,a,town}=f,older=person(f),p=person(f,{parents:[older.id],race:'orc'});f.p=p;f.anchor=death(f,older);observeBurialPlaces(s,p);f.bodies=[death(f,person(f,{parents:[older.id]}),192),death(f,person(f,{parents:[older.id]}),192)];p.area=town.id;p.x=42;p.agenda.wealth=20;town.civic.tools=Math.max(1,town.civic.tools);assert.ok(buyBurialTool(s,p,cycleContext));p.area=a.id;p.x=42;observeNPCPlace(s,p);s.tick++;return f;}
export function burialAct(f){f.s.tick++;assert.ok(npcAction(f.s,f.p,'personal'));const r=burialTurn(f.s,f.p,cycleContext);syncNPCActors(f.s);return r;}
export function wolf(f,x=42,hunger=95){const e=createEnemy(f.s,f.a,{species:'wolf',x,initialHunger:hunger});assert.ok(e.predator);return e;}
