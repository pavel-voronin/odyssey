import {enabled} from '../rules.js';
export const mechanismKey=(a,b)=>[a,b].sort().join('|');
export const grateAt=(s,a,b)=>s.edges?.[mechanismKey(a,b)]?.mechanism;
export const grateClosed=(s,a,b)=>enabled(s,'mechanisms')&&grateAt(s,a,b)?.state==='closed';
export const gateX=(from,to)=>Number(to.slice(1))>Number(from.slice(1))?100:0;
export function gratePassage(s,from,to){return grateClosed(s,from,to)?{kind:'mechanism',key:mechanismKey(from,to),x:gateX(from,to),arrival:gateX(from,to)===100?5:95,allowed:false}:null;}
// Personal knowledge can be stale. The physical executor still checks the edge.
export function knownGrateBlocked(s,p,from,to){
 if(!enabled(s,'mechanisms'))return false;
 const note=p?.mechanisms?.known.find(n=>n.key===mechanismKey(from,to));
 if(note?.state!=='closed')return false;
 if(note.holdAfter>s.tick)return true;
 const h=s.actorStates?.[p.id];
 if(note.requiresHold&&(!enabled(s,'companions')||!enabled(s,'people')||!h?.companions.some(c=>c.person&&c.loyalty>=55&&h.memory.people.includes(c.person)&&s.people[c.person]?.alive&&s.people[c.person].needs.energy>=40&&!s.people[c.person].needs.sleeping)))return true;
 return !(note.leverArea===from&&h?.energy>=35&&h.personality.curiosity>=.5);
}
