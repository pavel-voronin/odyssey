import {enabled} from '../rules.js';
import {areaScale} from '../geometry.js';
import {knownArea} from '../actor-atlas.js';
import {npcController} from './npc-control.js';
import {incomingReply} from './combat-forecast.js';
import {combatOptions} from './combat-judgment.js';
import {questReady} from './quests.js';
import {partyDemand} from './party-needs.js';
import {deliverSafetyAdvice,DANGER_CONTACT_TICKS} from './danger-contact.js';
export const INTENTION_POLICY={sight:30,hearing:9,history:12,window:48};
const distance=(s,a,b)=>Math.abs(a-b)*areaScale(s.areas[s.hero.area]);
const contactId=(p,c)=>`${p.id}/${c.enemy}/${c.area}/${c.since}`;
const ensure=h=>h.intentions||(h.intentions={current:null,suspended:null,recent:[],last:null});
function localPerson(s,p){return p?.area===s.hero.area&&Number.isFinite(p.x)&&distance(s,p.x,s.hero.x)<=INTENTION_POLICY.sight;}
// Ephemeral references to canonical affairs, never another quest/inventory registry.
export function knownAffairs(s){
 const h=s.hero,affairs=[];
 if(enabled(s,'quests'))for(const q of h.quests)if(q.status==='active')affairs.push({domain:'quest',id:q.id,title:q.title||q.kind,urgency:q.deadline?Math.max(0,80-(q.deadline-s.tick)):0});
 if(enabled(s,'commitments')&&h.commitments?.personal?.status==='active')affairs.push({domain:'commitment',id:h.commitments.personal.cause,title:'Подготовиться после прежнего опыта',urgency:0});
 if(h.hp<h.maxHp*Math.max(.55,.35+(1-h.personality.courage)*.28))affairs.push({domain:'need',id:'health',title:'Позаботиться о ранах',urgency:100});
 if(h.energy<30)affairs.push({domain:'need',id:'rest',title:'Восстановить силы',urgency:100});
 if(enabled(s,'body')&&h.hunger>45)affairs.push({domain:'need',id:'food',title:'Найти еду',urgency:h.hunger>=75?100:20});
 if(partyDemand(s))affairs.push({domain:'need',id:'party',title:'Позаботиться о спутниках',urgency:100});
 if(enabled(s,'personal-aid'))for(const p of Object.values(s.people)){const r=p.aidRequest;if(localPerson(s,p)&&r?.to===h.lineage&&['pending','agreed'].includes(r.status)&&r.until>=s.tick)affairs.push({domain:'aid',id:r.id,title:'Помочь: '+p.name,urgency:p.health<(p.maxHealth||100)*.35?98:45});}
 return affairs.sort((a,b)=>b.urgency-a.urgency||a.domain.localeCompare(b.domain)||String(a.id).localeCompare(String(b.id)));
}
export function visibleAssaults(s){
 const h=s.hero;if(h.transit)return [];
 return Object.values(s.people).filter(p=>p.id!==h.lineage&&p.alive&&localPerson(s,p)).flatMap(p=>{
  const c=p.dangerContact;if(!c||c.area!==h.area||s.tick-c.tick>DANGER_CONTACT_TICKS||s.tick<c.tick)return [];
  const enemy=s.areas[h.area].objects.find(e=>e.kind==='enemy'&&e.id===c.enemy&&e.alive&&!e.resolved);
  if(!enemy||distance(s,enemy.x,h.x)>INTENTION_POLICY.sight||distance(s,enemy.x,p.x)>16)return [];
  const wound=p.health<(p.maxHealth||100)*.35?'critical':p.health<(p.maxHealth||100)*.8?'wounded':'holding';
  // A guard just recruited by this hero is already responding to the same
  // danger. Do not immediately interrupt that agreement with another warning.
  if(wound!=='critical'&&s.society.orders.some(o=>o.person===p.id&&o.localAssistance&&o.owner===h.lineage))return [];
  return [{id:contactId(p,c),person:p.id,enemy:enemy.id,area:h.area,wound,tick:c.tick}];
 }).sort((a,b)=>(a.wound==='critical'?0:1)-(b.wound==='critical'?0:1)||b.tick-a.tick||a.id.localeCompare(b.id));
}
function guardAttack(p){return Number.isFinite(p.attack)?p.attack:3+Math.min(4,Math.floor((p.agenda?.work||0)/8));}
function availableGuards(s,victim){
 if(!enabled(s,'orders')||!s.areas[s.hero.area].civic)return [];
 return Object.values(s.people).filter(p=>p.id!==victim&&p.alive&&localPerson(s,p)&&p.status==='resident'&&p.agenda&&(p.role==='страж'||p.agenda.job==='guard')&&!p.agenda.task&&!p.needs?.sleeping&&p.health>=(p.maxHealth||100)*.6&&(p.needs?.energy??100)>=30&&(p.needs?.hunger??0)<75&&guardAttack(p)>0&&npcController(s,p)==='personal').sort((a,b)=>distance(s,a.x,s.hero.x)-distance(s,b.x,s.hero.x)||a.id.localeCompare(b.id));
}
export function assessAssistance(s,event){
 const h=s.hero,p=s.people[event.person],enemy=s.areas[h.area].objects.find(e=>e.id===event.enemy),affairs=knownAffairs(s),trust=h.relations[p.id]?.trust||0;
 const care=h.personality.generosity+Math.max(-.3,Math.min(.3,trust/100))+(h.alignment>30?.1:h.alignment< -30?-.2:0);
 if(care<.3)return {method:'leave',reason:'Не готов вмешиваться в чужой бой. У него остаются собственные дела.'};
 const selfCare=affairs.some(a=>a.domain==='need'&&a.urgency>=100);
 const warning=enabled(s,'orders')&&s.society.orders.some(o=>o.person===p.id&&o.enemy===enemy.id&&o.stage==='fighting');
 if(selfCare)return {method:'leave',reason:'Собственное состояние не позволяет вмешаться. Сначала нужно выжить самому.'};
 if(affairs.some(a=>a.domain==='quest'&&a.urgency>=78)&&event.wound!=='critical')return {method:'leave',reason:'У собственного обещания почти не осталось времени. Он не берётся за ещё один риск.'};
 if(affairs.some(a=>a.domain==='aid'&&a.urgency>=98)&&event.wound!=='critical')return {method:'leave',reason:'Рядом уже ждёт помощи тяжелораненый человек. Он не бросает его ради ещё одного дела.'};
 const options=combatOptions(s,enemy),weapon=options[0],average=o=>(o.damage.min+o.damage.max)/2,reply=incomingReply(s,enemy);
 const opening=options.filter(o=>o.damage).sort((a,b)=>average(b)-average(a))[0],remaining=Math.ceil(Math.max(0,enemy.hp-average(opening))/Math.max(1,average(weapon)));
 // Price one currently available spell, never repeat it as if mana and cooldown
 // were unlimited. Further replies are conservatively budgeted against a weapon.
 const risk=opening.reply.max+reply.max*remaining,guard=availableGuards(s,p.id)[0],certainFinish=options.some(o=>o.win&&o.reply.max===0);
 if(certainFinish||h.personality.courage>=.45&&risk<h.hp*(.4+h.personality.courage*.5))return {method:'fight',reason:certainFinish?'Знает доступный способ закончить этот бой до ответного удара. Ради человека можно отвлечься от сбора.':'Видит посильный способ остановить противника. Человек в опасности важнее несрочного сбора.',risk};
 if(guard)return {method:'guard',guard:guard.id,reason:'Бой для него слишком опасен. Поблизости есть свободный страж; можно попросить настоящую помощь.',risk};
 if(warning)return {method:'warn',reason:'Не потянет этот бой, но может предупредить человека и предложить отойти.',risk};
 return {method:'leave',reason:'Посильного способа помочь и доступного стража не видно. Он не обещает невозможного.',risk};
}
function remember(h,episode){const state=ensure(h);state.last={...episode,ended:episode.ended};state.recent.push(episode.id);if(state.recent.length>INTENTION_POLICY.history)state.recent.shift();}
function stop(s,outcome,text){
 const h=s.hero,state=ensure(h),episode=state.current;if(!episode)return;
 episode.status=outcome;episode.ended=s.tick;episode.result=text;remember(h,episode);state.current=null;
 if(h.goal?.intention===episode.id)h.goal=null;
}
export function relevantSuspension(s,saved,ctx){
 const h=s.hero,g=saved.action,a=s.areas[g.area];if(!a||!knownArea(s,a))return 'Прежний путь больше не известен.';
 if(g.intention&&h.intentions?.current?.id!==g.intention)return 'Прежнее срочное вмешательство уже завершилось или было отложено. Нужен новый выбор по нынешним обстоятельствам.';
 if((h.memory.avoided[g.area]||0)>s.tick)return 'После опасности он пока избегает прежнего места.';
 if(g.quest){const q=h.quests.find(q=>q.id===g.quest);if(!enabled(s,'quests')||q?.status!=='active')return 'Прежнее обещание больше не действует.';if(questReady(s,q))return 'Для прежнего обещания уже достаточно собранного; нужен новый план.';}
 if(g.kind==='forage'){
  if(!enabled(s,'supply'))return 'Сбор сейчас отключён.';
  if(h.hunger<30&&h.inventory.rations>=3)return 'Еда уже есть в сумке. Прежний сбор больше не нужен.';
  if(g.area===h.area&&!g.search&&!(a.forage?.stock>0))return 'На месте больше нет прежнего запаса.';
 }
 if(g.kind==='collect'&&g.area===h.area){const o=a.objects.find(o=>o.id===g.object);if(!o||o.taken||o.kind==='herb'&&o.count<=0)return 'Прежняя находка уже исчерпана.';}
 if(g.area!==h.area&&!(ctx.knownRoute||ctx.route)(s,h.area,g.area).length)return 'Известного доступного возврата нет.';
 return null;
}
function resume(s,ctx){
 const h=s.hero,state=h.intentions;if(!state?.suspended||h.goal||h.combat||h.transit)return false;
 const saved=state.suspended,reason=relevantSuspension(s,saved,ctx);state.suspended=null;
 if(reason){ctx.log(s,reason,'plan');return false;}
 h.goal=saved.action;h.intent=saved.intent;h.reason='Ситуация изменилась. Прежнее дело ещё актуально; собранное и сделанные шаги сохранились.';
 if(h.planning)h.planning.checked=null;
 ctx.log(s,`После вмешательства ${h.name} возвращается к прежнему делу: ${saved.intent}.`,'plan');return true;
}
function start(s,event,assessment,ctx){
 const h=s.hero,state=ensure(h),p=s.people[event.person];
 const episode={...event,method:assessment.method,guard:assessment.guard||null,started:s.tick,status:'active',reason:assessment.reason};
 if(assessment.method==='leave'){episode.status='declined';episode.ended=s.tick;remember(h,episode);ctx.log(s,`${h.name} замечает опасность рядом с ${p.name}. ${assessment.reason}`,'choice');return;}
 if(!state.suspended&&h.goal)state.suspended={action:h.goal,intent:h.intent,reason:h.reason};
 state.current=episode;
 const target=assessment.method==='fight'?s.areas[h.area].objects.find(e=>e.id===event.enemy):s.people[assessment.method==='guard'?assessment.guard:event.person];
 ctx.goal(s,assessment.method==='fight'?'hunt':'assist',h.area,target.x,assessment.method==='fight'?`Вступиться: ${p.name}`:assessment.method==='guard'?'Позвать местного стража':`Предупредить: ${p.name}`,assessment.reason,{...(assessment.method==='fight'?{object:event.enemy}:{}),intention:episode.id});
 ctx.log(s,`${h.name} прерывает прежнее занятие: рядом с ${p.name} опасность. ${assessment.reason}`,'choice');
}
export function intentionTick(s,ctx){
 const h=s.hero,state=h.intentions;
 if(!enabled(s,'intentions')){
  if(state?.current){stop(s,'paused','Новые вмешательства отключены.');resume(s,ctx);}else resume(s,ctx);return;
 }
 if(state?.current){
  const e=state.current,p=s.people[e.person];
  if(!localPerson(s,p)){stop(s,'out-of-sight','Человек больше не виден. Его дальнейшая судьба пока неизвестна.');resume(s,ctx);}
  else if(!p.alive){stop(s,'too-late',`${p.name} погиб. Вмешательство не спасло его.`);ctx.log(s,`${p.name} погиб. Прежние дела придётся оценить заново.`,'loss');resume(s,ctx);}
  else if(!s.areas[h.area].objects.some(o=>o.id===e.enemy&&o.alive&&!o.resolved)){stop(s,'danger-ended','Противник больше не угрожает этому месту.');resume(s,ctx);}
  else if(s.tick-e.started>INTENTION_POLICY.window||h.goal&&h.goal.intention!==e.id){stop(s,'withdrawn','Не удалось продолжить вмешательство. Собственная безопасность и новые обстоятельства изменили план.');resume(s,ctx);}
  return;
 }
 resume(s,ctx);
 const event=visibleAssaults(s).find(e=>!h.intentions?.recent.includes(e.id));if(event)start(s,event,assessAssistance(s,event),ctx);
}
export function intentionTarget(s){
 const g=s.hero.goal;if(g?.kind!=='assist')return true;
 const e=s.hero.intentions?.current;if(!enabled(s,'intentions')||!e||e.id!==g.intention){s.hero.goal=null;return false;}
 const p=s.people[e.method==='guard'?e.guard:e.person];if(!p?.alive||!localPerson(s,p)){stop(s,'unavailable','Нужного человека больше не видно.');return false;}g.x=e.method==='warn'&&distance(s,p.x,s.hero.x)<=INTENTION_POLICY.hearing?s.hero.x:p.x;return true;
}
export function assistanceAction(s,ctx){
 const h=s.hero,e=h.intentions?.current;if(!e||!intentionTarget(s))return false;
 const enemy=s.areas[h.area].objects.find(o=>o.id===e.enemy&&o.alive&&!o.resolved),person=s.people[e.method==='guard'?e.guard:e.person];
 if(!enemy||!person||distance(s,h.x,person.x)>(e.method==='warn'?INTENTION_POLICY.hearing:1)){stop(s,'unavailable','Ситуация успела измениться.');return false;}
 h.lastAction='talk';h.action='РАЗГОВОР';h.energy=Math.max(0,h.energy-1);
 if(e.method==='warn'){
  const sent=deliverSafetyAdvice(s,person,enemy,h.lineage);ctx.log(s,sent?`${h.name}: «${person.name}, отойди от опасности!» Он предупреждает; решение и следующий шаг остаются за самим человеком.`:`${person.name} уже услышал предупреждение. Повтор не даёт ему второго действия.`,'talk');stop(s,'warning-delivered','Предупреждение передано, исход ещё не известен.');return true;
 }
 const eligible=availableGuards(s,e.person).some(p=>p.id===person.id),attack=guardAttack(person),duty=person.agenda?.duty??.5,burden=Math.ceil(enemy.hp/Math.max(1,attack))*(enemy.attack+2);
 if(!eligible||burden>person.health*(.7+duty)&&duty<.85){ctx.log(s,`${person.name} не берётся за бой: ${!eligible?'уже занят или не готов.':'считает риск чрезмерным.'}`,'talk');stop(s,'guard-declined','Страж не согласился.');return true;}
 person.attack=attack;person.status='guarding';
 // The interaction assigns an existing person; preserve its current actionControl.
 // If it already acted, orders cannot claim another action until the next tick.
 s.society.orders.push({person:person.id,owner:h.lineage,from:h.area,to:h.area,enemy:enemy.id,stage:'fighting',remaining:0,localAssistance:{person:e.person,asked:s.tick}});
 ctx.log(s,`${person.name} соглашается помочь ${s.people[e.person].name}. В бой пойдёт этот страж, со своими силами и припасами.`,'orders');stop(s,'guard-agreed','Местный страж принял просьбу; результат боя ещё впереди.');return true;
}
