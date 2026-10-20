import assert from 'node:assert/strict';
import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {createArea,connectAreas,createEnemy,serialize,restore,log} from '../engine.js';
import {createDelveLayout} from '../modules/delve-layout.js';
import {positionTacticalReply} from '../modules/position-replies.js';
import {recordLocalWound} from '../modules/wound-events.js';
import {createPerson} from '../modules/lineage.js';
import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';
import {requestSurgery,surgeonTurn} from '../modules/surgery.js';
export const surgeryContext={...forgingContext,log};
export function surgeryFixture(){const f=forgingFixture(),{s,h}=f;assert.ok(startKnife(s,f.worker,f.site,forgingContext));placeAtBench(f);for(let i=0;i<6;i++){s.tick++;assert.equal(workKnife(s,f.worker,forgingContext),true);}
 for(const k of ['surgery','local-wounds','wound-care','wound-infection','delve-layouts','delves','mechanisms','dungeon-positions','people','npc-control'])setModule(s,k,true);
 const id=createArea(s,'dungeon','Каменный источник осколка',1,{layoutRoom:true,continent:f.a.continent,era:f.a.era}),root=s.areas[id];connectAreas(s,f.a.id,id,{mode:'stairs',duration:2});const layout=createDelveLayout(s,root,f.a,{...surgeryContext,addArea:createArea,connect:connectAreas,spawnEnemy:createEnemy});if(!layout?.position)throw Error(JSON.stringify({layout,root:root.dungeon,visited:root.visited,tick:s.tick}));const room=s.areas[layout.position.area],enemy=room.objects.find(e=>e.id===layout.position.enemy),p=s.people[h.lineage];
 Object.assign(h,{area:room.id,x:34,race:'human',maxHp:100,hp:100,energy:100,hunger:0,goal:null,combat:null,transit:null});p.race='human';h.coverPosition=null;syncActiveActor(s);s.tick++;const raw=positionTacticalReply(s,enemy,h,35,surgeryContext);assert.equal(raw,35);h.hp-=raw;const w=recordLocalWound(s,p,enemy,{before:100,after:65,maximum:100,area:room.id,controller:'surgery-real-shard',scarPart:'leftLeg'},surgeryContext);assert.ok(w.foreignBody);syncActiveActor(s);
 // Selected arrival at the existing workshop after that actual damage; no journey is claimed.
 h.area=f.a.id;h.x=42;h.combat=null;h.goal=null;h.personality.courage=.3;syncActiveActor(s);const doctor=s.people[createPerson(s,{race:'human',role:'житель',area:f.a.id,x:42,parents:[]},{initialJob:'healer',ageYears:32})];f.a.population.push(doctor.id);doctor.needs.energy=100;doctor.needs.hunger=0;doctor.needs.sleeping=false;doctor.agenda.task=null;doctor.agenda.duty=.9;doctor.agenda.sociability=.8;doctor.roadSupplies={food:0,medicine:2};return {...f,p,w,root,room,enemy,doctor,fragment:s.foreignBodies.byId[w.foreignBody]};}
export function surgeryAct(f){f.s.tick++;const ok=surgeonTurn(f.s,f.doctor,surgeryContext);syncActiveActor(f.s);return ok;}
export function agreedSurgery(f=surgeryFixture()){f.s.tick++;assert.equal(requestSurgery(f.s,f.p,f.doctor,surgeryContext),true);return f;}
export function exactSurgery(f){syncActiveActor(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);return raw;}


