import {createWorld} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {tavernIn,tavernPlan} from '../modules/interiors.js';
export function interiorFixture(seed=0){
 const s=createWorld(seed);for(const m of MODULES)setModule(s,m.id,false);
 for(const id of ['interiors','people','npc-control','npc-needs','npc-knowledge','npc-contacts','npc-personal-supplies','body','supply','lighting','scenery','appearance','facades','animation','color-profile'])setModule(s,id,true);
 const h=s.hero,d=tavernIn(s,'a1'),p=s.people[d.owner];s.tick=30;h.area='a1';h.x=d.x;h.goal={kind:'tavernVisit',area:d.hall,x:50,remaining:3};h.personality.sociability=.9;h.inventory.rations=30;h.inventory.potions=0;h.energy=100;h.hp=h.maxHp;h.hunger=5;
 p.roadSupplies={food:100,medicine:0,tools:0};p.agenda.task=null;p.agenda.due=0;p.x=d.x;p.needs.hunger=10;p.needs.energy=100;
 tavernPlan(s,{goal:(world,kind,area,x,intent,reason,extra)=>{h.goal={kind,area,x,started:s.tick,...extra};h.intent=intent;h.reason=reason;}});
 return {s,h,d,p,hall:s.areas[d.hall]};
}
