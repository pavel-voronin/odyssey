import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {setActorMoney} from '../actor-projection.js';
import {npcController,canStartNPCActivity} from './npc-control.js';
import {productionSources,completeGoodsWork} from './goods.js';
import {tradeGoods} from './market.js';
import {workshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {controlBlocked} from './building-control-state.js';
import {financeBody,financeTogether} from './production-finance.js';
import {patronageActive} from './patronage-state.js';
import {supportWorkshopRepair} from './workshop-support.js';
export const patronageOn=s=>enabled(s,'patronage')&&enabled(s,'property')&&enabled(s,'property-damage')&&enabled(s,'work')&&enabled(s,'goods-cycle')&&enabled(s,'local-market');
const book=h=>h.patronMemory ||= {version:1,after:0,notes:[]};
function note(s,p,o,outcome){const m=book(s.hero);m.after=s.tick+96;m.notes.push({at:s.tick,person:p.id,property:o.id,area:p.area,outcome});if(m.notes.length>12)m.notes.shift();}
function localSite(s,p,id=null){const b=financeBody(s,p?.id),site=b&&workshopSite(s,b.area,id);return site&&site.object.owner===p.id&&physicalDistance(s.areas[b.area],b.x,site.inside?site.room.interior.station:site.object.x)<=24?site:null;}
export function patronagePlan(s,ctx){
 const h=s.hero;if(!patronageOn(s)||!h.alive||h.transit||h.combat||h.energy<30)return false;
 const c=Object.values(s.patronProjects||{}).find(c=>c.donor===h.lineage&&c.status==='awaiting-stock'&&(c.supplyAttempt?.until||0)<=s.tick&&financeTogether(s,h.lineage,c.producer));
 if(c){ctx.goal(s,'patronStock',h.area,financeBody(s,c.producer).x,'Обсудить первый запас мастерской','Ремонт завершён настоящим трудом. Следующий подарок требует новых доступных денег и сырья; прежний остаётся у получателя.',{project:c.id,person:c.producer});return true;}
 if(h.gold<64||h.personality.generosity<.65||(h.patronMemory?.after||0)>s.tick||Object.values(s.patronProjects||{}).some(c=>c.donor===h.lineage&&patronageActive(c)))return false;
 for(const p of Object.values(s.people)){
  if(p.id===h.lineage||p.role==='ребёнок'||p.agenda?.job!=='artisan'||npcController(s,p)!=='personal'||!financeTogether(s,h.lineage,p.id)||!h.memory.people.includes(p.id))continue;
  const site=localSite(s,p);if(!site||site.object.state!=='burned'||site.object.repair?.materials||controlBlocked(s,site.area,site.object)||Object.values(s.patronProjects||{}).some(c=>c.workshop===site.object.id&&patronageActive(c))||Object.values(s.productionDeals||{}).some(c=>c.producer===p.id&&['working','selling','payable'].includes(c.status)))continue;
  if(ctx.maySpend&&!ctx.maySpend(s,'patronage',18,ctx))return false;
  ctx.goal(s,'patronOffer',h.area,p.x,'Предложить помощь мастерской','◈18 и один местный инструмент пойдут на ремонт. После трёх рабочих действий можно отдельно подарить ◈4 на первый запас. Титул и будущий доход останутся у владельца.',{person:p.id,property:site.object.id});return true;
 }return false;
}
export function acceptPatronage(s,ctx){
 const h=s.hero,g=h.goal,p=s.people[g?.person],site=p&&localSite(s,p,g.property);h.goal=null;
 if(!patronageOn(s)||!site||p.id===h.lineage||p.role==='ребёнок'||p.agenda?.job!=='artisan'||npcController(s,p)!=='personal'||!h.memory.people.includes(p.id)||h.personality.generosity<.65||!financeTogether(s,h.lineage,p.id)||!canStartNPCActivity(s,p)||h.gold<64||site.object.state!=='burned'||Object.values(s.patronProjects||{}).some(c=>c.workshop===site.object.id&&patronageActive(c)))return false;
 if(Object.values(s.productionDeals||{}).some(c=>c.producer===p.id&&['working','selling','payable'].includes(c.status)))return false;
 const o=site.object;p.productionTalkTick=s.tick;h.lastAction='talk';
 if((p.agenda.bonds?.[h.lineage]||0)<-8||(p.agenda.duty<.25&&(p.agenda.bonds?.[h.lineage]||0)<3)){
  note(s,p,o,'refused');ctx.log(s,p.name+' отказывается от предложенного патронажа. Мастерская и деньги остаются у прежних владельцев.','choice');return false;
 }
 const repair=supportWorkshopRepair(s,h,p,site.area,o,ctx);if(!repair){note(s,p,o,'unavailable');ctx.log(s,'Помощь мастерской не оплачена: доступных материалов или денег сейчас нет.','trade');return false;}
 s.patronProjects ||= {};let n=1;while(s.patronProjects[h.lineage+'/patronage/'+n])n++;const id=h.lineage+'/patronage/'+n;
 const c=s.patronProjects[id]={version:1,id,donor:h.lineage,producer:p.id,area:site.area.id,workshop:o.id,accepted:s.tick,damageAt:o.damagedAt,status:'repairing',repair,material:null,work:null,cargo:0,revenue:0,lastAction:-1,after:0};note(s,p,o,'repair');p.agenda.due=s.tick;
 ctx.log(s,h.name+' помогает '+p.name+': оплачены ◈18 и один действительный инструмент. Титул остаётся у мастера; ремонт потребует трёх рабочих действий.','repair');return c;
}
export function patronStock(s,ctx){
 const h=s.hero,c=s.patronProjects?.[h.goal?.project],p=s.people[c?.producer];h.goal=null;
 if(!patronageOn(s)||c?.status!=='awaiting-stock'||c.donor!==h.lineage||!financeTogether(s,h.lineage,p.id)||!canStartNPCActivity(s,p))return false;
 const site=localSite(s,p,c.workshop);if(!site||site.area.id!==c.area||site.object.state!=='intact')return false;p.productionTalkTick=s.tick;h.lastAction='talk';
 if(h.gold<24||h.personality.generosity<.65||ctx.maySpend&&!ctx.maySpend(s,'patronage',4,ctx)){
  c.status='stopped';c.stopped={at:s.tick,by:h.lineage,reason:'own-needs'};note(s,p,site.object,'stopped');ctx.log(s,h.name+' прекращает дальнейшие платежи: собственные нужды важнее. Уже восстановленная мастерская остаётся у '+p.name+'.','choice');return true;
 }
 const a=site.area,raw=productionSources(s,a).materials;if(raw.stock<2){c.supplyAttempt={at:s.tick,by:h.lineage,until:s.tick+96,reason:'no-raw'};note(s,p,site.object,'no-raw');ctx.log(s,'Для первого рабочего запаса не хватает настоящего сырья. Новых денег не списано; прежний ремонт сохраняется.','trade');return false;}
 const before=raw.stock;setActorMoney(s,s.people[h.lineage],h.gold-4);a.civic.treasury+=4;raw.stock-=2;raw.used+=2;c.material={quantity:2,state:'reserved',source:raw.id,before,after:raw.stock,at:s.tick,payer:h.lineage,price:4};c.status='working';p.agenda.due=s.tick;note(s,p,site.object,'stock');
 ctx.log(s,h.name+' покупает за ◈4 две настоящие заготовки в подарок '+p.name+'. Выпуск и сбыт ещё зависят от труда, исправной мастерской и покупателя.','trade');return true;
}
export function npcPatronagePlan(s,p){
 if(!patronageOn(s)||p.ailment||p.health<(p.maxHealth||100)*.85||p.needs.energy<25||p.needs.hunger>65)return false;
 const c=Object.values(s.patronProjects||{}).find(c=>c.producer===p.id&&['working','selling'].includes(c.status));if(!c||c.after>s.tick)return false;
 const site=workshopSite(s,c.area,c.workshop);if(c.status==='working'&&(!site||site.object.owner!==p.id||site.object.state!=='intact'||!workToolReady(s,site.object)||controlBlocked(s,site.area,site.object)))return false;
 const pos=c.status==='working'?workshopPosition(s,site.area,site.object):{area:c.area,x:58};p.agenda.task={kind:c.status==='working'?'work':'patronSale',target:pos.area,x:pos.x,remaining:3,patronProject:c.id,...(c.status==='working'?{workMode:'production',workshop:{id:c.workshop,area:c.area}}:{})};p.status=p.area===pos.area?'resident':'wandering';return true;
}
export function finishPatronWork(s,p,t,ctx){
 const c=s.patronProjects?.[t.patronProject];if(!patronageOn(s)||c?.status!=='working'||c.producer!==p.id)return false;
 const a=s.areas[c.area],o=a.objects.find(o=>o.id===c.workshop);if(o?.owner!==p.id||o.state!=='intact'||controlBlocked(s,a,o))return false;
 const r=completeGoodsWork(s,a,t.goodsWork,{kind:'tools',units:1,patronProject:c.id});if(r.quantity!==1)return false;c.work={id:r.id,at:s.tick,actor:p.id,spent:t.goodsWork.spent,required:3};c.status='selling';c.cargo=1;p.agenda.work++;
 if(s.hero.area===p.area)ctx.log(s,p.name+' изготовляет первый инструмент из подаренного сырья. Доход появится только после продажи.','work');return true;
}
export function patronSale(s,p,t,ctx){
 const c=s.patronProjects?.[t.patronProject];if(!patronageOn(s)||c?.status!=='selling'||c.producer!==p.id||c.lastAction===s.tick||c.cargo!==1||(p.marketCargo?.tools||0)<1)return false;c.lastAction=s.tick;
 const q=tradeGoods(s,s.areas[c.area],p.id,'tools','sell',1);p.agenda.task=null;p.agenda.due=s.tick+48;if(q.quantity!==1){c.after=s.tick+96;c.saleFailure={at:s.tick,reason:q.reason};return false;}
 c.cargo=0;c.revenue=q.total;c.status='complete';c.sale={at:s.tick,area:c.area,quantity:1,total:q.total};if(s.hero.area===p.area)ctx.log(s,p.name+' продаёт первый инструмент за ◈'+q.total+'. Это его доход; патрон не получает процента или титула.','trade');return true;
}
