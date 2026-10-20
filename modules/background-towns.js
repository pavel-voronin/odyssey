import {enabled} from '../rules.js';
import {isTown} from './common.js';
import {localContact} from './npc-contacts.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
export function civicCandidates(s){
  return Object.values(s.areas).filter(a=>isTown(a)&&(enabled(s,'background-towns')||a.visited));
}
export function heroPresent(s,a){return Boolean(s.hero?.alive&&!s.hero.life.ended&&s.hero?.area===a.id&&!s.hero.transit);}
export function areaObservation(s,a,prefix='civic'){
  s.society.nextRecord ??=0;
  const detailed=detailedActors(s).filter(h=>selfDrivenActor(s,h)&&localContact(s,h.lineage,a.id)),candidates=new Set();
  for(const h of detailed){candidates.add(h.lineage);for(const c of h.companions||[])if(c.person)candidates.add(c.person);}
  for(const id of [...(a.population||[]),...a.objects.filter(o=>o.kind==='resident').map(o=>o.person)])candidates.add(id);
  const carriers=new Set((s.logistics?.convoys||[]).filter(c=>c.movement==='physical'||enabled(s,'npc-logistics')).map(c=>c.person));for(const id of carriers)if(s.people[id]?.area===a.id)candidates.add(id);
  const travellers=new Set((s.society?.journeys||[]).filter(j=>j.movement==='physical').map(j=>j.person));for(const id of travellers)if(s.people[id]?.area===a.id)candidates.add(id);
  const watch=enabled(s,'npc-watch-needs');if(watch)for(const o of s.society.orders)if(s.people[o.person]?.area===a.id)candidates.add(o.person);
  const witnesses=[...candidates].filter(id=>{if(watch)return Boolean(localContact(s,id,a.id));const p=s.people[id];return p?.alive&&p.area===a.id&&(['resident','guarding','wandering'].includes(p.status)||carriers.has(id)||travellers.has(id));}).slice(0,32);
  return {id:`${prefix}-${s.society.nextRecord++}`,knownBy:detailedActors(s).map(h=>h.lineage).filter(id=>witnesses.includes(id)),witnesses};
}
export function civicObservation(s,a){return enabled(s,'background-towns')?areaObservation(s,a):{};}
export function knownWorldEvent(s,event){
  // Legacy entries were already exposed; do not erase previously visible history.
  return event.knownBy===undefined||Array.isArray(event.knownBy)&&event.knownBy.includes(s.hero?.lineage)||event.witnesses?.includes(s.hero?.lineage);
}
export function civicDestinations(s,a){
  if(!enabled(s,'background-towns'))return Object.values(s.areas).filter(b=>isTown(b)&&b.visited&&b.id!==a.id&&b.era===a.era);
  // This first stage only permits an actual neighbouring street, never a path from the hero's map.
  return a.links.map(id=>s.areas[id]).filter(b=>b&&isTown(b)&&b.id!==a.id&&b.era===a.era&&['road',undefined].includes(s.edges[[a.id,b.id].sort().join('|')]?.mode));
}
