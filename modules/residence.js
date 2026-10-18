import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {isTown,hasHabit} from './common.js';

// Shared local circumstances in the ordinary planner, without a resident controller.
export function localNeedsPlan(s,ctx){
 const h=s.hero,r=h.life.residence;
 const a=s.areas[h.area];
 if(r?.away?.from===a.id&&a.civic?.food>0)delete r.away;
 if(enabled(s,'supply')&&isTown(a)&&a.civic?.food===0){
  const refuge=ctx.closest(s,t=>knownArea(s,t)&&isTown(t)&&t.id!==a.id&&t.civic?.food>=20);
  if(refuge){
   h.life.residence ||= {};const memory=h.life.residence;
   if(memory.lastDeparture!==a.id+':food'){memory.lastDeparture=a.id+':food';ctx.log(s,`${h.name} уходит из «${a.name}»: здесь закончилась еда. Он ищет стол и доступную работу в месте «${refuge.name}». Дом и прежнее ремесло не забыты.`,'choice');}
   memory.away={from:a.id,to:refuge.id,since:s.tick,cause:'food'};
   ctx.goal(s,'explore',refuge.id,42,'Найти работу и еду',`В «${a.name}» опустели запасы. Привязанность к дому не отменяет нужд.`);return true;
  }
  return false;
 }
 return false;
}

export function quietSignals(s){
 const h=s.hero,p=h.commitments?.personal;
 return JSON.stringify([h.gold,p&&[p.status,p.target,p.since],h.quests.filter(q=>q.status==='active').map(q=>q.id),(s.storyCases||[]).filter(c=>c.owner===h.lineage&&c.status==='active').map(c=>[c.id,c.stage]),Object.values(s.workOrders||{}).filter(c=>c.helper===h.lineage&&['quoted','active'].includes(c.status)).map(c=>[c.id,c.status]),Object.values(h.property?.known||{}).map(k=>[k.area,k.state,k.owner,k.price]),h.memory.facts.at(-1)?.text,h.memory.people.length,s.areas[h.area].civic?.food===0,h.workMaterials?.revision||0]);
}
export function quietPlan(s,ctx){
 const h=s.hero,a=s.areas[h.area];
 if(!isTown(a)||!hasHabit(h,'homebody')&&h.personality.curiosity>=.4)return false;
 const signals=quietSignals(s);
 if(h.memory.lastQuiet!==signals){h.memory.lastQuiet=signals;ctx.log(s,`${h.name} пока не видит срочных доступных дел и остаётся отдохнуть. Новые нужды или известия могут изменить решение.`,'life');}
 ctx.goal(s,'leisure',a.id,h.x,'Побыть среди знакомых мест','Срочных доступных дел сейчас нет. Он отдыхает и вскоре снова оценит нужды, обещания и новости.',{remaining:12,signals});return true;
}
