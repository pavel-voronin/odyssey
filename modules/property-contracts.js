import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {maySpend} from './finances.js';
import {observeProperty,transferProperty,wantsWorkshop} from './property.js';
import {reservedWorkshop,workshopContract} from './workshop-contract-state.js';
const active=s=>enabled(s,'property')&&enabled(s,'property-contracts');
const at=(s,c)=>s.areas[c.area]?.objects.find(o=>o.id===c.property&&o.kind==='workshop');
const present=(s,id,area)=>{const p=s.people[id];return p?.alive&&p.status==='resident'&&p.area===area?p:null;};
export function initializePropertyContracts(s,h){s.propertyContracts ||= {};s.nextPropertyContract ??=0;s.propertyContractClock ??=s.tick;h.property.contract ??=null;h.property.claims ||= [];}
function note(s,c,text,ctx){c.history.push({tick:s.tick,text});if(c.history.length>16)c.history.shift();if(c.buyer===s.hero.lineage)ctx.log(s,text,'property');}
function buyerActor(s,c){return s.actorStates?.[c.buyer]||(s.hero.lineage===c.buyer?s.hero:null);}
function release(s,c){const o=at(s,c);if(o?.contract===c.id)o.contract=null;const h=buyerActor(s,c);if(h?.property.contract===c.id)h.property.contract=null;}
function claim(s,c,reason,ctx){
  c.claimAmount=Math.max(c.credit||0,c.completed?c.creditValue:0,c.materials||0);c.paidClaim ||= 0;c.status=c.claimAmount?'claim':'cancelled';c.reason=reason;c.changed=s.tick;release(s,c);
  const h=buyerActor(s,c);if(c.claimAmount&&h&&!h.property.claims.includes(c.id))h.property.claims.push(c.id);
  note(s,c,c.claimAmount?`Сделка с мастерской отложена: ${reason}. Требование на ◈${c.claimAmount} осталось за исполнителем.`:`Сделка с мастерской отменена: ${reason}. Работа и оплата ещё не начинались.`,ctx);
}
function accept(s,c,o,ctx){
  const seller=present(s,c.seller,c.area);
  if(c.accepted||!c.completed||o.owner!==c.seller||o.state!=='intact'||o.damagedAt!==c.damageAt||!seller||s.hero.area!==c.area||Math.abs(s.hero.x-(seller.x??42))*areaScale(s.areas[s.hero.area])>9)return false;
  c.accepted=true;c.credit=c.creditValue;c.acceptedAt=s.tick;if(c.status==='performed')c.status='credited';
  note(s,c,`Хозяин принимает восстановленную мастерскую. В счёт цены зачтено ◈${c.credit}; доплата — ◈${c.price-c.credit}.`,ctx);return true;
}
export function propertyContractsTick(s,ctx){
  const elapsed=Math.max(0,s.tick-(s.propertyContractClock??s.tick));s.propertyContractClock=s.tick;
  if(!active(s)){for(const c of Object.values(s.propertyContracts))if(['active','performed','credited'].includes(c.status))c.deadline+=elapsed;return;}
  for(const c of Object.values(s.propertyContracts)){
    if(!['active','performed','credited'].includes(c.status))continue;
    const o=at(s,c),buyer=s.people[c.buyer],seller=s.people[c.seller];
    if(!o||o.owner!==c.seller){claim(s,c,'собственник изменился',ctx);continue;}
    if(!buyer?.alive||!seller?.alive||s.hero.lineage===c.buyer&&s.hero.life.ended||s.lives.some(l=>l.lineage===c.buyer)){claim(s,c,'история одной из сторон завершилась',ctx);continue;}
    if(c.status==='active'&&(o.state!=='burned'||o.damagedAt!==c.damageAt)){claim(s,c,'исходное повреждение изменилось',ctx);continue;}
    if(s.tick>c.deadline){claim(s,c,'срок истёк',ctx);continue;}
  }
}
export function propertyLifeEnded(s,ctx){for(const c of Object.values(s.propertyContracts||{}))if(c.buyer===s.hero.lineage&&['active','performed','credited'].includes(c.status))claim(s,c,'история исполнителя завершилась',ctx);}
export function mayRepairProperty(s,o,actor){const c=workshopContract(s,o);return Boolean(active(s)&&c?.status==='active'&&c.buyer===actor&&c.seller===o.owner&&c.damageAt===o.damagedAt&&c.deadline>=s.tick);}
export function repairMaterials(s,a,o,proof){const c=workshopContract(s,o);if(mayRepairProperty(s,o,proof.payer)&&c.damageAt===proof.damageAt)c.materials=proof.cost;}
export function workshopRepaired(s,a,o,proof,ctx){
  const c=workshopContract(s,o);if(!active(s)||c?.status!=='active'||c.accepted||c.buyer!==proof.actor||c.buyer!==proof.payer||c.seller!==o.owner||c.damageAt!==proof.damageAt)return;
  const event=o.history.at(-1);if(event?.kind!=='repair'||event.tick!==s.tick||event.actor!==proof.actor||event.payer!==proof.payer||event.damageAt!==proof.damageAt)return;
  c.completed={tick:s.tick,...proof};c.status='performed';accept(s,c,o,ctx);
}
const interest=wantsWorkshop;
export function propertyContractPlan(s,ctx){
  if(!active(s))return false;const h=s.hero,c=s.propertyContracts[h.property.contract];
  if(c&&['active','performed','credited'].includes(c.status)){
    if((c.nextAttempt||0)>s.tick)return false;
    const o=at(s,c);if(!o)return false;
    if(c.status==='active'){
      if(!enabled(s,'property-damage'))return false;
      if(h.hp<h.maxHp*.65||h.energy<40||enabled(s,'body')&&h.hunger>=65)return false;
      if(!o.repair?.materials&&(!maySpend(s,'repair',18,ctx)||h.area===c.area&&!(s.areas[c.area].civic?.tools>0))){c.nextAttempt=s.tick+96;return false;}
      ctx.goal(s,'propertyRepair',c.area,o.x,'Выполнить договорный ремонт','Сначала восстановить помещение, затем доплатить владельцу. Ремонт уменьшит цену покупки.',{property:o.id,agreement:c.id});return true;
    }
    if(c.status==='performed'||o.state==='intact'&&maySpend(s,'property',c.price-c.credit,ctx)){
      ctx.goal(s,'propertyContract',c.area,42,'Принять ремонт и оформить мастерскую','Нужно встретиться с владельцем, проверить зачёт и передать оставшиеся монеты.',{agreement:c.id,mode:'finish'});return true;
    }
    return false;
  }
  for(const id of h.property.claims){const debt=s.propertyContracts[id],p=debt&&present(s,debt.seller,h.area);if(debt?.status==='claim'&&p&&(p.agenda.wealth>0||!debt.extended&&p.agenda.sociability>.5)&&(debt.nextAttempt||0)<=s.tick){ctx.goal(s,'propertyContract',h.area,p.x??42,'Вернуться к расчёту по мастерской','Прежняя работа или переданный материал остаются требованием, даже если покупка сорвалась.',{agreement:id,mode:'claim'});return true;}}
  if(!enabled(s,'property-damage')||!interest(h)||h.property.nextAttempt>s.tick||Object.values(s.areas).some(a=>a.objects.some(o=>o.kind==='workshop'&&o.owner===h.lineage)))return false;
  for(const [id,k]of Object.entries(h.property.known)){
    if(k.state!=='burned'||k.price===null||k.price<72||!maySpend(s,'property',k.price-36+18,ctx))continue;
    const path=(ctx.knownRoute||ctx.route)(s,h.area,k.area);if(!path.length||path.length>5)continue;
    ctx.goal(s,'propertyContract',k.area,42,'Предложить ремонт в счёт мастерской','Он помнит повреждённое помещение и предложение продажи. Часть цены можно покрыть нужной работой.',{property:id,seller:k.owner,price:k.price,mode:'offer'});return true;
  }
  return false;
}
function failAttempt(s,g,ctx,text){const c=g.agreement&&s.propertyContracts[g.agreement];if(c)c.nextAttempt=s.tick+96;else s.hero.property.nextAttempt=s.tick+480;s.hero.goal=null;ctx.log(s,text,'choice');return false;}
export function propertyContractTarget(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyContract')return true;if(!active(s)){h.goal=null;return false;}
  if(h.area!==g.area)return true;
  const c=g.agreement&&s.propertyContracts[g.agreement],seller=g.seller||c?.seller,p=present(s,seller,h.area);
  if(!p)return failAttempt(s,g,ctx,'Владелец сейчас недоступен. Расчёт придётся отложить.');g.x=p.x??42;return true;
}
export function propertyContractAction(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyContract'||!propertyContractTarget(s,ctx))return false;
  const c=g.agreement&&s.propertyContracts[g.agreement],p=present(s,g.seller||c?.seller,h.area);if(!p||Math.abs(h.x-(p.x??42))*areaScale(s.areas[h.area])>9)return false;h.lastAction='talk';
  if(g.mode==='offer'){
    const o=s.areas[h.area].objects.find(o=>o.id===g.property);
    if(!o||o.state!=='burned'||!Number.isInteger(o.damagedAt)||o.owner!==p.id||o.offer?.owner!==p.id||o.offer?.price!==g.price||reservedWorkshop(s,o)||o.repair||p.agenda.task?.kind==='propertyRepair'||!interest(h)||!(s.areas[h.area].civic?.tools>0)||!maySpend(s,'property',g.price-36+18,ctx))return failAttempt(s,g,ctx,'Договорный ремонт сейчас невозможен. Ни деньги, ни право не переданы.');
    const id='property-agreement-'+s.nextPropertyContract++,deal={id,property:o.id,area:h.area,seller:p.id,buyer:h.lineage,price:g.price,currency:'gold',creditValue:36,credit:0,materials:0,accepted:false,status:'active',signed:s.tick,deadline:s.tick+1200,extended:false,damageAt:o.damagedAt,paidClaim:0,history:[]};
    s.propertyContracts[id]=deal;o.contract=id;h.property.contract=id;h.goal=null;
    note(s,deal,`Согласован ремонт мастерской в счёт цены: зачёт ◈36, доплата ◈${deal.price-36}. Инструмент для работы покупает исполнитель; аренда этого ремонта не взимается.`,ctx);return true;
  }
  if(!c||c.buyer!==h.lineage)return failAttempt(s,g,ctx,'Соглашение не принадлежит этому исполнителю.');
  const o=at(s,c);if(!o)return failAttempt(s,g,ctx,'Прежнее помещение недоступно. Требование сохранено.');
  if(g.mode==='claim'){
    accept(s,c,o,ctx);
    if(c.reason==='срок истёк'&&!c.extended&&!c.paidClaim&&p.agenda.sociability>.5&&c.accepted&&h.area===c.area&&!reservedWorkshop(s,o)&&o.owner===p.id&&o.offer?.price===c.price){c.extended=true;c.deadline=s.tick+600;c.status='credited';o.contract=c.id;h.property.contract=c.id;h.goal=null;note(s,c,'Стороны продлевают срок расчёта. Признанный зачёт остаётся прежним.',ctx);return true;}
    const amount=(c.accepted||!c.completed)?Math.min(Math.max(0,c.claimAmount-c.paidClaim),p.agenda.wealth):0;
    if(amount>0){p.agenda.wealth-=amount;h.gold+=amount;c.paidClaim+=amount;if(c.paidClaim===c.claimAmount)c.status='settled';note(s,c,`Прежний владелец выплачивает ◈${amount} по требованию исполнителя. Мастерская от этой выплаты не меняет владельца.`,ctx);}
    c.nextAttempt=s.tick+480;h.goal=null;return true;
  }
  accept(s,c,o,ctx);
  if(c.status!=='credited'||!c.accepted||o.state!=='intact'||o.owner!==c.seller){h.goal=null;c.nextAttempt=s.tick+96;return false;}
  const act=transferProperty(s,ctx,{id:o.id,seller:c.seller,price:c.price,cash:c.price-c.credit,credit:c.credit,contract:c.id});h.goal=null;
  if(!act){c.nextAttempt=s.tick+96;return false;}
  c.status='done';c.ended=s.tick;c.act=act.id;release(s,c);note(s,c,`Мастерская перешла исполнителю: ◈${c.credit} зачтено работой, ◈${act.cash} передано владельцу.`,ctx);return true;
}
