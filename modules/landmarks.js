import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {spatialPassage} from './spatial.js';
import {weatherAt} from './weather.js';
import {areaAvoided} from './route-memory.js';
import {revealArea,revealRoad} from '../actor-atlas.js';

export const landmarksOn=s=>enabled(s,'landmarks')&&enabled(s,'scenery');
const surface=a=>a&&!a.interior&&!a.temporaryCamp&&(!a.realm||a.realm==='surface')&&!['cave','dungeon','undercity','sea','dream','clockwork'].includes(a.type);
// This is the outer structure of an existing ruin, not another area, treasure,
// enemy or RNG roll. Legacy ruins retain their actual objects and occupants.
export function towerProfile(s,a){
 if(!landmarksOn(s)||!surface(a)||a.type!=='ruins')return null;
 let hash=s.seed>>>0;for(const c of a.id+'/outer-tower')hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 return hash%4===0?{id:'tower/'+a.id,area:a.id,x:72,height:58+hash%17}:null;
}
export function visibleTowers(s){
 const h=s.hero,a=s.areas[h.area];if(!landmarksOn(s)||!h.alive||h.transit||!surface(a))return [];
 const weather=weatherAt(s,a).id;if(['fog','storm','snow'].includes(weather))return [];
 const range=weather==='rain'?7:18,ends=[];
 for(const id of a.links){const b=s.areas[id],profile=towerProfile(s,b),edge=s.edges?.[[a.id,id].sort().join('|')];if(!profile||!edge||edge.opaque||edge.visibility==='opaque'||(edge.mode||'road')!=='road'||b.continent!==a.continent||(b.era??0)!==(a.era??0))continue;
  const p=spatialPassage(s,[a.id,id].sort().join('|')),end=p.ends?.find(e=>e.area===a.id);if(p.status!=='known'||p.kind!=='road'||p.crossLayer||![0,100].includes(end?.departureX)||physicalDistance(a,h.x,end.departureX)>range)continue;
  // At a fork the outline is only a hypothesis. The real approach is examined
  // at the shared road end later, without inspecting the destination contents.
  ends.push({...profile,from:a.id,departureX:end.departureX,arrivalX:end.arrivalX});
 }
 return ends;
}
export function observeTowers(s,ctx){
 for(const tower of visibleTowers(s)){const memory=s.hero.memory.landmarks;if(memory?.some(m=>m.id===tower.id))continue;
  s.hero.memory.landmarks ||= [];s.hero.memory.landmarks.push({id:tower.id,area:tower.area,from:tower.from,x:tower.departureX,seen:s.tick,status:'seen'});if(s.hero.memory.landmarks.length>16)s.hero.memory.landmarks.shift();
  ctx.log(s,'Над дальним склоном видна старая башня. Кажется, к ней подходит эта дорога. Кто живёт внутри, неизвестно.','landmark');
 }
}
export function landmarkPlan(s,ctx){
 const h=s.hero;if(!landmarksOn(s)||h.personality.curiosity<.7||h.hp<h.maxHp*.8||h.energy<65||h.hunger>50||h.gold<14||h.quests.some(q=>q.status==='active')||h.delve||h.caravanJob||h.commitments?.personal?.status==='active'||s.storyCases?.some(c=>c.owner===h.lineage&&c.status==='active'))return false;
 const visible=visibleTowers(s).find(t=>h.memory.landmarks?.some(m=>m.id===t.id&&m.status==='seen')&&!h.memory.places.includes(t.area)&&!areaAvoided(s,t.area));if(!visible)return false;
 ctx.goal(s,'landmarkStudy',h.area,visible.departureX,'Изучить подход к башне','Силуэт заинтересовал его. Сначала нужно проверить дорогу; о том, что внутри, он пока ничего не знает.',{landmark:visible.id,targetArea:visible.area});return true;
}
export function landmarkTarget(s){
 const g=s.hero.goal;if(g?.kind!=='landmarkStudy')return true;
 if(s.hero.quests.some(q=>q.status==='active')||areaAvoided(s,g.targetArea)||!visibleTowers(s).some(t=>t.id===g.landmark&&t.area===g.targetArea)){s.hero.goal=null;return false;}return true;
}
export function landmarkStudy(s,ctx){
 const h=s.hero,g=h.goal;if(g?.kind!=='landmarkStudy')return false;const sight=visibleTowers(s).find(t=>t.id===g.landmark&&t.area===g.targetArea),memory=h.memory.landmarks?.find(m=>m.id===g.landmark);if(!sight||!memory||physicalDistance(s.areas[h.area],h.x,g.x)>1){h.goal=null;return false;}
 h.energy=Math.max(0,h.energy-1);h.lastAction='inspect';memory.status='approach';memory.examined=s.tick;revealArea(s,sight.area);revealRoad(s,h.area,sight.area);
 ctx.log(s,'У края дороги обнаруживается подход к той самой башне. Он проверил путь, но ещё не знает ни её обитателей, ни того, что осталось внутри.','landmark');
 ctx.goal(s,'explore',sight.area,8,'Пройти к замеченной башне','Он изучил настоящий подход. Дальше — обычная дорога, с неизвестными опасностями и без обещанной награды.',{landmark:sight.id});return true;
}
