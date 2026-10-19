import {woundFocus} from './wound-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {knowsPracticalMethod,recordPracticalWard,skillBranchesEnabled} from './skill-branches.js';
const on=s=>skillBranchesEnabled(s)&&enabled(s,'magic')&&enabled(s,'body');
const state=s=>s.people[s.hero.lineage]?.skillPractice?.magic;
export function wardThreat(s,e){const h=s.hero;return Boolean(enabled(s,'magic')&&enabled(s,'body')&&h.alive&&h.hp>0&&!h.life.ended&&!h.transit&&s.people[h.lineage]?.alive&&s.people[h.lineage].status!=='captive'&&!s.people[h.lineage].needs.sleeping&&h.combat===e?.id&&e.kind==='enemy'&&e.alive&&!e.resolved&&!e.hidden&&s.areas[h.area]?.objects.includes(e));}
function unlock(s){const q=state(s);if(!on(s)||!q?.instruction||q.total!==3||q.method)return;q.method={id:'measured-ward',learnedAt:s.tick,origin:'practice',source:q.operations.map(e=>e.id),instruction:q.instruction.id};}
export function learnWardCourse(s,g,path,ctx={}){
 const h=s.hero,a=s.areas[h.area];if(!on(s)||!h.alive||h.transit||h.combat||s.people[h.lineage]?.needs.sleeping||!h.magic.spells.includes('ward')||!enabled(s,'faction-paths')||h.goal!==g||g.kind!=='factionDuty'||g.area!==h.area||physicalDistance(a,h.x,42)>3||a.faction!==g.faction||h.affiliation.primary!==g.faction||h.affiliation.paths[g.faction]!==path||path.suspended||path.service!=='study'||path.rank<2||g.remaining>0||h.counters.research%5!==0)return false;
 const q=(s.people[h.lineage].skillPractice ||= {}).magic ||= {operations:[],total:0};if(q.instruction)return false;
 q.instruction={id:h.lineage+'/ward-course/'+g.faction+'/'+(path.duties+1),kind:'archive-lesson',at:s.tick,area:h.area,faction:g.faction,branch:path.branch,duty:path.duties+1,research:h.counters.research};unlock(s);ctx.log?.(s,'На завершённом занятии закрытого архива разобрана медленная форма знакомого слова укрытия. Для освоения нужны три разных настоящих угрозы.','skill');return true;
}
export function cancelWard(s,reason){const m=s.hero.magic,p=m?.wardChannel;if(!p)return;m.wardLast={...p,status:'cancelled',ended:s.tick,reason};delete m.wardChannel;}
export function readyMeasuredWard(s,e){const h=s.hero,p=h.magic.wardChannel;return Boolean(on(s)&&woundFocus(s)&&knowsPracticalMethod(s,h.lineage,'magic')&&wardThreat(s,e)&&h.magic.spells.includes('ward')&&p&&p.actor===h.lineage&&p.enemy===e.id&&p.area===h.area&&p.started+1===s.tick&&p.cast===h.magic.casts+1&&!h.conditions.some(c=>c.id==='blessing'));}
export function wardTick(s){const h=s.hero,m=h.magic;if(!m)return;const e=s.areas[h.area]?.objects.find(o=>o.id===h.combat);if(m.wardChannel&&!readyMeasuredWard(s,e))cancelWard(s,'Подготовка прервана: изменились время, тело, угроза или место.');if(m.wardActive&&!h.conditions.some(c=>c.id==='blessing'&&c.since===m.wardActive.since&&c.until>s.tick))delete m.wardActive;}
export function canBeginMeasuredWard(s,e){const h=s.hero;return Boolean(on(s)&&knowsPracticalMethod(s,h.lineage,'magic')&&wardThreat(s,e)&&h.magic.spells.includes('ward')&&!h.conditions.some(c=>c.id==='blessing')&&(h.magic.cooldowns.ward||0)<=s.tick&&!h.magic.wardChannel&&h.magic.wardLast?.started!==s.tick&&h.magic.mana>=1&&!(enabled(s,'tactics')&&e.tactic==='charged'&&e.battle?.intent==='strike'));}
export function beginMeasuredWard(s,e,ctx){if(!canBeginMeasuredWard(s,e))return false;const h=s.hero,m=h.magic;m.mana--;m.responseSkipped=false;m.wardChannel={actor:h.lineage,area:h.area,enemy:e.id,started:s.tick,paid:1,cast:m.casts+1};h.lastAction='prepare';h.action='МАГИЯ';h.intent='Размеренно подготовить слово укрытия';h.reason='Одна мера маны уже вложена; защиты пока нет, противник продолжает действовать.';ctx.log?.(s,h.reason,'magic');return true;}
export function stampWardEffect(s,e,{paid,form}){if(!wardThreat(s,e))return;const h=s.hero,m=h.magic,c=h.conditions.find(c=>c.id==='blessing');if(!c||c.since!==s.tick)return;m.wardActive={actor:h.lineage,area:h.area,enemy:e.id,cast:m.casts,at:s.tick,paid,form,since:c.since};if(m.wardChannel){m.wardLast={...m.wardChannel,status:'completed',ended:s.tick,paid};delete m.wardChannel;}}
export function recordWardReply(s,e,raw,before,after){
 const h=s.hero,a=h.magic?.wardActive,c=h.conditions.find(c=>c.id==='blessing');if(!on(s)||!wardThreat(s,e)||!a||a.enemy!==e.id||a.area!==h.area||a.actor!==h.lineage||!c||c.since!==a.since||c.until<=s.tick||!(raw>0&&before>after))return;
 const q=state(s);if(q?.total>=3||q?.operations.some(r=>r.enemy===e.id))return;
 const event={id:h.lineage+'/ward/'+a.cast+'/'+e.id,tick:s.tick,area:h.area,actor:h.lineage,enemy:e.id,cast:a.cast,castAt:a.at,paid:a.paid,raw,before,after,form:a.form};h.magic.wardLastImpact=event;recordPracticalWard(s,event);unlock(s);
}
