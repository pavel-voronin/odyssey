import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {literacyOn,literacyCaps} from './literacy-state.js';
import {migrationKnowledgeOn,migrationBody,rememberMigrationReport} from './migration-memory.js';
export function exchangeMigrationNotes(s,p,q){
 if(!migrationKnowledgeOn(s)||!p?.alive||!q?.alive||p.id===q.id||p.needs.sleeping||q.needs.sleeping)return false;
 const a=migrationBody(s,p),b=migrationBody(s,q);if(a.transit||b.transit||a.combat||b.combat||p.fordCrossing||q.fordCrossing||p.liftTransit||q.liftTransit||!localContact(s,p.id,a.area)||!localContact(s,q.id,a.area)||physicalDistance(s.areas[a.area],a.x,b.x)>12)return false;
 const caps=v=>literacyCaps(s,v,s.actorStates?.[v.id]?.actorMode!=='npc'?s.actorStates?.[v.id]:null).spoken;if(literacyOn(s)&&!caps(p).some(id=>caps(q).includes(id)))return false;
 let changed=false;for(const [from,to]of [[q,p],[p,q]])for(const note of Object.values(from.migrationKnowledge?.places||{}).sort((a,b)=>Number(b.area===p.area)-Number(a.area===p.area)||b.observed-a.observed)){
  if(note.via.some(h=>h.to===to.id))continue;if(rememberMigrationReport(s,to,from,note,a.area)){changed=true;break;}
 }
 return changed;
}
