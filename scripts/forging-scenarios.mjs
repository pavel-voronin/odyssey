import {practiceFixture,practiceContext} from './craft-practice-scenarios.mjs';
import {setModule} from '../rules.js';
import {receiveItem} from '../modules/inventory.js';
import {workshopSite,workshopPosition} from '../modules/workshop-place.js';
import {initializeWorkshopRooms} from '../modules/workshop-interiors.js';
import {syncActiveActor} from '../actor-projection.js';
export const forgingContext={...practiceContext,receiveItem};
export function forgingFixture({npc=false,interior=false}={}){
 const f=practiceFixture(),{s,h,a,o,p}=f;
 for(const id of ['forging','goods-cycle','equipment','item-originals','skill-branches'])setModule(s,id,true);
 Object.assign(h,{energy:100,hunger:0,x:42,goal:null});h.bag=[];h.equipment={weapon:null,armor:null,charm:null};
 if(npc){o.owner=p.id;Object.assign(p,{x:42,area:a.id,health:p.maxHealth||100,status:'resident'});Object.assign(p.agenda,{task:null,wealth:100,job:'artisan'});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});}
 if(interior){setModule(s,'interiors',true);setModule(s,'workshop-interiors',true);initializeWorkshopRooms(s,a);}
 syncActiveActor(s);return {...f,worker:npc?p:s.people[h.lineage],site:workshopSite(s,a,o.id)};
}
export function placeAtBench(f){const at=workshopPosition(f.s,f.a,f.o);if(f.worker.id===f.h.lineage){f.h.area=at.area;f.h.x=at.x;syncActiveActor(f.s);}else Object.assign(f.worker,{area:at.area,x:at.x});return at;}
