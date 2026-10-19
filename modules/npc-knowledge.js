import {observeRupture} from './quake-knowledge.js';
import {quakeBlocked,knownQuakeBlocked} from './quake-state.js';
import {rememberRoadPrice} from './metric-route-state.js';
import {layoutStair} from './shortcut-state.js';
import {observeMigrationPlace} from './migration-memory.js';
import {enabled} from '../rules.js';
import {campPassage,physicalDistance} from '../geometry.js';
export const NPC_PLACE_LIMIT=64,NPC_ROAD_LIMIT=96;
const key=(a,b)=>[a,b].sort().join('|');
export function initializeNPCKnowledge(s,p){
  p.navigation ??={version:1,places:[],roads:[]};
}
export function observeNPCPlace(s,p){
  if(!enabled(s,'npc-knowledge')||!p.alive||!p.area||!s.areas[p.area])return;
  observeMigrationPlace(s,p);
  initializeNPCKnowledge(s,p);const nav=p.navigation,a=s.areas[p.area];
  const remember=(area,local=false)=>{
    let entry=nav.places.find(e=>e.area===area.id);
    if(!entry){entry={area:area.id,name:area.name,seen:s.tick};nav.places.push(entry);}
    entry.seen=s.tick;entry.name=area.name;
    if(local&&a.civic){entry.payroll=a.civic.treasury>=12;entry.workSeen=s.tick;}
    if(local&&entry.hazardUntil&&!a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved))delete entry.hazardUntil;
    return entry;
  };
  remember(a,true);
  for(const id of a.links){const b=s.areas[id],edge=s.edges[key(a.id,id)];
    if(!b||!(['road','door',undefined].includes(edge?.mode)||edge?.ferry===s.ferry?.id&&s.ferry?.ports.includes(a.id)&&s.ferry.ports.includes(b.id))||a.era!==b.era||a.realm!==b.realm)continue;
    if(a.temporaryCamp||b.temporaryCamp){const passage=campPassage(s,a.id,b.id,p.id);if(!passage?.allowed||!passage.exit&&physicalDistance(a,p.x,passage.x)>18)continue;}
    observeRupture(s,p,a.id,id);const place=remember(b);if(b.temporaryCamp?.site?.version===1)place.campSite={parent:a.id,x:b.temporaryCamp.site.parentX,seen:s.tick};if(s.edges[key(a.id,id)]?.metric||s.geographyFrame){nav.roadCosts ||= {};rememberRoadPrice(s,nav.roadCosts,a.id,id);}const road=nav.roads.find(e=>e.key===key(a.id,id));
    if(road)road.seen=s.tick;else nav.roads.push({key:key(a.id,id),from:a.id,to:id,seen:s.tick});
  }
  if(nav.places.length>NPC_PLACE_LIMIT){const keep=new Set([p.area,p.agenda?.home]);nav.places.sort((a,b)=>Number(keep.has(a.area))-Number(keep.has(b.area))||a.seen-b.seen).splice(0,nav.places.length-NPC_PLACE_LIMIT);}
  if(nav.roads.length>NPC_ROAD_LIMIT)nav.roads.sort((a,b)=>a.seen-b.seen).splice(0,nav.roads.length-NPC_ROAD_LIMIT);
}
export function npcKnownRoute(p,from,to,avoided=[]){
 if(from===to)return [from];const roads=p.navigation?.roads||[],costs=p.navigation?.roadCosts,queue=[from],seen=new Set(),parents={[from]:null},prices={[from]:0};
 while(queue.length){if(costs)queue.sort((a,b)=>prices[a]-prices[b]||a.localeCompare(b));const last=queue.shift();if(seen.has(last))continue;seen.add(last);if(last===to){const path=[];for(let id=to;id!==null;id=parents[id])path.push(id);return path.reverse();}
 for(const e of roads){const next=e.from===last?e.to:e.to===last?e.from:null;if(!next||knownQuakeBlocked(p,last,next)||seen.has(next)||avoided.includes(next)||e.layoutGate&&p.mechanisms?.known.find(n=>n.key===e.layoutGate)?.state!=='open')continue;
 const q=costs?.[e.key],weight=q?.distance?Math.ceil(q.distance/(q.speed*({road:1,trail:.85,sand:.8,mountain:.7}[q.terrain]||1)))+16:1,candidate=prices[last]+weight;
 if(next in prices&&prices[next]<=candidate)continue;prices[next]=candidate;parents[next]=last;queue.push(next);}}
 return [];
}
export function knownEmployer(s,p){
  for(const place of p.navigation?.places||[]){if(place.area===p.area||!place.payroll)continue;
    const path=npcKnownRoute(p,p.area,place.area,knownNPCHazards(s,p));if(path.length>=2&&path.length<=4)return {area:place.area,path,seen:place.workSeen,name:place.name};
  }
  return null;
}
export function knownNPCHazards(s,p){return (p.navigation?.places||[]).filter(e=>e.area!==p.area&&e.hazardUntil>s.tick).map(e=>e.area);}
export function rememberNPCHazard(s,p){const place=p.navigation?.places.find(e=>e.area===p.area);if(place)place.hazardUntil=s.tick+240;}
export function forgetNPCRoad(p,from,to){if(p.navigation)p.navigation.roads=p.navigation.roads.filter(e=>e.key!==key(from,to));}
export function roadStillPresent(s,from,to){
  const a=s.areas[from],b=s.areas[to],edge=s.edges[key(from,to)];
  return Boolean(!quakeBlocked(s,from,to)&&a?.links.includes(to)&&b&&(['road','door',undefined].includes(edge?.mode)||edge?.ferry===s.ferry?.id&&s.ferry?.ports.includes(from)&&s.ferry.ports.includes(to)||layoutStair(s,from,to))&&a.era===b.era&&a.realm===b.realm&&(!b.temporaryCamp||b.temporaryCamp.site?.version===1));
}
