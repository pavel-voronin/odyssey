import {authoritiesOn,authorityBody} from './authority-state.js';
import {npcController} from './npc-control.js';import {physicalDistance} from '../geometry.js';
export const administrationOn=s=>authoritiesOn(s)&&s.rules['administration-changes']!==false&&s.rules['witness-news']!==false;
export function administrationReady(s,p){const b=p&&authorityBody(s,p.id);return Boolean(p?.alive&&p.role!=='ребёнок'&&b&&!b.transit&&!b.combat&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.hp:p.health)>0&&(b.lineage?b.energy:p.needs.energy)>=25&&(b.lineage?b.hunger:p.needs.hunger)<65&&(b.lineage||['resident','wandering'].includes(p.status)&&npcController(s,p)==='personal')&&!p.agenda.task);}
export function administrationNear(s,p,a){const b=p&&authorityBody(s,p.id);return b?.area===a.capital&&physicalDistance(s.areas[b.area],b.x,42)<=6;}
export function administrationCanAct(s,p,inTurn=false){const b=p&&authorityBody(s,p.id);return administrationReady(s,p)&&(p.administrationLastAt??-1)<s.tick&&(b===s.hero||!b.lineage&&inTurn&&p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'&&p.actionControl.phases.includes('act'));}
export function administrationKnown(s,p,state){return Object.values(p.news?.known||{}).filter(r=>r.administration?.state===state&&r.administration.phase==='transfer').sort((a,b)=>b.occurred-a.occurred)[0]||null;}
export function administrationRevision(s,g){if(g.kind!=='adminTransfer')return null;const a=s.authorities?.byId[g.state],p=s.people[g.person];return [s.rules['administration-changes'],a?.ruler,a?.law,a&&s.areas[a.capital].civic.treasury,p&&[p.alive,p.area,p.x,p.agenda.task,p.actionControl?.tick===s.tick]];}

export function administrationFree(s,p){const c=p.actionControl;return p.administrationLastAt!==s.tick&&(c?.tick!==s.tick||c.owner==='personal'&&c.phases.length===1&&c.phases[0]==='act'&&p.administrationIdleAt===s.tick);}
