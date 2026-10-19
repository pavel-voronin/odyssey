import {inheritLibraryBooks} from './libraries.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {relatedPeople,localContact} from './npc-contacts.js';
import {setActorMoney,selfDrivenActor} from '../actor-projection.js';
import {routeMapMemory} from './route-maps.js';
import {inheritMapCopies} from './map-copies.js';

// Called only by a real current death transition, never by restore or archives.
export function openInheritance(s,h,cache=null,ctx={}){
 const p=s.people[h.lineage];
 if(!enabled(s,'finances')||!enabled(s,'lifecycle')||!p||p.alive||h.alive||p.died!==s.tick||p.estate)return null;
 const deathArea=h.actorMode==='npc'?(p.area??h.area):h.area,deathX=h.actorMode==='npc'?(p.x??h.x):h.x;
 const heirs=Object.values(s.people).filter(q=>q.id!==p.id&&q.alive&&q.role!=='ребёнок'&&relatedPeople(p,q)).sort((a,b)=>Number(b.area===deathArea)-Number(a.area===deathArea)||Number(b.parents.includes(p.id))-Number(a.parents.includes(p.id))||a.id.localeCompare(b.id));
 const heir=heirs[0]||null,wallet=h.actorMode==='npc'?p.agenda.wealth:h.gold;
 const total=Math.max(0,wallet-(cache?.gold||0));
 const estate=p.estate={version:1,id:`estate/${p.id}/${s.tick}`,opened:s.tick,heir:heir?.id??null,total,cash:total,paid:0,status:'pending',assets:[]};
 inheritMapCopies(s,p,heir,deathArea,deathX,estate,p.deathJourney||h.transit);
 inheritLibraryBooks(s,p,heir,estate,cache);
 if(heir&&p.routeMaps?.documents.length){const next=routeMapMemory(heir);for(const d of p.routeMaps.documents){d.owner=heir.id;next.documents.push(d);estate.assets.push({kind:'route-map',area:deathArea,id:d.id});}p.routeMaps.documents=[];}
 if(cache){cache.estate=estate.id;cache.inheritor=heir?.id??null;estate.assets.push({kind:'death-cache',area:h.area,id:cache.id});
  for(const item of cache.items||[]){if(item.libraryLoan?.returned===null&&item.textCopy?.owner!==p.id)continue;item.inheritance={estate:estate.id,owner:heir?.id??null};estate.assets.push({kind:'item',area:h.area,id:item.id,cache:cache.id});}
 }
 for(const a of Object.values(s.areas))for(const o of a.objects){
  if(o.kind==='workshop'&&o.owner===p.id){
   estate.assets.push({kind:'property',area:a.id,id:o.id});
   if(heir){o.owner=heir.id;o.offer=null;o.history ||= [];o.history.push({id:estate.id+'/'+o.id,tick:s.tick,kind:'inheritance',from:p.id,owner:heir.id,estate:estate.id});
    const actor=s.actorStates?.[heir.id];if(actor?.property.known[o.id])actor.property.known[o.id].owner=heir.id;
   }
  }
  // Hidden money is included only if this recipient already knows its address.
  if(o.kind==='buriedMoney'&&o.moneyCache.owner===p.id&&heir?.moneyCaches?.places.some(n=>n.id===o.id)){
   estate.assets.push({kind:'money-cache',area:a.id,id:o.id});const c=o.moneyCache;c.rights ||= [];c.rights.push({tick:s.tick,from:p.id,owner:heir.id,estate:estate.id});c.owner=heir.id;
   for(const n of heir.moneyCaches.places)if(n.id===o.id)n.owner=heir.id;
  }
 }
 // The thirty-percent physical death cache remains a distinct finite source.
 // The rest enters this act exactly once, never from the life archive snapshot.
 setActorMoney(s,p,0);
 const at=heir&&localContact(s,heir.id,deathArea);
 if(heir&&at&&!h.transit&&!p.deathJourney&&!heir.needs?.sleeping&&physicalDistance(s.areas[deathArea],at.x,deathX)<=12){
  const funds=selfDrivenActor(s,heir.id)?s.actorStates[heir.id].gold:heir.agenda.wealth;
  setActorMoney(s,heir,funds+estate.cash);estate.paid=estate.cash;estate.cash=0;estate.status='distributed';
 }
 ctx.log?.(s,heir?`После смерти ${p.name} открыто наследство для ${heir.name}. ${estate.status==='distributed'?`Передано ◈${estate.paid}; вещи остаются на своих местах.`:'Деньги остаются в имуществе до получения; вещи не телепортируются.'}`:`После смерти ${p.name} имущество остаётся без подходящего получателя.`,'heritage');
 return estate;
}
