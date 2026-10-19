import {quakeBlocked,quakeTravelLimit,quakeDamage} from './quake-state.js';
import {wagonRate,wagonMoved} from './wagon-state.js';
import {recordCrossingTrace} from './edge-traces.js';
import {groupHorse,horseMotion,ridingOn} from './horse-state.js';
import {metricMap,metricMapPoint} from './metric-map.js';
import {weatherAt} from './weather.js';
import {woundStride} from './wound-state.js';
import {metricKey,metricRate,routeLoad} from './metric-route-state.js';
import {physicalDistance} from '../geometry.js';
const pets=b=>b.lineage?b.companions||[]:b.pets||[],petBody=c=>c.packCargo?.body||c.petCustody?.body;
export function metricTravelRate(s,body,metric,options={}){const weather=weatherAt(s,s.areas[body.area]),foot=metricRate(metric,weather,routeLoad(s,body,options),woundStride(s,s.people[body.lineage||body.id])),mount=ridingOn(s)&&groupHorse(s,body);const groupFoot={...foot,speed:Math.min(foot.speed,...(body.companions||[]).filter(c=>c.person&&s.people[c.person]?.alive).map(c=>metricRate(metric,weather,0,woundStride(s,s.people[c.person])).speed))};const wagon=wagonRate(s,body,metric,groupFoot,weather,mount?horseMotion(s,body,mount,weather):null);if(wagon)return {...wagon,...(mount?{mount,mountEnergy:1.2*(weather.energy??1)}:{})};if(!mount)return (body.bodyCarry?.stage==='carrying'||body.remainsCarry?.stage==='carrying')?{...foot,energy:foot.energy+1}:foot;const rate=horseMotion(s,body,mount,weather,{mounted:mount.rider===(body.lineage||body.id),terrain:metric.terrain});return {speed:mount.rider?rate.speed:Math.min(foot.speed,rate.speed),energy:mount.rider ? .2 : foot.energy,mount,mountEnergy:rate.energy};}
export function roadCampWaypoint(s,body,t,speed){
 const energy=body.lineage?body.energy:body.needs.energy;if(energy>=20||s.rules.fieldcamp===false||s.rules['camp-sites']===false)return null;
 const edge=metricKey(t.from,t.to),e=s.edges[edge],m=t.metric,near=[];
 for(const a of Object.values(s.areas)){const q=a.routeSite;if(!a.fieldCamp||!q||q.edge!==edge||q.distance!==m.distance)continue;const at=t.from===e.a?q.position:m.distance-q.position,gap=Math.abs(at-m.travelled);if(gap<.000001||gap>speed)continue;const point=metricMapPoint(s,t,at)?.point;if(point&&Math.hypot(point.x-q.point.x,point.y-q.point.y)<.000001)near.push({at,gap,id:a.id});}
 near.sort((a,b)=>a.gap-b.gap||a.id.localeCompare(b.id));return near[0]?.at??null;
}
export function startMetricTravel(s,body,to,arrivalX,options={}){
 const edge=s.edges?.[metricKey(body.area,to)],m=edge?.metric;if(!m||quakeBlocked(s,body.area,to)||edge.mode!=='road'||s.rules?.travel===false||s.rules?.['geography-frame']===false)return null;
 const rate=metricTravelRate(s,body,m,options);if(rate.blocked)return null;const {speed,mount}=rate,total=Math.ceil(m.distance/speed);
 const map=metricMap(s,body.area,to,arrivalX),group=pets(body).filter(c=>c.uid&&c.hp>0&&c.petTraining&&petBody(c)?.area===body.area&&physicalDistance(s.areas[body.area],petBody(c).x,body.x)<=2).map(c=>c.uid);
 return {from:body.area,to,mode:'road',arrivalX,remaining:total,total,...(mount?{carrier:mount.id}:{}),metric:{...m,travelled:0,started:s.tick,lastTick:s.tick,departureX:body.x,departureVersion:edge.spatial?.revision||1,...(map?{map}:{})},...(group.length?{group}:{}),eventDone:true,crew:false};
}
export function advanceMetricTravel(s,body,t,options={}){
 const m=t.metric;if(m.lastTick===s.tick)return false;m.lastTick=s.tick;
 const rate=metricTravelRate(s,body,m,options),energy=body.lineage?body:body.needs;
 if(rate.blocked){if(body.lineage)body.lastAction='wait';return false;}
 const group=pets(body).filter(c=>t.group?.includes(c.uid)&&c.hp>0&&c.petTraining);
 if(rate.mount&&(rate.mount.energy<rate.mountEnergy||rate.mount.lastMove===s.tick||rate.mount.lastAction===s.tick)){m.restedAt=s.tick;if(body.lineage)body.lastAction='rest';return false;}
 if(energy&&energy.energy<rate.energy||group.some(c=>c.petTraining.energy<.5)){if(energy)energy.energy=Math.min(100,energy.energy+2);for(const c of group)c.petTraining.energy=Math.min(100,c.petTraining.energy+2);m.restedAt=s.tick;if(body.lineage)body.lastAction='rest';return false;}
 const waypoint=body.lineage||options.canCamp?roadCampWaypoint(s,body,t,rate.speed):null,next=quakeTravelLimit(s,t,waypoint??Math.min(m.distance,m.travelled+rate.speed)),walked=Math.abs(next-m.travelled);if(next===m.travelled&&quakeBlocked(s,t.from,t.to)){m.ruptureHold={cause:quakeDamage(s,t.from,t.to).cause,at:s.tick,point:m.travelled};if(body.lineage)body.lastAction='wait';return false;}m.travelled=next;t.remaining=Math.ceil(Math.max(0,m.distance-m.travelled)/rate.speed);
 if(rate.wagon)wagonMoved(s,rate.wagon);
 if(rate.mount){rate.mount.energy=Math.max(0,rate.mount.energy-rate.mountEnergy);rate.mount.hunger=Math.min(100,rate.mount.hunger+.12);rate.mount.lastMove=s.tick;}
 if(energy)energy.energy=Math.max(0,energy.energy-rate.energy);if(body.lineage)body.distance+=walked;
 if(t.remaining===0)recordCrossingTrace(s,{kind:'person',id:body.lineage||body.id},t.from,t.to);
 for(const c of group){c.petTraining.energy-=.5;if(t.remaining===0)recordCrossingTrace(s,{kind:'pet',id:c.uid,owner:body.lineage||body.id,pet:c},t.from,t.to);if(t.remaining===0){const b=petBody(c);b.area=t.to;b.x=t.arrivalX;if(c.packCargo)c.packCargo.lastKnown={area:b.area,x:b.x,at:s.tick,reason:'seen'};}}
 return t.remaining===0;
}
// The controller already owns this body's action. No location/cargo transfer here.
export function npcMetricGate(s,p,to,arrivalX,options={}){
 if(p.roadTransit){const crossing=p.roadTransit;if(advanceMetricTravel(s,p,crossing,options)){delete p.roadTransit;return {status:'arrived',crossing};}return {status:'crossing',crossing};}
 const crossing=startMetricTravel(s,p,to,arrivalX,options);if(!crossing)return s.edges?.[metricKey(p.area,to)]?.metric?{status:'unavailable'}:null;p.roadTransit=crossing;return {status:'crossing',crossing,started:true};
}
