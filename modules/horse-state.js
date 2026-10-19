import {rootWorld} from '../world-ref.js';
import {areaScale} from '../geometry.js';
import {itemUnits,packView} from './container-state.js';
import {metricKey,terrainPace} from './metric-route-state.js';
export const HORSE_PRICE=28,HORSE_BAG_PRICE=12,HORSE_BAG_CAPACITY=6,HORSE_LOAD=36;
export const horses=s=>Object.values(s.horses?.byId||{});
export const horseById=(s,id)=>s.horses?.byId?.[id]||null;
export const ridingOn=s=>s.rules?.riding!==false;
export function horseActor(input,id){const s=rootWorld(input);return input.hero?.lineage===id?input.hero:s.actorStates?.[id]||null;}
function leaderPosition(input,id){const s=rootWorld(input),h=horseActor(input,id),p=s.people[id];if(!p?.alive)return null;
 if(h?.alive&&!h.life.ended&&h.actorMode!=='npc')return h.transit?{transit:h.transit}:{area:h.area,x:h.x};
 if(p.roadTransit)return {transit:p.roadTransit};return s.areas[p.area]?{area:p.area,x:p.x}:null;
}
export function horsePosition(input,m){const s=rootWorld(input);if(m.leader){const loc=leaderPosition(input,m.leader);if(loc){if(loc.transit)return loc;const a=s.areas[loc.area];if(!a?.interior&&!a?.dungeon)return {area:loc.area,x:Math.max(0,Math.min(100,loc.x+(m.rider?0:m.offset/areaScale(a))))};}}return m.body;}
export function horseEdgePosition(h,m){const t=h.transit,b=m.body?.kind==='edge'&&m.body.journey;if(!t?.metric||!b?.metric||metricKey(t.from,t.to)!==metricKey(b.from,b.to)||t.metric.distance!==b.metric.distance)return null;const target=t.from===b.from?b.metric.travelled:b.metric.distance-b.metric.travelled;if(JSON.stringify(t.metric.map)!==JSON.stringify(t.from===b.from?b.metric.map:b.metric.map&&{...b.metric.map,from:b.metric.map.to,to:b.metric.map.from}))return null;return target;}
export function horseNear(s,h,m,range=3){const a=horsePosition(s,m);if(h.transit){if(m.leader===h.lineage)return true;const at=horseEdgePosition(h,m);return at!==null&&Math.abs(at-h.transit.metric.travelled)<=range;}if(a?.transit||a?.kind==='edge')return false;return a?.area===h.area&&Math.abs(a.x-h.x)*areaScale(s.areas[h.area])<=range;}
export function groupHorse(s,body){const id=body.lineage||body.id;return horses(s).find(m=>m.hp>0&&m.leader===id)||null;}
export function riddenHorse(s,body){const id=body.lineage||body.id;return horses(s).find(m=>m.hp>0&&m.rider===id)||null;}
export function horseCargoLoad(m){return (m.cargo?.items||[]).reduce((n,i)=>n+itemUnits(i),0);}
export function horseLoad(s,body,m){const id=body.lineage||body.id,h=horseActor(s,id),p=s.people[id],worn=h?Object.values(h.equipment||{}).filter(Boolean).reduce((n,i)=>n+itemUnits(i),0):0;return (m.rider?8+packView(s,id).used+worn:0)+horseCargoLoad(m)+(m.fodder||0)/4;}
export function horseReady(s,body,m,{terrain='road'}={}){return ridingOn(s)&&m?.hp>=m.maxHp*.7&&m.energy>=25&&m.hunger<70&&m.fearUntil<=s.tick&&horseLoad(s,body,m)<=HORSE_LOAD&&!['mountain','stairs','lift','portal','time','sea'].includes(terrain);}
export function horseMotion(s,body,m,weather,{mounted=false,terrain='road'}={}){const load=horseLoad(s,body,m),burden=1+load/72,base=mounted&&horseReady(s,body,m,{terrain})&&terrain==='road'?9:6,health=m.hp<m.maxHp*.7?.65:1;return {speed:base*terrainPace(terrain)*(weather.speed??1)*health/burden,energy:(mounted?1.1:.65)*(weather.energy??1)*(1+load/72)/terrainPace(terrain)};}
export function rememberHorse(s,h,m){const at=horsePosition(s,m);if(h.transit||!horseNear(s,h,m,18))return false;h.memory.horses ||= {};h.memory.horses[m.id]={version:1,id:m.id,name:m.name,area:at.area,x:at.x,seen:s.tick,owner:m.owner,hp:m.hp,maxHp:m.maxHp,energy:m.energy,hunger:m.hunger,cargo:(m.cargo?.items||[]).map(i=>({id:i.id,name:i.name}))};return true;}
export function horseEvent(s,m,kind,from,to,extra={}){m.history.push({tick:s.tick,kind,from,to,...extra});if(m.history.length>12)m.history.shift();}
