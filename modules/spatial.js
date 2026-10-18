import {geographyAnchor} from './geography-anchor.js';
import {rootWorld} from '../world-ref.js';
import {areaScale} from '../geometry.js';
import {personLocation} from '../person-location.js';
import {selfDrivenActor} from '../actor-projection.js';

const pct=x=>Number.isFinite(x)&&x>=0&&x<=100;
const key=(a,b)=>[a,b].sort().join('|');
const layerId=a=>`schematic/${encodeURIComponent(a.realm||'surface')}/${a.era??0}`;
function hash(seed,text){let h=seed>>>0;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
function registry(s){const r=s.spatial ||= {version:1,scheme:'schematic-v1',revision:0,layers:{}};if(r.version===1){r.layers ||= {};r.revision ??=0;}return r;}
function rootAnchor(s,a){
 const n=/^a\d+$/.test(a.id)?Number(a.id.slice(1)):hash(s.seed,a.id),c=/^c\d+$/.test(a.continent||'')?Number(a.continent.slice(1)):hash(s.seed,a.continent||'c0')%1024;
 return {id:'place/'+a.id,x:c*8192+(n%32)*160+(hash(s.seed,a.id+'/x')%9),y:Math.floor(n/32)*128+(hash(s.seed,a.id+'/y')%9),unit:'diagram'};
}
function boundary(from,to){return Number(to.slice(1))>Number(from.slice(1))?100:0;}
function attachment(s,a){
 if(a.interior){const i=a.interior,parent=s.areas[i.parent],door=parent?.objects.find(o=>o.id===i.building&&o.hall===a.id||o.to===a.id&&o.kind==='door');return {kind:i.kind||'interior',source:'interior',parent:i.parent??null,entrance:pct(i.entrance)?i.entrance:pct(door?.x)?door.x:null,localEntry:8,building:i.building??null};}
 if(a.temporaryCamp){const site=a.temporaryCamp.site;return {kind:'camp',source:'camp',parent:a.temporaryCamp.parent??null,entrance:site?.version===1&&pct(site.parentX)?site.parentX:null,localEntry:site?.version===1&&pct(site.localEntry)?site.localEntry:68};}
 if(a.dungeon){const candidates=Object.values(s.areas).filter(p=>p.id!==a.id&&(a.dungeon.root===a.id?p.delveGate===a.id:p.dungeon?.root===a.dungeon.root&&p.dungeon.next===a.id)&&p.links.includes(a.id)&&a.links.includes(p.id));const parent=candidates.length===1?candidates[0].id:null;return {kind:'dungeon',source:a.dungeon.root===a.id?'delve-gate':'delve-next',parent,entrance:parent?boundary(parent,a.id):null,localEntry:parent?(boundary(parent,a.id)===100?5:95):null,root:a.dungeon.root??null,floor:a.dungeon.floor??null};}
 return null;
}
export function registerSpatialArea(input,area){
 const s=rootWorld(input),a=typeof area==='string'?s.areas[area]:area;if(!a||s.areas[a.id]!==a||a.spatial&&a.spatial.version!==1)return;
 const world=registry(s);if(world.version!==1)return;
 const layer=layerId(a),attach=attachment(s,a),continent=a.continent||'c0',settlement=a.city||null,signature=JSON.stringify([layer,continent,settlement,attach,...(a.geography?[a.geography,geographyAnchor(s,a)]:[])]);
 world.layers[layer] ||= {id:layer,realm:a.realm||'surface',era:a.era??0,scheme:'schematic-v1',unit:'diagram'};
 if(a.spatial?.signature===signature)return a.spatial;
 const old=a.spatial;a.spatial={version:1,revision:(old?.revision||0)+1,layer,continent,settlement,scheme:'schematic-v1',signature,...(attach?{attachment:attach}:{anchor:geographyAnchor(s,a)||old?.anchor||rootAnchor(s,a)})};world.revision++;
 // Refresh only real incident passages when this writer changes a place, never a full per-tick graph scan.
 if(old)for(const to of a.links||[])if(s.edges?.[key(a.id,to)])registerSpatialEdge(s,key(a.id,to));
 return a.spatial;
}
function end(s,a,b){
 const aa=a.spatial?.attachment,ba=b.spatial?.attachment;
 if(aa?.parent===b.id)return {area:a.id,departureX:aa.localEntry,arrivalX:aa.localEntry};
 if(ba?.parent===a.id)return {area:a.id,departureX:ba.entrance,arrivalX:ba.entrance};
 const departureX=boundary(a.id,b.id);return {area:a.id,departureX,arrivalX:departureX===100?95:5};
}
export function registerSpatialEdge(input,id){
 const s=rootWorld(input),e=s.edges?.[id];if(!e||e.spatial&&e.spatial.version!==1)return;
 const a=s.areas[e.a],b=s.areas[e.b];if(!a||!b)return;
 registerSpatialArea(s,a);registerSpatialArea(s,b);const world=registry(s);if(world.version!==1||a.spatial?.version!==1||b.spatial?.version!==1)return;
 const ends=[{...end(s,a,b),areaRevision:a.spatial.revision},{...end(s,b,a),areaRevision:b.spatial.revision}],cross=a.spatial.layer!==b.spatial.layer||a.spatial.continent!==b.spatial.continent,attached=a.spatial.attachment?.parent===b.id?a.spatial.attachment:b.spatial.attachment?.parent===a.id?b.spatial.attachment:null;
 const kind=e.mode==='road'?(attached?.kind==='camp'?'camp':cross?'legacy-connector':'road'):e.mode||'road';
 const signature=JSON.stringify([e.a,e.b,e.mode,e.duration,e.cost,kind,ends,...(e.metric?[e.metric]:[])]);if(e.spatial?.signature===signature)return e.spatial;
 e.spatial={version:1,id:'edge/'+id,revision:(e.spatial?.revision||0)+1,kind,scheme:'schematic-v1',ends,signature};world.revision++;return e.spatial;
}
// Called by actual world writers, never by a renderer/address query.
export function initializeSpatial(input,{force=false}={}){
 const s=rootWorld(input),world=registry(s);if(world.version!==1||world.initialized&&!force)return;
 for(const a of Object.values(s.areas))registerSpatialArea(s,a);
 for(const id of Object.keys(s.edges||{}))registerSpatialEdge(s,id);
 world.initialized=true;
}
function unknown(area,x,reason){return {version:1,status:'unknown',reason,scene:{area,x},point:null};}
export function spatialAddress(input,id,x=50){
 const s=rootWorld(input),first=s.areas[id];if(!first||!pct(x))return unknown(id,x,'invalid-scene');if(s.spatial?.version!==1)return unknown(id,x,'unsupported-world');
 const scene={area:id,x,physicalLength:100*areaScale(first)},seen=new Set(),chain=[];let a=first,precision='scene',rootX=x;
 while(a){
  if(seen.has(a.id))return unknown(id,x,'parent-cycle');seen.add(a.id);
  const p=a.spatial;if(!p||p.version!==1||!s.spatial?.layers?.[p.layer]||p.layer!==layerId(a)||p.continent!==(a.continent||'c0'))return unknown(id,x,'unregistered-place');
  if(a.city&&a.city!==a.id&&!s.areas[a.city])return unknown(id,x,'missing-settlement');
  if(!p.attachment){if(!p.anchor||!Number.isFinite(p.anchor.x)||!Number.isFinite(p.anchor.y))return unknown(id,x,'invalid-anchor');const center=p.anchor,point={x:center.x+(rootX-50)*(center.sceneScale??1.2),y:center.y,unit:'diagram'};return {version:1,status:precision==='area'?'partial':'known',scheme:'schematic-v1',layer:first.spatial.layer,continent:first.spatial.continent,anchor:center.id,scene,point,precision,attachments:chain};}
  const actual=attachment(s,a),ref=p.attachment;if(JSON.stringify(actual)!==JSON.stringify(ref))return unknown(id,x,'changed-parent');
  const parent=s.areas[ref.parent];if(!parent||!parent.links.includes(a.id)||!a.links.includes(parent.id))return unknown(id,x,'missing-parent');
  chain.push({area:a.id,...ref});rootX=pct(ref.entrance)?ref.entrance:50;if(!pct(ref.entrance))precision='area';else if(precision!=='area')precision='entrance';a=parent;
 }
 return unknown(id,x,'missing-parent');
}
export function spatialPassage(input,id){
 const s=rootWorld(input),e=s.edges?.[id],p=e?.spatial;if(!p||p.version!==1)return {status:'unknown',reason:'unregistered-edge',edge:id};
 if(JSON.stringify([e.a,e.b,e.mode,e.duration,e.cost,p.kind,p.ends,...(e.metric?[e.metric]:[])])!==p.signature)return {status:'unknown',reason:'changed-edge',edge:id};
 if(!s.areas[e.a]?.links.includes(e.b)||!s.areas[e.b]?.links.includes(e.a))return {status:'unknown',reason:'broken-edge',edge:id};
 if(p.ends.some(end=>s.areas[end.area]?.spatial?.revision!==end.areaRevision))return {status:'unknown',reason:'changed-endpoint',edge:id};
 const ends=p.ends.map(end=>({area:end.area,departureX:end.departureX,arrivalX:end.arrivalX,address:spatialAddress(s,end.area,pct(end.departureX)?end.departureX:50)}));
 return {status:ends.some(e=>e.address.status==='unknown')?'unknown':ends.some(e=>!pct(e.departureX)||e.address.status==='partial')?'partial':'known',id:p.id,revision:p.revision,kind:p.kind,mode:e.mode,scheme:p.scheme,ends,duration:e.duration,cost:e.cost,worldDistance:e.metric?.distance??null,spatialUnit:'diagram',...(e.metric?{distanceUnit:e.metric.unit}:{}),crossLayer:ends[0].address.layer!==ends[1].address.layer};
}
export function actorSpatialAddress(input,h=input.hero){
 const s=rootWorld(input);if(!h)return unknown(null,null,'missing-actor');
 // NPC/group presence belongs to its existing controller, not the last drawn scene.
 const location=h.alive&&!selfDrivenActor(s,h)&&s.people[h.lineage]?personLocation(s,h.lineage):h;
 if(!location)return unknown(null,null,'missing-presence');
 if(location.transit){const t=location.transit;if(t.unknown)return unknown(null,null,'unknown-transit');const id=key(t.from,t.to),passage=spatialPassage(s,id);return {version:1,status:passage.status==='unknown'?'unknown':'partial',kind:'transit',actor:h.lineage,edge:passage.id||null,from:t.from,to:t.to,mode:t.mode??null,scene:null,point:null,physicalProgress:t.metric?{travelled:t.metric.travelled,distance:t.metric.distance,unit:t.metric.unit}:null,departureVersion:t.metric?.departureVersion??null,geometryBasis:t.metric?'departure-snapshot':'current-edge',time:{remaining:t.remaining??null,total:t.total??null,unit:'tick'},passage};}
 return {...spatialAddress(s,location.area,location.x),kind:'scene',actor:h.lineage};
}
