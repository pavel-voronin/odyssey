import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {revealArea} from '../actor-atlas.js';
import {setActorMoney} from '../actor-projection.js';
import {hasHabit,profile} from './common.js';
import {collectionItems} from './collection-state.js';
import {goodsEnabled,productionSources} from './goods.js';
import {workshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {recordToolUse} from './workshop-tools.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {itemWorking} from './item-condition.js';

export const REFIT_FEE=12,REFIT_MATERIAL_PRICE=3;
export const refittingEnabled=s=>enabled(s,'knife-refit')&&enabled(s,'equipment')&&enabled(s,'property')&&goodsEnabled(s);
const ensure=p=>p.knifeRefit ||= {version:1,serial:0,orders:{},active:null,after:0};
const order=p=>p.knifeRefit?.orders[p.knifeRefit.active];
const ownKnife=(s,id,item)=>collectionItems(s,id).find(i=>i.id===item&&i.base==='blade'&&i.toolKind==='knife');
const known=(s,h,m)=>h.memory.people.includes(m.id)||Object.hasOwn(h.relations,m.id)||s.people[h.lineage].forging?.recipes['working-knife']?.teacher===m.id||h.lineage===m.id;
const at=(s,h,area,x)=>h.area===area&&physicalDistance(s.areas[area],h.x,x)<=9;
const ready=(s,site,m)=>site&&site.object.owner===m?.id&&site.object.state==='intact'&&!site.object.closed&&m.alive&&workToolReady(s,site.object);
const healthy=(h,energy=35)=>h.alive&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.75&&h.energy>=energy&&h.hunger<55;
const capable=(s,m,energy=35)=>m?.alive&&(m.agenda?.job==='artisan'||m.forging?.recipes['working-knife'])&&!m.needs.sleeping&&m.health>=(m.maxHealth||100)*.75&&m.needs.energy>=energy&&m.needs.hunger<55&&npcController(s,m)==='personal';
const spend=(s,price,ctx)=>ctx.maySpend?ctx.maySpend(s,'craft',price,ctx):s.hero.gold>=price;
function defer(s,delay=120){ensure(s.people[s.hero.lineage]).after=s.tick+delay;s.hero.goal=null;}
export function refitPreference(s,item){
 const h=s.hero,sentiment=hasHabit(h,'collector')||hasHabit(h,'hoarder')&&item.creator===h.lineage||item.enchantment?.owners?.some(id=>s.people[h.lineage].parents.includes(id));
 const mode=['ranger','farmer','healer','alchemist'].includes(h.profession)||['healing','spirit'].includes(profile(h).skill)?'precision':'edge';
 return {mode,sentimental:Boolean(sentiment),choice:h.money.style==='cautious'&&!sentiment?'defer':'refit'};
}
export function acceptRefit(s,m,item,ctx){
 const h=s.hero,p=s.people[h.lineage],site=workshopSite(s,h.area),preference=item&&refitPreference(s,item);
 if(!refittingEnabled(s)||!healthy(h)||!capable(s,m)||!known(s,h,m)||!ready(s,site,m)||!at(s,h,m.area,m.x)||m.agenda.task||m.refitCommission||m.itemRepairCommission||m.itemRepairWorkTick>=s.tick||m.forgeTeachingTick>=s.tick||m.refitWorkTick>=s.tick||!canStartNPCActivity(s,m)||!item||!itemWorking(item)||ownKnife(s,h.lineage,item.id)!==item||item.refit||order(p)||preference.choice!=='refit'||!spend(s,REFIT_FEE+REFIT_MATERIAL_PRICE,ctx)||!npcAction(s,m,'personal','refit-accept'))return null;
 const q=ensure(p),id=h.lineage+'/refit/'+(++q.serial),skilled=knowsPracticalMethod(s,m.id,'craft');
 const o={id,owner:h.lineage,item:item.id,master:m.id,area:site.area.id,workshop:site.object.id,mode:preference.mode,status:'material',accepted:s.tick,fee:REFIT_FEE,paidAt:s.tick,material:null,progress:0,required:skilled?3:4,limit:skilled?3:2,lastWorkTick:-1,before:{name:item.name,power:item.power},checkAfter:s.tick};
 setActorMoney(s,p,h.gold-REFIT_FEE);setActorMoney(s,m,m.agenda.wealth+REFIT_FEE);q.orders[id]=o;q.active=id;m.refitCommission={version:1,client:h.lineage,order:id};m.refitWorkTick=s.tick;
 ctx.log(s,`${m.name} предлагает ${o.mode==='precision'?'подогнать нож для точного сбора':'переточить нож для боя'}. ${h.name} сохраняет знакомую вещь и платит мастеру ◈${REFIT_FEE}. Материал ещё нужно приобрести.`,'craft');return o;
}
export function acquireRefitMaterial(s,ctx){
 const h=s.hero,p=s.people[h.lineage],o=order(p);if(!refittingEnabled(s)||!o||o.status!=='material'||o.material||!healthy(h)||!ownKnife(s,h.lineage,o.item)||!at(s,h,o.area,42)||!spend(s,REFIT_MATERIAL_PRICE,ctx))return false;
 const a=s.areas[o.area],raw=productionSources(s,a)?.materials;if(!raw||raw.stock<1)return false;
 raw.stock--;raw.used++;setActorMoney(s,p,h.gold-REFIT_MATERIAL_PRICE);a.civic.treasury+=REFIT_MATERIAL_PRICE;
 o.material={id:o.id+'/material',owner:p.id,source:raw.id,sourceOwner:'civic/'+raw.place,acquiredAt:s.tick,price:REFIT_MATERIAL_PRICE,state:'reserved'};o.status='working';return true;
}
export function performRefit(s,ctx){
 const h=s.hero,p=s.people[h.lineage],o=order(p),m=o&&s.people[o.master],site=o&&workshopSite(s,o.area,o.workshop),item=o&&ownKnife(s,h.lineage,o.item);
 if(!refittingEnabled(s)||!o||o.status!=='working'||!o.material||!healthy(h,24)||!capable(s,m,24)||!ready(s,site,m)||!item||item.refit||m.itemRepairCommission||m.itemRepairWorkTick>=s.tick||m.forgeTeachingTick>=s.tick||o.lastWorkTick>=s.tick)return false;
 const pos=workshopPosition(s,site.area,site.object);if(!at(s,h,pos.area,pos.x)||m.area!==pos.area||physicalDistance(s.areas[pos.area],m.x,pos.x)>9||m.refitCommission?.order!==o.id||m.agenda.task&&m.agenda.task.kind!=='refitBench'||!canStartNPCActivity(s,m)||m.refitWorkTick>=s.tick||!npcAction(s,m,'personal','refit-work'))return false;
 o.lastWorkTick=s.tick;m.refitWorkTick=s.tick;o.progress++;h.energy-=2;m.needs.energy-=2;h.lastAction='work';h.speech=`Переделка ножа: ${o.progress}/${o.required}`;
 if(o.progress<o.required)return true;
 o.status='completed';o.finished=s.tick;o.material.state='consumed';qFinish(p,s.tick);
 item.refit={version:1,order:o.id,recipe:'knife-'+o.mode,mode:o.mode,master:m.id,finished:s.tick,actions:o.progress,limit:o.limit,fee:o.fee,material:{...o.material},before:{...o.before}};
 item.name=o.mode==='precision'?'Рабочий нож · точная рукоять':'Рабочий нож · боевая заточка';item.power=o.mode==='edge'?Math.min(o.limit,o.before.power+(o.required===3?2:1)):o.before.power;
 item.history.push({tick:s.tick,text:`Переделано: ${m.name}. ${o.mode==='precision'?'Точная рукоять для сбора':'Боевая заточка'}; прежний нож и его владельцы сохранены. Материал со склада «${site.area.name}», ${o.progress} рабочих действий.`});
 if(itemWorking(item)&&h.bag.includes(item)&&(!itemWorking(h.equipment.weapon)||item.power>h.equipment.weapon.power)){const previous=h.equipment.weapon;h.bag=h.bag.filter(i=>i!==item);if(previous)h.bag.push(previous);h.equipment.weapon=item;}
 recordToolUse(s,site.area,site.object,m.id,ctx);m.refitCommission=null;if(m.agenda.task?.kind==='refitBench'){m.agenda.task=null;m.agenda.due=s.tick+48;}h.goal=null;
 ctx.log(s,`${m.name} возвращает тот же нож: ${item.name}. ${!itemWorking(item)?'Нож по-прежнему неисправен: до рабочего эффекта нужен отдельный ремонт.':o.mode==='precision'?'Сбор грибов занимает на одно действие меньше.':'Боевой удар ножа усилен.'} Прежняя история вещи продолжается.`,'craft');return true;
}
function qFinish(p,tick){p.knifeRefit.active=null;p.knifeRefit.after=tick+960;}
function jobForMaster(s,m){const c=m.refitCommission,p=c&&s.people[c.client],o=p?.knifeRefit?.orders[c.order];return p?.alive&&o&&o.master===m.id&&['material','working'].includes(o.status)?{p,o}:null;}
export function npcRefitPlan(s,m){
 if(!refittingEnabled(s)||!capable(s,m))return null;const pair=jobForMaster(s,m);if(!pair){if(m.refitCommission)m.refitCommission=null;return null;}
 const {p,o}=pair,h=s.hero?.lineage===p.id?s.hero:s.actorStates?.[p.id],site=workshopSite(s,o.area,o.workshop);
 if(!h?.alive||!['refitMaterial','refitWork'].includes(h.goal?.kind)||!ready(s,site,m)||![site.area.id,site.room?.id].includes(h.area))return null;
 return {kind:'refitBench',target:site.area.id,x:site.object.x,remaining:1,property:site.object.id,client:p.id,order:o.id};
}
export function npcRefitWait(s,m){
 const t=m.agenda.task,pair=jobForMaster(s,m),h=pair&&(s.hero?.lineage===pair.p.id?s.hero:s.actorStates?.[pair.p.id]);
 const site=pair&&workshopSite(s,pair.o.area,pair.o.workshop);
 if(!refittingEnabled(s)||!pair||!h?.alive||!['refitMaterial','refitWork'].includes(h.goal?.kind)||h.transit||!site||![site.area.id,site.room?.id].includes(h.area)||t.order!==pair.o.id){m.agenda.task=null;m.agenda.due=s.tick+16;return false;}
 // This NPC tick is a real appointment/wait. The hero's later callback cannot
 // spend the same actor's action again; joint work resumes on another tick.
 return true;
}
export function refitPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage],q=p.knifeRefit;if(!refittingEnabled(s)||h.goal||!healthy(h)||q?.after>s.tick)return false;
 const o=order(p);if(o){const kind=o.status==='material'?'refitMaterial':'refitWork';if(!ownKnife(s,h.lineage,o.item)){o.status='lost-item';o.ended=s.tick;qFinish(p,s.tick);ctx.log(s,'Ножа больше нет при владельце. Начатая переделка прекращена; прежняя оплата и вложение остаются в записи заказа.','craft');return false;}ctx.goal(s,kind,o.area,42,'Продолжить переделку ножа','Оплата и начатая работа сохранены. Нужны прежний мастер, материал и встреча у верстака.',{property:o.workshop,master:o.master});return true;}
 const a=s.areas[h.area],site=workshopSite(s,a),m=site&&s.people[site.object.owner];if(!ready(s,site,m)||!capable(s,m)||!known(s,h,m)||m.id===h.lineage||m.refitCommission||h.quests.some(q=>q.status==='active'))return false;
 const item=collectionItems(s).find(i=>i.base==='blade'&&i.toolKind==='knife'&&!i.refit);if(!item||refitPreference(s,item).choice!=='refit'||!spend(s,REFIT_FEE+REFIT_MATERIAL_PRICE,ctx))return false;
 ctx.goal(s,'refitMeet',site.area.id,site.object.x,'Обсудить переделку ножа',refitPreference(s,item).sentimental?'Хочет сохранить знакомую вещь и её историю.':'Знакомый мастер может приспособить нож к его нынешнему занятию.',{property:site.object.id,master:m.id,item:item.id});return true;
}
export function refitTarget(s){
 const h=s.hero,g=h.goal;if(!['refitMeet','refitWork'].includes(g?.kind))return true;
 if(!refittingEnabled(s)){h.goal=null;return false;}
 const site=workshopSite(s,g.workshopExterior||g.area,g.property),m=s.people[g.master];if(!site){defer(s);return false;}
 if(![site.area.id,site.room?.id].includes(h.area))return true;
 if(!ready(s,site,m)){defer(s);return false;}
 g.workshopExterior=site.area.id;const pos=g.kind==='refitWork'?workshopPosition(s,site.area,site.object):{area:m.area,x:m.x};
 if(![site.area.id,site.room?.id].includes(pos.area)){defer(s);return false;}
 if(h.area===site.area.id&&pos.area===site.room?.id&&physicalDistance(site.area,h.x,site.object.x)>18){g.area=site.area.id;g.x=site.object.x;return true;}
 if(pos.area===site.room?.id)revealArea(s,site.room);g.area=pos.area;g.x=pos.x;return true;
}
export function refitAction(s,ctx){
 const h=s.hero,g=h.goal,p=s.people[h.lineage];if(!g)return false;if(!refittingEnabled(s)){h.goal=null;return false;}
 if(g.kind==='refitMeet'){const o=acceptRefit(s,s.people[g.master],ownKnife(s,h.lineage,g.item),ctx);if(!o){defer(s);return false;}Object.assign(g,{kind:'refitMaterial',area:o.area,x:42});h.intent='Найти материал для переделки';h.reason='Мастеру уже заплачено. Нужна одна единица материала с местного склада.';return true;}
 if(g.kind==='refitMaterial'){if(!acquireRefitMaterial(s,ctx)){defer(s);return false;}Object.assign(g,{kind:'refitWork',waits:0});h.intent='Доработать нож вместе с мастером';h.reason='Оплата и материал готовы. Встреча у верстака сохранит прежнюю историю ножа.';return true;}
 if(g.kind==='refitWork'){if(performRefit(s,ctx))return true;h.lastAction='talk';h.speech='Подожду мастера у верстака.';g.waits=(g.waits||0)+1;if(g.waits>=96)defer(s);return false;}
 return false;
}
