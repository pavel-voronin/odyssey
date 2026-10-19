import {enabled} from '../rules.js';
import {climateId} from '../calendar.js';
export const harvestFailureOn=s=>enabled(s,'harvest-failure')&&enabled(s,'supply');
export const harvestZone=(s,area)=>{const a=s.areas?.[area.city]||area;return [a.geography?.region||a.continent||a.id,a.realm||'surface',a.era||0,climateId(s,a)].join('/');};
export function localHarvestFailure(s,a,tick=s.tick){
 if(!harvestFailureOn(s)||!a||a.interior)return null;
 return s.harvestFailures?.events.findLast(e=>e.at<=tick&&tick<e.until&&e.zone===harvestZone(s,a))||null;
}
export const harvestFactor=(s,a)=>localHarvestFailure(s,a)?.factor??1;
export function localHarvestRecovery(s,a){
 if(!harvestFailureOn(s)||!a||a.interior)return null;
 return s.harvestFailures?.events.findLast(e=>e.ended&&e.until<=s.tick&&s.tick-e.ended.at<=240&&e.zone===harvestZone(s,a))||null;
}
