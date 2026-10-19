import {actionKey} from './action-selection.js';
import {registeredGoal} from './goal-handlers.js';
export function validateActionSelection(s,h,fail){
 const validTick=v=>Number.isSafeInteger(v)&&v>=0&&v<=s.tick;if(h===s.hero)for(const p of Object.values(s.people))if(p.directionTalkTick!==undefined&&!validTick(p.directionTalkTick))fail(p.id+'.directionTalkTick');
 const m=h.actionSelection;if(!m)return;const key=h.lineage+'.actionSelection',integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=s.tick,hash=v=>typeof v==='string'&&/^[a-f0-9]{16}$/.test(v),list=(v,n)=>Array.isArray(v)&&v.length<=n;
 if(m.version!==1||!list(m.deferred,8)||!list(m.attempts,8)||m.paused!==undefined&&!list(m.paused,8)||m.questions!==undefined&&!list(m.questions,8)||m.inspections!==undefined&&!list(m.inspections,8)||new Set(m.deferred.map(e=>e.key)).size!==m.deferred.length)fail(key);
 for(const e of m.deferred)if(!e.step||!registeredGoal(e.step)||e.key!==actionKey(e.step)||e.area!==e.step.area||e.kind!==e.step.kind||!s.areas[e.area]||!Number.isFinite(e.step.x)||!integer(e.at)||typeof e.reason!=='string'||typeof e.retryOn!=='string'||!hash(e.signature))fail(key+'.deferred');
 for(const g of m.paused||[])if(!registeredGoal(g)||!s.areas[g.area]||!Number.isFinite(g.x))fail(key+'.paused');
 for(const e of m.attempts)if(typeof e.key!=='string'||!hash(e.basis)||![1,2].includes(e.count))fail(key+'.attempt');
 if(m.last&&(!integer(m.last.tick)||typeof m.last.key!=='string'||!['progressed','blocked','completed','interrupted'].includes(m.last.status)))fail(key+'.last');
 for(const e of m.inspections||[])if(!s.areas[e.area]||!hash(e.signature)||!integer(e.at))fail(key+'.inspection');
 for(const e of m.questions||[]){if(!s.people[e.person]||!s.areas[e.topic]||!hash(e.signature)||!integer(e.at)||!['refused','unknown','directions'].includes(e.outcome)||!list(e.roads,2)||!list(e.places,2)||e.outcome!=='directions'&&e.roads.length)fail(key+'.question');for(const r of e.roads)if(!s.areas[r.from]||!s.areas[r.to]||r.key!==[r.from,r.to].sort().join('|')||!integer(r.seen))fail(key+'.source');for(const v of e.places)if(!s.areas[v.area]||typeof v.name!=='string'||!integer(v.seen))fail(key+'.place');}
 if(h===s.hero)for(const p of Object.values(s.people))if(p.directionTalkTick!==undefined&&!integer(p.directionTalkTick))fail(p.id+'.directionTalkTick');
}
