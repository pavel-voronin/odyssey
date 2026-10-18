import {NPC_TASKS,NPC_JOBS} from './npc-labels.js';
import {companionAffairsEnabled} from './modules/companion-affair-state.js';
import {materialDeliveryEnabled,pendingMaterialContract,materialContracts} from './modules/material-delivery-state.js';
import {partyCombatOn} from './modules/party-combat-policy.js';
// Read-only presentation of the existing NPC controller; never a second travel or work action.
export function projectNPCView(s,h,p,leader,previous){
 if(!p.alive){const route=p.deathJourney;h.lastAction='dead';h.transit=route&&s.areas[route.from]&&s.areas[route.to]?{...route,remaining:0,total:1,viewOnly:true,dead:true}:!p.area?{from:h.area,to:h.area,mode:'road',remaining:0,total:1,viewOnly:true,unknown:true,dead:true}:null;h.intent='Жизнь закончилась. Мир продолжается';h.reason='Можно остаться наблюдать это место или явно выбрать другую историю.';return;}
 const journey=s.society?.journeys.find(j=>j.person===p.id&&j.movement==='timed'),remaining=journey?Math.max(0,journey.arrival-s.tick):0,old=h.transit;
 if(leader?.transit)h.transit={...leader.transit,viewOnly:true};
 else if(leader)h.transit=null;
 else if(!p.area&&journey&&s.areas[journey.from]&&s.areas[journey.to])h.transit={from:journey.from,to:journey.to,mode:'road',remaining,total:old?.from===journey.from&&old?.to===journey.to?old.total:Math.max(1,remaining),viewOnly:true};
 else if(!p.area)h.transit={from:h.area,to:h.area,mode:'road',remaining:0,total:1,viewOnly:true,unknown:true};
 else h.transit=null;
 if(p.liftTransit)h.transit={...p.liftTransit,mode:'lift',liftRide:{...p.liftTransit},viewOnly:true};
 const moved=previous.area!==h.area||previous.x!==h.x,task=p.agenda?.task,job=p.agenda?.job,convoy=s.logistics?.convoys.find(c=>c.person===p.id),order=s.society?.orders.find(o=>o.person===p.id),publicJourney=s.society?.journeys.find(j=>j.person===p.id&&j.movement==='physical');
 if(moved||h.npcProfile?.viewTick!==s.tick)h.lastAction=p.needs?.sleeping?'rest':h.transit?'travel':moved?'walk':task?.kind||'idle';
 if(!moved&&!h.transit&&!p.needs?.sleeping&&task?.kind==='forgeWork')h.lastAction='work';
 h.intent=h.transit?.unknown?'В пути · положение неизвестно':h.transit?`В пути: ${s.areas[h.transit.to].name}`:p.needs?.sleeping?'Восстанавливает силы':leader?`В отряде: ${leader.name}`:convoy?`Везёт припасы: ${s.areas[convoy.to]?.name||'место назначения'}`:order?'Выполняет службу':publicJourney?`Путешествует: ${s.areas[publicJourney.to]?.name||'место назначения'}`:NPC_TASKS[task?.kind]||'Между собственными делами';
 h.reason=journey?.reason||(task?.addressName?`Направляется в ${task.addressName}.`:job?`Собственное дело: ${NPC_JOBS[job]||job}.`:'Работа, нужды и дорога принадлежат этому человеку.');
 const talk=s.workshopDisputes?.[task?.dispute];
 if(talk&&['workshopTalk','workshopWait'].includes(task.kind))h.reason=task.kind==='workshopWait'?'Сам согласился подождать пополнения; материал ещё не куплен. Деньги и собственный срок остаются его.':'У двух владельцев повреждённые мастерские. Каждый сообщает свою нужду и решает за себя.';
 if(!leader&&!convoy&&!order&&!publicJourney&&!h.transit&&!p.needs.sleeping){
  if(task?.kind==='tavernVisit'){h.intent=task.host?'Открыть свой общий зал':'Зайти в таверну';h.reason='Подходит к настоящей двери; время и собственные нужды продолжаются.';}
  else if(task?.kind==='tavernLeave'){h.intent='Выйти из таверны';h.reason='Он возвращается к той же двери и своим другим делам.';}
  else if(task?.kind==='roomBook'){h.intent='Договориться о комнате';h.reason='Ищет хозяина для настоящей встречи. Оплата ещё не внесена.';}
  else if(task?.kind==='roomSleep'){h.intent=p.area===task.target?'Отдохнуть в гостевой комнате':'Дойти до оплаченной комнаты';h.reason='Ночлег оплачен на ограниченный срок. Остальные нужды продолжаются.';if(p.area===task.target&&Math.abs(p.x-task.x)<=1)h.lastAction='rest';}
  else if(p.interiorStay){h.intent='В общем зале';h.reason='Ненадолго остаётся внутри. Голод, усталость или закрытие могут изменить планы.';}
 }
 if(h.transit?.unknown)h.reason='Новое местоположение не записано. Можно выбрать другого наблюдателя.';
 if(p.literacyTeaching&&p.literacyTeaching.until>=s.tick&&!h.transit&&!p.needs.sleeping){h.intent=p.literacyTeaching.turn<0?'Получил просьбу разобраться с записью':'Помогает разобраться с записью';h.reason=p.literacyTeaching.turn<0?'Ответит в свой свободный ход; занятия ещё не оплачены.':'Ждёт своего ученика или читает с ним. Время, нужды и плата настоящие.';if(p.literacyTeaching.turn===s.tick&&p.literacyTeaching.used)h.lastAction='talk';}
 const deed=p.npcIntentions?.current;if(deed&&task?.deedId===deed.id&&!leader&&!convoy&&!order&&!publicJourney&&!h.transit&&!p.needs.sleeping){h.intent=task.kind==='familySupply'?'Купить лекарство для родного':deed.title;h.reason=deed.reason;}
 const shared=p.companionAffairs?.agreement;if(leader&&shared&&s.tick<shared.until&&companionAffairsEnabled(s)&&!p.needs.sleeping)h.reason=p.companionAffairs.history.at(-1)?.reason||h.reason;
 const study=p.personalJourney;
 const lesson=leader?.campLesson,part=lesson&&s.areas[lesson.area]?.objects.find(o=>o.id===lesson.part);
 if(lesson?.lastTick===s.tick&&part&&p.actionControl?.tick===s.tick&&p.actionControl.phases.includes('camp-study')&&[lesson.teacher,lesson.pupil].includes(p.id)&&!h.transit){
  const teacher=s.people[lesson.teacher],pupil=s.people[lesson.pupil],remaining=pupil.skillPractice.craft.study?.remaining||0;
  h.lastAction='work';h.intent=p.id===lesson.teacher?`Показывает подгонку: ${pupil.name}`:`Учится подгонке у ${teacher.name}`;
  h.reason=lesson.status==='done'?'Совместная практика завершена. Приём освоен, настоящая заготовка стала образцом.':`Работают над настоящей деталью у костра. Осталось ${remaining} учебных действий; время и силы тратят оба.`;
 }
 if(study?.kind==='seekMentor'&&study.status==='active'&&task?.kind==='mentorLesson'&&!h.transit&&!p.needs.sleeping&&!leader){h.intent=p.area===study.target?'Застать мастера и продолжить занятия':'Дойти до знакомого наставника';h.reason=`Он помнит ${study.name} в месте «${study.placeName}». Оплачено занятий: ${study.lessons.length}/3. Дорогу и обучение оплачивает сам.`;if(study.lessons.at(-1)?.tick===s.tick)h.lastAction='talk';}
 if(p.agenda&&'home' in p.agenda)h.life.home=p.agenda.home;
 const service=Object.values(s.workOrders||{}).find(c=>c.client===p.id&&c.status==='active');
 const waiting=s.workshopDisputes?.[p.workshopTalk?.active];
 if(s.rules?.['workshop-dispute']!==false&&waiting&&['agreed','partial'].includes(waiting.status)&&waiting.first!==p.id&&!waiting.completed[p.id]&&waiting.quotes[p.id]?.deadline>s.tick&&!h.transit&&!task&&!convoy&&!order&&!leader&&!p.needs?.sleeping){h.intent='Ждёт своей очереди на ремонт';h.reason='Согласился подождать ради соседа. Своя мастерская ещё повреждена; у ожидания есть срок.';}
 if(service&&!h.transit&&!task&&!convoy&&!order&&!leader&&!p.needs?.sleeping){h.intent='Ожидает ремонта мастерской';h.reason=`На заказе остаётся ◈${service.escrow}. Оплата мастеру выдаётся после восстановления.`;}
 const aid=p.aidRequest;if(aid&&['pending','agreed'].includes(aid.status)&&aid.until>=s.tick&&!h.transit&&!task&&!convoy&&!order&&!leader&&!p.needs?.sleeping){h.intent=aid.status==='agreed'?'Ждёт медицинской помощи':'Просит помощи';h.reason=`Помощник: ${aid.helperName||'знакомый путник'}. Остальные нужды и время продолжаются.`;h.lastAction='talk';}
 if(materialDeliveryEnabled(s)&&!leader&&!convoy&&!order&&!publicJourney&&!h.transit&&!p.needs?.sleeping){
  const delivery=pendingMaterialContract(s,p.id);
  if(delivery?.status==='quoted'){h.intent=delivery.client===p.id?'Ждёт ответа на предложение доставки':'Может ответить на предложение доставки';h.reason='Путник ещё не согласился. Аванс не выдан.';}
  else if(delivery?.carrier===p.id&&task?.delivery===delivery.id)h.reason=delivery.status==='returning'?'Сырьё при нём. Оплата — при встрече.':'Аванс получен. За ним ещё дорога и работа.';
  if(p.materialMemory?.lastActionTick===s.tick){const latest=materialContracts(s,p.id).at(-1);h.lastAction=latest?.receipt?.tick===s.tick?'trade':latest?.lastWorkTick===s.tick?'work':'talk';}
 }
 const battle=p.partyCombat;
 if(partyCombatOn(s)&&leader&&battle?.leader===leader.lineage&&battle.tick===s.tick&&!h.transit&&!p.needs.sleeping){
  h.lastAction=battle.action==='cover'?'guard':battle.action==='prepare'?'windup':battle.action==='paired-attack'?'attack':battle.action;
  h.intent=battle.action==='cover'?'Прикрывает союзника':battle.action==='heal'?'Перевязывает раненого':battle.action==='prepare'?'Готовит общий приём':battle.action==='paired-attack'?'Завершает общий приём':'Наносит собственный удар';
  h.reason=battle.action==='cover'?'Прикрывает вместо удара.':battle.action==='heal'?'Расходует своё лекарство.':battle.action==='prepare'?'Этот ход — на подготовку.':battle.action==='paired-attack'?'Размах подготовлен с партнёром.':'Свой удар; силы расходуются.';
 }
 if(['holding','returning'].includes(p.mechanismDuty?.stage)){h.intent=p.mechanismDuty.stage==='holding'?'Удерживает рычаг':'Возвращается к отряду по обходу';h.reason='Остаётся одним телом на действительной дороге. Ожидание расходует силы; голод и личные дела продолжаются.';if(p.mechanismDuty.stage==='holding')h.lastAction='work';}
 if(h.npcProfile){h.npcProfile.viewTick=s.tick;h.npcProfile.job=job;h.npcProfile.work=p.agenda?.work||0;h.npcProfile.tools=p.agenda?.tools||0;h.profession='npc-'+(job||'farmer');}
 if(h.atlas){const known=new Set([h.area,...(p.navigation?.places||[]).map(e=>e.area),journey?.to,publicJourney?.to,convoy?.to].filter(id=>s.areas[id]));for(const id of known)if(!h.atlas.known.includes(id))h.atlas.known.push(id);for(const r of p.navigation?.roads||[])if(!h.atlas.roads.includes(r.key))h.atlas.roads.push(r.key);if(!h.transit&&s.areas[h.area]){if(!h.atlas.visited.includes(h.area))h.atlas.visited.push(h.area);if(!h.memory.places.includes(h.area))h.memory.places.push(h.area);}}
}
