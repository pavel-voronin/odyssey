import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {revealArea} from '../actor-atlas.js';
import {setActorMoney} from '../actor-projection.js';
import {hasHabit,profile} from './common.js';
import {collectionItems} from './collection-state.js';
import {itemWearEnabled,itemWorking} from './item-condition.js';
import {cacheItems,ITEM_CAPACITY} from './item-originals.js';
import {goodsEnabled,productionSources} from './goods.js';
import {workshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {recordToolUse} from './workshop-tools.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';

export const ITEM_REPAIR_FEE=6,ITEM_REPAIR_MATERIAL=3;
export const ITEM_REPAIR_WINDOW=960;
const on=s=>itemWearEnabled(s)&&enabled(s,'property')&&goodsEnabled(s);
const own=(s,id,item)=>collectionItems(s,id).find(i=>i.id===item);
const current=p=>p.itemRepair?.orders[p.itemRepair.active];
const ensure=p=>p.itemRepair ||= {version:1,serial:0,orders:{},active:null,after:0};
const damaged=i=>Boolean(i?.durability&&i.durability.current<=i.durability.max*.25);
const healthy=(h,energy=35)=>h.alive&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.75&&h.energy>=energy&&h.hunger<55;
const at=(s,h,area,x)=>h.area===area&&physicalDistance(s.areas[area],h.x,x)<=9;
const ready=(s,site,m)=>site&&site.object.owner===m?.id&&site.object.state==='intact'&&!site.object.closed&&m.alive&&workToolReady(s,site.object);
const known=(s,h,m)=>h.memory.people.includes(m.id)||Object.hasOwn(h.relations,m.id)||s.people[h.lineage].forging?.recipes['working-knife']?.teacher===m.id;
function skill(s,m,item){return m.itemRepairKnowledge?.bases[item.base]?.source||(m.agenda.job==='artisan'?'occupation/artisan':knowsPracticalMethod(s,m.id,'craft')?'fit-working-part':item.base==='blade'&&m.forging?.recipes['working-knife']?'working-knife':null);}
const capable=(s,m,item,energy=35)=>m?.alive&&!m.needs.sleeping&&m.health>=(m.maxHealth||100)*.75&&m.needs.energy>=energy&&m.needs.hunger<55&&npcController(s,m)==='personal'&&skill(s,m,item);
const busy=(s,m)=>m.agenda.task||m.refitCommission||m.itemRepairCommission||m.refitWorkTick>=s.tick||m.forgeTeachingTick>=s.tick||m.itemRepairWorkTick>=s.tick||!canStartNPCActivity(s,m);
const spend=(s,n,ctx)=>ctx.maySpend?ctx.maySpend(s,'repair',n,ctx):s.hero.gold>=n;
function defer(s,n=240){ensure(s.people[s.hero.lineage]).after=s.tick+n;s.hero.goal=null;}
function end(s,p,o,status){o.status=status;o.ended=s.tick;p.itemRepair.active=null;p.itemRepair.after=s.tick+240;const h=s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id];if(h?.goal?.kind.startsWith('itemRepair')&&h.goal.master===o.master)h.goal=null;}
function attachment(s,item){const h=s.hero;return hasHabit(h,'collector')||hasHabit(h,'hoarder')&&item.creator===h.lineage||item.enchantment?.owners?.some(id=>s.people[h.lineage].parents.includes(id));}
export function itemRepairPreference(s,item){
 const h=s.hero,attached=Boolean(attachment(s,item)),selfKnife=item.toolKind==='knife'&&Boolean(s.people[h.lineage].forging?.recipes['working-knife']);
 return {attached,choice:h.money.style==='cautious'&&!attached&&(selfKnife||item.value<ITEM_REPAIR_FEE+ITEM_REPAIR_MATERIAL)?'base':'repair'};
}
export function acceptItemRepair(s,m,item,ctx){
 const h=s.hero,p=s.people[h.lineage],site=workshopSite(s,h.area);
 if(!on(s)||!healthy(h)||!item||!damaged(item)||own(s,p.id,item.id)!==item||current(p)||!capable(s,m,item)||!known(s,h,m)||!ready(s,site,m)||!at(s,h,m.area,m.x)||busy(s,m)||itemRepairPreference(s,item).choice!=='repair'||!spend(s,ITEM_REPAIR_FEE+ITEM_REPAIR_MATERIAL,ctx)||!npcAction(s,m,'personal','item-repair-accept'))return null;
 const q=ensure(p),id=p.id+'/item-repair/'+(++q.serial),source=skill(s,m,item);m.itemRepairKnowledge ||= {version:1,bases:{}};m.itemRepairKnowledge.bases[item.base] ||= {source,recordedAt:s.tick};
 const o={id,owner:p.id,item:item.id,master:m.id,area:site.area.id,workshop:site.object.id,status:'material',accepted:s.tick,paidAt:s.tick,deadline:s.tick+ITEM_REPAIR_WINDOW,fee:ITEM_REPAIR_FEE,material:null,progress:0,required:knowsPracticalMethod(s,m.id,'craft')?3:4,lastWorkTick:-1};
 for(const old of Object.values(q.orders).filter(o=>o.status==='completed').slice(0,-7))delete q.orders[old.id];
 setActorMoney(s,p,h.gold-ITEM_REPAIR_FEE);setActorMoney(s,m,m.agenda.wealth+ITEM_REPAIR_FEE);q.orders[id]=o;q.active=id;m.itemRepairCommission={version:1,client:p.id,order:id};m.itemRepairWorkTick=s.tick;
 ctx.log(s,`${m.name} берётся восстановить ${item.name} за ◈${ITEM_REPAIR_FEE}. Место сохранится четыре дня. Нужны материал и настоящая работа; прежний экземпляр остаётся у владельца.`,'equipment');return o;
}
export function acquireItemRepairMaterial(s,ctx){
 const h=s.hero,p=s.people[h.lineage],o=current(p);if(!on(s)||!o||s.tick>o.deadline||o.status!=='material'||o.material||!healthy(h)||!own(s,p.id,o.item)||!at(s,h,o.area,42)||!spend(s,ITEM_REPAIR_MATERIAL,ctx))return false;
 const a=s.areas[o.area],raw=productionSources(s,a)?.materials;if(!raw||raw.stock<1)return false;
 raw.stock--;raw.used++;setActorMoney(s,p,h.gold-ITEM_REPAIR_MATERIAL);a.civic.treasury+=ITEM_REPAIR_MATERIAL;
 o.material={id:o.id+'/material',owner:p.id,source:raw.id,sourceOwner:'civic/'+raw.place,acquiredAt:s.tick,price:ITEM_REPAIR_MATERIAL,state:'reserved'};o.status='working';
 ctx.log(s,`${h.name} приобретает материал для ремонта за ◈${ITEM_REPAIR_MATERIAL}. Он принадлежит начатому заказу.`,'equipment');return true;
}
export function performItemRepair(s,ctx){
 const h=s.hero,p=s.people[h.lineage],o=current(p),item=o&&own(s,p.id,o.item),m=o&&s.people[o.master],site=o&&workshopSite(s,o.area,o.workshop);
 if(!on(s)||!o||s.tick>o.deadline||o.status!=='working'||!o.material||!item?.durability||item.durability.current>=item.durability.max||!healthy(h,24)||!capable(s,m,item,24)||!ready(s,site,m)||o.lastWorkTick>=s.tick||m.refitCommission||m.refitWorkTick>=s.tick||m.forgeTeachingTick>=s.tick||m.itemRepairWorkTick>=s.tick)return false;
 const pos=workshopPosition(s,site.area,site.object);if(!at(s,h,pos.area,pos.x)||m.area!==pos.area||physicalDistance(s.areas[pos.area],m.x,pos.x)>9||m.itemRepairCommission?.order!==o.id||m.agenda.task&&m.agenda.task.kind!=='itemRepairBench'||!canStartNPCActivity(s,m)||!npcAction(s,m,'personal','item-repair-work'))return false;
 o.lastWorkTick=s.tick;m.itemRepairWorkTick=s.tick;o.progress++;h.energy-=2;m.needs.energy-=2;h.lastAction='work';h.speech=`Ремонт: ${o.progress}/${o.required}`;
 if(o.progress<o.required)return true;
 const d=item.durability,restored=d.max-d.current;d.current=d.max;d.restored+=restored;d.repairs++;d.lastRepair={tick:s.tick,master:m.id,order:o.id,restored};
 o.status='completed';o.finished=s.tick;o.restored=restored;o.material.state='consumed';qFinish(p,s.tick);
 item.history.push({tick:s.tick,text:`Восстановлено: ${m.name}, ${restored} исправности. Тот же экземпляр; материал со склада «${site.area.name}», ${o.progress} рабочих действий.`});
 recordToolUse(s,site.area,site.object,m.id,ctx);m.itemRepairCommission=null;if(m.agenda.task?.kind==='itemRepairBench'){m.agenda.task=null;m.agenda.due=s.tick+48;}h.goal=null;
 ctx.log(s,`${item.name} снова исправен. ${m.name} восстановил прежнюю вещь; её создатель, владельцы и память сохранены.`,'equipment');return true;
}
function qFinish(p,tick){p.itemRepair.active=null;p.itemRepair.after=tick+240;}
function jobForMaster(s,m){const c=m.itemRepairCommission,p=c&&s.people[c.client],o=p?.itemRepair?.orders[c.order];if(p?.alive&&o&&['material','working'].includes(o.status)&&s.tick>o.deadline){end(s,p,o,'expired');return null;}return p?.alive&&o&&o.master===m.id&&['material','working'].includes(o.status)?{p,o}:null;}
export function npcItemRepairPlan(s,m){
 if(!on(s))return null;const pair=jobForMaster(s,m);if(!pair){if(m.itemRepairCommission)m.itemRepairCommission=null;return null;}
 const {p,o}=pair,h=s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id],item=h&&own(s,p.id,o.item),site=workshopSite(s,o.area,o.workshop);
 if(!h?.alive||!item||!capable(s,m,item)||!['itemRepairMaterial','itemRepairWork'].includes(h.goal?.kind)||!ready(s,site,m)||![site.area.id,site.room?.id].includes(h.area))return null;
 return {kind:'itemRepairBench',target:site.area.id,x:site.object.x,remaining:1,property:site.object.id,client:p.id,order:o.id};
}
export function npcItemRepairWait(s,m){
 const t=m.agenda.task,pair=jobForMaster(s,m),h=pair&&(s.hero.lineage===pair.p.id?s.hero:s.actorStates?.[pair.p.id]),site=pair&&workshopSite(s,pair.o.area,pair.o.workshop);
 if(!on(s)||!pair||!h?.alive||!['itemRepairMaterial','itemRepairWork'].includes(h.goal?.kind)||h.transit||!site||![site.area.id,site.room?.id].includes(h.area)||t.order!==pair.o.id){m.agenda.task=null;m.agenda.due=s.tick+16;return false;}return true;
}
function fallbackPlan(s,ctx){
 const h=s.hero;for(const [slot,item]of Object.entries(h.equipment))if(item?.durability&&!itemWorking(item)){
  const alternatives=h.bag.filter(i=>i.slot===slot&&itemWorking(i)),score=i=>slot==='weapon'&&i.stat==='magic'&&profile(h).skill!=='magic'&&!h.magic.spells.length ? .1 : i.power;
  alternatives.sort((a,b)=>score(b)-score(a));const next=alternatives[0];
  if(next||slot==='armor'){ctx.goal(s,'itemGearSwap',h.area,h.x,next?'Сменить сломанное снаряжение':'Снять бесполезный груз',next?'В сумке есть исправная вещь. Сломанный оригинал останется у владельца.':'Повреждённый доспех больше не защищает, но сохраняет вес. Можно продолжить с базовой защитой.',{item:item.id,replacement:next?.id||null,slot});return true;}
 }return false;
}
export function itemRepairPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage],q=p.itemRepair;if(h.goal||!h.alive||h.combat||h.transit||!enabled(s,'equipment'))return false;if(fallbackPlan(s,ctx))return true;
 if(!on(s)||!healthy(h)||q?.after>s.tick)return false;
 const o=current(p);if(o){if(s.tick>o.deadline){end(s,p,o,'expired');return false;}if(!own(s,p.id,o.item)){end(s,p,o,'lost-item');return false;}ctx.goal(s,o.status==='material'?'itemRepairMaterial':'itemRepairWork',o.area,42,'Продолжить оплаченный ремонт','Материал и выполненные шаги сохраняются. Нужны прежний мастер и настоящий верстак.',{property:o.workshop,master:o.master});return true;}
 const item=collectionItems(s).find(damaged);if(!item)return false;
 const pending=p.knifeRefit?.orders[p.knifeRefit.active];if(pending?.item===item.id&&['material','working'].includes(pending.status))return false;
 if(itemRepairPreference(s,item).choice==='base'){const state=ensure(p);state.after=s.tick+240;state.lastChoice={tick:s.tick,item:item.id,choice:'base'};return false;}
 const site=workshopSite(s,h.area),m=site&&s.people[site.object.owner];if(!ready(s,site,m)||!capable(s,m,item)||!known(s,h,m)||m.refitCommission||m.itemRepairCommission||!spend(s,ITEM_REPAIR_FEE+ITEM_REPAIR_MATERIAL,ctx))return false;
 ctx.goal(s,'itemRepairMeet',site.area.id,site.object.x,'Договориться о ремонте',attachment(s,item)?'Он хочет сохранить знакомую вещь вместе с её историей.':'Сильный износ уже заметен. Ремонт может вернуть исправность без замены предмета.',{property:site.object.id,master:m.id,item:item.id});return true;
}
export function itemRepairTarget(s,ctx){
 const h=s.hero,g=h.goal;if(!['itemRepairMeet','itemRepairWork'].includes(g?.kind))return true;if(!on(s)){h.goal=null;return false;}
 const site=workshopSite(s,g.workshopExterior||g.area,g.property),m=s.people[g.master];if(!site){defer(s);return false;}if(![site.area.id,site.room?.id].includes(h.area))return true;
 if(!ready(s,site,m)){const p=s.people[h.lineage],o=current(p);if(o)end(s,p,o,'unavailable');h.goal=null;ctx.log(s,'Место или мастер больше недоступны. Предмет и запись вложенного материала сохранены; жизнь продолжается.','equipment');return false;}
 g.workshopExterior=site.area.id;const pos=g.kind==='itemRepairWork'?workshopPosition(s,site.area,site.object):{area:m.area,x:m.x};if(![site.area.id,site.room?.id].includes(pos.area)){defer(s);return false;}
 if(h.area===site.area.id&&pos.area===site.room?.id&&physicalDistance(site.area,h.x,site.object.x)>18){g.area=site.area.id;g.x=site.object.x;return true;}if(pos.area===site.room?.id)revealArea(s,site.room);g.area=pos.area;g.x=pos.x;return true;
}
export function itemRepairAction(s,ctx){
 const h=s.hero,g=h.goal;if(!g)return false;
 if(g.kind==='itemGearSwap'){
  const item=h.equipment[g.slot],next=g.replacement&&h.bag.find(i=>i.id===g.replacement);if(!item||item.id!==g.item||itemWorking(item)||g.replacement&&!itemWorking(next)){h.goal=null;return false;}
  if(next)h.bag=h.bag.filter(i=>i!==next);h.equipment[g.slot]=next||null;if(h.bag.length<ITEM_CAPACITY)h.bag.push(item);else cacheItems(s,[item]);h.lastAction='collect';h.goal=null;ctx.log(s,next?`${h.name} меняет сломанную вещь на ${next.name}. Прежний оригинал сохранён.`:`${h.name} снимает ${item.name}. Доспех сохранён, а лишний груз больше не тратит силы в дороге.`,'equipment');return true;
 }
 if(!on(s)){h.goal=null;return false;}
 const p=s.people[h.lineage],o=current(p);if(g.kind!=='itemRepairMeet'&&(!o||s.tick>o.deadline)){if(o)end(s,p,o,'expired');h.goal=null;return false;}
 if(g.kind==='itemRepairMeet'){const o=acceptItemRepair(s,s.people[g.master],own(s,h.lineage,g.item),ctx);if(!o){defer(s);return false;}Object.assign(g,{kind:'itemRepairMaterial',area:o.area,x:42});h.intent='Приобрести материал для ремонта';h.reason='Мастер уже оплачен. Материал нужен от настоящего местного источника.';return true;}
 if(g.kind==='itemRepairMaterial'){if(!acquireItemRepairMaterial(s,ctx)){defer(s);return false;}Object.assign(g,{kind:'itemRepairWork',waits:0});h.intent='Восстановить вещь вместе с мастером';h.reason='Оплата и материал готовы. Прежний экземпляр ждёт работы у верстака.';return true;}
 if(g.kind==='itemRepairWork'){if(performItemRepair(s,ctx))return true;h.lastAction='talk';h.speech='Подожду мастера для ремонта.';g.waits=(g.waits||0)+1;if(g.waits>=96)defer(s);return false;}return false;
}
