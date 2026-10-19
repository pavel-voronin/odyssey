import {createWorld,step,serialize} from '../engine.js';import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';import {recordAreaVisit,revealArea,revealRoad} from '../actor-atlas.js';
import {buyNavigationRope} from '../modules/navigation-tools.js';import {boardFerry} from '../modules/ferry-actions.js';
export const seamanshipContext={log(){}};
export function seamanshipFixture({rope=true,lesson=false}={}){
 const flags=['ferry','geography-frame','districts','people','origins','birthplaces','travel','supply','npc-control','containers','item-originals','equipment','navigation-tools','identity','skill-branches'];
 const s=createWorld(1,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,f=s.ferry,from=s.areas[f.ports[0]],to=s.areas[f.ports[1]];
 Object.assign(h,{profession:'sailor',gold:rope?6:0,hp:h.maxHp,energy:100,hunger:0,goal:null,transit:null,combat:null,conditions:[],companions:[],quests:[],bag:[]});Object.assign(h.inventory,{rations:0,herbs:0,potions:0,relics:0});h.personality.curiosity=.8;h.personality.generosity=.8;h.stories.active=null;h.destiny.completed=true;h.memory.shopAfter=100000;
 let material=null;if(rope){h.area=s.merchant.area;h.x=58;s.areas[h.area].objects=s.areas[h.area].objects.filter(o=>o.kind!=='enemy');if(!buyNavigationRope(s,seamanshipContext))throw Error('No actual paid rope');material=h.bag.find(i=>i.base==='rope');}
 // Prepared approach/departure window, not a simulated journey from the shop.
 s.tick=1;f.departure=3;h.area=from.id;h.x=50;h.atlas={version:1,known:[],visited:[],roads:[],visits:{}};recordAreaVisit(s,from);revealArea(s,to.id);revealRoad(s,from.id,to.id);s.people[f.captain].agenda.sociability=lesson?.9:0;syncActiveActor(s);
 return {s,h,f,from,to,material};
}
export function boardCargo(f){if(!boardFerry(f.s,f.h.lineage,f.to.id,seamanshipContext,{work:true}))throw Error('No actual work agreement');syncActiveActor(f.s);return f;}
export function departCargo(f){while(f.s.tick<f.f.departure)step(f.s);if(f.f.phase!=='sailing')throw Error('No actual departure');return f;}
export function quietArrival(f){
 // One explicit checkpoint before the real arrival boundary.
 f.f.travelled=f.f.distance-f.f.speed;f.f.pause=0;f.f.eventDone=true;f.f.lastEvent={version:1,voyage:f.f.voyage,at:f.s.tick,kind:'quiet'};step(f.s);if(f.h.transit)throw Error('No actual landing');return f;
}
export function twoSecureDepartures(){
 const f=boardCargo(seamanshipFixture()),paying=f.from.population.map(id=>f.s.people[id]).find(p=>p.alive&&p.id!==f.h.lineage&&p.id!==f.f.captain&&p.area===f.from.id&&p.agenda);paying.x=50;paying.agenda.wealth=6;paying.needs.sleeping=false;if(!boardFerry(f.s,paying.id,f.to.id,seamanshipContext))throw Error('No actual paying customer');departCargo(f);quietArrival(f);f.h.goal={kind:'explore',area:f.from.id,x:50,started:f.s.tick};step(f.s);if(!f.h.transit)throw Error('No second boarding');departCargo(f);syncActiveActor(f.s);return f;
}
export function stormBoundary(f){f.f.travelled=f.f.distance/2-1;f.f.eventDone=false;f.s.randomStreams.voyages=Math.imul((Math.floor(.1*4294967296)-1013904223)>>>0,4276115653)>>>0;step(f.s);if(f.f.lastEvent?.kind!=='storm')throw Error('No actual chosen storm event');return f;}
export function seamanshipSave(f){syncActiveActor(f.s);return serialize(f.s);}
