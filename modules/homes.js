import {physicalDistance} from '../geometry.js';
import {enabled} from '../rules.js';
import {activeBooking,roomAdmission} from './room-state.js';
import {interiorBuilding} from './interiors.js';
import {homesOn,homeAdmission} from './home-place.js';
import {localContact} from './npc-contacts.js';
import {npcAction,npcController} from './npc-control.js';
import {marketWallet,tradeGoods,quoteMarket} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {itemUnits,packView,fitsPack} from './container-state.js';
import {itemLocation,actorItemLocation} from './item-originals.js';
import {knowsBroth} from './hearth-food.js';
import {profile} from './common.js';
const healthy=h=>h.alive&&!h.transit&&!h.combat&&h.hp>=h.maxHp*.8&&h.energy>=40&&h.hunger<55;
const safe=(s,h)=>healthy(h)&&!h.quests.some(q=>q.status==='active')&&!h.stories.active&&!s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[h.area],h.x,o.x)<=28);
const ownRoom=(s,h)=>Object.values(s.areas).find(a=>a.interior?.kind==='room'&&(a.residence?.owner===h.lineage&&(s.people[h.lineage].privateHome?.room===a.id||h.area===a.id)||activeBooking(s,a,h.lineage)?.payer===h.lineage)&&[a.id,a.interior.parent,a.interior.exterior].includes(h.area));
export function homePlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!homesOn(s)||h.goal||!safe(s,h))return false;
 const a=ownRoom(s,h),owned=a?.residence?.owner===h.lineage;if(!a||!roomAdmission(s,a,h.lineage))return false;
 if(a.home){
  if(a.home.tenant!==h.lineage)return false;
  if(a.home.state==='building'){ctx.goal(s,'homeFit',a.id,56,owned?'Оборудовать свой дом':'Оборудовать жилую комнату',owned?'Материал отложен. Существующий сундук и право на дом сохраняются.':'Материал и согласие хозяина уже получены. Это работа в арендованном жилье, без права собственности.',{home:a.id});return true;}
  if(!homeAdmission(s,a,h.lineage))return false;
  const chest=a.objects.find(o=>o.id===a.home.chest),load=packView(s),used=chest.items.reduce((n,i)=>n+itemUnits(i),0);
  const stored=load.used<6&&chest.items.find(i=>!h.equipment[i.slot]&&['weapon','armor','charm'].includes(i.slot)&&fitsPack(s,h.lineage,{items:[...h.bag,i]}));
  const spare=load.used>12&&h.bag.filter(i=>h.equipment[i.slot]&&!i.mechanismPart&&!i.bioMaterial&&!i.tradeReceipt&&used+itemUnits(i)<=12).sort((x,y)=>(x.value||0)-(y.value||0))[0];
  if(stored||spare){ctx.goal(s,'homeStore',a.id,56,stored?'Забрать свою вещь из сундука':'Оставить запасную вещь дома','Оригинал перейдёт между дорожной сумкой и этим конечным сундуком; удалённого доступа нет.',{home:a.id,item:(stored||spare).id,take:Boolean(stored)});return true;}return false;
 }
 const configuration=knowsBroth(s,p)&&h.hunger>=35?'hearth':['craft','time'].includes(profile(h).skill)?'bench':knowsBroth(s,p)?'hearth':null;
 if(!configuration||h.career.path!=='peaceful'&&h.personality.curiosity<.7||h.gold<(owned?8:16)||(h.homeAfter||0)>s.tick)return false;
 if((p.marketCargo?.tools||0)<2){if(!enabled(s,'local-market')||!enabled(s,'goods-cycle')||h.gold<24)return false;ctx.goal(s,'homeMaterials',a.interior.exterior,58,'Купить материалы для жилой комнаты','Для сундука и устройства нужны два настоящих инструмента с конечного местного склада.',{home:a.id});return true;}
 const d=interiorBuilding(s,a),owner=owned?p:d&&localContact(s,d.owner,a.interior.parent)?.person;
 if(!owner||!owned&&(owner.id===h.lineage||owner.agenda.task||owner.needs.sleeping||owner.needs.energy<30||owner.needs.hunger>=60||npcController(s,owner)!=='personal')||(h.relations[owner.id]?.trust??0)<0)return false;
 ctx.goal(s,'homeAgree',owned?a.id:a.interior.parent,owned?56:owner.x,owned?'Подготовить оборудование своего дома':'Согласовать оборудование комнаты',owned?`Два инструмента и три действия оборудуют ${configuration==='bench'?'рабочий стол':'очаг'} и расширят существующий сундук. Право на дом не меняется.`:`За ◈8, два инструмента и три действия можно поставить сундук и ${configuration==='bench'?'рабочий стол':'очаг'}. Ночлег и доступ действуют только на оплаченный срок.`,{home:a.id,configuration,owner:owner.id});return true;
}
export function homeAction(s,ctx){
 const h=s.hero,g=h.goal,a=s.areas[g?.home],p=s.people[h.lineage],owned=a?.residence?.owner===h.lineage;
 if(!homesOn(s)||!a||!safe(s,h)||!roomAdmission(s,a,h.lineage)||!owned&&activeBooking(s,a,h.lineage)?.payer!==h.lineage){h.goal=null;return false;}
 if(g.kind==='homeMaterials'){
  if(h.area!==a.interior.exterior||physicalDistance(s.areas[h.area],h.x,58)>3)return false;
  const n=Math.max(0,2-(p.marketCargo?.tools||0)),q=quoteMarket(s,s.areas[h.area],'tools','buy',n,{gold:h.gold});
  if(!n||q.quantity!==n||h.gold-q.total<(owned?8:16)||ctx.maySpend&&!ctx.maySpend(s,'property',q.total+(owned?0:8),ctx)){h.homeAfter=s.tick+96;h.goal=null;return false;}
  const deal=tradeGoods(s,s.areas[h.area],h.lineage,'tools','buy',n);if(deal.quantity!==n){h.homeAfter=s.tick+96;h.goal=null;return false;}h.energy--;h.goal=null;h.lastAction='trade';ctx.log(s,'Материалы для жилой комнаты куплены из настоящего местного запаса.','trade');return true;
 }
 if(g.kind==='homeAgree'){
  const d=interiorBuilding(s,a),owner=owned?p:localContact(s,g.owner,h.area)?.person;
  if(a.home||!owner||d?.owner!==owner.id||h.area!==(owned?a.id:a.interior.parent)||physicalDistance(s.areas[h.area],h.x,owned?56:owner.x)>3||!owned&&(owner.agenda.task||owner.needs.sleeping||owner.needs.energy<30||owner.needs.hunger>=60||npcController(s,owner)!=='personal'||h.gold<16||(h.relations[owner.id]?.trust??0)<0||ctx.maySpend&&!ctx.maySpend(s,'property',8,ctx)||!npcAction(s,owner,'personal'))||(p.marketCargo?.tools||0)<2||!['bench','hearth'].includes(g.configuration)){h.goal=null;return false;}
  const before=p.marketCargo.tools;if(!owned){setActorMoney(s,p,h.gold-8);setActorMoney(s,owner,marketWallet(s,owner.id)+8);owner.needs.energy-=1;}p.marketCargo.tools-=2;h.energy-=2;
  const id=a.id+'/home',chest=owned?a.residence.chest:id+'/chest',device=id+'/'+g.configuration;
  a.home={version:1,id,owner:owner.id,tenant:h.lineage,permission:owned?a.residence.title:activeBooking(s,a).id,agreed:s.tick,configuration:g.configuration,state:'building',remaining:3,lastWorkTick:-1,steps:[],paid:owned?0:8,material:{kind:'tools',before,after:p.marketCargo.tools},chest,device};
  if(!owned)a.objects.push({id:chest,kind:'homeChest',name:'Личный сундук жильца',x:56,owner:h.lineage,items:[],capacity:12});h.goal=null;h.lastAction='talk';ctx.log(s,owned?'Два собственных инструмента отложены на оборудование дома. Существующий сундук и вещи сохраняются.':'Хозяин получил плату и разрешил оборудование. Два настоящих инструмента отложены на сундук и устройство; работу ещё предстоит закончить.','property');return true;
 }
 if(h.area!==a.id||physicalDistance(a,h.x,56)>3)return false;
 const home=a.home;if(!home||home.tenant!==h.lineage||home.owner!==(owned?a.residence.owner:activeBooking(s,a).owner)){h.goal=null;return false;}
 if(g.kind==='homeFit'){
  if(home.state!=='building'||home.lastWorkTick>=s.tick)return false;
  home.remaining--;home.lastWorkTick=s.tick;home.steps.push({tick:s.tick,energy:2});h.energy-=2;h.lastAction='work';
  if(home.remaining===0){home.state='ready';home.finished=s.tick;if(owned)a.objects.find(o=>o.id===home.chest).capacity=12;a.objects.push({id:home.device,kind:home.configuration==='bench'?'homeBench':'homeHearth',name:home.configuration==='bench'?'Домашний рабочий стол':'Домашний очаг с котелком',x:home.configuration==='bench'?42:72,owner:home.owner,tenant:home.tenant,state:'intact',history:[{tick:s.tick,kind:'installed',actor:h.lineage}],rent:0});h.goal=null;ctx.log(s,'В жилой комнате готовы личный сундук и '+(home.configuration==='bench'?'рабочий стол. Рецепт и настоящие материалы для ремесла по-прежнему нужны.':'очаг. Для еды по-прежнему нужны известный рецепт и собственные припасы.'),'property');}return true;
 }
 if(g.kind==='homeStore'){const moved=transferHomeItem(s,a,g.item,g.take,ctx);if(!moved)h.goal=null;return moved;}
 return false;
}
export function transferHomeItem(s,a,id,take,ctx){
 const h=s.hero;if(!homesOn(s)||!homeAdmission(s,a,h.lineage)||h.area!==a.id||h.combat||h.transit||h.energy<1||physicalDistance(a,h.x,56)>3||a.home.lastStoreTick>=s.tick)return false;
 const chest=a.objects.find(o=>o.id===a.home.chest),from=take?chest.items:h.bag,to=take?h.bag:chest.items,item=from.find(i=>i.id===id);
 if(chest.library?.copies.includes(id)||!item||take&&!fitsPack(s,h.lineage,{items:[...h.bag,item]})||!take&&chest.items.reduce((n,i)=>n+itemUnits(i),0)+itemUnits(item)>chest.capacity)return false;
 from.splice(from.indexOf(item),1);to.push(item);if(take)actorItemLocation(s,item);else itemLocation(s,item,{kind:'cache',area:a.id,object:chest.id});a.home.lastStoreTick=s.tick;h.energy--;h.lastAction='collect';h.goal=null;ctx.log(s,take?'Своя вещь взята из домашнего сундука.':'Своя вещь оставлена в домашнем сундуке; в дороге её больше нет.','item');return true;
}
