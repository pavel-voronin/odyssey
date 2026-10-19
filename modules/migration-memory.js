import {migrationEmployment} from './migration-service.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {structurallySound} from './building-condition.js';
export const migrationKnowledgeOn=s=>enabled(s,'migration-knowledge')&&enabled(s,'npc-knowledge');
export const migrationMemory=p=>(p.migrationKnowledge ||= {version:1,places:{}});
export function migrationBody(s,p){const h=s.actorStates?.[p?.id];return h?.alive&&!h.life.ended&&h.actorMode!=='npc'?h:p;}
export function localSettlement(s,p){
 const b=migrationBody(s,p),a=s.areas[b?.area];if(!p?.alive||p.needs.sleeping||!a?.civic||a.interior||b.transit||physicalDistance(a,b.x??42,42)>12)return null;
 if(b===p&&!['resident','wandering','caravan','guarding','lever-duty'].includes(p.status)||p.status==='captive')return null;
 const profiles=a.facades?.profiles||[],workshops=a.objects.filter(o=>o.kind==='workshop');
 const shelter=profiles.length?profiles.some(structurallySound):a.objects.some(o=>['rest','tavern','workshop'].includes(o.kind)&&(!o.state||o.state==='intact')&&!o.closed);
 return {area:a.id,name:a.name,observed:s.tick,food:a.civic.food,safety:a.civic.safety,work:enabled(s,'service-access')?migrationEmployment(s,a):a.civic.treasury>=12&&(!workshops.length||workshops.some(o=>o.state==='intact')),habitable:shelter,damage:profiles.some(p=>!structurallySound(p))||workshops.some(o=>o.state==='burned')};
}
export function observeMigrationPlace(s,input){
 if(!migrationKnowledgeOn(s))return false;const p=s.people[input?.id];if(!p||input.area!==migrationBody(s,p)?.area)return false;const place=localSettlement(s,p);if(!place)return false;
 const old=p.migrationKnowledge?.places[place.area];if(old?.mode==='seen'&&old.observed===s.tick&&['food','safety','work','habitable','damage'].every(k=>old[k]===place[k]))return false;
 const serial=s.migrationObservationSerial=(s.migrationObservationSerial||0)+1,id=`settlement-note/${p.id}/${place.area}/${s.tick}/${serial}`,note={...place,id,serial,witness:p.id,mode:'seen',received:s.tick,from:p.id,via:[]},m=migrationMemory(p);m.places[place.area]=note;
 const keys=Object.keys(m.places);if(keys.length>24){keys.sort((a,b)=>m.places[a].received-m.places[b].received||a.localeCompare(b));delete m.places[keys[0]];}return true;
}
export function rememberMigrationReport(s,p,from,note,area){
 const old=p.migrationKnowledge?.places[note.area];if(old&&(old.observed>note.observed||old.observed===note.observed&&old.serial>=note.serial)||note.via.length>=6)return false;
 const m=migrationMemory(p);m.places[note.area]={...structuredClone(note),mode:'heard',received:s.tick,from:from.id,via:[...note.via,{from:from.id,to:p.id,area,tick:s.tick}]};
 const keys=Object.keys(m.places);if(keys.length>24){keys.sort((a,b)=>m.places[a].received-m.places[b].received||a.localeCompare(b));delete m.places[keys[0]];}return true;
}
