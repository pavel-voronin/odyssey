import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
export function scentPlantKnown(s,h,a,o){return !enabled(s,'pet-training')||!o.scentCover||h.area===a.id&&!h.transit&&physicalDistance(a,h.x,o.x)<=9||Boolean(h.memory.scentPlants?.some(n=>n.area===a.id&&n.object===o.id));}
export function rememberScentPlant(s,h,a,o,dog=null){
 h.memory.scentPlants ||= [];const old=h.memory.scentPlants.find(n=>n.area===a.id&&n.object===o.id);const n={area:a.id,object:o.id,seen:s.tick,source:dog?'dog':'sight',dog};if(old)Object.assign(old,n);else h.memory.scentPlants.push(n);if(h.memory.scentPlants.length>24)h.memory.scentPlants.shift();
}
export function observeScentPlants(s){const h=s.hero;if(!enabled(s,'pet-training')||!h.alive||h.transit)return;const a=s.areas[h.area];for(const o of a.objects)if(o.kind==='herb'&&o.scentCover&&o.count>0&&physicalDistance(a,h.x,o.x)<=9&&!h.memory.scentPlants?.some(n=>n.area===a.id&&n.object===o.id))rememberScentPlant(s,h,a,o);}
