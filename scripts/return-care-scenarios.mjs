import assert from 'node:assert/strict';
import {returnFixture,returnedFixture,ritualAct,returnContext} from './return-ritual-scenarios.mjs';
import {returnedSkeleton} from './skeleton-return-scenarios.mjs';
import {syncActiveActor,syncNPCActors} from '../actor-projection.js';
import {step} from '../engine.js';
import {createPerson} from '../modules/lineage.js';
import {personNeeds} from '../modules/needs.js';
import {setModule} from '../rules.js';
import {bodyRemains} from '../modules/remains.js';
import {peopleTick} from '../modules/people.js';
import {returnedBodyTick} from '../modules/return-person.js';
import {observeReturnCare} from '../modules/return-care-state.js';
export const careContext=returnContext;
export function careResource(s){for(const a of Object.values(s.areas)){const o=a.objects.find(o=>o.kind==='relic'&&!o.taken);if(o)return {a,o};}throw Error('No genuine selected resource');}
export function careFixture({skeleton=false,paid=true,days=2,offset=0}={}){
 const f=skeleton?returnedSkeleton():returnedFixture(),{s,h}=f;
 if(paid){const {a,o}=careResource(s);a.length=100;h.area=a.id;h.x=o.x;h.goal={kind:'collect',area:a.id,x:o.x,object:o.id,started:s.tick};syncActiveActor(s);step(s);assert.equal(o.taken,true,JSON.stringify({goal:h.goal,action:h.lastAction,intent:h.intent,area:h.area,x:h.x,enemy:a.objects.filter(e=>e.kind==='enemy').map(e=>({x:e.x,alive:e.alive,hp:e.hp})),selection:h.actionSelection?.last,deferred:h.actionSelection?.deferred}));assert.equal(h.inventory.relics,1);f.payment={area:a.id,object:o.id};}
 // Selected return-day and actual arrival boundaries, not a replayed journey/life.
 h.area=f.a.id;h.x=f.caster.x-offset;h.goal=null;syncActiveActor(s);s.tick=f.dead.returnEpisode.lastDay+days*240-1;step(s);assert.equal(f.dead.returnEpisode.cohesion,3-days);return f;
}
export function careDoctorAct(f){f.s.tick=Math.floor(f.s.tick/8+1)*8;peopleTick(f.s,careContext);syncNPCActors(f.s);return f;}
export function maintainedFixture(options={}){const f=careFixture(options);assert.ok(f.dead.returnEpisode.care?.request);for(let i=0;i<3;i++)careDoctorAct(f);assert.equal(f.dead.returnEpisode.cohesion,3);return f;}
export function nativeCareFixture(){const f=returnFixture({kin:false}),{s,caster}=f;s.tick=8;const id=createPerson(s,{name:'Вернувшийся житель',race:'human',area:f.a.id,x:caster.x,parents:[caster.id]},{initialJob:'guard'}),p=s.people[id];p.agenda.due=1e9;p.health=1;p.needs.hunger=100;p.biology={tick:0,deficit:11,loss:0};setModule(s,'npc-needs',true);assert.equal(personNeeds(s,p,careContext,{onlyUpkeep:true,migration:false,localFood:false}),true);setModule(s,'npc-needs',false);f.native=p;f.b=bodyRemains(s,p);for(let i=0;i<4;i++)ritualAct(f);assert.equal(p.alive,true);assert.equal(p.returnEpisode.caster,caster.id);
 const {a,o}=careResource(s);a.length=100;p.area=caster.area=a.id;caster.x=o.x;p.x=o.x-6;p.needs.energy=100;p.needs.hunger=0;caster.needs.energy=100;caster.needs.hunger=0;s.tick=p.returnEpisode.lastDay+480;returnedBodyTick(s,careContext);assert.equal(p.returnEpisode.cohesion,1);observeReturnCare(s,p);f.resource={a,o};return f;}



