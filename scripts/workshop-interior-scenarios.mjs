import {craftFixture} from './craft-respect-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {initializeWorkshopRooms} from '../modules/workshop-interiors.js';
import {JOBS} from '../content.js';
export function workshopInteriorFixture({owned=false}={}){
 const f=craftFixture(),{s,h,a,o}=f;
 for(const id of ['property-damage','relationships','supply','finances','work-orders','craft-respect','events'])setModule(s,id,false);
 for(const id of ['interiors','workshop-interiors','workshop-tools'])setModule(s,id,true);
 h.area=a.id;h.x=o.x;h.hp=h.maxHp;h.hunger=0;h.energy=100;h.gold=20;h.destiny.completed=true;h.life.reflectAfter=1e9;
 if(owned)o.owner=h.lineage;
 const job=JOBS.find(j=>j.id==='repair');h.goal={kind:'work',area:a.id,x:o.x,job:'repair',remaining:job.duration,started:s.tick,workplace:{id:o.id,area:a.id,owner:o.owner}};
 h.intent=job.name;h.reason='Он получил работу в настоящей мастерской. Для станка нужно право доступа и время на сам заказ.';
 initializeWorkshopRooms(s);syncActiveActor(s);return {...f,job,room:s.areas[o.workshopInterior.area]};
}
