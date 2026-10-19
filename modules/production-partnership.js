import {fieldMedicineCost} from './skill-branches.js';
import {supportWorkshopRepair} from './workshop-support.js';
import {physicalDistance} from '../geometry.js';
import {setActorMoney,selfDrivenActor} from '../actor-projection.js';
import {marketWallet} from './market.js';
import {stackRoom} from './container-state.js';
import {workshopSite} from './workshop-place.js';
import {canStartNPCActivity,npcController} from './npc-control.js';
import {productionFinanceOn,financeBody,financeTogether,settleProduction} from './production-finance.js';
import {productionBeneficiary,outstandingProduction} from './production-finance-state.js';
const siteFor=(s,c)=>workshopSite(s,c.area,c.workshop);
const localShop=(s,p,site)=>site&&(p.area===site.room?.id||p.area===site.area.id&&physicalDistance(site.area,p.x,site.object.x)<=24);
export function productionProblem(s,c){
 const p=s.people[c.producer],site=siteFor(s,c);if(!p?.alive)return 'partner-lost';
 if(p.ailment||p.health<(p.maxHealth||100)*.85)return 'ill';
 if(c.status==='working'&&localShop(s,p,site)){
  if(site.object.owner!==p.id)return 'title';
  if(site.object.state!=='intact')return 'workshop';
 }
 if(c.status==='selling'&&c.cargo>(p.marketCargo?.tools||0))return 'cargo';
 if(c.status==='selling'&&c.disruption?.kind==='buyer')return 'buyer';
 return null;
}
const reasons={ill:'Болезнь мешает закончить заказ.',workshop:'Мастерская повреждена: заготовки сохранены, работать пока нельзя.',title:'Право на мастерскую изменилось. Обязательство осталось у прежнего мастера; новый владелец ничего не обещал.',cargo:'Изготовленный товар утрачен. Продажа не состоялась.',buyer:'Покупатель не принял товар. Выручки пока нет.'};
export function productionPartnerPlan(s,ctx){
 if(!productionFinanceOn(s)||!s.hero.alive||s.hero.transit||s.hero.combat)return false;
 const h=s.hero,c=Object.values(s.productionDeals||{}).find(c=>outstandingProduction(c)&&c.status!=='payable'&&productionBeneficiary(c)===h.lineage&&(!c.partnerTalk||c.partnerTalk.until<=s.tick)&&financeTogether(s,h.lineage,c.producer)&&productionProblem(s,c));if(!c)return false;
 const at=financeBody(s,c.producer);ctx.goal(s,'productionReview',at.area,at.x,'Обсудить задержанный заказ','Причину и доступные средства можно выяснить при личной встрече с партнёром.',{deal:c.id,person:c.producer});return true;
}
function choose(s,c,issue){
 const h=s.hero;if(issue==='cargo')return 'loss';
 if(h.money?.style==='cautious'||h.gold<24)return 'buyout';
 if(h.personality.generosity>=.65&&['ill','workshop'].includes(issue)&&!(c.support||[]).some(r=>r.kind===issue))return 'help';
 return 'wait';
}
export function reviewProduction(s,ctx){
 const h=s.hero,c=s.productionDeals?.[h.goal?.deal];h.goal=null;const p=s.people[c?.producer];
 if(!productionFinanceOn(s)||!c||!outstandingProduction(c)||c.status==='payable'||productionBeneficiary(c)!==h.lineage||!financeTogether(s,h.lineage,p.id)||!canStartNPCActivity(s,p))return false;
 const issue=productionProblem(s,c);if(!issue)return false;const choice=choose(s,c,issue);p.productionTalkTick=s.tick;
 const note=c.partnerTalk={at:s.tick,by:h.lineage,partner:p.id,issue,choice,outcome:'wait',until:s.tick+96};h.lastAction='talk';h.speech='Обсудим, что возможно.';
 ctx.log(s,p.name+': «'+reasons[issue]+'»','trade');
 if(choice==='loss'){
  // Only a real missing carried product is written off. No new product or
  // municipal reimbursement replaces it, and no interest survives the close.
  c.exit={mode:'loss',at:s.tick,by:h.lineage,amount:0};c.cargo=0;c.status='lost';c.ended=s.tick;note.outcome='loss';ctx.log(s,h.name+' признаёт убыток ◈4. Продажи и выплаты по этому заказу нет.','trade');return true;
 }
 if(choice==='buyout'){
  const price=c.status==='working'?4:3,wallet=marketWallet(s,p.id);
  if((p.agenda.duty??0)<.45||wallet<price+2){note.outcome='refused';ctx.log(s,p.name+' не принимает выкуп доли: '+(wallet<price+2?'свободных денег недостаточно.':'не согласен на предложенные условия.')+' Договор и его риск сохраняются.','trade');return true;}
  setActorMoney(s,p,wallet-price);setActorMoney(s,s.people[h.lineage],h.gold+price);c.exit={mode:'buyout',at:s.tick,by:h.lineage,amount:price,payer:p.id,walletBefore:wallet,walletAfter:wallet-price};c.beneficiary=p.id;note.outcome='bought-out';
  ctx.log(s,p.name+' выкупает долю за ◈'+price+' из своего кошелька. '+(price<4?'Вкладчик принимает убыток ◈'+(4-price)+'. ':'')+'Дальнейший товар и доход принадлежат мастеру; повторной выплаты вкладчику нет.','trade');return true;
 }
 if(choice==='help'){
  const medicine=fieldMedicineCost(s,p.id);
  if(issue==='ill'&&h.inventory.potions>=medicine&&stackRoom(s,p.id,'medicine',medicine)>=medicine){
   h.inventory.potions-=medicine;p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.medicine+=medicine;
   (c.support ||= []).push({kind:issue,at:s.tick,by:h.lineage,amount:medicine,source:'personal-potion'});note.outcome='medicine';ctx.log(s,h.name+' передаёт свои лекарства: '+medicine+'. Партнёр использует его обычным лечением; доля и обещанная выручка не растут.','heal');return true;
  }
  const site=siteFor(s,c),o=site?.object,a=site?.area;
  const repair=issue==='workshop'?supportWorkshopRepair(s,h,p,a,o,ctx):null;
  if(repair){(c.support ||= []).push(repair);note.outcome='repair';p.agenda.due=s.tick;
   ctx.log(s,h.name+' оплачивает ◈18 и один действительный инструмент для ремонта. Три рабочих действия ещё нужны; доля не увеличивается.','repair');return true;
  }
  note.outcome='unavailable';ctx.log(s,'Для предложенной помощи сейчас нет доступных средств. Партнёры откладывают решение без нового списания.','trade');return true;
 }
 ctx.log(s,h.name+' соглашается подождать и занимается другими делами. Обещанного процента за ожидание нет.','choice');return true;
}
// A current producer's ordinary personal phase may hand the same escrow to a
// present inherited NPC holder, using both bodies once. No remote estate cash.
export function npcInheritedPayout(s,p,ctx){
 if(!productionFinanceOn(s)||!canStartNPCActivity(s,p,{inTurn:true}))return false;
 const c=Object.values(s.productionDeals||{}).find(c=>c.producer===p.id&&c.status==='payable'&&!c.exit&&productionBeneficiary(c)!==null),id=c&&productionBeneficiary(c),q=s.people[id];
 if(!c||!q?.alive||selfDrivenActor(s,id)||npcController(s,q)!=='personal'||!canStartNPCActivity(s,q)||!financeTogether(s,p.id,id))return false;
 p.productionTalkTick=s.tick;q.productionTalkTick=s.tick;settleProduction(s,c,id);if(s.hero.area===p.area)ctx.log(s,p.name+' передаёт ◈'+c.paid+' законному наследнику '+q.name+'. Деньги взяты из прежней отложенной выручки.','heritage');return true;
}
