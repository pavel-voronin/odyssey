import {returnsOn} from './return-state.js';
import {authorityBody} from './authority-state.js';
import {npcController} from './npc-control.js';
import {physicalDistance,routeDistance} from '../geometry.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {wildGrazer} from './ecology-state.js';
export const careOn=s=>returnsOn(s);
export const careBody=(s,p)=>authorityBody(s,p.id);
export const careInventory=(s,p)=>s.actorStates?.[p.id]?.inventory||p.actorLink?.inventory||p.returnEpisode?.care?.inventory||null;
export const careMemory=p=>p.returnEpisode.care ||= {version:1,doctors:[],resources:[],blocked:[],request:null,serial:0,lastAction:-1,restored:0,droppedGain:0,receipts:[],decision:null};
export function careReady(s,p){const b=p&&careBody(s,p);return Boolean(careOn(s)&&p?.alive&&(!p.returnEpisode||p.returnEpisode.cohesion>0)&&b&&!b.transit&&!b.combat&&!b.carriedBy&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&!p.needs.sleeping&&p.bodyCarry?.stage!=='carrying'&&p.remainsCarry?.stage!=='carrying'&&(b.lineage?b.energy:p.needs.energy)>=25&&(b.lineage?b.hp:p.health)>0);}
export const doctorReady=(s,p)=>Boolean(p?.alive&&p.returnRite&&npcController(s,p)==='personal'&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&!p.ferryDuty&&!p.ferryTicket&&p.bodyCarry?.stage!=='carrying'&&p.remainsCarry?.stage!=='carrying'&&!p.ailment&&!p.needs.sleeping&&p.needs.hunger<65&&p.needs.energy>=30&&p.health>=(p.maxHealth||100)*.5&&p.agenda.duty>=.6);
const note=(list,n,key)=>{const old=list.find(v=>v[key]===n[key]);if(old)Object.assign(old,n);else list.push(n);if(list.length>4)list.shift();};
export function observeReturnCare(s,p){if(!careOn(s)||!p?.returnEpisode||!p.alive)return;const b=careBody(s,p),a=s.areas[b.area];if(!a||b.transit||p.roadTransit||p.needs.sleeping)return;const c=careMemory(p),q=p.returnEpisode;
 if(!c.originKnown){const source=s.remains?.byId[q.body];if(source?.position.kind==='area')note(c.doctors,{person:q.caster,area:source.position.area,x:source.position.x,seen:q.at,ready:null,origin:true},'person');c.originKnown=true;}
 for(const v of Object.values(s.people)){if(v.id===p.id||!v.returnRite||v.area!==a.id||physicalDistance(a,b.x,v.x)>12)continue;note(c.doctors,{person:v.id,area:a.id,x:v.x,seen:s.tick,ready:doctorReady(s,v),origin:v.id===q.caster},'person');c.blocked=c.blocked.filter(n=>n.key!=='doctor:'+v.id+'/'+a.id||n.reason!=='Известный путь оказался недоступен');}
 for(const o of a.objects)if(o.kind==='relic'&&physicalDistance(a,b.x,o.x)<=24){note(c.resources,{object:o.id,area:a.id,x:o.x,seen:s.tick,available:!o.taken},'object');c.blocked=c.blocked.filter(n=>n.key!=='relic:'+o.id+'/'+a.id||n.reason!=='Известный путь оказался недоступен');}
}
export const careKey=g=>(g.doctor?'doctor:'+g.doctor:'relic:'+g.object)+'/'+g.area;
export const careBasis=g=>JSON.stringify([g.area,g.x,g.ready??g.available??null]);
export function blockCare(s,p,g,reason){const c=careMemory(p),key=careKey(g);c.blocked=c.blocked.filter(n=>n.key!==key);c.blocked.push({key,basis:careBasis(g),at:s.tick,reason});if(c.blocked.length>4)c.blocked.shift();c.refusal={at:s.tick,reason};}
export function safeCareLocal(s,p,x){const b=careBody(s,p),a=s.areas[b.area];return Boolean(a&&!a.objects.some(e=>e.kind==='enemy'&&!wildGrazer(e)&&e.alive&&!e.resolved&&!e.hidden&&physicalDistance(a,b.x,e.x)<=24&&e.x>=Math.min(b.x,x)-2&&e.x<=Math.max(b.x,x)+2));}
export function careChoice(s,p,ctx){if(!p.returnEpisode||!careReady(s,p)||p.returnEpisode.cohesion>2)return null;observeReturnCare(s,p);const q=p.returnEpisode,c=careMemory(p),b=careBody(s,p),left=q.cohesion*240-(s.tick-q.lastDay);
 if(c.request)return {kind:'returnCareWait',area:b.area,x:b.x,doctor:c.request.doctor};
 const path=to=>b.lineage?ctx.knownRoute(s,b.area,to):npcKnownRoute(p,b.area,to,knownNPCHazards(s,p));
 const reachable=n=>{const route=path(n.area);if(!route.length||route.length>3)return false;const distance=route.length===1?physicalDistance(s.areas[b.area],b.x,n.x):routeDistance(s,route)+100;const cost=Math.ceil(distance/3)*(b.lineage?1:8)+40;return cost<left&&(n.area!==b.area||safeCareLocal(s,p,n.x));};
 const unblocked=n=>!c.blocked.some(r=>r.key===careKey(n)&&r.basis===careBasis(n));
 const doctors=c.doctors.map(n=>({...n,doctor:n.person})).filter(n=>n.ready!==false&&unblocked(n)&&reachable(n));
 let g=null;if((careInventory(s,p)?.relics||0)>0&&doctors.length){const n=doctors[0];g={...n,kind:n.area===b.area&&physicalDistance(s.areas[b.area],b.x,n.x)<=2?'returnCareRequest':'returnCareVisit'};}
 else if(doctors.length){const n=c.resources.find(n=>n.available&&unblocked(n)&&reachable(n));if(n)g={...n,kind:'returnCareCollect'};}
 if(g&&b.lineage&&ctx.methodRevision&&b.actionSelection?.deferred.some(e=>e.kind===g.kind&&e.area===g.area&&e.step.object===g.object&&e.step.doctor===g.doctor&&e.signature===ctx.methodRevision(s,g)))g=null;
 const kind=g?'seek-rite':'last-work',reason=g?'Известный источник и короткий путь укладываются в оставшуюся связность.':'Не знаю безопасного обряда, до которого успею. Продолжу последнее посильное дело.';
 if(c.decision?.kind!==kind||c.decision?.cohesion!==q.cohesion)c.decision={at:s.tick,kind,cohesion:q.cohesion,reason,work:b.lineage?b.goal?.kind||null:p.agenda.task?.kind||null};return g;
}



