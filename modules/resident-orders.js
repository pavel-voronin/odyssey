import {controlBlocked} from './building-control-state.js';
import {confirmWord} from './word-custom.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {profile,clamp} from './common.js';
import {detailedActors,selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {advanceCareer} from './identity.js';
import {reservedWorkshop} from './workshop-contract-state.js';
import {npcController} from './npc-control.js';
import {materialSource,carriedServiceTool,consumeServiceTool,TOOL_PRICE} from './work-materials.js';
import {knownCraftsperson,craftRespect,missedRepairPromise} from './craft-respect.js';
const open=new Set(['visiting','quoted','active']);
const active=s=>enabled(s,'work-orders')&&enabled(s,'property')&&enabled(s,'property-damage')&&enabled(s,'work');
const building=(s,c)=>s.areas[c.area]?.objects.find(o=>o.id===c.property&&o.kind==='workshop');
export function initializeWorkOrders(s){s.workOrders ||= {};s.nextWorkOrder ??=0;}
function tell(s,c,text,ctx){
 const p=s.people[c.client];if(p?.alive&&p.agenda){(p.agenda.knowledge ||= []).push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();}
 const h=s.actorStates?.[c.helper];if(h?.alive&&(c.quoted!==undefined||c.accepted!==undefined))ctx.log(actorView(s,h),text,'work');
}
function close(s,c,status,reason,ctx){
 const p=s.people[c.client],h=s.actorStates?.[c.helper],o=building(s,c);
 if(active(s)&&status==='cancelled'&&o?.owner===c.client&&o.damagedAt===c.damageAt&&o.state==='burned')missedRepairPromise(s,c);
 if(c.escrow>0&&p){setActorMoney(s,p,(p.agenda?.wealth??p.actorLink?.wealth??0)+c.escrow);c.refunded=(c.refunded||0)+c.escrow;c.escrow=0;}
 c.status=status;c.ended=s.tick;c.reason=reason;if(o?.service===c.id)o.service=null;
 if(h?.goal?.service===c.id)h.goal=null;
 if(h?.life.residence?.service===c.id)h.life.residence.service=null;
 tell(s,c,reason,ctx);
}
export function workOrdersTick(s,ctx){
 initializeWorkOrders(s);
 for(const c of Object.values(s.workOrders))if(open.has(c.status)){
  const o=building(s,c),h=s.actorStates?.[c.helper],p=s.people[c.client];
  if(!active(s)||!p?.alive||!h?.alive||h.life.ended||!o||o.owner!==c.client||o.damagedAt!==c.damageAt||s.tick>c.deadline||o.state!=='burned')close(s,c,'cancelled',`Заказ на ремонт прекращён. ${!active(s)?'Правила работы изменились.':s.tick>c.deadline?'Срок прошёл.':'Прежние условия больше не действуют.'} Неиспользованные деньги возвращены заказчику.`,ctx);
 }
 const completed=Object.values(s.workOrders).filter(c=>!open.has(c.status));for(const c of completed.slice(0,Math.max(0,completed.length-80)))delete s.workOrders[c.id];
}
export function commissionRepair(s,p,o){
 initializeWorkOrders(s);
 if(!active(s)||!p?.alive||selfDrivenActor(s,p.id)||npcController(s,p)!=='personal'||p.status!=='resident'||!s.areas[p.area]?.objects.includes(o)||o.owner!==p.id||o.state!=='burned'||o.repair?.materials||reservedWorkshop(s,o)||p.agenda.wealth<30||(p.workCommissionAfter||0)>s.tick||p.agenda.duty>.75)return false;
 const h=detailedActors(s).find(h=>selfDrivenActor(s,h)&&h.area===p.area&&!h.transit&&!h.combat&&h.career.rank>=2&&['craft','time'].includes(profile(h).skill)&&knownCraftsperson(s,p,h)&&Math.abs(h.x-p.x)*areaScale(s.areas[h.area])<=30&&!Object.values(s.workOrders).some(c=>c.helper===h.lineage&&open.has(c.status)));
 if(!h)return false;
 const id='service-'+s.nextWorkOrder++;s.workOrders[id]={id,client:p.id,helper:h.lineage,area:p.area,property:o.id,damageAt:o.damagedAt,status:'visiting',offered:s.tick,deadline:s.tick+240,currency:'gold',price:24,materialCost:18,fee:6,escrow:0};
 if(craftRespect(s,p.id,h.lineage)>=6)s.workOrders[id].basis={kind:'witnessed-craft',respect:craftRespect(s,p.id,h.lineage),event:p.craftRelations[h.lineage].lastWork.id,trust:p.agenda.bonds?.[h.lineage]||0};
 p.workCommissionAfter=s.tick+480;p.agenda.task={kind:'repairCommission',target:p.area,x:h.x,remaining:1,service:id};return true;
}
export function commissionTarget(s,p,t){
 const c=s.workOrders?.[t.service],h=s.actorStates?.[c?.helper];
 if(!c||c.status!=='visiting'||!h?.alive||h.area!==p.area||h.transit||h.combat){p.agenda.task=null;return false;}t.x=h.x;return true;
}
export function quoteRepair(s,p,t,ctx){
 const c=s.workOrders?.[t.service],h=s.actorStates?.[c?.helper];
 if(c?.status==='visiting'&&h?.alive&&h.area===p.area&&!h.transit&&Math.abs(h.x-p.x)*areaScale(s.areas[h.area])<=9)c.localToolSeen=s.areas[p.area].civic.tools>0;
 if(c?.status==='visiting'&&h?.alive&&h.area===p.area&&!h.transit&&Math.abs(h.x-p.x)*areaScale(s.areas[h.area])<=9){c.status='quoted';c.quoted=s.tick;if(!h.memory.people.includes(p.id))h.memory.people.push(p.id);if(enabled(s,'relationships')){h.relations[p.id] ||= {trust:0,met:s.tick,lastSeen:s.tick,helped:0};h.relations[p.id].lastSeen=s.tick;}tell(s,c,`${p.name} просит восстановить свою мастерскую. Материалы: ◈18, работа мастера: ◈6. Право собственности остаётся у заказчика.`,ctx);}
 if(c?.status==='quoted'&&c.basis&&!c.basis.explained&&craftRespect(s,p.id,h?.lineage)>=6){c.basis.explained=true;tell(s,c,`${p.name}: «${c.basis.trust<0?'Лично мы не ладим, но мастерство мне знакомо.':'Ваше мастерство мне знакомо.'} Это оплачиваемый заказ, общий путь я не предлагаю».`,ctx);}
 p.agenda.task=null;p.agenda.due=s.tick+48;
}
export function servicePlan(s,ctx){
 if(!active(s))return false;const h=s.hero;
 const c=Object.values(s.workOrders||{}).find(c=>c.helper===h.lineage&&['active','quoted'].includes(c.status));if(!c)return false;
 if(c.status==='quoted'){
  if(enabled(s,'word-custom')&&c.word?.mode==='waiting'&&c.word.waitUntil>s.tick)return false;
  if(h.personality.generosity<.35&&h.gold>24){close(s,c,'declined',`${h.name} не берётся за предложенный ремонт: собственные занятия сейчас выгоднее.`,ctx);return false;}
  const localTool=h.area===c.area?s.areas[c.area].civic.tools>0:c.localToolSeen!==false;
  if(!localTool&&!materialSource(s,c,ctx)){close(s,c,'declined','Мастер не берётся за ремонт: местного инструмента нет, а другого известного источника пока не нашлось.',ctx);return false;}
  ctx.goal(s,'serviceAccept',c.area,s.people[c.client]?.x??42,'Обсудить ремонт с заказчиком','Нужно встретиться и согласовать оплату, прежде чем начинать чужую работу.',{service:c.id});return true;
 }
 const o=building(s,c);
 if(c.toolPurchase&&c.materialsPaid!==c.materialCost&&!carriedServiceTool(h,c)){close(s,c,'cancelled','Купленный инструмент больше не найден среди груза мастера. Заказ прекращён; возвращён только неистраченный резерв.',ctx);return false;}
 if(!o?.repair?.materials&&!carriedServiceTool(h,c)){
  if(h.area===c.area)c.localToolSeen=s.areas[c.area].civic.tools>0;
  if(c.localToolSeen===false){
   if(c.materialWaitUntil>s.tick&&c.materialWaitRevision===(h.workMaterials?.revision||0))return false;
   const source=materialSource(s,c,ctx);
   if(source){
    if(source.ticks+8>c.deadline-s.tick){
     if(c.extension===undefined&&h.area===c.area){ctx.goal(s,'serviceDelay',c.area,s.people[c.client]?.x??42,'Попросить время на материалы','Известный путь за инструментом не укладывается в оставшийся срок.',{service:c.id,tripTicks:source.ticks});return true;}
     close(s,c,'cancelled','Мастер отказывается рисковать заказом: на известную поездку за инструментом времени уже не хватает.',ctx);return false;
    }
    c.supplySource=source.area;
    ctx.goal(s,'serviceSupply',source.area,42,'Привезти инструмент для ремонта',`В «${source.name}» раньше был нужный инструмент. Покупка войдёт в прежний резерв материалов; запас ещё предстоит проверить.`,{service:c.id});return true;
   }
   c.materialWaitUntil=s.tick+24;c.materialWaitRevision=h.workMaterials?.revision||0;
   if(c.materialMissingNoted===undefined){c.materialMissingNoted=s.tick;ctx.log(s,'Для заказа не хватает инструмента. Другого известного источника пока нет; мастер откладывает работу и рассматривает другие дела.','work');}
   return false;
  }
 }
 ctx.goal(s,'propertyRepair',c.area,building(s,c)?.x??42,'Выполнить заказ на ремонт',`Заказ оплачен из средств владельца. После восстановления причитается ◈${c.fee}.`,{property:c.property,service:c.id});return true;
}
export function serviceTarget(s,ctx){
 const h=s.hero,g=h.goal;if(!g?.service)return true;const c=s.workOrders?.[g.service],p=s.people[c?.client];
 if(!active(s)||!c||!p?.alive||!['quoted','active'].includes(c.status)){h.goal=null;return false;}
 if(['serviceAccept','serviceDelay'].includes(g.kind)&&h.area===g.area){if(!p?.alive||p.area!==h.area){h.goal=null;return false;}g.x=p.x;}
 return true;
}
export function acceptService(s,ctx){
 const h=s.hero,c=s.workOrders?.[h.goal?.service],p=s.people[c?.client],o=c&&building(s,c);
 if(!active(s)||c?.status!=='quoted'||c.helper!==h.lineage||s.tick>c.deadline||!p?.alive||p.area!==h.area||Math.abs(p.x-h.x)*areaScale(s.areas[h.area])>9||p.agenda.wealth<c.price+6||!o||o.owner!==p.id||o.state!=='burned'||o.damagedAt!==c.damageAt||o.repair?.materials||reservedWorkshop(s,o)){h.goal=null;return false;}
 const word=confirmWord(s,p,h,c);
 if(!word.allowed){h.goal=null;h.lastAction='talk';h.intent=word.mode==='refused'?'Согласие не состоялось':'Договориться позже';h.reason=word.mode==='refused'?'Заказчик не дождался знакомого свидетеля и отказался. Деньги и прежние навыки остались у владельцев.':'Заказчик хочет подтвердить слово при знакомом свидетеле. Пока можно заняться другими делами.';h.speech=word.mode==='refused'?'Пока не договорились.':'Подождём знакомого свидетеля.';if(word.mode==='refused'){close(s,c,'declined',p.name+' не дождался знакомого свидетеля. Денег за несогласованный заказ никто не получил.',ctx);}else{c.word.waitUntil=s.tick+16;if(!c.word.noted){c.word.noted=true;tell(s,c,p.name+': «Я привык подтверждать общее дело при знакомом свидетеле. Пока подождём; деньги остаются у меня».',ctx);}}return false;}
 if(word.mode==='witness')tell(s,c,p.name+' подтверждает слово при '+s.people[word.person].name+'. Свидетель слышит условия, но не получает платы и не становится стороной заказа.',ctx);
 else if(word.mode==='personal-trust')tell(s,c,p.name+': «Наш прежний опыт для меня важнее обычая. Договоримся вдвоём».',ctx);
 setActorMoney(s,p,p.agenda.wealth-c.price);c.escrow=c.price;c.status='active';c.accepted=s.tick;c.deadline=s.tick+480;c.localToolSeen=s.areas[h.area].civic.tools>0;o.service=c.id;h.goal=null;h.lastAction='talk';h.speech='Договорились.';
 tell(s,c,`${p.name} оставляет ◈${c.price} на заказ: материалы и работа оплачиваются отдельно по результату. ${h.name} берётся восстановить помещение.`,ctx);return true;
}
export function serviceRepairAllowed(s,o,person){const c=s.workOrders?.[o.service],h=s.actorStates?.[person];return Boolean(active(s)&&!controlBlocked(s,c?.area,o)&&c?.status==='active'&&s.people[c.client]?.alive&&h?.alive&&!h.transit&&h.area===c.area&&h.goal?.service===c.id&&c.property===o.id&&c.helper===person&&c.client===o.owner&&c.damageAt===o.damagedAt);}
export function fundServiceRepair(s,a,o,cost){
 const id=s.hero.goal?.service;if(!id)return undefined;const c=s.workOrders?.[id];
 if(!c||!serviceRepairAllowed(s,o,s.hero.lineage)||c.materialCost!==cost)return false;
 const tool=carriedServiceTool(s.hero,c),paid=c.materialSpent||0,charge=cost-paid;
 if(paid!==0&&paid!==TOOL_PRICE||paid&&!tool||c.escrow<charge)return false;
 if(tool&&!consumeServiceTool(s,c))return false;
 c.escrow-=charge;c.materialsPaid=cost;return {payer:c.client,cost:charge,advance:paid,toolProvided:Boolean(tool)};
}
export function hasServiceTool(s,o){const c=s.workOrders?.[o.service];return Boolean(c&&serviceRepairAllowed(s,o,s.hero.lineage)&&carriedServiceTool(s.hero,c));}
export function extendService(s,ctx){
 const h=s.hero,c=s.workOrders?.[h.goal?.service],p=s.people[c?.client];
 if(!active(s)||c?.status!=='active'||c.helper!==h.lineage||c.extension!==undefined||!p?.alive||p.area!==h.area||h.area!==c.area||Math.abs(p.x-h.x)*areaScale(s.areas[h.area])>9){h.goal=null;return false;}
 h.lastAction='talk';const trip=h.goal.tripTicks;
 if(p.agenda.duty>.65||(p.needs?.hunger||0)>75){close(s,c,'cancelled',`${p.name} не может ждать поездки за инструментом и отзывает заказ. Неиспользованный резерв возвращён.`,ctx);return false;}
 const extra=Math.min(240,Math.max(60,(trip||60)+24-(c.deadline-s.tick)));c.deadline+=extra;c.extension={tick:s.tick,extra,deadline:c.deadline};h.goal=null;
 tell(s,c,`${p.name} соглашается подождать материалы. Новый срок согласован при встрече; прежний денежный резерв не изменился.`,ctx);return true;
}
export function finishServiceRepair(s,a,o,proof,ctx){
 const c=s.workOrders?.[o.service];if(!c||c.status!=='active'||!active(s)||o.state!=='intact'||a.id!==c.area||o.id!==c.property||proof.actor!==c.helper||proof.payer!==c.client||proof.damageAt!==c.damageAt||c.materialsPaid!==18||c.escrow!==c.fee)return;
 const h=s.actorStates[c.helper],p=s.people[c.client];if(!h?.alive||!p?.alive)return;
 setActorMoney(s,s.people[h.lineage],h.gold+c.fee);c.escrow=0;c.paid=c.fee;c.status='done';c.ended=s.tick;o.service=null;if(h.life.residence?.service===c.id)h.life.residence.service=null;
 h.counters.customerWork=(h.counters.customerWork||0)+1;h.counters.peacefulWork=(h.counters.peacefulWork||0)+1;advanceCareer(s,5,ctx);ctx.gainXp(s,5);
 (p.agenda.bonds ||= {})[h.lineage]=clamp((p.agenda.bonds[h.lineage]||0)+2,-100,100);
 const relation=h.relations[p.id];if(relation&&enabled(s,'relationships')){relation.trust=clamp(relation.trust+2,-100,100);relation.helped++;}
 tell(s,c,`${h.name} восстанавливает мастерскую для ${p.name} и получает ◈${c.fee}. Заказчик снова может работать в своём помещении.`,ctx);
}


