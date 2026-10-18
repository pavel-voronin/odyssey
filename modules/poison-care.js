import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {areaScale} from '../geometry.js';
import {isTown} from './common.js';
import {planFieldCamp,leaveCamp} from './fieldcamp.js';
import {relevantSuspension} from './intentions.js';
import {clinicTreatment} from './supply.js';
import {poisonForecast,medicalDamageUntil,careArrival} from './poison-forecast.js';
import {combatOptions} from './combat-judgment.js';
import {partyDemand} from './party-needs.js';
import {activeBooking,roomAdmission} from './room-state.js';
import {actualService} from './service-access.js';
const on=s=>enabled(s,'poison-care')&&enabled(s,'body');
const poisoned=s=>s.hero.conditions.some(c=>c.id==='poison'&&c.until>s.tick);
const ensure=h=>h.poisonCare||(h.poisonCare={active:null,suspended:null,last:null});
function blockedHere(s,x){const h=s.hero,a=s.areas[h.area];return a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&Math.abs(e.x-h.x)*areaScale(a)<=30&&e.x>=Math.min(h.x,x)-9/areaScale(a)&&e.x<=Math.max(h.x,x)+9/areaScale(a));}
export function holdPoisonRest(s){const h=s.hero;return on(s)&&Boolean(h.goal?.poisonCare&&h.poisonCare?.active)&&(poisoned(s)||h.hp<h.maxHp*.82||h.energy<60);}
function suspend(s){const h=s.hero,state=ensure(h);if(!state.active&&h.goal&&!['rest','campPitch'].includes(h.goal.kind))state.suspended={action:h.goal,intent:h.intent,reason:h.reason};}
function finish(s,ctx,disabled=false,status='recovered'){
 const h=s.hero,state=h.poisonCare;if(!state?.active)return;
 if(h.goal?.poisonCare)h.goal=null;
 if(s.areas[h.area].temporaryCamp&&h.campReturn)leaveCamp(s,ctx);
 state.last={...state.active,ended:s.tick,status:disabled?'disabled':status};state.active=null;
 const saved=state.suspended;state.suspended=null;if(!saved)return;
 if(h.goal){ctx.log(s,`${h.name} уже занят другим делом и пока не возвращается к «${saved.intent}». Прежние вещи и обещания остаются.`,'plan');return;}
 const reason=relevantSuspension(s,saved,ctx);if(reason){ctx.log(s,reason,'plan');return;}
 h.goal=saved.action;h.intent=saved.intent;h.reason='Состояние позволяет вернуться к этому делу. Прежние предметы, обещание и сделанные шаги сохранились.';if(h.planning)h.planning.checked=null;
 ctx.log(s,`${h.name} возвращается к отложенному делу: ${saved.intent}.`,'plan');
}
export function poisonCareTick(s,ctx){
 const h=s.hero;if(h.combat||h.transit)return false;
 if(!on(s)){finish(s,ctx,true);return false;}
 if(!poisoned(s)){
  if(h.goal?.poisonCare&&h.poisonCare?.active&&(h.hp<h.maxHp*.82||h.energy<60))return false;
  finish(s,ctx);return false;
 }
 const forecast=poisonForecast(s);
 const local=s.areas[h.area];
 // Treatment uses the clinic's existing two units as its own action. Do not
 // spend the same limited stock on a generic HP-rest before attempting a cure.
 if(enabled(s,'supply')&&isTown(local)&&Math.abs(h.x-68)*areaScale(local)<2&&local.civic?.medicine>=2&&actualService(s,local,'clinic',{units:2}).available){
  suspend(s);const state=ensure(h);state.active={started:state.active?.started??s.tick,method:'clinic',forecast};
  clinicTreatment(s,ctx);ctx.goal(s,'rest',h.area,68,'Восстановиться после лечения','Яд снят настоящим лекарством. Раны и усталость требуют обычного отдыха.',{poisonCare:true});h.lastAction='heal';return true;
 }
 // Full HP alone never cancels an already chosen wait for the real expiration.
 if(h.goal?.poisonCare&&['campPitch','rest'].includes(h.goal.kind)&&h.goal.area===h.area)return false;
 const hunting=h.goal?.kind==='hunt'||h.poisonCare?.suspended?.action.kind==='hunt';
 const reserve=h.hp-medicalDamageUntil(s,forecast.until),need=reserve<=0||h.hp<h.maxHp*.8||hunting&&reserve<h.maxHp*.82;
 if(!need){if(h.poisonCare?.active?.method==='medicine')finish(s,ctx,false,'stabilized');return false;}
 if(forecast.uncertain)return false;
 const emergency=h.intentions?.current;
 const canStillAct=h.hp>=h.maxHp*Math.max(.48,.35+(1-h.personality.courage)*.28)&&h.energy>=23&&h.hunger<=75&&!partyDemand(s);
 if(canStillAct&&h.goal?.intention===emergency?.id&&emergency?.method==='fight'&&emergency.wound==='critical'&&h.goal.area===h.area&&medicalDamageUntil(s,s.tick+2)<h.hp){
  const enemy=local.objects.find(e=>e.id===emergency.enemy&&e.alive&&!e.resolved);
  if(enemy&&Math.abs(enemy.x-h.x)*areaScale(local)<=9&&combatOptions(s,enemy).some(o=>o.win&&o.reply.max===0)){
   const state=ensure(h);if(state.last?.emergency!==emergency.id){state.last={emergency:emergency.id,tick:s.tick,status:'calculated-risk',forecast};ctx.log(s,`${h.name} учитывает яд, но видит короткий способ остановить угрозу раненому без ответного удара. На это действие ещё есть время.`,'plan');}return false;
  }
 }
 const candidates=[];
 for(const a of Object.values(s.areas)){
  const booking=enabled(s,'lodging')&&enabled(s,'interiors')&&a.lodging&&activeBooking(s,a,h.lineage),paid=booking&&(a.id!==h.area||roomAdmission(s,a,h.lineage));
  if(!knownArea(s,a)||!(isTown(a)||a.type==='camp'||a.dungeon?.cleared||paid)||a.id===h.area&&blockedHere(s,68))continue;
  const route=careArrival(s,a.id,68,ctx);if(route&&medicalDamageUntil(s,s.tick+route.ticks-1)<h.hp&&(!paid||s.tick+route.ticks-1<booking.until))candidates.push({...route,...(paid?{lodging:a.id}:{})});
 }
 candidates.sort((a,b)=>a.ticks-b.ticks||a.area.localeCompare(b.area));
 const best=candidates[0],state=ensure(h);
 // Pitching takes two real actions; the first healing action is later still.
 if((!best||best.ticks>3)&&medicalDamageUntil(s,s.tick+2)<h.hp){
  const oldGoal=h.goal,oldIntent=h.intent,oldReason=h.reason;
  if(planFieldCamp(s,ctx)&&medicalDamageUntil(s,s.tick+(h.goal.campArrivalTicks||3)-1)<h.hp){
   if(!state.active&&oldGoal&&!['rest','campPitch'].includes(oldGoal.kind))state.suspended={action:oldGoal,intent:oldIntent,reason:oldReason};
   state.active={started:state.active?.started??s.tick,method:'camp',forecast};h.goal.poisonCare=true;
   h.reason=`Яд ещё нанесёт ${forecast.damage} урона. До дальней помощи можно не успеть; здесь можно разбить настоящий лагерь и восстановить здоровье, не снимая отравление.`;
   ctx.log(s,`${h.name} учитывает отравление и выбирает лагерь поблизости. Яд продолжит действовать.`,'plan');return false;
  }
  h.goal=oldGoal;h.intent=oldIntent;h.reason=oldReason;
 }
 if(best){
  if(h.goal?.poisonCare&&h.goal.kind==='rest'&&h.goal.area===best.area)return false;
  suspend(s);state.active={started:state.active?.started??s.tick,method:'refuge',forecast,arrival:best.ticks};
  ctx.goal(s,'rest',best.area,68,'Пережить отравление в укрытии',`Яд ещё нанесёт ${forecast.damage} урона. До известного укрытия около ${best.ticks} действий; запас здоровья позволяет дойти. Наличие лекарств проверит на месте.`,{poisonCare:true,...(best.lodging?{lodging:best.lodging}:{})});
  ctx.log(s,`${h.name} сравнивает срок действия яда с дорогой до укрытия и откладывает прочие дела.`,'plan');return false;
 }
 // A carried remedy restores HP in one paid action, never removes poison.
 const herbsPromised=enabled(s,'quests')&&h.quests.some(q=>q.status==='active'&&q.kind==='herbs');
 const item=h.inventory.potions>0?'potions':h.inventory.herbs>0&&!herbsPromised?'herbs':null;
 if(item&&h.hp<h.maxHp){
  suspend(s);state.active={started:state.active?.started??s.tick,method:'medicine',forecast};h.goal=null;
  h.inventory[item]--;h.hp=Math.min(h.maxHp,h.hp+(item==='potions'?19:9));h.lastAction='heal';
  ctx.log(s,`${h.name} расходует ${item==='potions'?'своё лечебное зелье':'свою лечебную траву'}, чтобы успеть пережить отравление. Здоровье восстановлено; яд не снят.`,'heal');return true;
 }
 const key=`${h.area}/${forecast.until}/${forecast.lethalAt}/${Math.floor(h.hp)}`;
 if(state.last?.key!==key){state.last={key,tick:s.tick,status:'no-known-help',forecast};ctx.log(s,`${h.name} не видит помощи, до которой успеет дойти, или собственного средства. Яд остаётся настоящей угрозой.`,'plan');}
 return false;
}
