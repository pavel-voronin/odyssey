import {setModule} from '../rules.js';
import {workTick} from '../modules/work.js';
import {serviceFixture,serviceContext} from './service-access-scenarios.mjs';
import {materialContext} from './materials-scenarios.mjs';
import {syncActiveActor} from '../actor-projection.js';
export const craftContext={...serviceContext,...materialContext};
export function craftFixture(){
 const f=serviceFixture(),{s,h,a,o}=f;for(const id of ['craft-respect','relationships','work-orders','property-damage'])setModule(s,id,true);
 h.hp=h.maxHp;h.hunger=0;h.x=42;h.personality.generosity=.8;
 const p=s.people[o.owner];Object.assign(p,{area:a.id,x:42,status:'resident'});Object.assign(p.agenda,{job:'artisan',wealth:40,duty:.5,task:null});p.needs.energy=100;p.needs.hunger=0;p.needs.sleeping=false;p.agenda.bonds ||= {};p.agenda.bonds[h.lineage]=0;
 syncActiveActor(s);return {...f,p};
}
export function demonstrateCraft(f){
 const {s,h,a}=f;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5};for(let i=0;i<8&&h.goal;i++){s.tick++;workTick(s,craftContext);}if(h.goal)throw Error('Prepared actual work did not finish');
}
export function damageCraftRoom(f){f.o.state='burned';f.o.damagedAt=f.s.tick;f.o.repair=null;f.o.offer=null;f.h.goal=null;}
