import {stealthOn,stealthBody,stealthMemory,activeGuard} from './stealth-state.js';
import {knowsPracticalMethod,recordStealthLesson} from './skill-branches.js';
import {physicalDistance} from '../geometry.js';
import {canStartNPCActivity,npcAction,npcController} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
const ready=(s,p)=>{const b=p&&stealthBody(s,p.id);return p?.alive&&b&&!b.transit&&!b.combat&&!p.roadTransit&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.energy:p.needs.energy)>=35&&(b.lineage?b.hunger:p.needs.hunger)<60&&(b.lineage?b.hp>=b.maxHp*.75:p.health>=(p.maxHealth||100)*.75)?b:null;};
function restHere(s,p){const b=ready(s,p),a=b&&s.areas[b.area];return a&&!a.interior&&!activeGuard(s,a.id)&&!a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&physicalDistance(a,b.x,o.x)<18)?a.objects.find(o=>o.kind==='rest'&&physicalDistance(a,b.x,o.x)<=6):null;}
export function stealthLesson(s,pupil,teacher,{actor=s.hero.lineage,inTurn=false}={}){
 const a=ready(s,pupil),b=ready(s,teacher),rest=a&&restHere(s,pupil);if(!stealthOn(s)||!a||!b||pupil.id===teacher.id||![pupil.id,teacher.id].includes(actor)||!rest||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>3||!knowsPracticalMethod(s,teacher.id,'stealth')||knowsPracticalMethod(s,pupil.id,'stealth')||pupil.stealth?.lesson||marketWallet(s,pupil.id)<1||(pupil.stealth?.lastAt??-1)>=s.tick||(teacher.stealth?.lastAt??-1)>=s.tick)return false;
 const initiator=actor===pupil.id?pupil:teacher,own=stealthBody(s,actor),partner=actor===pupil.id?teacher:pupil,other=stealthBody(s,partner.id);
 if(own.lineage?own!==s.hero:npcController(s,initiator)!=='personal'||!canStartNPCActivity(s,initiator,{inTurn}))return false;
 if(other.lineage||partner.agenda.task||npcController(s,partner)!=='personal'||!canStartNPCActivity(s,partner)||partner.agenda.duty<.4||partner.agenda.sociability<.45||partner.agenda.curiosity<.6)return false;
 if(!npcAction(s,partner,'personal'))return false;
 const e={id:pupil.id+'/quiet-lesson',actor:pupil.id,teacher:teacher.id,initiator:actor,area:a.area,rest:rest.id,tick:s.tick,paid:1,before:marketWallet(s,pupil.id),after:marketWallet(s,pupil.id)-1,teacherBefore:marketWallet(s,teacher.id),teacherAfter:marketWallet(s,teacher.id)+1,voluntary:{person:partner.id,duty:partner.agenda.duty,sociability:partner.agenda.sociability,curiosity:partner.agenda.curiosity}};
 stealthMemory(pupil).lesson=e;setActorMoney(s,pupil,e.after);setActorMoney(s,teacher,e.teacherAfter);for(const p of [pupil,teacher]){const body=stealthBody(s,p.id);if(body.lineage)body.energy--;else p.needs.energy--;stealthMemory(p).lastAt=s.tick;}recordStealthLesson(s,pupil,teacher,e);return true;
}
export function stealthLessonTask(s,p){
 const b=ready(s,p),rest=b&&restHere(s,p);if(!stealthOn(s)||!rest||(p.stealth?.lastAt??-1)>=s.tick)return null;const known=knowsPracticalMethod(s,p.id,'stealth'),interested=b.lineage?known?b.personality.generosity>=.65:b.profession==='thief'||b.personality.curiosity>=.7:p.agenda.curiosity>=.7;if(!interested)return null;
 for(const q of Object.values(s.people)){const other=ready(s,q);if(q.id===p.id||!other||other.lineage||other.area!==b.area||physicalDistance(s.areas[b.area],b.x,other.x)>3||q.agenda.task||q.agenda.duty<.4||q.agenda.sociability<.45||q.agenda.curiosity<.6||npcController(s,q)!=='personal'||!canStartNPCActivity(s,q))continue;const otherKnown=knowsPracticalMethod(s,q.id,'stealth');if(known===otherKnown)continue;const pupil=known?q:p,teacher=known?p:q;if(pupil.stealth?.lesson||marketWallet(s,pupil.id)<1)continue;return {kind:'stealthLesson',target:b.area,x:b.x,pupil:pupil.id,teacher:teacher.id,person:q.id,remaining:1};}return null;
}
export function stealthLessonPlan(s,ctx){if(s.hero.goal)return false;const t=stealthLessonTask(s,s.people[s.hero.lineage]);if(!t)return false;ctx.goal(s,t.kind,t.target,t.x,t.teacher===s.hero.lineage?'Показать тихий проход':'Научиться выжидать внимание','Добровольный урок на безопасном месте отдыха; он не даёт невидимости.',{pupil:t.pupil,teacher:t.teacher,person:t.person});return true;}
export const stealthLessonAction=(s,p,g,options={})=>stealthLesson(s,s.people[g.pupil],s.people[g.teacher],{actor:p.id,...options});
