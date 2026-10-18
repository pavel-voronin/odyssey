import {spatialAddress,spatialPassage,actorSpatialAddress} from './modules/spatial.js';
import {knownArea,knownRoad} from './actor-atlas.js';
export const MAP_SCOPES=['overview','region','local'];
export const SCOPE_NAMES={overview:'Общий вид',region:'Округ',local:'Тропы'};
export const MAP_BODY_NAMES={elsewhere:'Персонаж в другом слое',unmapped:'Персонаж вне показанных мест',transit:'Персонаж в пути',dead:'Наблюдаемая жизнь завершилась'};
const realmNames={surface:'Поверхность',underground:'Подземье',dream:'Сновидение',clockwork:'Мир механизмов'};
export function mapLayerName(layer){return (realmNames[layer.realm]||'Иной мир')+(layer.era?` · эпоха ${layer.era>0?'+':''}${layer.era}`:'');}
const supported=a=>!a?.spatial?.attachment||a.dungeon&&a.spatial.attachment.source==='delve-gate';
export function knownMapLayers(s){
 const layers=new Map();for(const id of s.hero.atlas.known){const a=s.areas[id],layer=a&&s.spatial?.layers[a.spatial?.layer];if(!layer||!supported(a)||spatialAddress(s,id,50).status!=='known')continue;layers.set(layer.id,{...layer,name:mapLayerName(layer)});}
 return [...layers.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
}
export function mapScopeProposal(s){const a=s.areas[s.hero.area],tier=a?.geography?.tier;return tier==='city'||tier==='port'||a?.type==='road'?'overview':tier==='district-center'||a?.type==='village'||a?.type==='port'||a?.type==='citadel'||a?.type==='undercity'?'region':'local';}
function hierarchy(a){if(['city','port','district-center'].includes(a.geography?.tier)||['port','citadel','undercity'].includes(a.type)||a.city===a.id&&a.districts?.length>1)return 0;return a.type==='road'||a.type==='village'?1:2;}
export function roadMapModel(s,{inspect=false,scope=mapScopeProposal(s),layer='current'}={}){
 const h=s.hero,a=s.areas[h.area];
 if(!a||!inspect&&(!h.alive||h.life?.ended||h.combat||h.transit||h.lastAction!=='walk'||a.interior||a.temporaryCamp||a.dungeon||!['road','forest','desert','mountain','island'].includes(a.type)||h.goal?.area===a.id))return null;
 const address=actorSpatialAddress(s),currentLayer=address.layer||a.spatial?.layer,layers=knownMapLayers(s);
 if(!inspect&&(address.status!=='known'||!address.point||address.precision!=='scene'))return null;
 const selected=layer!=='current'&&layers.some(l=>l.id===layer)?layer:currentLayer;if(!layers.some(l=>l.id===selected))return null;
 if(!MAP_SCOPES.includes(scope))scope='region';
 const all=new Map();for(const id of h.atlas.known){const place=s.areas[id];if(!place||!knownArea(s,id)||!supported(place))continue;const p=spatialAddress(s,id,50);if(p.status!=='known')continue;const start=spatialAddress(s,id,0),end=spatialAddress(s,id,100);all.set(id,{id,name:place.name,type:place.type,point:p.point,segment:[start.point,end.point],revision:place.spatial.revision,layer:p.layer,priority:hierarchy(place),entrance:Boolean(place.spatial.attachment)});}
 const nodes=[...all.values()].filter(n=>n.layer===selected),roads=[],connectors=[],seen=new Set();if(!nodes.length)return null;
 for(const node of all.values())for(const to of s.areas[node.id].links){const key=[node.id,to].sort().join('|');if(seen.has(key)||!all.has(to)||!knownRoad(s,node.id,to))continue;seen.add(key);const p=spatialPassage(s,key);if(p.status!=='known')continue;
  if(p.crossLayer){const from=p.ends.find(e=>e.address.layer===selected),other=p.ends.find(e=>e.address.layer!==selected);if(from&&other){const target=layers.find(l=>l.id===other.address.layer);connectors.push({id:p.id,revision:p.revision,kind:p.kind,from:from.area,to:other.area,point:from.address.point,layer:other.address.layer,name:target?.name||'Иной слой'});}continue;}
  if(p.ends[0].address.layer===selected)roads.push({id:p.id,revision:p.revision,kind:p.kind,areas:p.ends.map(e=>e.area),ends:p.ends.map(e=>e.address.point),priority:p.kind==='sea'?0:Math.min(node.priority,all.get(to).priority)});
 }
 const threshold={overview:0,region:1,local:2}[scope];for(const n of nodes)n.labelVisible=n.priority<=threshold||n.id===a.id||connectors.some(c=>c.from===n.id);
 const body=!h.alive?'dead':h.transit?'transit':address.layer!==selected?'elsewhere':address.status!=='known'||address.precision!=='scene'||!nodes.some(n=>n.id===a.id)?'unmapped':'here';
 const topology=JSON.stringify([s.seed,selected,scope,nodes,roads,connectors]);return {scheme:'schematic-v1',scope,layer:selected,layers,layerName:layers.find(l=>l.id===selected).name,body,area:a.id,nodes,roads,connectors,topology,marker:body==='here'?{...address.point,name:h.name,actor:h.lineage,localX:h.x,facing:h.facing}:null};
}
