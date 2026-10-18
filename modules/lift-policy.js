import {enabled} from '../rules.js';
const key=(a,b)=>[a,b].sort().join('|');
export const liftAt=(s,a,b)=>s.edges?.[key(a,b)]?.lift;
export const liftReady=n=>n?.status==='ready'&&n.parts.length===2&&n.charge.remaining>0;
export const liftBlocked=(s,a,b)=>enabled(s,'mechanisms')&&Boolean(liftAt(s,a,b))&&!liftReady(liftAt(s,a,b));
export function liftPassage(s,from,to){return liftBlocked(s,from,to)?{kind:'lift',x:Number(to.slice(1))>Number(from.slice(1))?100:0,arrival:Number(to.slice(1))>Number(from.slice(1))?5:95,allowed:false}:null;}
export function knownLiftBlocked(s,p,from,to){
 if(!enabled(s,'mechanisms'))return false;const n=p?.liftMemory?.known.find(n=>n.key===key(from,to));if(!n||n.status==='ready'&&n.remaining>0)return false;
 if(n.after>s.tick)return true;
 const h=s.actorStates?.[p.id];return n.consoleArea!==from||n.status==='dismantled'||!h||h.energy<35||h.personality.curiosity<.5||n.status==='ready'&&h.inventory.relics<1;
}
// Admission spends one charge exactly once. Already admitted rides use their own saved phase.
export function admitLift(s,from,to,person,arrivalX){
 const n=liftAt(s,from,to);if(!enabled(s,'mechanisms')||!n||!liftReady(n))return null;
 const h=s.hero.lineage===person?s.hero:s.actorStates?.[person],p=s.people[person],body=h&&h.actorMode!=='npc'?h:p;if(!p?.alive||body?.area!==from||h&&h.actorMode!=='npc'&&(!h.alive||h.life.ended))return null;
 n.charge.remaining--;n.charge.spent++;n.wear++;n.rides++;if(n.wear>=3)n.status='broken';s.graphRevision=(s.graphRevision||0)+1;
 const ride={version:1,id:n.id+'/ride/'+n.rides,node:n.id,from,to,person,started:s.tick,lastTick:s.tick,total:2,remaining:2,arrivalX,spent:1};
 n.history.push({tick:s.tick,person,action:'ride',id:ride.id});if(n.history.length>12)n.history.shift();return ride;
}
export function npcLiftPassage(s,p,to,arrivalX){
 if(p.liftTransit){const t=p.liftTransit;if(t.lastTick===s.tick)return {status:'held',crossing:t};t.lastTick=s.tick;t.remaining--;if(t.remaining<=0){delete p.liftTransit;return {status:'arrived',crossing:t};}return {status:'crossing',crossing:t};}
 const n=liftAt(s,p.area,to);if(!enabled(s,'mechanisms')||!n)return {status:'clear'};
 const scale=s.areas[p.area].length>0?Math.max(.5,Math.min(6,s.areas[p.area].length/100)):1,x=Number(to.slice(1))>Number(p.area.slice(1))?100:0;
 if(Math.abs(p.x-x)*scale>1)return {status:'unavailable'};
 const ride=admitLift(s,p.area,to,p.id,arrivalX);if(!ride)return {status:'unavailable'};p.liftTransit=ride;return {status:'crossing',crossing:ride,started:true};
}
// A timed controller has already completed its ordinary approach segment.
export function timedLiftPassage(s,p,to,arrivalX){
 if(p.liftTransit)return npcLiftPassage(s,p,to,arrivalX);
 const n=liftAt(s,p.area,to);if(!enabled(s,'mechanisms')||!n)return {status:'clear'};if(!liftReady(n))return {status:'unavailable'};
 p.x=Number(to.slice(1))>Number(p.area.slice(1))?100:0;return npcLiftPassage(s,p,to,arrivalX);
}
