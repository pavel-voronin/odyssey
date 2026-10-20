import {willAssetOwner} from './will-records.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {bodyRemains} from './remains.js';
import {remainsLocation} from '../remains-position.js';
export const estateClaimsOn=s=>['estate-claims','finances','lifecycle'].every(k=>enabled(s,k));
export function estateActor(s,p){const h=s.actorStates?.[p?.id]||(s.hero?.lineage===p?.id?s.hero:null);return selfDrivenActor(s,h)?h:null;}
export const estateBody=(s,p)=>estateActor(s,p)||p;
export function estateReady(s,p){const h=estateActor(s,p);return Boolean(p?.alive&&p.role!=='ребёнок'&&!p.needs.sleeping&&!p.ailment&&(h?!h.transit&&!h.combat&&h.hp>=h.maxHp*.6&&!h.carriedBy:p.health>=(p.maxHealth||100)*.6&&!p.roadTransit)&&(h||p.needs).energy>=25&&(h||p.needs).hunger<65);}
export function estateById(s,id){return Object.values(s.people).find(p=>p.estate?.id===id)||null;}
export function estateSource(s,p){
 const e=p?.estate;if(!e)return null;const body=bodyRemains(s,p),loc=body&&remainsLocation(s,body);
 if(e.custody?.kind==='remains')return body&&e.custody.id===body.id?loc:null;
 if(e.custody?.kind==='transit')return {area:e.custody.journey.from,x:e.custody.journey.metric?.departureX??50,transit:e.custody.journey};
 const ref=e.custody?.kind==='object'?e.custody:e.assets.find(a=>a.kind==='death-cache'),a=ref&&s.areas[ref.area],o=a?.objects.find(o=>o.id===ref.id);
 if(o)return {area:a.id,x:o.x,object:o.id,transit:null};
 // A currently existing canonical death body is evidence, never an old snapshot.
 return !e.custody&&body&&body.death.tick===e.opened?loc:null;
}
export function createEstateCustody(s,p,h,cache){
 if(!estateClaimsOn(s))return;if(cache&&enabled(s,'item-originals'))cache.itemOriginals=1;if(!p.estate?.cash)return;const e=p.estate,body=bodyRemains(s,p),journey=p.deathJourney||h.transit;
 if(body){e.custody={kind:'remains',id:body.id};return;}
 if(journey){e.custody={kind:'transit',journey:structuredClone(journey)};return;}
 const area=h.actorMode==='npc'?p.area??h.area:h.area,x=h.actorMode==='npc'?p.x??h.x:h.x;if(!s.areas[area]||!Number.isFinite(x))return;
 if(cache){e.custody={kind:'object',area,id:cache.id};return;}
 const id=e.id+'/funds';s.areas[area].objects.push({id,kind:'estateFunds',name:'Имущество '+p.name,x,estate:e.id});e.custody={kind:'object',area,id};
}
export function observeEstateClaims(s,p){
 if(!estateClaimsOn(s)||!estateReady(s,p))return;const b=estateBody(s,p),a=s.areas[b.area];if(!a)return;
 for(const dead of Object.values(s.people)){const e=dead.estate,source=e&&estateSource(s,dead);if(!e||source?.transit)continue;const localCash=source?.area===a.id&&physicalDistance(a,b.x,source.x)<=12,caches=a.objects.filter(o=>(o.estate===e.id||o.items?.some(i=>i.inheritance?.estate===e.id))&&physicalDistance(a,b.x,o.x)<=12).sort((a,b)=>Number(Boolean(b.items?.length))-Number(Boolean(a.items?.length))),cache=caches[0],at=localCash?source:cache?{area:a.id,x:cache.x}:null;if(!at)continue;
  const memory=p.estateNotes ||= {},old=memory[e.id],items=caches.flatMap(o=>(o.items||[]).filter(i=>i.inheritance?.estate===e.id)).map(i=>i.id).slice(0,12);
  memory[e.id]={version:1,estate:e.id,decedent:dead.id,area:a.id,x:at.x,observed:s.tick,witness:p.id,from:p.id,received:s.tick,heir:e.heir,cash:localCash?e.cash:0,itemHeirs:Object.fromEntries(caches.flatMap(o=>(o.items||[]).filter(i=>i.inheritance?.estate===e.id)).map(i=>[i.id,willAssetOwner(e,i.id)]).slice(0,12)),items:[...new Set([...(old?.items||[]),...items])].slice(0,12),holders:old?.holders||{},via:[]};
  for(const id of items)delete memory[e.id].holders[id];
  const ids=Object.keys(memory);if(ids.length>12){ids.sort((a,b)=>memory[a].received-memory[b].received);delete memory[ids[0]];}
 }
}
export function shareEstateKnowledge(s,from,to){
 if(!estateClaimsOn(s)||!estateReady(s,from)||!estateReady(s,to))return false;const a=estateBody(s,from),b=estateBody(s,to);if(a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12)return false;let changed=false;
 for(const n of Object.values(from.estateNotes||{})){
  const old=to.estateNotes?.[n.estate],fresh=!old||n.observed>old.observed,holders=Object.entries(n.holders).filter(([id,h])=>(h.relays?.length||0)<4&&(!old?.holders[id]||h.seen>old.holders[id].seen));if((!fresh||n.via.length>=4)&&!holders.length)continue;
  const copy=fresh&&n.via.length<4?{...structuredClone(n),from:from.id,received:s.tick,via:[...n.via,{from:from.id,to:to.id,area:a.area,at:s.tick}]}:structuredClone(old);if(!copy)continue;
  if(n.itemHeirs||old?.itemHeirs)copy.itemHeirs={...(old?.itemHeirs||{}),...(n.itemHeirs||{})};
  copy.items=[...new Set([...(old?.items||[]),...copy.items,...holders.map(([id])=>id)])].slice(0,12);
  for(const [id,h]of Object.entries(old?.holders||{}))if(copy.items.includes(id)&&(!copy.holders[id]||h.seen>copy.holders[id].seen))copy.holders[id]=structuredClone(h);
  for(const [id,h]of holders)if(copy.items.includes(id))copy.holders[id]={...structuredClone(h),relays:[...(h.relays||[]),{from:from.id,to:to.id,area:a.area,at:s.tick}]};
  for(const id of Object.keys(copy.holders))if(!copy.items.includes(id))delete copy.holders[id];(to.estateNotes ||= {})[n.estate]=copy;changed=true;
 }
 const ids=Object.keys(to.estateNotes||{});if(ids.length>12){ids.sort((a,b)=>to.estateNotes[a].received-to.estateNotes[b].received);for(const id of ids.slice(0,-12))delete to.estateNotes[id];}return changed;
}
