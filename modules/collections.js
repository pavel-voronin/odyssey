import {physicalDistance} from '../geometry.js';
import {collectionsOn,collectible,collectionItems,collectionStatus,collectionEmergency,startCollection,refreshCollection} from './collection-state.js';
import {npcController,canStartNPCActivity,npcAction} from './npc-control.js';
import {localContact} from './npc-contacts.js';
import {setActorMoney} from '../actor-projection.js';
import {presentItem,actorItemLocation,ITEM_CAPACITY} from './item-originals.js';
import {itemBearer} from './enchantments.js';
import {itemWorth} from './item-condition.js';

const price=item=>Number.isFinite(item.value)&&item.value>0?Math.max(1,Math.floor(itemWorth(item)*.7)):null;
function ready(s,p){return p?.alive&&p.role!=='ребёнок'&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p)&&!p.needs?.sleeping&&(p.needs?.energy??100)>=30&&(p.needs?.hunger??0)<65;}
function bag(s,p,write=false){const h=s.actorStates?.[p.id];return h?h.bag:p.looseItems||(write?(p.looseItems=[]):[]);}
function purse(p){return Math.max(0,p.agenda?.wealth??p.actorLink?.wallet??0);}
function owns(s,id,item){const actual=presentItem(s,item.id);return actual?.kind==='person'&&actual.id===id&&actual.item===item;}
function interested(s,p,item){
 if(p.collection)return p.collection.version===1&&p.collection.master===item.creator;
 return (p.agenda?.curiosity??0)>=.6&&['artisan','merchant'].includes(p.agenda?.job)&&(p.id===item.creator||collectionItems(s,p.id).some(i=>i.creator===item.creator)||p.navigation?.contacts?.some(c=>c.person===item.creator));
}
function available(s){const h=s.hero;return h.alive&&!h.transit&&!h.combat&&h.hp>=h.maxHp*.6&&h.energy>=23;}
// Only local known people are approached. Their private interest, wallet and
// bag are evaluated by the recipient at the actual conversation, not by a GPS.
export function collectionPlan(s,ctx,{urgentOnly=false}={}){
 if(!collectionsOn(s)||!available(s)||s.hero.energy<30)return false;const h=s.hero,v=collectionStatus(s);if(!v)return false;
 const emergency=collectionEmergency(s);if(urgentOnly&&!emergency||!emergency&&h.quests.some(q=>q.status==='active'))return false;
 if(h.goal?.kind==='collectionTrade')return true;
 const offered=(emergency?[...v.surplus,...v.representatives]:v.surplus).find(i=>h.bag.includes(i));if(!offered)return false;
 const last=s.people[h.lineage].collection.lastOffer;
 const people=Object.values(s.people).filter(p=>p.id!==h.lineage&&h.memory.people.includes(p.id)&&['artisan','merchant'].includes(p.agenda?.job)&&ready(s,p)).map(p=>({p,body:localContact(s,p.id,h.area)})).filter(({p,body})=>body&&physicalDistance(s.areas[h.area],h.x,body.x)<=18&&!(last?.person===p.id&&last.item===offered.id&&last.until>s.tick));
 if(!people.length)return false;people.sort((a,b)=>Number(b.p.id===v.collection.master)-Number(a.p.id===v.collection.master)||physicalDistance(s.areas[h.area],h.x,a.body.x)-physicalDistance(s.areas[h.area],h.x,b.body.x)||a.p.id.localeCompare(b.p.id));
 const {p,body}=people[0];ctx.goal(s,'collectionTrade',h.area,body.x,emergency?'Памятная вещь ради еды':'Предложить повторную работу мастера',emergency?'Пайков и монет не осталось. Даже любимую работу можно предложить настоящему покупателю.':'Он спросит знакомого, интересна ли ему эта работа. Согласие и средства ещё не известны.',{person:p.id,item:offered.id,collectionEmergency:emergency,offeredAt:s.tick});return true;
}
export function collectionTarget(s){
 const h=s.hero,g=h.goal;if(g?.kind!=='collectionTrade')return true;
 if(!collectionsOn(s)||g.collectionEmergency&&!collectionEmergency(s)||s.tick-(g.offeredAt??s.tick)>72||!h.bag.some(i=>i.id===g.item)){h.goal=null;return false;}
 const body=localContact(s,g.person,h.area);if(!body||physicalDistance(s.areas[h.area],h.x,body.x)>18){h.goal=null;return false;}g.x=body.x;return true;
}
export function collectionAction(s,ctx){
 const h=s.hero,g=h.goal;if(g?.kind!=='collectionTrade')return false;const p=s.people[g.person],c=s.people[h.lineage]?.collection,item=h.bag.find(i=>i.id===g.item),body=localContact(s,g.person,h.area);if(!c){h.goal=null;return false;}
 if(!collectionsOn(s)||g.collectionEmergency&&!collectionEmergency(s)||!available(s)||!collectible(item)||!owns(s,h.lineage,item)||!body||physicalDistance(s.areas[h.area],h.x,body.x)>1){h.goal=null;return false;}
 if(!ready(s,p)||!npcAction(s,p,'personal')){h.lastAction='wait';h.goal=null;return true;}
 h.lastAction='talk';h.energy=Math.max(0,h.energy-1);if(p.needs)p.needs.energy=Math.max(0,p.needs.energy-1);h.goal=null;
 c.lastOffer={person:p.id,item:item.id,tick:s.tick,until:s.tick+480,outcome:'refused'};
 const refuse=reason=>{c.lastOffer.reason=reason;ctx.log(s,`${p.name}: «${reason}» Вещь остаётся у ${h.name}.`,'collection');return true;};
 if(!interested(s,p,item))return refuse('Я не собираю эти работы.');
 const focus=p.collection||startCollection(s,p.id,item,{kind:'shown-item',person:h.lineage},3);if(!focus)return refuse('Сейчас у меня другие интересы.');
 const own=collectionStatus(s,p.id);if(own.representatives.some(i=>i.base===item.base))return refuse('Такая работа у меня уже есть.');
 if(own.complete)return refuse('Для моего собрания уже достаточно работ.');
 const offeredPrice=price(item);if(offeredPrice===null)return refuse('Не могу оценить эту работу.');
 const wanted=collectionStatus(s),counter=!g.collectionEmergency&&own.surplus.find(i=>bag(s,p).includes(i)&&!wanted.representatives.some(m=>m.base===i.base)&&owns(s,p.id,i));
 if(counter){
  const counterPrice=price(counter);if(counterPrice===null)return refuse('Не могу оценить эту работу.');const difference=counterPrice-offeredPrice;if(difference>h.gold||difference<0&&-difference>purse(p))return refuse('Для разницы в цене не хватает монет.');
  h.bag.splice(h.bag.indexOf(item),1);bag(s,p).splice(bag(s,p).indexOf(counter),1);h.bag.push(counter);bag(s,p,true).push(item);h.gold-=difference;setActorMoney(s,p,purse(p)+difference);actorItemLocation(s,counter);actorItemLocation(s,item,p.id);itemBearer(s,counter);itemBearer(s,item,p.id);c.lastOffer.outcome='exchanged';
  for(const [i,owner]of [[item,p.name],[counter,h.name]]){i.history ||= [];i.history.push({tick:s.tick,text:`Обмен работами мастера: ${owner}.`});}
  ctx.log(s,`${h.name} и ${p.name} обмениваются оригиналами: «${item.name}» и «${counter.name}». ${difference?`Разница ◈${Math.abs(difference)} оплачена из настоящего кошелька.`:'Обе стороны получают недостающую работу.'}`,'collection');
 }else{
  if(!g.collectionEmergency)return refuse('Повтор мне интересен, но предложить недостающую работу пока нечего.');
  const amount=offeredPrice;if(purse(p)<amount)return refuse('Работа мне нравится, но столько монет у меня нет.');if(bag(s,p).length>=ITEM_CAPACITY)return refuse('Больше вещей я не унесу.');
  h.bag.splice(h.bag.indexOf(item),1);bag(s,p,true).push(item);h.gold+=amount;setActorMoney(s,p,purse(p)-amount);actorItemLocation(s,item,p.id);itemBearer(s,item,p.id);item.history ||= [];item.history.push({tick:s.tick,text:`Продано ${p.name} ради еды за ◈${amount}.`});c.lastOffer.outcome='sold-for-food';c.lastOffer.price=amount;
  ctx.log(s,`${h.name} отдаёт памятную работу «${item.name}» ${p.name} за ◈${amount}: сейчас еда важнее собрания. Деньги взяты из кошелька покупателя.`,'collection');
 }
 refreshCollection(s,ctx);refreshCollection(s,ctx,p.id);return true;
}
