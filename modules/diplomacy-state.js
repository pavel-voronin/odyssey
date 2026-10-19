import {authoritiesOn,authorityBody,authorityAt} from './authority-state.js';
import {npcController} from './npc-control.js';
import {physicalDistance} from '../geometry.js';
import {npcKnownRoute} from './npc-knowledge.js';
import {literacyOn,literacyCaps} from './literacy-state.js';
export const diplomacyOn=s=>authoritiesOn(s)&&s.rules['authority-diplomacy']!==false&&s.rules['witness-news']!==false;
export const diplomaticProposal=(s,id)=>s.authorities?.diplomacy?.proposals[id]||null;
export const proposals=s=>Object.values(s.authorities?.diplomacy?.proposals||{});
export const activeProposal=q=>q&&!['origin-veto','vetoed','failed','implemented'].includes(q.status);
export function diplomaticReady(s,p){const b=p&&authorityBody(s,p.id);return Boolean(p?.alive&&b&&(b.lineage?b.hp>0:p.health>0)&&!b.transit&&!b.combat&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.energy:p.needs.energy)>=25&&(b.lineage?b.hunger:p.needs.hunger)<65&&(b.lineage||['resident','wandering'].includes(p.status)&&npcController(s,p)==='personal'));}
export function nearDiplomat(s,a,b,range=3){const x=a&&authorityBody(s,a.id),y=b&&authorityBody(s,b.id);return Boolean(x&&y&&x.area===y.area&&physicalDistance(s.areas[x.area],x.x,y.x)<=range);}
export function diplomaticSpeech(s,p,q){if(!literacyOn(s))return true;const a=authorityBody(s,p.id),b=authorityBody(s,q.id);return literacyCaps(s,p,a?.lineage?a:null).spoken.some(k=>literacyCaps(s,q,b?.lineage?b:null).spoken.includes(k));}
export function personalBorderExperience(s,p){const b=s.authorities?.border,own=authorityBody(s,p.id),state=own&&authorityAt(s,own.area);if(!b||!state||state.id===b.receiver||own.area!==state.capital||physicalDistance(s.areas[own.area],own.x,42)>3)return null;
 const receipt=p.borderAccess?.entries.filter(r=>r.edge===b.edge&&r.law===b.law&&r.status==='crossed'&&(r.payment?.amount||0)+r.steps.length===3).at(-1),target=s.authorities.byId[b.receiver];if(!receipt||p.id===state.ruler||p.id===target.ruler||!npcKnownRoute(p,own.area,target.capital).length)return null;return {receipt,state,target,b};
}
export function commonEntry(s,b){const a=b&&s.edges[b.edge]?.commonAccess,q=a&&diplomaticProposal(s,a.proposal);return Boolean(a?.version===1&&a.rule==='free-entry'&&a.fee===0&&a.edge===b.edge&&q?.status==='implemented'&&q.policy===a.id&&q.implemented===a.at);}
