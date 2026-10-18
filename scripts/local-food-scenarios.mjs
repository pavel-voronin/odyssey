import {revealArea} from '../actor-atlas.js';
import {createWorld,route,knownRoute,log} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {localFoodChoice} from '../modules/local-food.js';
import {syncActiveActor} from '../actor-projection.js';
export const foodContext={route,knownRoute,log,closest(s,where){return Object.values(s.areas).filter(where).sort((a,b)=>route(s,s.hero.area,a.id).length-route(s,s.hero.area,b.id).length)[0];},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,intent,reason,started:s.tick,...extra};}};
export function foodFixture(kind='mushroom',accept=null){
 const role=kind==='fish'?'sailor':'ranger';let s;
 for(let seed=0;seed<200;seed++){const candidate=createWorld(seed);if(candidate.hero.profession===role&&Object.values(candidate.areas).some(a=>a.forage?.localFood?.kind===kind)&&(!accept||accept(candidate))){s=candidate;break;}}
 if(!s)throw Error('Actual role not found');
 const h=s.hero,p=s.people[h.lineage],a=Object.values(s.areas).find(a=>a.forage?.localFood?.kind===kind);
 if(!a)throw Error('Actual local source not found');
 // Prepared access to an existing generated source. No new items or invented
 // source/skill is added; encounter and reserves are deliberately controlled.
 for(const m of MODULES)setModule(s,m.id,false);
 for(const id of ['local-food','supply','identity'])setModule(s,id,true);
 for(const person of Object.values(s.people))if(person.id!==p.id)person.status='absent';
 h.area=a.id;revealArea(s,a);h.x=a.forage.x;h.energy=100;h.hp=h.maxHp;h.hunger=80;h.inventory.rations=0;h.companions=[];h.goal=null;h.combat=null;h.transit=null;p.needs.sleeping=false;
 for(const o of a.objects)if(o.kind==='enemy')o.alive=false;
 a.discovered=true;a.climate='temperate';h.memory.places.push(a.id);h.destiny.completed=true;h.life.reflectAfter=1e9;s.logistics.nextDispatch=1e9;
 syncActiveActor(s);return{s,h,p,a};
}
export function startFood(f){const {s,h,p,a}=f,choice=localFoodChoice(s,p,h,a);if(!choice)throw Error('Food inaccessible');h.goal={kind:'forage',area:a.id,x:choice.x,remaining:choice.remaining,foodSource:choice.id};return h.goal;}
