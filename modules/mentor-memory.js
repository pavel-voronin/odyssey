import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
import {localContact} from './npc-contacts.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {workshopSite} from './workshop-place.js';
export const MENTOR_CONTACT_LIMIT=8;
export const mentorEnabled=s=>['mentor-journeys','companion-goals','property','workshop-tools','people','npc-control','npc-knowledge','npc-contacts'].every(id=>enabled(s,id));
const indexes=new WeakMap();
const canTeach=p=>p.agenda?.job==='artisan'||p.toolSkills?.clamp;
function localMasters(input,area){
 const s=rootWorld(input);let index=indexes.get(s);
 if(!index||index.tick!==s.tick||index.people!==s.people||index.nextPerson!==s.nextPerson){index={tick:s.tick,people:s.people,nextPerson:s.nextPerson,areas:new Map()};for(const p of Object.values(s.people))if(p.alive&&p.area&&canTeach(p)){const ids=index.areas.get(p.area)||[];ids.push(p.id);index.areas.set(p.area,ids);}indexes.set(s,index);}
 return index.areas.get(area)||[];
}
export function observeMentors(s,p){
 if(!mentorEnabled(s)||!p.alive)return;const a=s.areas[p.area],self=a&&localContact(s,p.id,a.id);if(!self)return;
 for(const id of localMasters(s,a.id)){
  if(id===p.id)continue;const body=localContact(s,id,a.id);if(!body||!canTeach(body.person)||physicalDistance(a,self.x,body.x)>12)continue;
  const memory=p.mentorMemory ||= {contacts:[],attempts:[]};let contact=memory.contacts.find(c=>c.person===id);if(!contact){contact={person:id};memory.contacts.push(contact);}
  Object.assign(contact,{name:body.person.name,area:a.id,place:a.name,x:body.x,skill:'clamp',fee:1,seen:s.tick,missingAt:null});
  if(memory.contacts.length>MENTOR_CONTACT_LIMIT)memory.contacts.sort((a,b)=>a.seen-b.seen).splice(0,memory.contacts.length-MENTOR_CONTACT_LIMIT);
 }
 // A fault is learned at the actual bench, never through an exterior wall.
 const visible=a.interior?.kind==='workshop'?workshopSite(s,a):workshopSite(s,a,a.objects.find(o=>o.kind==='workshop'&&o.owner===p.id)?.id);
 if(visible&&visible.object.owner===p.id&&(!visible.room||visible.inside)&&physicalDistance(a,self.x,visible.inside?a.interior.station:visible.object.x)<=12){
  const memory=p.mentorMemory ||= {contacts:[],attempts:[]},o=visible.object;
  if(o.state==='intact'&&o.workTool?.state==='broken')memory.need={property:o.id,area:visible.area.id,episode:o.workTool.episode,skill:'clamp',seen:s.tick};
  else if(memory.need?.property===o.id)memory.need=null;
 }
}
export function knownMentorCandidates(s,p,maxNodes=6){
 if(!mentorEnabled(s))return [];
 return (p.mentorMemory?.contacts||[]).filter(c=>c.skill==='clamp'&&c.missingAt==null&&c.person!==p.id).map(contact=>({contact,path:npcKnownRoute(p,p.area,contact.area,knownNPCHazards(s,p))})).filter(entry=>entry.path.length>0&&entry.path.length<=maxNodes);
}
export function missMentor(s,p,id,area){const c=p.mentorMemory?.contacts.find(c=>c.person===id);if(c&&(area===undefined||c.area===area))c.missingAt=s.tick;}
