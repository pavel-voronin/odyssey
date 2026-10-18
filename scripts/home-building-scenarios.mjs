import assert from 'node:assert/strict';
import {homeFixture,homeContext} from './home-scenarios.mjs';
import {setModule} from '../rules.js';import {recruitPerson} from '../modules/social.js';
import {lodgingPlan,bookRoom} from '../modules/lodging.js';
import {homeBuildingNPCTask,homeBuildingNPCAction,homeBuildingPlan,homeBuildingAction} from '../modules/home-building.js';
import {npcAction} from '../modules/npc-control.js';
export const buildingContext=homeContext;
export function buildingFixture({hire=false}={}){
 const f=homeFixture({book:false}),{s,h,p,room,hall}=f;setModule(s,'home-building',true);setModule(s,'companions',true);setModule(s,'relationships',true);
 const guests=Object.values(s.people).filter(q=>q.alive&&q.role!=='ребёнок'&&![h.lineage,p.id].includes(q.id)).slice(0,2);assert.equal(guests.length,2);
 for(const q of guests){q.area=hall.id;q.x=h.x;q.status='resident';q.agenda.task=null;q.needs.hunger=0;q.needs.energy=100;assert.equal(recruitPerson(s,q.id,homeContext,true),true);h.companions.at(-1).loyalty=80;}
 h.goal=null;h.energy=40;assert.equal(lodgingPlan(s,homeContext),true);bookRoom(s,homeContext);assert.ok(room.roomDemand);assert.equal(room.lodging.booking,null);assert.equal(room.lodging.capacity,2);h.energy=100;h.goal=null;
 p.agenda.duty=hire?.1:.9;if(hire){const a=Object.values(s.areas).find(a=>a.civic?.treasury>=40&&a.id!=='a1');assert.ok(a);a.civic.treasury-=40;p.agenda.wealth+=40;}
 delete p.interiorStay;p.agenda.task=null;p.agenda.due=0;assert.ok(homeBuildingNPCTask(s,p));return{...f,project:room.extension};
}
// Each case prepares physical contact at the named workplace, then consumes
// a real bounded personal action. It does not claim a naturally walked life.
export function buildingNPCTurn(f){const {s,p}=f,t=p.agenda.task;assert.ok(t);p.area=t.target;p.x=t.x;s.tick=(Math.floor(s.tick/8)+1)*8;assert.equal(npcAction(s,p,'personal'),true);assert.equal(homeBuildingNPCAction(s,p),true);}
export function buildingSupply(f){buildingNPCTurn(f);assert.ok(f.project.materials);return f;}
export function hireBuilder(f){const {s,h,p}=f;buildingSupply(f);p.area=f.hall.id;p.x=76;p.status='resident';h.area=p.area;h.x=p.x;s.tick++;assert.equal(homeBuildingPlan(s,homeContext),true);assert.equal(h.goal.kind,'homeBuildHire');assert.equal(homeBuildingAction(s,homeContext),true);assert.equal(f.project.worker,h.lineage);return f;}
export function heroBuild(f,n=6){const {s,h,project:r}=f;h.goal=null;assert.equal(homeBuildingPlan(s,homeContext),true);h.area=r.area;h.x=r.x;for(let i=0;i<n;i++){s.tick++;assert.equal(homeBuildingAction(s,homeContext),true);}return f;}
