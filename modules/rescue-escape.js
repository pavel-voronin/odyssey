import {physicalDistance} from '../geometry.js';
import {enabled} from '../rules.js';
// An agreed escape is the prisoner's own personal task, not a second party body.
export const isDungeonRescue=q=>q?.dungeonRescue?.version===1;
export function rescueQuestAvailable(s,q){return !isDungeonRescue(q)||enabled(s,'people')&&enabled(s,'npc-control')&&(enabled(s,'dungeon-rescue')||q.dungeonRescue.stage!=='captive')||isDungeonRescue(q)&&dungeonRescueReady(s,q);}
export function rescueGuardPass(s,enemy,person,target){
 const g=enemy?.rescueGuard;
 return Boolean(g?.version===1&&g.agreement?.permits.includes(person)&&target<=g.cageX&&s.areas[g.room]);
}
export function beginRescueEscape(s,p,q){
 const h=s.hero;
 if(!enabled(s,'dungeon-rescue')||!isDungeonRescue(q)||q.status!=='active'||!h.quests.includes(q)||!h.alive||h.transit||h.combat||!p?.alive||p.status!=='captive'||p.area!==q.target||p.id!==q.person||p.rescueFlight||h.area!==p.area)return false;
 const a=s.areas[p.area],cage=a?.objects.find(o=>o.id===q.object&&o.kind==='captive'&&o.person===p.id&&!o.resolved);
 if(!cage||!a.links.includes(q.source)||physicalDistance(a,h.x,cage.x)>1||physicalDistance(a,p.x,cage.x)>1)return false;
 const guard=a.objects.find(o=>o.id===q.dungeonRescue.guard);
 if(guard?.alive&&!guard.resolved&&physicalDistance(a,guard.x,cage.x)<=12&&!rescueGuardPass(s,guard,h.lineage,cage.x))return false;
 p.rescueFlight={version:1,quest:q.id,owner:s.hero.lineage,room:q.target,exit:q.source,meeting:42,status:'walking',agreedAt:s.tick,blocked:null};
 p.status='wandering';p.agenda.task=null;p.agenda.due=s.tick;p.agenda.home=q.source;
 cage.resolved=true;q.dungeonRescue.stage='escorting';q.dungeonRescue.releasedAt=s.tick;
 if(!a.objects.some(o=>o.kind==='resident'&&o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
 rescueEscapePlan(s,p);return true;
}
export function rescueEscapePlan(s,p){
 const f=p.rescueFlight;if(f?.status!=='walking'||!p.alive||p.agenda.task)return false;
 if(![f.room,f.exit].includes(p.area))return false;
 p.agenda.task={kind:'rescueEscape',target:f.exit,x:f.meeting,remaining:1};return true;
}
export function rescueEscapeRoute(s,p,t){
 const f=p.rescueFlight;if(t.kind!=='rescueEscape'||f?.status!=='walking'||t.target!==f.exit)return null;
 if(p.area===f.exit)return [f.exit];
 // Only the actual, locally agreed adjacent stairs. This grants no distant road knowledge.
 return p.area===f.room&&s.areas[p.area]?.links.includes(f.exit)&&s.areas[f.exit]?.links.includes(p.area)?[p.area,f.exit]:[];
}
export function finishRescueEscape(s,p){
 const f=p.rescueFlight;if(f?.status!=='walking'||p.area!==f.exit||physicalDistance(s.areas[p.area],p.x,f.meeting)>1||!p.alive)return false;
 f.status='arrived';f.arrivedAt=s.tick;f.blocked=null;p.status='resident';p.home ||= p.area;p.agenda.task=null;p.agenda.due=s.tick+48;return true;
}
export function dungeonRescueReady(s,q){
 const p=s.people[q.person],f=p?.rescueFlight,h=s.hero;
 return Boolean(isDungeonRescue(q)&&p?.alive&&f?.quest===q.id&&f.status==='arrived'&&p.area===q.source&&h.area===q.source&&!h.transit&&physicalDistance(s.areas[h.area],h.x,p.x)<=12);
}
