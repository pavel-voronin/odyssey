import {enabled} from '../rules.js';
import {personAgeAt,ageLimits} from './age-state.js';
import {physicalDistance} from '../geometry.js';
import {dwellingActor} from './dwelling-state.js';
import {residenceAdmission} from './residence-access.js';
import {npcController,canStartNPCActivity} from './npc-control.js';

export const familiesOn=s=>enabled(s,'families')&&['lineage','relationships','people','homes','interiors','lodging','supply'].every(k=>enabled(s,k));
export const familyBook=s=>s.families ||= {version:1,serial:0,shared:{},offers:{},unions:{}};
export const familyBody=(s,p)=>dwellingActor(s,p)||p;
export function familyAdult(s,p){const n=personAgeAt(p,s.tick);return Boolean(p?.alive&&n!==null&&n>=ageLimits(p)[0]);}
export function familyNear(s,p,q){const a=familyBody(s,p),b=familyBody(s,q);return Boolean(a&&b&&!a.transit&&!b.transit&&a.area===b.area&&s.areas[a.area]&&physicalDistance(s.areas[a.area],a.x,b.x)<=12);}
export function familyKin(s,p,q){const ancestors=(p,depth=0,seen=new Set())=>{if(!p||depth>3||seen.has(p.id))return seen;seen.add(p.id);for(const id of p.parents||[])ancestors(s.people[id],depth+1,seen);return seen;};const a=ancestors(p),b=ancestors(q);return [...a].some(id=>b.has(id));}
export function familyReady(s,p){if(!familyAdult(s,p))return false;const b=familyBody(s,p),n=b.lineage?b:p.needs;return Boolean(n&&!b.transit&&!b.combat&&!b.carriedBy&&!p.roadTransit&&!p.ferryTicket&&!p.ferryDuty&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.hp:p.health)>0&&n.energy>=25&&n.hunger<65&&(b.lineage||npcController(s,p)==='personal'));}
export function familyCanAct(s,p,inTurn){const b=p&&familyBody(s,p);return familyReady(s,p)&&p.familyLastAt!==s.tick&&(b.lineage?b===s.hero:inTurn&&p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'&&p.actionControl.phases.includes('act')&&canStartNPCActivity(s,p,{inTurn:true}));}
export const familyKey=(p,q)=>[p.id,q.id].sort().join('|');
export function recordFamilyCooperation(s,people,{id,kind,actions=1}){if(!familiesOn(s))return;const ids=[...new Set(people)];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const p=s.people[ids[i]],q=s.people[ids[j]];if(!familyAdult(s,p)||!familyAdult(s,q)||!familyNear(s,p,q)||familyKin(s,p,q))continue;const book=familyBook(s),key=familyKey(p,q),r=book.shared[key] ||= {people:[p.id,q.id].sort(),actions:0,sources:[]};if(r.sources.some(e=>e.id===id)||r.sources.length>=8)continue;r.sources.push({id,kind,tick:s.tick,actions});r.actions+=actions;}}
export function familyHome(s,p){const room=s.areas[p.privateHome?.room];return room?.residence?.owner===p.id&&residenceAdmission(s,room,p.id)?room:null;}
export function familyBusy(p){return Boolean(p.agenda?.task&&!p.agenda.task.kind.startsWith('familyPair')||p.personalJourney||p.provisionCredit?.status==='working');}
export function familySpend(s,p){const b=familyBody(s,p);if(b.lineage){b.energy--;b.lastAction='talk';}else p.needs.energy--;p.familyLastAt=s.tick;}
export function familyRevision(s,g){if(!g.kind.startsWith('familyPair'))return null;return [s.rules.families,s.families?.offers[g.offer],s.families?.unions[g.union],s.people[g.person]?.agenda?.task,s.people[g.person]?.alive,s.people[g.person]?.familyActive,s.areas[g.room]?.residence];}
export function familyAdmission(s,g,p){if(!g.kind.startsWith('familyPair'))return null;return !familiesOn(s)||!familyReady(s,p)?{status:'blocked',reason:'Нет подтверждённой зрелости или свободных телесных сил для семейного решения.',retryOn:'family-conditions'}:null;}
