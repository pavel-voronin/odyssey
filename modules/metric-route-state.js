import {causewayCargoLoad} from './causeway-state.js';
import {carriedRemains} from './remains-mass.js';import {remainsCarryLoad} from './remains-carry-state.js';
import {peopleCarryLoad,carryingPerson} from './people-carry-state.js';
// A route gap is separate from each scene's physical exit/entrance. No reader creates one.
export const metricKey=(a,b)=>[a,b].sort().join('|');
export function newMetricRoute(a,b){
 const types=[a.type,b.type],terrain=types.includes('mountain')?'mountain':types.includes('desert')?'sand':types.includes('forest')?'trail':'road';
 return {version:1,unit:'world',distance:Math.max(12,Math.round(Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y))),terrain,speed:6};
}
export const terrainPace=t=>({road:1,trail:.85,sand:.8,mountain:.7}[t]||1);
export const roadPriceKey=table=>JSON.stringify(Object.entries(table).map(([id,{seen,source,...q}])=>[id,q]));
export function routeLoad(s,body,{cargoFood=0,personalOnly=false}={}){
 const corpse=carriedRemains(s,body.lineage||body.id);if(corpse)return remainsCarryLoad(s,s.people[body.lineage||body.id],corpse);const passenger=carryingPerson(s,body);if(passenger)return peopleCarryLoad(s,body,passenger);
 const id=body.lineage||body.id,h=body.lineage?body:s.actorStates?.[id],p=s.people?.[id],inventory=h?.inventory||p?.actorLink?.inventory||{},items=h?.bag||p?.looseItems||[];
 const pets=body.lineage?body.companions||[]:p?.pets||[],scale=Math.max(.5,Math.min(6,(s.areas[body.area]?.length||100)/100)),petCargo=pets.reduce((n,c)=>{const b=c.packCargo?.body;return n+(c.hp>0&&b?.area===body.area&&Math.abs(b.x-body.x)*scale<=2?(c.packCargo.items?.length||0):0);},0);
 return Math.max(0,causewayCargoLoad(s,id)+(inventory.rations||0)+(inventory.herbs||0)*.1+(inventory.relics||0)*2+items.length+(personalOnly?0:petCargo)+Math.max(0,cargoFood)/4);
}
export function personalRouteLoad(s,body,options={}){const id=body.lineage||body.id,p=s.people[id],base=routeLoad(s,body,{...options,personalOnly:true});return carriedRemains(s,id)||carryingPerson(s,body)?base:base+(p?.roadSupplies?.food||0)/4+(p?.roadSupplies?.medicine||0)*.1+(p?.marketCargo?.tools||0)+(p?.goodsRawCargo?.quantity||0);}
export function metricRate(metric,weather={speed:1,energy:1},load=0,stride=1,{athletics=0,carrying=0,personalLoad=load}={}){
 const penalty=Math.min(1,Math.max(0,load)/30),burden=1+penalty-penalty*Math.min(1,Math.max(0,personalLoad)/Math.max(.001,load))*carrying,terrain=terrainPace(metric.terrain);
 return {speed:metric.speed*(1+athletics)*terrain*(weather.speed??1)*Math.max(.1,stride)/burden,energy:.7*(weather.energy??1)*burden/terrain*(1+athletics)*(1-.75*athletics)};
}
export function rememberRoadPrice(s,table,from,to){
 const edge=s.edges?.[metricKey(from,to)];if(!edge||!edge.metric&&!s.geographyFrame)return;
 table[metricKey(from,to)]={version:1,seen:s.tick,source:'local-road',distance:null,terrain:null,speed:null,...edge.metric,mode:edge.mode,duration:edge.duration,cost:edge.cost,revision:edge.spatial?.revision||1};
}
export function initialWaterPreference(s,h){
 if(s.rules?.['geography-frame']===false||s.rules?.psychology===false||!s.geographyFrame||h.mind.type!=='anxious')return;
 h.routePreferences={water:{version:1,source:'birth-trait',trait:'anxious',at:s.tick,person:h.lineage,aversion:1}};
}
