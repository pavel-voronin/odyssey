import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {maySpend} from './finances.js';
import {observeProperty,transferProperty} from './property.js';
import {reservedWorkshop,needsWorkshop} from './workshop-contract-state.js';
const active=s=>enabled(s,'property')&&enabled(s,'property-aid');
function kin(s,p){const self=s.people[s.hero.lineage];return self.parents.includes(p.id)||p.parents.includes(self.id)||self.parents.some(id=>p.parents.includes(id));}
function familiar(s,p){const h=s.hero,r=h.relations[p.id];return kin(s,p)||Boolean(h.memory.people.includes(p.id)&&r?.helped>=2&&r.trust>=16);}
function seller(s,a,o){const p=s.people[o.owner];return p?.alive&&p.status==='resident'&&p.area===a.id&&o.offer?.owner===p.id&&o.state==='intact'&&Number.isInteger(o.offer.price)&&o.offer.price>0?p:null;}
function valid(s,a,o,c){return Number.isInteger(c.consent?.recipient)&&o.owner===c.seller&&seller(s,a,o)&&o.offer.price===c.price&&needsWorkshop(s,s.people[c.recipient],a.id,c.price)&&s.people[c.payer]?.alive&&!(s.hero.lineage===c.payer&&s.hero.life.ended)&&!s.lives.some(l=>l.lineage===c.payer);}
function finish(s,o,status,text,ctx){o.aid.status=status;o.aid.ended=s.tick;o.aid.reason=text;const payer=s.actorStates?.[o.aid.payer]||(s.hero.lineage===o.aid.payer?s.hero:null);if(payer?.goal?.aid===o.aid.id)payer.goal=null;if(s.hero.lineage===o.aid.payer&&s.hero.area===o.aid.area)ctx.log(s,text,'property');return true;}
export function propertyAidTick(s,ctx){
 for(const a of Object.values(s.areas))for(const o of a.objects){const c=o.aid;if(o.kind!=='workshop'||!['requested','agreed'].includes(c?.status))continue;
  const elapsed=Math.max(0,s.tick-(c.checked??s.tick));c.checked=s.tick;if(!active(s))continue;c.remaining-=elapsed;
  if(c.remaining<=0||!valid(s,a,o,c))finish(s,o,'cancelled','Прежнюю покупку для ремесленника пришлось отложить: срок или обстоятельства изменились. Деньги остались у плательщика.',ctx);
 }
}
export function propertyAidPlan(s,ctx){
 if(!active(s))return false;const h=s.hero,a=s.areas[h.area];
 for(const o of a.objects.filter(o=>o.kind==='workshop')){
  const c=o.aid;if(c?.payer===h.lineage&&['requested','agreed'].includes(c.status)){const p=s.people[c.status==='requested'?c.recipient:c.seller];ctx.goal(s,'propertyAid',a.id,p?.x??42,c.status==='requested'?'Решить, помочь ли с мастерской':'Оплатить мастерскую для знакомого','Получатель согласился на конкретное помещение. Оплата возможна только при действительных условиях и свободном бюджете.',{property:o.id,aid:c.id,phase:c.status==='requested'?'choose':'pay'});return true;}
  if(c&&(c.payer===h.lineage||['requested','agreed'].includes(c.status))||reservedWorkshop(s,o)||!seller(s,a,o))continue;
  const p=(a.population||[]).map(id=>s.people[id]).find(p=>p&&p.id!==h.lineage&&p.id!==o.owner&&familiar(s,p)&&needsWorkshop(s,p,a.id,o.offer.price));if(!p)continue;
  ctx.goal(s,'propertyAid',a.id,p.x??42,'Обсудить планы ремесленника','Знакомый мастер давно работает по найму. Разговор покажет, хочет ли он своё помещение.',{property:o.id,recipient:p.id,phase:'ask'});return true;
 }
 return false;
}
export function propertyAidTarget(s,ctx){
 const h=s.hero,g=h.goal;if(g?.kind!=='propertyAid')return true;if(!active(s)){h.goal=null;return false;}if(h.area!==g.area)return true;
 const a=s.areas[g.area],o=a.objects.find(o=>o.id===g.property),c=o?.aid,p=s.people[g.phase==='pay'?c?.seller:g.recipient||c?.recipient];
 const okay=o&&p&&(g.phase==='ask'?seller(s,a,o)&&!reservedWorkshop(s,o)&&familiar(s,p)&&needsWorkshop(s,p,a.id,o.offer.price):c?.id===g.aid&&c.payer===h.lineage&&['requested','agreed'].includes(c.status)&&c.remaining>0&&valid(s,a,o,c));
 if(!okay){h.goal=null;return false;}g.x=p.x??42;return true;
}
export function propertyAidAction(s,ctx){
 const h=s.hero,g=h.goal;if(g?.kind!=='propertyAid'||!propertyAidTarget(s,ctx)||h.area!==g.area)return false;
 const a=s.areas[h.area],o=a.objects.find(o=>o.id===g.property),c=o.aid,p=s.people[g.phase==='pay'?c.seller:g.recipient||c?.recipient];if(Math.abs(h.x-(p.x??42))*areaScale(s.areas[h.area])>9)return false;h.lastAction='talk';
 if(g.phase==='ask'){
  o.aid={id:`aid-${o.id}-${s.tick}-${o.history.length}`,status:'requested',area:a.id,property:o.id,seller:o.owner,payer:h.lineage,recipient:p.id,price:o.offer.price,currency:'gold',consent:{recipient:s.tick,payer:null},asked:s.tick,remaining:240,checked:s.tick};g.aid=o.aid.id;g.phase='choose';observeProperty(s,a,ctx);
  ctx.log(s,`${p.name}: «Хочу эту мастерскую, но на цену ◈${o.aid.price} не хватает. Если поможешь с покупкой, я согласен принять именно это помещение».`,'property');return true;
 }
 if(g.phase==='choose'){
  if(h.personality.generosity+(kin(s,p)? .15:0)<.78||!maySpend(s,'property',c.price,ctx))return finish(s,o,'declined','Герой отказывается оплачивать мастерскую: собственные планы и ближайшие нужды пока важнее. Ни деньги, ни право не переданы.',ctx);
  c.consent.payer=s.tick;c.status='agreed';g.phase='pay';g.x=s.people[c.seller].x??42;ctx.log(s,`Герой соглашается оплатить мастерскую для ${p.name}. Осталось встретиться с продавцом и ещё раз проверить цену ◈${c.price}.`,'property');return true;
 }
 const act=transferProperty(s,ctx,{id:o.id,seller:c.seller,price:c.price,recipient:c.recipient,aid:c.id});if(!act)return finish(s,o,'cancelled','Оплатить прежнюю сделку уже нельзя. Деньги остались у героя, помещение — у собственника.',ctx);
 c.act=act.id;c.status='done';c.ended=s.tick;h.goal=null;const recipient=s.people[c.recipient];recipient.agenda.bonds[h.lineage]=(recipient.agenda.bonds[h.lineage]||0)+8;
 ctx.log(s,`${h.name} платит ◈${act.cash} владельцу мастерской. Новое право получает ${recipient.name}; у помощника остаётся благодарность, а не доля в помещении.`,'property');return true;
}
