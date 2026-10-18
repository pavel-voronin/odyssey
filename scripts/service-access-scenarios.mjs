import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {commonContext} from './common-life-scenarios.mjs';
import {workshopAt,observeProperty} from '../modules/property.js';
import {syncActiveActor} from '../actor-projection.js';
export const serviceContext=commonContext;
export function serviceFixture(){
 const s=createWorld(0),h=s.hero;for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['service-access','supply','property','work','work-materials','identity','finances'])setModule(s,id,true);
 const a=Object.values(s.areas).find(a=>a.district==='Мастерские');Object.assign(h,{area:a.id,x:68,profession:'clockmaker',gold:20,hp:20,energy:100,hunger:70,combat:null,transit:null,goal:null,workAfter:0});h.career.rank=3;h.career.path='peaceful';h.inventory.potions=0;h.inventory.herbs=0;h.inventory.rations=0;h.conditions=[];h.companions=[];h.habits=[];h.quests=[];h.commitments.personal=null;h.memory.avoided={};h.memory.rejected={};h.memory.shopAfter=0;delete h.memory.services;
 Object.assign(a.civic,{food:60,medicine:8,tools:5,treasury:40});const o=workshopAt(s,a);s.people[o.owner].x=42;observeProperty(s,a);const doctor=a.population.map(id=>s.people[id]).find(p=>p.agenda?.job==='healer');s.merchant.area=a.id;s.merchant.destination=null;s.merchant.nextMove=100000;syncActiveActor(s);return {s,h,a,o,doctor};
}
export function emptyServiceArea(f){for(const id of f.a.population){const p=f.s.people[id];if(p.id!==f.h.lineage){p.area='a1';p.status='travelling';}}}
