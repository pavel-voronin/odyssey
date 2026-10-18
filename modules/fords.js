import {enabled} from '../rules.js';
import {physicalDistance,campLink,areaScale} from '../geometry.js';
import {spatialPassage} from './spatial.js';
import {carriedFood} from './stores.js';

export const fordsOn=s=>enabled(s,'fords');
export const fordKey=(a,b)=>[a,b].sort().join('|');
const surface=a=>a&&!a.interior&&!a.temporaryCamp&&(!a.realm||a.realm==='surface');
export function newFord(s,e){
 const a=s.areas[e.a],b=s.areas[e.b];if(!s.hero||!fordsOn(s)||e.ford||e.mode!=='road'||!surface(a)||!surface(b)||a.city&&a.city===b.city||a.continent!==b.continent||(a.era??0)!==(b.era??0)||!['road','forest'].some(t=>a.type===t||b.type===t))return;
 let hash=s.seed>>>0;for(const c of fordKey(e.a,e.b)+'/water')hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;if(hash%24!==0)return;
 e.ford={version:1,id:'ford/'+fordKey(e.a,e.b),period:120,low:72,offset:hash%120,foot:3,cart:6,forecastBias:hash%7-3};
}
export function fordProfile(s,from,to){const e=s.edges?.[fordKey(from,to)],f=e?.ford;if(e?.mode!=='road'||!surface(s.areas[from])||!surface(s.areas[to])||!f||f.version!==1||!Number.isInteger(f.period)||f.period<12||f.period>960||!Number.isInteger(f.low)||f.low<4||f.low>=f.period||!Number.isInteger(f.offset)||![f.foot,f.cart].every(n=>Number.isInteger(n)&&n>=2&&n<=24)||!s.areas[from]?.links.includes(to)||!s.areas[to]?.links.includes(from))return null;return f;}
export function fordWater(s,from,to,tick=s.tick){const f=fordProfile(s,from,to);if(!f)return null;const phase=((tick+f.offset)%f.period+f.period)%f.period,open=phase<f.low;return {id:f.id,phase,open,wait:open?0:f.period-phase,remaining:open?f.low-phase:0,level:open?'мелкая вода':'высокая вода',flow:phase<f.low?'река отступила':'река вернётся в берега',profile:f};}
export function fordEnd(s,from,to){const p=spatialPassage(s,fordKey(from,to)),end=p.ends?.find(e=>e.area===from);return p.status==='known'&&p.kind==='road'&&Number.isFinite(end?.departureX)?end.departureX:null;}
export function fordBlocked(s,b){return fordsOn(s)?(b.fordKnowledge||[]).filter(k=>k.deferredUntil>s.tick).map(k=>k.edge):[];}
export function pathHasFord(s,path){return fordsOn(s)&&path.slice(1).some((id,i)=>Boolean(fordProfile(s,path[i],id)));}
function spend(b,amount){if(Number.isFinite(b.energy))b.energy=Math.max(0,b.energy-amount);else if(b.needs)b.needs.energy=Math.max(0,b.needs.energy-amount);}
export function fordPassage(s,b,to,arrivalX,{carrier=false}={}){
 const active=b.fordCrossing,from=active?.from??b.area,edge=fordKey(from,to),f=fordProfile(s,from,to);
 if(!active&&(!fordsOn(s)||!s.edges?.[edge]?.ford||s.edges[edge].mode!=='road'))return {status:'clear'};
 if(b.fordActionTick===s.tick)return {status:'held'};b.fordActionTick=s.tick;
 if(active){
  if(active.version!==1)return {status:'unavailable'};
  if(active.from!==b.area||!fordProfile(s,active.from,active.to)){delete b.fordCrossing;return {status:'aborted',reason:'Подход изменился. Возвращается к своему берегу.'};}
  active.remaining--;spend(b,.4);if(active.remaining>0)return {status:'crossing',crossing:active};delete b.fordCrossing;return {status:'arrived',crossing:active};
 }
 const x=fordEnd(s,from,to);if(!f||x===null||physicalDistance(s.areas[from],b.x,x)>1)return {status:'unavailable'};
 const water=fordWater(s,from,to);b.fordKnowledge ||= [];let k=b.fordKnowledge.find(k=>k.edge===edge);if(!k){k={edge,from,to,firstSeen:s.tick};b.fordKnowledge.push(k);if(b.fordKnowledge.length>24)b.fordKnowledge.shift();}
 Object.assign(k,{seen:s.tick,open:water.open,level:water.level,expectedOpen:water.open?s.tick:Math.max(s.tick+1,s.tick+water.wait+(f.forecastBias||0))});
 if(!water.open)return {status:'closed',water,knowledge:k,edge};
 delete k.deferredUntil;delete k.waitSince;const duration=carrier?f.cart:f.foot;b.fordCrossing={version:1,edge,from,to,arrivalX,started:s.tick,remaining:duration-1,total:duration};spend(b,.4);return {status:'crossing',crossing:b.fordCrossing,started:true};
}
// This search reads the traveller's recorded map, never remote water or stock.
export function fordBypass(s,b,target,blocked,avoid=id=>(b.memory?.avoided?.[id]||0)>s.tick||Boolean(b.memory?.rejected?.[id])){
 const hero=Boolean(b.memory),atlas=b.atlas,roads=hero?atlas.roads:(b.navigation?.roads||[]).map(e=>e.key||fordKey(e.from,e.to));
 const known=new Set(hero?atlas.known:(b.navigation?.places||[]).map(p=>p.area)),allowed=new Set(roads),avoidEdges=new Set([...fordBlocked(s,b),blocked]),queue=[[b.area]],seen=new Set([b.area]);
 for(let i=0;i<queue.length;i++){const path=queue[i],last=path.at(-1);if(path.length>8)continue;for(const next of s.areas[last]?.links||[]){const key=fordKey(last,next),e=s.edges?.[key];if(seen.has(next)||avoidEdges.has(key)||!allowed.has(key)||!known.has(next)||e?.mode!=='road'||!campLink(s,last,next)||s.areas[last]?.temporaryCamp&&last!==b.area||hero&&avoid(next)||!hero&&b.navigation?.places.some(k=>k.area===next&&k.hazardUntil>s.tick))continue;const result=[...path,next];if(next===target)return result;seen.add(next);queue.push(result);}}
 return [];
}
export function fordChoice(s,b,target,result,{carrier=false,cargoFood=0,avoid}={}){
 const k=result.knowledge,wait=Math.max(1,k.expectedOpen-s.tick),path=fordBypass(s,b,target,result.edge,avoid),curiosity=b.personality?.curiosity??b.agenda?.curiosity??.5;
 const cost=path.slice(1).reduce((n,id,i)=>n+50*(areaScale(s.areas[path[i]])+areaScale(s.areas[id])),0)/6;
 const energy=b.energy??b.needs?.energy??100,hunger=b.hunger??b.needs?.hunger??0,healthy=(b.hp??b.health??100)>=(b.maxHp??b.maxHealth??100)*.6,food=carriedFood(s.people[b.lineage||b.id]||b,b.inventory)+cargoFood;
 const safe=healthy&&energy>24+wait*.15&&hunger<65&&(food>0||wait<=12);
 if(path.length>1&&energy>=40&&(!safe||cost*(1.5-curiosity)<wait))return {kind:'bypass',path};
 if(safe&&wait<=(carrier?48:36)&&s.tick-(k.waitSince??s.tick)<(carrier?72:48)){k.waitSince??=s.tick;spend(b,.15);return {kind:'wait',expected:k.expectedOpen};}
 k.deferredUntil=Math.max(s.tick+8,Math.min(s.tick+96,k.expectedOpen));return {kind:'defer',until:k.deferredUntil};
}
export function fordDetour(s,b,holder,target,original){const d=holder?.fordDetour;if(!d||d.target!==target)return original;const i=d.path.indexOf(b.area),path=d.path.slice(i);if(i<0||path.at(-1)!==target||path.slice(1).some((id,n)=>!s.areas[path[n]]?.links.includes(id))){delete holder.fordDetour;return original;}return path;}
