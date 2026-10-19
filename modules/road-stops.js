import {metricTravelRate,roadCampWaypoint} from './metric-route.js';
import {metricMapPoint,routePointKey} from './metric-map.js';
import {walkCampOrder} from './camp-route.js';
import {observeNPCPlace} from './npc-knowledge.js';
const key=(a,b)=>[a,b].sort().join('|'),petBody=c=>c.packCargo?.body||c.petCustody?.body;
export function roadPosition(s,t){const e=s.edges[key(t.from,t.to)];return t.from===e.a?t.metric.travelled:t.metric.distance-t.metric.travelled;}
export function findRoadSite(s,t){const edge=key(t.from,t.to),position=roadPosition(s,t),mapped=metricMapPoint(s,t);return Object.values(s.areas).find(a=>a.routeSite?.edge===edge&&a.routeSite.distance===t.metric.distance&&Math.abs(a.routeSite.position-position)<.000001&&mapped&&Math.hypot(a.routeSite.point.x-mapped.point.x,a.routeSite.point.y-mapped.point.y)<.000001)||null;}
export function createRoadSite(s,t,ctx,source){
 const old=findRoadSite(s,t);if(old)return old;const mapped=metricMapPoint(s,t);if(!mapped)return null;const edge=key(t.from,t.to),e=s.edges[edge],a=s.areas[t.from],position=roadPosition(s,t),record={version:1,key:edge+'/'+Math.round(position*1e6),edge,from:e.a,to:e.b,distance:t.metric.distance,position,created:s.tick,layer:mapped.layer,point:{x:mapped.point.x,y:mapped.point.y},source};
 record.key=routePointKey(edge,record.distance,position,record.point);const id=ctx.addArea(s,a.realm==='underground'?'cave':'road','Привал на дороге',a.depth,{continent:a.continent,realm:a.realm,era:a.era,culture:a.culture,routeSite:record});return s.areas[id];
}
function moveGroup(h,t,area,x){for(const c of (h.lineage?h.companions:h.pets||[])){const b=petBody(c);if(t.group?.includes(c.uid)&&c.hp>0&&b){b.area=area;b.x=x;}}}
export function pauseHeroRoad(s,ctx,{reason='rest',source=s.hero.lineage}={}){
 const h=s.hero,t=h.transit;if(!h.alive||h.roadStop||!t?.metric||t.metric.travelled<=0||t.metric.travelled>=t.metric.distance)return false;
 const site=createRoadSite(s,t,ctx,{kind:reason,person:source,at:s.tick});if(!site)return false;
 h.roadStop={version:1,site:site.id,journey:t,goal:h.goal,intent:h.intent,reason:h.reason,action:h.action,entered:s.tick,cause:reason};h.transit=null;h.goal=null;h.x=50;moveGroup(h,t,site.id,50);ctx.enter(s,site.id);h.lastAction='idle';return true;
}
export function roadCampNeed(s,ctx){
 const h=s.hero;if(s.rules.fieldcamp===false||s.rules['camp-sites']===false||h.energy>=20||h.combat||!h.transit?.metric)return false;
 if(!findRoadSite(s,h.transit)&&roadCampWaypoint(s,h,h.transit,metricTravelRate(s,h,h.transit.metric).speed)!==null)return false;
 if(!pauseHeroRoad(s,ctx))return false;if(!ctx.planFieldCamp(s,ctx))ctx.goal(s,'rest',h.area,h.x,'Перевести дух у дороги','Пройденный участок сохранён. Сейчас нужно восстановить силы.');return true;
}
export function manageHeroRoadStop(s,ctx){const h=s.hero,q=h.roadStop;if(!h.alive||h.combat||!q||h.area!==q.site||h.goal&&[h.area,s.areas[h.area].fieldCamp].includes(h.goal.area))return false;if(!h.goal&&(h.energy<20||h.hp<h.maxHp*.6)&&s.rules.fieldcamp!==false&&ctx.planFieldCamp(s,ctx))return true;return resumeHeroRoad(s,ctx,{reverse:h.goal?.area===q.journey.from});}
export function resumeHeroRoad(s,ctx,{reverse=false}={}){
 const h=s.hero,stop=h.roadStop;if(!h.alive||h.combat||!stop||h.area!==stop.site)return false;const t=stop.journey,site=s.areas[stop.site],changed=h.goal,view={intent:h.intent,reason:h.reason,action:h.action};
 if(reverse){const departure=t.metric.departureX??(Number(t.to.slice(1))>Number(t.from.slice(1))?100:0),oldArrival=t.arrivalX,from=t.from;t.from=t.to;t.to=from;t.metric.travelled=t.metric.distance-t.metric.travelled;if(t.metric.map){const from=t.metric.map.from;t.metric.map.from=t.metric.map.to;t.metric.map.to=from;}t.arrivalX=departure;t.metric.departureX=oldArrival;}
 h.area=t.from;h.x=t.metric.departureX??(Number(t.to.slice(1))>Number(t.from.slice(1))?100:0);t.metric.lastTick=s.tick;h.transit=t;h.goal=reverse?changed:stop.goal;h.intent=reverse?view.intent:stop.intent;h.reason=reverse?view.reason:stop.reason;h.action=reverse?view.action:stop.action;t.savedIntent=h.intent;t.savedReason=h.reason;h.lastAction='travel';moveGroup(h,t,t.from,h.x);t.remaining=Math.ceil((t.metric.distance-t.metric.travelled)/metricTravelRate(s,h,t.metric).speed);delete h.roadStop;
 ctx.log(s,'Он возвращается на тот же дорожный участок и продолжает с места остановки.','travel',site.id);return true;
}
export function advanceNPCRoadCamp(s,p,ctx){
 if(!p.alive)return false;
 if(!p.roadStop){const t=p.roadTransit;if(!t?.metric||p.needs.energy>=20||t.metric.travelled<=0||t.metric.travelled>=t.metric.distance)return false;const site=findRoadSite(s,t);if(!site)return false;
  p.roadStop={version:1,site:site.id,journey:t,entered:s.tick,phase:'enter'};delete p.roadTransit;p.area=site.id;p.x=50;moveGroup(p,t,site.id,50);observeNPCPlace(s,p);return true;
 }
 const q=p.roadStop,site=s.areas[q.site],camp=s.areas[site.fieldCamp];
 if(!camp){p.needs.energy=Math.min(100,p.needs.energy+2);if(p.needs.energy>=60)q.phase='leave';else return true;}
 if(q.phase==='enter'){
  const result=walkCampOrder(s,p,camp.id,68,{...ctx,route:()=>p.area===camp.id?[camp.id]:[site.id,camp.id]},q);
  if(result==='arrived')q.phase='rest';observeNPCPlace(s,p);return true;
 }
 if(q.phase==='rest'){const fire=camp.objects.some(o=>o.kind==='rest'&&!o.destroyed&&o.state!=='burned');p.needs.energy=Math.min(100,p.needs.energy+(fire?6:2));if(p.needs.energy>=60)q.phase='leave';return true;}
 if(p.area!==site.id||Math.abs(p.x-50)>.1){walkCampOrder(s,p,site.id,50,{...ctx,route:()=>p.area===site.id?[site.id]:[camp.id,site.id]},q);return true;}
 s.areas[p.area].objects=s.areas[p.area].objects.filter(o=>o.kind!=='resident'||o.person!==p.id);p.area=q.journey.from;p.x=q.journey.metric.departureX??(Number(q.journey.to.slice(1))>Number(p.area.slice(1))?100:0);p.roadTransit=q.journey;moveGroup(p,q.journey,p.area,p.x);p.roadTransit.metric.lastTick=s.tick;p.roadTransit.remaining=Math.ceil((p.roadTransit.metric.distance-p.roadTransit.metric.travelled)/metricTravelRate(s,p,p.roadTransit.metric).speed);delete p.roadStop;return true;
}
