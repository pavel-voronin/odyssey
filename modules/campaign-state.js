import {enabled} from '../rules.js';
import {authoritiesOn,authorityBody} from './authority-state.js';
import {physicalDistance} from '../geometry.js';
import {npcController,canStartNPCActivity} from './npc-control.js';
export const campaignsOn=s=>authoritiesOn(s)&&['limited-campaigns','orders','npc-control','npc-needs','npc-watch-needs','supply','equipment','witness-news','authority-diplomacy'].every(k=>enabled(s,k));
export const campaignBook=s=>s.authorities.campaigns ||= {version:1,operations:{}};
export const campaignBody=(s,p)=>p&&authorityBody(s,p.id);
export const campaignNear=(s,p,area,x,range=3)=>{const b=campaignBody(s,p);return b&&b.area===area&&!b.transit&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&physicalDistance(s.areas[area],b.x,x)<=range;};
export const militaryControl=(s,b=s.authorities?.border)=>b&&s.edges[b.edge]?.militaryControl||null;
export function campaignReady(s,p){const b=campaignBody(s,p);return Boolean(p?.alive&&b&&!b.transit&&!b.combat&&!b.carriedBy&&(b.lineage?b===s.hero:['resident','wandering'].includes(p.status)&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p,{inTurn:true}))&&!p.ferryDuty&&!p.ferryTicket&&!p.carriedBy&&!p.partyInjury&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.hp>=b.maxHp*.6&&b.energy>=35&&b.hunger<60:p.health>=(p.maxHealth||100)*.6&&p.needs.energy>=35&&p.needs.hunger<60));}
export function campaignKnown(s,p,q){return q?.status==='vetoed'&&q.origin?.choice==='accepted'&&q.response?.choice==='vetoed'&&q.edge===s.authorities.border?.edge&&p.news?.known[q.responseNews]&&q.fromState!==q.toState;}
