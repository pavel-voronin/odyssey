import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {npcController} from './npc-control.js';
export const authoritiesOn=s=>enabled(s,'territorial-authorities')&&enabled(s,'politics')&&enabled(s,'people');
export const authorityKey=(a,b)=>[a,b].sort().join('|');
export function authorityBody(s,id){const h=s.hero?.lineage===id?s.hero:s.actorStates?.[id];return selfDrivenActor(s,h)?h:s.people[id];}
export const authorityAt=(s,area)=>s.authorities?.byId[s.areas[area]?.authority]||null;
export const borderAt=(s,from,to)=>{const b=s.authorities?.border;return b?.from===from&&b.to===to?b:null;};
export function borderGuard(s,b){const p=s.people[b?.guard],d=p?.borderDuty;return p?.alive&&d?.active&&d.edge===b.edge&&p.area===b.from&&['resident','wandering'].includes(p.status)&&!p.needs.sleeping&&!p.ailment&&p.needs.energy>=20&&p.health>=(p.maxHealth||100)*.6&&s.tick<d.until&&npcController(s,p)==='personal'&&physicalDistance(s.areas[b.from],p.x,b.x)<=2?p:null;}
export const borderMemory=p=>p.borderAccess ||= {version:1,serial:0,pending:null,entries:[],known:[],lastAt:-1,wait:null,refusal:null};
export function finishBorderCrossing(s,id,from,to){
 const p=s.people[id],body=p&&authorityBody(s,id),m=p?.borderAccess,r=m?.entries.find(r=>r.id===m.pending),b=borderAt(s,from,to);if(!p?.alive||body?.area!==from||body.carriedBy||!b||r?.status!=='admitted'||r.edge!==b.edge||r.from!==from||r.to!==to)return false;
 r.status='crossed';r.crossed=s.tick;m.pending=null;m.lastAt=s.tick;b.crossings++;const w=b.maintenance;if(w.remaining===6)w.overflow++;else w.remaining++;return true;
}

export function authorityRevision(s){const h=s.hero,p=s.people[h.lineage],b=s.authorities?.border;if(!b||h.area!==b.from||physicalDistance(s.areas[h.area],h.x,b.x)>24)return [s.rules['territorial-authorities']];const g=borderGuard(s,b),r=p.borderAccess?.entries.find(r=>r.id===p.borderAccess.pending);return [s.rules['territorial-authorities'],s.rules.politics,b.law,s.edges[b.edge]?.commonAccess?.id||null,b.maintenance.remaining,g?.id||null,g&&[g.actionControl?.tick===s.tick&&g.borderDuty.idleAt!==s.tick,g.borderDuty.servicedAt===s.tick],r&&[r.status,r.steps.length,r.payment?.amount]];}
