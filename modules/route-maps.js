import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {initializeNPCKnowledge,npcKnownRoute,roadStillPresent} from './npc-knowledge.js';
import {partyBodySpent} from './party-combat-policy.js';

const on=s=>enabled(s,'route-maps');
export const routeMapMemory=p=>(p.routeMaps ||= {version:1,serial:0,notes:[],documents:[],lastActionTick:-1});
const actor=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
const wallet=(s,p)=>actor(s,p)?.gold??p.agenda.wealth;
function body(s,p){const h=actor(s,p);return h?(h.transit?null:{area:h.area,x:h.x}):localContact(s,p.id,p.area);}
const specialist=(s,p)=>p.agenda?.job==='scholar'||['scholar','ranger','sailor'].includes(actor(s,p)?.profession);
const signature=n=>n.key+'/'+(n.employment?`${n.employment.area}/${n.employment.available}`:'road');
function remember(p,n){const m=routeMapMemory(p),i=m.notes.findIndex(old=>old.key===n.key);if(i<0)m.notes.push(n);else m.notes[i]=n;if(m.notes.length>32)m.notes.shift();}
export function observeRouteMap(s,p){
 const b=p&&body(s,p);if(!on(s)||!p?.alive||p.needs?.sleeping||!b||!specialist(s,p))return;
 const a=s.areas[b.area];if(!a||a.temporaryCamp||a.interior)return;
 for(const to of a.links){if(!roadStillPresent(s,a.id,to))continue;const key=[a.id,to].sort().join('|'),old=p.routeMaps?.notes.find(n=>n.key===key);
  const employment=a.civic&&physicalDistance(a,b.x,42)<=18?{area:a.id,available:a.civic.treasury>=12,at:s.tick,source:p.id}:old?.employment;
  remember(p,{key,from:a.id,to,fromName:a.name,toName:s.areas[to].name,at:s.tick,source:{kind:'visit',person:p.id,origin:p.id},...(employment?{employment:{...employment}}:{})});
 }
}
export function hearRouteMapReport(s,from,to,key){
 const p=s.people[from],q=s.people[to],a=p&&body(s,p),b=q&&body(s,q),n=p?.routeMaps?.notes.find(n=>n.key===key);
 if(!on(s)||!n||!p.alive||!q?.alive||p.needs?.sleeping||q.needs?.sleeping||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12)return false;
 const old=q.routeMaps?.notes.find(k=>k.key===key);if(old&&old.at>=n.at)return false;
 remember(q,{...structuredClone(n),source:{kind:'report',person:from,origin:n.source.origin}});return true;
}
export function shareRouteMapReports(s,from,to){const q=s.people[to];if(!on(s)||!q||!specialist(s,q))return;for(const n of s.people[from]?.routeMaps?.notes||[])hearRouteMapReport(s,from,to,n.key);}
export function writeRouteMap(s,p,key){
 const b=p&&body(s,p),h=p&&actor(s,p),n=p?.routeMaps?.notes.find(n=>n.key===key),energy=h?.energy??p?.needs?.energy;
 if(!on(s)||!p?.alive||!b||p.needs?.sleeping||partyBodySpent(s,p)||!n||!specialist(s,p)||energy<35)return null;
 const m=routeMapMemory(p);if(m.documents.length>=8||m.documents.some(d=>signature(d.route)===signature(n)))return null;
 const d={version:1,id:`route-map/${p.id}/${++m.serial}`,owner:p.id,author:p.id,written:s.tick,route:structuredClone(n)};m.documents.push(d);m.lastActionTick=s.tick;if(h)h.energy-=2;else p.needs.energy-=2;return d;
}
function roadKnown(s,p,n){const h=actor(s,p);return h?h.atlas.roads.includes(n.key):p.navigation?.roads.some(r=>r.key===n.key);}
function knownWay(s,p,from,to){const h=actor(s,p);if(!h)return npcKnownRoute(p,from,to).length>0;const queue=[from],seen=new Set(queue);for(const id of queue){if(id===to)return true;for(const key of h.atlas.roads){const [a,b]=key.split('|'),next=a===id?b:b===id?a:null;if(next&&!seen.has(next)&&h.atlas.known.includes(next)){seen.add(next);queue.push(next);}}}return false;}
export function routeMapDemand(s,p,d){
 const b=p&&body(s,p),h=p&&actor(s,p),service=d?.route?.employment,n=d?.route;
 if(!on(s)||!p?.alive||p.needs?.sleeping||!b||!n||d.owner===p.id||!service||service.area===b.area||!(h?h.career.path==='peaceful':['artisan','merchant'].includes(p.agenda.job)))return false;
 const old=h?h.memory.services?.[service.area+'/employment']:p.navigation?.places.find(k=>k.area===service.area);
 const oldAvailable=h?old?.available:old?.payroll;
 const latest=(h?old?.seen:old?.workSeen)??-1;
 if(oldAvailable!==undefined&&oldAvailable!==service.available&&service.at<=latest)return false;
 if(!service.available)return oldAvailable===true;
 if(!(s.areas[b.area]?.civic?.treasury<12))return false;
 const entry=n.from===service.area?n.to:n.from,reachable=knownWay(s,p,b.area,entry);
 return reachable&&(!roadKnown(s,p,n)||oldAvailable!==true);
}
export function buyRouteMap(s,buyer,sellerId,mapId,ctx){
 const seller=s.people[sellerId],d=seller?.routeMaps?.documents.find(d=>d.id===mapId&&d.owner===sellerId),a=buyer&&body(s,buyer),b=seller&&body(s,seller),h=buyer&&actor(s,buyer);
 if(!on(s)||!seller?.alive||seller.needs?.sleeping||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12||partyBodySpent(s,buyer)||!routeMapDemand(s,buyer,d)||wallet(s,buyer)<7||h&&(s.hero.lineage!==buyer.id||!ctx?.maySpend?.(s,'map',3,ctx)))return false;
 setActorMoney(s,buyer,wallet(s,buyer)-3);setActorMoney(s,seller,wallet(s,seller)+3);const n=d.route;
 initializeNPCKnowledge(s,buyer);for(const [area,name]of [[n.from,n.fromName],[n.to,n.toName]])if(!buyer.navigation.places.some(k=>k.area===area))buyer.navigation.places.push({area,name,seen:n.at});
 const roads=buyer.navigation.roads;if(!roads.some(r=>r.key===n.key))roads.push({key:n.key,from:n.from,to:n.to,seen:n.at});
 const place=buyer.navigation.places.find(k=>k.area===n.employment.area);if((place.workSeen??-1)<=n.employment.at)Object.assign(place,{payroll:n.employment.available,workSeen:n.employment.at,map:d.id,source:n.employment.source});
 if(h){for(const id of [n.from,n.to])if(!h.atlas.known.includes(id))h.atlas.known.push(id);if(!h.atlas.roads.includes(n.key))h.atlas.roads.push(n.key);h.memory.services ||= {};const key=n.employment.area+'/employment';if((h.memory.services[key]?.seen??-1)<=n.employment.at)h.memory.services[key]={version:1,area:n.employment.area,kind:'employment',available:n.employment.available,provider:null,reason:null,seen:n.employment.at,map:d.id,source:n.employment.source};}
 const m=routeMapMemory(buyer);m.lastActionTick=s.tick;remember(buyer,{...structuredClone(n),source:{kind:'report',person:sellerId,origin:n.source.origin}});
 ctx?.log?.(s,`${buyer.name} покупает у ${seller.name} за ◈3 карту: ${n.fromName} — ${n.toName}. Сведения датированы тиком ${n.at}; источник — ${s.people[n.source.origin].name}.`,'trade');return true;
}
function offer(s,p){
 const b=body(s,p);if(!b)return null;const a=s.areas[b.area];
 for(const id of new Set([...(a.population||[]),...a.objects.filter(o=>o.person).map(o=>o.person)])){
  const q=s.people[id],at=q&&body(s,q);if(!q?.alive||q.id===p.id||!at||at.area!==b.area||physicalDistance(a,b.x,at.x)>30||q.needs?.sleeping)continue;
  const d=q.routeMaps?.documents.find(d=>d.owner===q.id&&routeMapDemand(s,p,d));if(d&&wallet(s,p)>=7)return {seller:id,map:d.id,x:at.x};
 }return null;
}
function unwritten(p){return p.routeMaps?.notes.find(n=>n.employment&&!p.routeMaps.documents.some(d=>signature(d.route)===signature(n)));}
export function routeMapPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!on(s)||h.transit||h.combat||h.energy<35||h.hunger>60||partyBodySpent(s,p))return false;
 const o=offer(s,p);if(o&&ctx.maySpend?.(s,'map',3,ctx)){ctx.goal(s,'routeMap',h.area,o.x,'Купить недостающую карту пути','У местного автора есть датированные сведения о другом месте работы.',o);return true;}
 const n=specialist(s,p)&&unwritten(p);if(n&&p.routeMaps.documents.length<8){ctx.goal(s,'routeMap',h.area,h.x,'Записать проверенный маршрут','Наблюдение станет картой с датой и источником.',{write:n.key});return true;}return false;
}
export function routeMapAction(s,ctx){const h=s.hero,g=h.goal,p=s.people[h.lineage];if(g?.kind!=='routeMap')return false;const done=g.write?writeRouteMap(s,p,g.write):buyRouteMap(s,p,g.seller,g.map,ctx);h.goal=null;if(done){h.lastAction=g.write?'work':'trade';if(g.write)ctx.log(s,'Герой записывает маршрут по собственным наблюдениям. Карта сохраняет дату и автора.','work');}return Boolean(done);}
export function npcRouteMapPlan(s,p){if(!on(s)||p.needs?.energy<35)return null;const o=offer(s,p);if(o)return {kind:'routeMap',target:p.area,x:o.x,remaining:1,...o};const n=specialist(s,p)&&unwritten(p);return n&&p.routeMaps.documents.length<8?{kind:'routeMap',target:p.area,x:p.x,remaining:1,write:n.key}:null;}
export function npcRouteMapAction(s,p,t,ctx){return t.write?writeRouteMap(s,p,t.write):buyRouteMap(s,p,t.seller,t.map,ctx);}
