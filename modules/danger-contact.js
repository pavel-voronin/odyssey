import {enabled} from '../rules.js';
export const DANGER_CONTACT_TICKS=24;
// A mechanical fact of an actual NPC reply, not an event fabricated for a quest
// and not a view-only actorFacts record used to drive the simulation.
export function recordDangerContact(s,p,enemy,damage,controller){
 if(!enabled(s,'intentions'))return;
 const old=p.dangerContact,same=old?.enemy===enemy.id&&old.area===p.area&&s.tick-old.tick<=8;
 p.dangerContact={enemy:enemy.id,area:p.area,x:p.x,enemyX:enemy.x,since:same?old.since:s.tick,tick:s.tick,damage:Math.max(0,damage),controller};
}
export function deliverSafetyAdvice(s,p,enemy,from){
 const previous=p.safetyAdvice;
 if(previous?.status==='pending'&&s.tick-previous.at<=DANGER_CONTACT_TICKS)return false;
 p.safetyAdvice={from,enemy:enemy.id,area:p.area,at:s.tick,status:'pending'};return true;
}
export function guardSafetyAdvice(s,p,enemy){
 if(!enabled(s,'intentions'))return null;
 const advice=p.safetyAdvice;if(advice?.status!=='pending'||s.tick<=advice.at)return null;
 if(s.tick-advice.at>DANGER_CONTACT_TICKS||advice.enemy!==enemy.id||advice.area!==p.area){advice.status='stale';advice.answered=s.tick;return null;}
 const maximum=p.maxHealth||100,duty=p.agenda?.duty??.5,bond=p.agenda?.bonds?.[advice.from]||0;
 const strike=(enemy.attack||1)*(enabled(s,'tactics')&&enemy.tactic==='charged'&&enemy.battle?.intent==='strike'?3:1)+2;
 const retreat=Boolean(p.health<maximum*.8||strike>=p.health*.3||duty<.65||bond>=15||(p.needs?.energy??100)<30||p.needs?.sleeping);
 advice.status=retreat?'accepted':'declined';advice.answered=s.tick;
 advice.reason=retreat?'Предупреждение и собственное состояние убеждают отойти.':'Считает, что ещё способен удержать дорогу.';
 return {retreat,reason:advice.reason,from:advice.from};
}
