import {profession,race} from '../content.js';
import {rootWorld} from '../world-ref.js';
import {packView,itemUnits} from './container-state.js';
import {limbCanCarry,limbStride} from './limb-state.js';
import {woundImpairment} from './wound-state.js';
export const peopleCarryOn=s=>['people-carry','companions','relationships','people'].every(id=>s.rules?.[id]!==false);
export function carryActor(input,id){return input.hero?.lineage===id?input.hero:rootWorld(input).actorStates?.[id]||null;}
export function bodyWeight(p){return 8*(race(p.race)?.height||1)**2;}
export function actualMight(s,p){if(s.rules.identity===false)return 1;const h=carryActor(s,p.id),base=h?.actorMode!=='npc'&&h?.alive?h.stats?.might:profession('npc-'+(p.agenda?.job||'farmer')).stats[0];return (base||1)+(s.rules.lineage===false?0:race(p.race)?.bonus.might||0);}
function worn(s,id){const h=carryActor(s,id);return Object.values(h?.equipment||{}).filter(Boolean).reduce((n,i)=>n+itemUnits(i),0);}
export function peopleCarryLoad(s,p,passenger){return packView(s,p.id).used+worn(s,p.id)+bodyWeight(passenger)+packView(s,passenger.id).used+worn(s,passenger.id);}
export function bodyCarryCapable(s,p,passenger){return p?.alive&&p.role!=='ребёнок'&&passenger?.alive&&p.id!==passenger.id&&limbCanCarry(p)&&limbStride(p)>=.9&&p.health>=(p.maxHealth||100)*.8&&!p.ailment&&woundImpairment(s,p,'arm')<.2&&woundImpairment(s,p,'leg')<.2&&woundImpairment(s,p,'head')<.2&&actualMight(s,p)>=6&&peopleCarryLoad(s,p,passenger)<=actualMight(s,p)*2+2;}
export function carryingPerson(s,p){const q=p?.bodyCarry;return q?.stage==='carrying'&&s.people[q.passenger]?.alive?s.people[q.passenger]:null;}
export function carryJourney(s,h){const p=s.people[h?.carriedBy],q=p?.bodyCarry;return q?.stage==='carrying'&&q.passenger===h.lineage?q.journey||null:null;}
export function carryingBodyPosition(s,id){const p=s.people[id],q=p?.bodyCarry;if(q?.stage!=='carrying')return null;return q.journey?{transit:q.journey}:{area:p.area,x:p.x};}
export function carryEvent(s,p,kind,extra={}){const q=p.bodyCarry;q.history.push({tick:s.tick,kind,...extra});if(q.history.length>8)q.history.shift();}
