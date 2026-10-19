import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {marketEnabled,marketWallet,quoteMarket,tradeGoods} from './market.js';
import {rememberedMarket} from './market-knowledge.js';
import {productionSources,completeGoodsWork} from './goods.js';
import {workshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {controlBlocked} from './building-control-state.js';
import {canStartNPCActivity} from './npc-control.js';
import {npcController} from './npc-control.js';
export const productionFinanceOn=s=>enabled(s,'production-finance')&&marketEnabled(s)&&enabled(s,'people')&&enabled(s,'property')&&enabled(s,'market-knowledge');
const body=(s,id)=>{const p=s.people[id],h=s.actorStates?.[id]||(s.hero.lineage===id?s.hero:null);return p?.alive&&!p.needs?.sleeping?(selfDrivenActor(s,h)?h.transit||h.combat?null:{area:h.area,x:h.x}:{area:p.area,x:p.x}):null;};
const together=(s,a,b)=>{const x=body(s,a),y=body(s,b);return x&&y&&x.area===y.area&&physicalDistance(s.areas[x.area],x.x,y.x)<=9;};
const active=c=>['working','selling','payable'].includes(c.status);
const siteFor=(s,c)=>workshopSite(s,c.area,c.workshop);
const usable=(s,site,p)=>site?.object.owner===p.id&&site.object.state==='intact'&&!site.object.closed&&!controlBlocked(s,site.area,site.object)&&workToolReady(s,site.object);
function producerOffer(s,p){
 if(!productionFinanceOn(s)||!p?.alive||p.role==='ребёнок'||npcController(s,p)!=='personal'||p.agenda?.job!=='artisan'||p.ailment||p.health<(p.maxHealth||100)*.85||p.needs?.energy<30||p.needs?.hunger>60||Object.values(s.productionDeals||{}).some(c=>c.producer===p.id&&active(c)))return null;
 const b=body(s,p.id),a=s.areas[b?.area];if(!a?.civic||physicalDistance(a,b.x,58)>18)return null;const o=a.objects.find(o=>o.kind==='workshop'&&o.owner===p.id),site=o&&workshopSite(s,a,o.id),m=rememberedMarket(s,p.id,a.id,'tools');
 if(!usable(s,site,p)||!m||m.source.kind!=='visit'||m.source.person!==p.id||s.tick-m.at>96||m.wanted<1||m.bid<8||productionSources(s,a).materials.stock<2)return null;
 return {producer:p.id,area:a.id,workshop:o.id,buyer:a.goods.owner,seen:m.at,expected:m.bid,advance:4,share:.5,quantity:1};
}
function book(h){return h.productionFinance ||= {version:1,after:0,decisions:[]};}
function decision(s,p,q,status,reason){const b=book(s.hero);b.after=s.tick+96;b.decisions.push({at:s.tick,producer:p.id,area:q.area,status,reason});if(b.decisions.length>12)b.decisions.shift();}
export function productionFinancePlan(s,ctx){
 if(!productionFinanceOn(s))return false;const h=s.hero;if(!h.alive||h.transit||h.combat)return false;
 const due=Object.values(s.productionDeals||{}).find(c=>c.investor===h.lineage&&c.status==='payable'&&together(s,h.lineage,c.producer));
 if(due){ctx.goal(s,'productionPayout',h.area,body(s,due.producer).x,'Получить долю выручки','Продажа состоялась; мастер передаст отложенную долю при встрече.',{deal:due.id,person:due.producer});return true;}
 if((h.productionFinance?.after||0)>s.tick||h.energy<35||h.hp<h.maxHp*.8||h.gold<24||ctx.maySpend&&!ctx.maySpend(s,'investment',4,ctx))return false;
 if(Object.values(s.productionDeals||{}).some(c=>c.investor===h.lineage&&active(c)))return false;
 for(const p of Object.values(s.people)){if(p.id===h.lineage||!together(s,h.lineage,p.id))continue;const q=producerOffer(s,p);if(!q)continue;
  if(h.money?.style==='cautious'&&(h.relations[p.id]?.trust||0)<0){decision(s,p,q,'declined','known-distrust');ctx.log(s,h.name+' не вкладывает деньги: прежний опыт с '+p.name+' вызывает недоверие.','choice');return false;}
  if(h.money?.style==='carefree'&&h.personality.curiosity<.45)continue;
  ctx.goal(s,'productionFund',h.area,p.x,'Обсудить долю заказа',p.name+' знает местного покупателя инструмента. ◈4 оплатят две заготовки; половина действительной выручки — после продажи. Капитал рискует остаться в незавершённом заказе.',{person:p.id});return true;
 }return false;
}
export function fundProduction(s,ctx){
 const h=s.hero,p=s.people[h.goal?.person],q=p&&producerOffer(s,p);h.goal=null;
 if(!q||!canStartNPCActivity(s,p)||!together(s,h.lineage,p.id)||h.gold<24||ctx.maySpend&&!ctx.maySpend(s,'investment',4,ctx)||Object.values(s.productionDeals||{}).some(c=>c.investor===h.lineage&&active(c))||h.money?.style==='cautious'&&(h.relations[p.id]?.trust||0)<0)return false;
 // Recheck the buyer only at its actual local counter; the dated personal quote
 // supplies the proposal, and never guarantees the future sale.
 const a=s.areas[q.area];if(physicalDistance(a,p.x,58)>18||quoteMarket(s,a,'tools','sell',1).quantity!==1)return false;
 const raw=productionSources(s,a).materials,investorBefore=h.gold,producerBefore=marketWallet(s,p.id),treasuryBefore=a.civic.treasury;
 book(h);decision(s,p,q,'accepted','local-order');s.productionDeals ||= {};let n=1;while(s.productionDeals[h.lineage+'/production/'+n])n++;const id=h.lineage+'/production/'+n;
 p.productionTalkTick=s.tick;setActorMoney(s,s.people[h.lineage],investorBefore-4);setActorMoney(s,p,producerBefore+4);
 raw.stock-=2;raw.used+=2;a.civic.treasury+=4;setActorMoney(s,p,marketWallet(s,p.id)-4);
 const c=s.productionDeals[id]={version:1,id,...q,investor:h.lineage,accepted:s.tick,status:'working',material:{source:raw.id,quantity:2,state:'reserved',before:raw.stock+2,after:raw.stock},funding:{investorBefore,producerBefore,treasuryBefore},work:null,cargo:0,revenue:0,escrow:0,paid:0,lastAction:-1,after:0};
 p.agenda.due=Math.min(p.agenda.due,s.tick);h.lastAction='talk';h.speech='Доля — после продажи.';
 ctx.log(s,h.name+' вкладывает ◈4 в заказ '+p.name+'. Оплачены две настоящие заготовки. Половина выручки причитается после изготовления и продажи; гарантированного процента нет.','trade');return c;
}
export function npcProductionPlan(s,p){
 if(!productionFinanceOn(s)||p.ailment||p.needs.energy<25||p.needs.hunger>65)return false;
 const c=Object.values(s.productionDeals||{}).find(c=>c.producer===p.id&&['working','selling'].includes(c.status));if(!c||c.after>s.tick)return false;
 const site=siteFor(s,c);if(c.status==='working'&&!usable(s,site,p))return false;
 const pos=c.status==='working'?workshopPosition(s,site.area,site.object):{area:c.area,x:58};
 p.agenda.task={kind:c.status==='working'?'work':'productionSell',target:pos.area,x:pos.x,remaining:3,productionDeal:c.id,...(c.status==='working'?{workMode:'production',workshop:{id:c.workshop,area:c.area}}:{})};p.status=p.area===pos.area?'resident':'wandering';return true;
}
export function finishFinancedWork(s,p,t,ctx){
 const c=s.productionDeals?.[t.productionDeal],site=c&&siteFor(s,c);if(!productionFinanceOn(s)||!c||c.producer!==p.id||c.status!=='working'||!usable(s,site,p))return false;
 const r=completeGoodsWork(s,site.area,t.goodsWork,{kind:'tools',units:1,productionDeal:c.id});if(r.quantity!==1)return false;
 c.work={id:r.id,at:s.tick,actor:p.id,spent:t.goodsWork.spent,required:t.goodsWork.required};c.status='selling';c.cargo=1;p.agenda.work++;p.agenda.due=s.tick;
 if(s.hero.area===p.area)ctx.log(s,p.name+' изготовляет инструмент по оплаченному заказу. Товар ещё нужно продать; выплаты пока нет.','work');return true;
}
export function productionSale(s,p,t,ctx){
 const c=s.productionDeals?.[t.productionDeal];if(!productionFinanceOn(s)||!c||c.producer!==p.id||c.status!=='selling'||c.lastAction===s.tick)return false;c.lastAction=s.tick;
 if(c.cargo!==1||(p.marketCargo?.tools||0)<1)return false;
 const r=tradeGoods(s,s.areas[c.area],p.id,'tools','sell',1);p.agenda.task=null;p.agenda.due=s.tick+48;
 if(r.quantity!==1){c.after=s.tick+96;return false;}
 c.cargo=0;c.revenue=r.total;c.sold=s.tick;c.sale={area:c.area,quantity:r.quantity,total:r.total};c.escrow=Math.floor(r.total*c.share);setActorMoney(s,p,marketWallet(s,p.id)-c.escrow);c.status='payable';
 if(s.hero.area===p.area)ctx.log(s,p.name+' продаёт изготовленный инструмент за ◈'+r.total+'. Доля ◈'+c.escrow+' отложена для вкладчика до личной встречи.','trade');return true;
}
export function collectProduction(s,ctx){
 const h=s.hero,c=s.productionDeals?.[h.goal?.deal];h.goal=null;
 if(!productionFinanceOn(s)||!canStartNPCActivity(s,s.people[c?.producer])||c?.status!=='payable'||c.investor!==h.lineage||!h.alive||!together(s,h.lineage,c.producer))return false;
 s.people[c.producer].productionTalkTick=s.tick;const amount=c.escrow;setActorMoney(s,s.people[h.lineage],h.gold+amount);c.escrow=0;c.paid=amount;c.status='done';c.ended=s.tick;book(h).after=s.tick+240;h.lastAction='talk';h.speech='Расчёт окончен.';
 ctx.log(s,s.people[c.producer].name+' передаёт долю выручки ◈'+amount+'. Договор завершён; новых выплат по нему не будет.','trade');return true;
}
