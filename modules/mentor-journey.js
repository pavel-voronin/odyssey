import {mentorEnabled,knownMentorCandidates,missMentor} from './mentor-memory.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {localContact} from './npc-contacts.js';
import {npcToolTeacherReady,reserveNPCToolTeacher,toolTeacherTurn} from './tool-teaching.js';
import {npcAction} from './npc-control.js';
import {setActorMoney} from '../actor-projection.js';
import {physicalDistance,areaOffset} from '../geometry.js';
const isGoal=g=>g?.kind==='seekMentor';
function release(s,p){const teacher=s.people[p.personalJourney?.teacher];if(teacher?.toolTeaching?.kind==='npc-mentor'&&teacher.toolTeaching.pupil===p.id)delete teacher.toolTeaching;}
export function pauseMentorJourney(s,p){release(s,p);}
function tell(s,p,ctx,text){p.agenda.knowledge ||= [];p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();if(p.area===s.hero.area&&!s.hero.transit)ctx.log(s,text,'npc');}
function finish(s,p,ctx,status,reason,retryResources=false){
 const g=p.personalJourney;release(s,p);g.status=status;g.ended=s.tick;g.reason=reason;g.retryResources=retryResources;p.agenda.task=null;p.agenda.due=s.tick+48;
 const path=npcKnownRoute(p,p.area,g.origin,knownNPCHazards(s,p));
 if(path.length>1){p.agenda.task={kind:'return',target:g.origin,x:g.originX??42,remaining:1,knownNavigation:true};p.status='wandering';}else p.status='resident';
 tell(s,p,ctx,`${p.name}: ${reason}`);return false;
}
export function startMentorJourney(s,p){
 const prior=p.personalJourney,lessons=isGoal(prior)?prior.lessons.map(e=>({...e})):[];
 if(!mentorEnabled(s)||prior?.status==='active'||p.toolSkills?.clamp||p.role==='ребёнок'||!p.alive||p.ailment||p.health<(p.maxHealth||100)*.85||p.needs.energy<60||p.needs.hunger>=35||p.agenda.wealth<3+(3-lessons.length)||p.agenda.curiosity<.65)return false;
 const memory=p.mentorMemory,need=memory?.need;if(!need)return false;
 const sameNeed=isGoal(prior)&&prior.property===need.property&&prior.episode===need.episode;
 if(sameNeed&&s.tick>prior.abandonAfter)return false;
 const selected=knownMentorCandidates(s,p).find(({contact})=>!memory.attempts.includes(`${need.property}/${need.episode}/${contact.person}/${contact.area}`)||sameNeed&&prior.retryResources&&contact.person===prior.teacher&&contact.area===prior.target);if(!selected)return false;
 const c=selected.contact,key=`${need.property}/${need.episode}/${c.person}/${c.area}`;memory.attempts.push(key);if(memory.attempts.length>8)memory.attempts.shift();
 memory.history ||= [];if(prior){memory.history.push({kind:prior.kind,status:prior.status,ended:prior.ended,target:prior.target,teacher:prior.teacher,paidLessons:lessons.length});if(memory.history.length>4)memory.history.shift();}
 p.personalJourney={kind:'seekMentor',skill:'clamp',teacher:c.person,name:c.name,target:c.area,x:c.x,placeName:c.place,addressSeen:c.seen,fee:c.fee,property:need.property,propertyArea:need.area,episode:need.episode,origin:sameNeed?prior.origin:p.area,originX:sameNeed?prior.originX:p.x,status:'active',phase:'independent',since:sameNeed?prior.since:s.tick,due:sameNeed?prior.due:s.tick+240,abandonAfter:sameNeed?prior.abandonAfter:s.tick+1200,talkedAt:null,lessons,offers:sameNeed?prior.offers.map(o=>({...o})):[]};return true;
}
export function mentorJourneyPlan(s,p,ctx){
 if(!mentorEnabled(s))return false;
 if(!isGoal(p.personalJourney)||p.personalJourney.status!=='active'){if(!startMentorJourney(s,p))return false;tell(s,p,ctx,`${p.name} решает освоить подгонку зажима. Он помнит ${p.personalJourney.name} в месте «${p.personalJourney.placeName}» и откладывает свои деньги на занятия.`);}
 refreshMentorAddress(s,p);const g=p.personalJourney;if(g.phase==='together'&&p.status!=='withHero'){g.phase='independent';g.parted=s.tick;}
 if(g.phase!=='independent')return false;
 if(s.tick>g.abandonAfter)return finish(s,p,ctx,'deferred','Срок обучения истёк. Уже оплаченные занятия и прежние знания остаются.');
 if(p.toolSkills?.clamp)return finish(s,p,ctx,'done','Нужный приём уже знаком. Можно вернуться к своей мастерской.');
 if(p.agenda.wealth<3+(3-g.lessons.length)*g.fee)return finish(s,p,ctx,'deferred','На уроки и рабочую деталь больше не хватает своих средств. Пока важнее заработок.',true);
 const path=npcKnownRoute(p,p.area,g.target,knownNPCHazards(s,p));if(!path.length)return finish(s,p,ctx,'deferred','Известная дорога к мастеру недоступна. Придётся заняться другим делом.');
 if(p.area===g.target){const body=localContact(s,g.teacher,g.target),visible=body&&physicalDistance(s.areas[p.area],p.x,body.x)<=12;if(visible)g.x=body.x;else if(physicalDistance(s.areas[p.area],p.x,g.x)<=1){missMentor(s,p,g.teacher,g.target);return finish(s,p,ctx,'missed',`По прежнему адресу не удалось застать ${g.name}. Нового адреса он не знает.`);}}
 p.agenda.task={kind:'mentorLesson',target:g.target,x:g.x,remaining:1,personal:true,knownNavigation:true,teacher:g.teacher};p.status='wandering';return true;
}
export function mentorTarget(s,p,t){
 if(t.kind!=='mentorLesson'||!mentorEnabled(s))return;
 refreshMentorAddress(s,p);const g=p.personalJourney;if(isGoal(g)&&g.status==='active'){t.target=g.target;t.x=g.x;}
 const body=localContact(s,t.teacher,p.area);if(p.area===t.target&&body&&physicalDistance(s.areas[p.area],p.x,body.x)<=12){const gap=areaOffset(s.areas[p.area],6),side=body.x<gap?1:body.x>100-gap?-1:p.x<=body.x?-1:1;t.x=Math.max(0,Math.min(100,body.x+side*gap));}
}
export function refreshMentorAddress(s,p){
 const g=p.personalJourney;if(!mentorEnabled(s)||!isGoal(g)||g.status!=='active')return;
 const c=p.mentorMemory?.contacts.find(c=>c.person===g.teacher&&c.missingAt==null&&c.seen>g.addressSeen);if(!c)return;
 if(c.area!==g.target){release(s,p);g.revisions ||= [];g.revisions.push({tick:s.tick,from:g.target,to:c.area,source:'actual-contact'});if(g.revisions.length>4)g.revisions.shift();}
 Object.assign(g,{target:c.area,x:c.x,name:c.name,placeName:c.place,addressSeen:c.seen});
}
export function mentorLessonAction(s,p,ctx){
 const g=p.personalJourney,t=p.agenda.task;if(t?.kind!=='mentorLesson')return false;
 if(!mentorEnabled(s)){release(s,p);p.agenda.task=null;return true;}
 if(!isGoal(g)||g.status!=='active'||g.phase!=='independent'){release(s,p);p.agenda.task=null;return true;}
 if(s.tick>g.abandonAfter){finish(s,p,ctx,'deferred','Личный срок прошёл. Учёбу придётся отложить.');return true;}
 const teacher=s.people[g.teacher],body=localContact(s,g.teacher,p.area);
 if(p.area!==g.target||!body||physicalDistance(s.areas[p.area],p.x,body.x)>12){missMentor(s,p,g.teacher,g.target);finish(s,p,ctx,'missed',`Мастера ${g.name} нет у известного места встречи. Урок не оплачен.`);return true;}
 if(physicalDistance(s.areas[p.area],p.x,body.x)>9)return true;
 if(g.lessons.at(-1)?.tick===s.tick)return true;
 if(p.agenda.wealth<3+(3-g.lessons.length)*g.fee){finish(s,p,ctx,'deferred','Не хватает средств на оставшиеся уроки и материал. Он сохраняет изученное и ищет заработок.',true);return true;}
 if(teacher.agenda?.job!=='artisan'&&!teacher.toolSkills?.clamp){missMentor(s,p,g.teacher,g.target);finish(s,p,ctx,'missed',`${g.name} больше не берётся учить этому приёму. Старые сведения оказались ненадёжны.`);return true;}
 if(!npcToolTeacherReady(s,teacher,p)){release(s,p);return true;}
 const r=teacher.toolTeaching;
 if(r?.kind!=='npc-mentor'||r.pupil!==p.id||r.until<s.tick){reserveNPCToolTeacher(s,teacher,p);return true;}
 if(r.turn!==s.tick&&(!npcAction(s,teacher,'personal')||!toolTeacherTurn(s,teacher)))return true;
 setActorMoney(s,p,p.agenda.wealth-g.fee);setActorMoney(s,teacher,teacher.agenda.wealth+g.fee);
 p.needs.energy=Math.max(0,p.needs.energy-2);teacher.needs.energy=Math.max(0,teacher.needs.energy-2);
 g.lessons.push({teacher:teacher.id,tick:s.tick,area:p.area,paid:g.fee});teacher.toolTeaching.until=s.tick+24;
 tell(s,p,ctx,`${p.name} платит ${g.name} за занятие по подгонке зажима: ${g.lessons.length}/3, ◈${g.fee} из своих денег.`);
 if(g.lessons.length===3){p.toolSkills ||= {};p.toolSkills.clamp={learnedAt:s.tick,source:'npc-paid-lessons',lessons:g.lessons.map(e=>({...e}))};finish(s,p,ctx,'done','Три занятия сложились в знакомый приём. Он возвращается чинить свой верстак.');}
 return true;
}
export function mentorOfferExists(s,p){return isGoal(p.personalJourney)&&p.personalJourney.offers.some(o=>o.hero===s.hero.lineage);}
export function offerMentorEscort(s,p,ctx){
 const g=p.personalJourney;if(!mentorEnabled(s)||!isGoal(g)||g.status!=='active')return true;
 if(g.offers.some(o=>o.hero===s.hero.lineage)||g.offers.length>=8)return false;
 const h=s.hero,body=localContact(s,p.id,h.area),path=npcKnownRoute(p,p.area,g.target,knownNPCHazards(s,p));
 const shared=h.goal?.area&&(ctx.knownRoute||ctx.route)?.(s,h.area,h.goal.area);
 const allowed=Boolean(body&&physicalDistance(s.areas[h.area],h.x,body.x)<=12&&s.tick<g.due&&path.length>1&&shared?.length>1&&path[1]===shared[1]&&!s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved));
 g.offers.push({hero:h.lineage,tick:s.tick,decision:allowed?'pending':'declined'});
 if(!allowed)ctx.log(s,`${p.name}: «Мне к ${g.name}. Сейчас нам не по пути; я пойду своей дорогой».`,'relationship');return allowed;
}
export function finishMentorOffer(s,p,joined){const g=p.personalJourney;if(!isGoal(g))return;const o=g.offers.find(o=>o.hero===s.hero.lineage);if(o?.decision==='pending')o.decision=joined?'accepted':'declined';if(joined){g.phase='together';release(s,p);}}
export function endDeadMentorJourney(s,p){
 const g=p.personalJourney;if(p.alive||!isGoal(g)||g.status!=='active')return;
 release(s,p);g.status='failed';g.ended=p.died??s.tick;g.reason='Жизнь ученика закончилась. Уже оплаченные занятия остались частью его истории.';if(p.agenda.task?.kind==='mentorLesson')p.agenda.task=null;
}
