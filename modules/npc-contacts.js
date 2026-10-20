import {actorPartyLeader,selfDrivenActor} from '../actor-projection.js';
import {enabled} from '../rules.js';
import {initializeNPCKnowledge,npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
export const NPC_CONTACT_LIMIT=32;
const related=(a,b)=>(a.parents||[]).includes(b.id)||(b.parents||[]).includes(a.id)||(a.parents||[]).some(id=>(b.parents||[]).includes(id));
export {related as relatedPeople};
// Genealogy is indexed once per tick/birth, but physical presence is read afresh for every observation.
const kinIndexes=new WeakMap();
function relativeIds(s,p){
  let index=kinIndexes.get(s);
  if(!index||index.tick!==s.tick||index.nextPerson!==s.nextPerson||index.people!==s.people){
    index={tick:s.tick,nextPerson:s.nextPerson,people:s.people,children:new Map()};
    for(const person of Object.values(s.people))for(const parent of person.parents||[]){let children=index.children.get(parent);if(!children){children=new Set();index.children.set(parent,children);}children.add(person.id);}
    kinIndexes.set(s,index);
  }
  const ids=new Set([...(p.parents||[]),...(index.children.get(p.id)||[])]);
  for(const parent of p.parents||[])for(const sibling of index.children.get(parent)||[])ids.add(sibling);
  return ids;
}
export function initializeNPCContacts(s,p){initializeNPCKnowledge(s,p);p.navigation.contacts ??=[];}
export function localContact(s,id,area){
  const p=s.people[id];if(!p?.alive)return null;
  if(p.liftTransit||p.roadTransit)return null;const aid=p.partyInjury,patientCarrier=s.hero?.lineage===aid?.leader?s.hero:s.actorStates?.[aid?.leader];if(aid?.stage==='supported')return patientCarrier?.alive&&!patientCarrier.transit&&patientCarrier.area===area?{person:p,area,x:patientCarrier.x}:null;
  const leader=actorPartyLeader(s,id),detailed=s.actorStates?.[id];
  if(leader)return !leader.transit&&leader.area===area?{person:p,area,x:leader.x}:null;
  if(selfDrivenActor(s,detailed))return !detailed.transit&&detailed.area===area&&p.status!=='captive'?{person:p,area,x:detailed.x}:null;
  const heroHere=s.hero?.alive&&!s.hero.life.ended&&!s.hero.transit&&s.hero?.area===area;
  if(!s.actorStates?.[s.hero?.lineage]&&(s.hero?.lineage===id||s.hero?.companions?.some(c=>c.person===id)))return heroHere?{person:p,area,x:s.hero.x}:null;
  const carrier=p.status==='caravan'&&s.logistics?.convoys.some(c=>c.person===id&&(c.movement==='physical'||enabled(s,'npc-logistics')));
  const traveller=p.status==='travelling'&&s.society?.journeys.some(j=>j.person===id&&j.movement==='physical');
  const guard=enabled(s,'npc-watch-needs')&&s.society?.orders.some(o=>o.person===id);
  return p.area===area&&(['resident','wandering','guarding','lever-duty','injury-wait'].includes(p.status)||carrier||traveller||guard)?{person:p,area,x:p.x??42}:null;
}
export function observeNPCContacts(s,p){
  const leader=actorPartyLeader(s,p.id),area=leader?(leader.transit?null:leader.area):p.area;
  if(!enabled(s,'npc-contacts')||!p.alive||!s.areas[area])return;
  initializeNPCContacts(s,p);const a=s.areas[area],ids=relativeIds(s,p);
  for(const id of ids){const body=localContact(s,id,a.id);if(!body||id===p.id||!related(p,body.person))continue;
    let contact=p.navigation.contacts.find(c=>c.person===id);if(!contact){contact={person:id};p.navigation.contacts.push(contact);}
    Object.assign(contact,{name:body.person.name,area:a.id,place:a.name,x:body.x,seen:s.tick,relative:true,missingAt:null});
  }
  if(p.navigation.contacts.length>NPC_CONTACT_LIMIT)p.navigation.contacts.sort((a,b)=>a.seen-b.seen).splice(0,p.navigation.contacts.length-NPC_CONTACT_LIMIT);
}
export function knownRelatives(s,p,ctx,maxNodes=3){
  return (p.navigation?.contacts||[]).filter(c=>c.relative&&c.missingAt==null&&c.area!==p.area).map(c=>{
    const path=enabled(s,'npc-knowledge')?npcKnownRoute(p,p.area,c.area,knownNPCHazards(s,p)):ctx.route(s,p.area,c.area);
    return {contact:c,path};
  }).filter(entry=>entry.path.length>=2&&entry.path.length<=maxNodes);
}
export function missContact(s,p,id){
  if(!enabled(s,'npc-contacts'))return;const c=p.navigation?.contacts?.find(c=>c.person===id);if(c)c.missingAt=s.tick;
}
