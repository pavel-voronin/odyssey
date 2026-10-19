import {finishBorderCrossing} from './authority-state.js';
import {interiorPassage} from './interiors.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {weatherAt} from './weather.js';
export const trackingOn=s=>enabled(s,'skill-branches')&&enabled(s,'identity');
const key=(a,b)=>[a,b].sort().join('|');
export function recordCrossingTrace(s,source,from,to){
 const e=s.edges?.[key(from,to)],a=s.areas[from],b=s.areas[to];
 if(source?.kind==='person'&&e&&a&&b)finishBorderCrossing(s,source.id,from,to);
 if(!trackingOn(s)||from===to||!a||!b||!e||!['road','door','stairs',undefined].includes(e.mode)||!source?.id||!['person','pet'].includes(source.kind)||source.kind==='person'&&!s.people[source.id]?.alive)return null;
 const body=source.kind==='person'?(s.hero?.lineage===source.id?s.hero:s.actorStates?.[source.id]||s.people[source.id]):null;
 if(body&&(body.area!==from||body.carriedBy))return null;
 if(source.kind==='pet'){const owner=s.hero?.lineage===source.owner?s.hero:s.actorStates?.[source.owner]||s.people[source.owner],pet=source.pet,b=pet?.packCargo?.body||pet?.petCustody?.body;if(!pet||pet.uid!==source.id||!(pet.hp>0)||b?.area!==from||!(owner?.companions||owner?.pets||[]).includes(pet))return null;}
 const camp=interiorPassage(s,from,to,source.kind==='person'?source.id:source.owner),fromX=camp?.x??(Number(to.slice(1))>Number(from.slice(1))?100:0),toX=camp?.arrival??(fromX===100?5:95);
 e.traces ||= [];e.traces=e.traces.filter(t=>t.expires>s.tick&&!(t.source.id===source.id&&t.source.kind===source.kind));
 const t={id:key(from,to)+'/trail/'+source.kind+'/'+source.id,source:{kind:source.kind,id:source.id},from,to,fromX,toX,at:s.tick,expires:s.tick+240,passage:Boolean(camp),wet:['rain','storm'].includes(weatherAt(s,a).id)};
 e.traces.push(t);if(e.traces.length>8)e.traces.shift();return t;
}
// Only adjacent edges of the occupied scene; readers do not discover the far
// area, refresh a source's position, expire world records or scan the world.
export function localEdgeTraces(s,h=s.hero){
 if(!trackingOn(s)||h.transit)return [];
 const a=s.areas[h.area],out=[];
 for(const to of a.links||[]){const k=key(a.id,to);for(const t of s.edges[k]?.traces||[]){const x=t.from===a.id?t.fromX:t.toX;if(t.expires>s.tick&&physicalDistance(a,h.x,x)<=12)out.push({...t,edge:k,x});}}
 return out;
}
export function trailClarity(s,t,area=s.areas[s.hero.area]){return t.wet||['rain','storm'].includes(weatherAt(s,area).id)?'washed':s.tick-t.at>80?'faded':'fresh';}
