import {weatherAt} from './weather.js';
import {woundStride} from './wound-state.js';
import {metricKey,metricRate,routeLoad} from './metric-route-state.js';
import {physicalDistance} from '../geometry.js';
const pets=b=>b.lineage?b.companions||[]:b.pets||[],petBody=c=>c.packCargo?.body||c.petCustody?.body;
export function metricTravelRate(s,body,metric,options={}){return metricRate(metric,weatherAt(s,s.areas[body.area]),routeLoad(s,body,options),woundStride(s,s.people[body.lineage||body.id]));}
export function startMetricTravel(s,body,to,arrivalX,options={}){
 const edge=s.edges?.[metricKey(body.area,to)],m=edge?.metric;if(!m||edge.mode!=='road'||s.rules?.travel===false||s.rules?.['geography-frame']===false)return null;
 const {speed}=metricTravelRate(s,body,m,options),total=Math.ceil(m.distance/speed);
 const group=pets(body).filter(c=>c.uid&&c.hp>0&&c.petTraining&&petBody(c)?.area===body.area&&physicalDistance(s.areas[body.area],petBody(c).x,body.x)<=2).map(c=>c.uid);
 return {from:body.area,to,mode:'road',arrivalX,remaining:total,total,metric:{...m,travelled:0,started:s.tick,lastTick:s.tick,departureVersion:edge.spatial?.revision||1},...(group.length?{group}:{}),eventDone:true,crew:false};
}
export function advanceMetricTravel(s,body,t,options={}){
 const m=t.metric;if(m.lastTick===s.tick)return false;m.lastTick=s.tick;
 const rate=metricTravelRate(s,body,m,options),energy=body.lineage?body:body.needs;
 const group=pets(body).filter(c=>t.group?.includes(c.uid)&&c.hp>0&&c.petTraining);
 if(energy&&energy.energy<rate.energy||group.some(c=>c.petTraining.energy<.5)){if(energy)energy.energy=Math.min(100,energy.energy+2);for(const c of group)c.petTraining.energy=Math.min(100,c.petTraining.energy+2);m.restedAt=s.tick;if(body.lineage)body.lastAction='rest';return false;}
 const walked=Math.min(m.distance-m.travelled,rate.speed);m.travelled=Math.min(m.distance,m.travelled+walked);t.remaining=Math.ceil(Math.max(0,m.distance-m.travelled)/rate.speed);
 if(energy)energy.energy=Math.max(0,energy.energy-rate.energy);if(body.lineage)body.distance+=walked;
 for(const c of group){c.petTraining.energy-=.5;if(t.remaining===0){const b=petBody(c);b.area=t.to;b.x=t.arrivalX;if(c.packCargo)c.packCargo.lastKnown={area:b.area,x:b.x,at:s.tick,reason:'seen'};}}
 return t.remaining===0;
}
// The controller already owns this body's action. No location/cargo transfer here.
export function npcMetricGate(s,p,to,arrivalX,options={}){
 if(p.roadTransit){const crossing=p.roadTransit;if(advanceMetricTravel(s,p,crossing,options)){delete p.roadTransit;return {status:'arrived',crossing};}return {status:'crossing',crossing};}
 const crossing=startMetricTravel(s,p,to,arrivalX,options);if(!crossing)return s.edges?.[metricKey(p.area,to)]?.metric?{status:'unavailable'}:null;p.roadTransit=crossing;return {status:'crossing',crossing,started:true};
}
