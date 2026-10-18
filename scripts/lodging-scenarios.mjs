import {hallFixture} from './hall-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function lodgingFixture(){
 const f=hallFixture(),{s,h,p,d}=f;setModule(s,'lodging',true);setModule(s,'hall-activities',false);h.profession='clockmaker';h.career.path='peaceful';h.x=76;h.goal=null;h.energy=40;h.hp=h.maxHp-10;h.hunger=5;s.areas.a1.civic.treasury-=26;h.gold+=26;p.x=76;p.needs.energy=100;p.interiorStay={until:s.tick+180,building:d.id};syncActiveActor(s);
 return {...f,room:s.areas[d.room]};
}
export function npcLodgingFixture(){
 const f=lodgingFixture(),{s,h,hall}=f,guest=s.people['person-2'];
 s.areas[guest.area].population=s.areas[guest.area].population.filter(id=>id!==guest.id);guest.area=hall.id;guest.x=76;guest.status='resident';hall.population.push(guest.id);guest.agenda.task=null;guest.agenda.due=0;guest.agenda.wealth=12;s.areas.a1.civic.treasury-=12;guest.needs.energy=50;guest.needs.hunger=10;
 h.goal={kind:'routeWait',area:h.area,x:h.x,until:100000};h.energy=100;h.hp=h.maxHp;syncActiveActor(s);return {...f,guest};
}
