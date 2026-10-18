import {moneyBudget} from './finances.js';
import {merchantEnabled,merchantOffer} from './merchant-policy.js';
import {buyMerchantLoad,merchantReceipt} from './merchant-settlement.js';
import {observeMarket} from './market-knowledge.js';
function offerForHero(s,ctx){const b=moneyBudget(s,ctx);return merchantOffer(s,s.hero.lineage,{...ctx,merchantReserve:b.reserve+(b.style==='purposeful'?b.targetCost:0)});}
export function heroMerchantPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];
 if(h.merchantTrip){const t=h.merchantTrip,to=t.status==='returning'?t.from:t.to,path=(ctx.knownRoute||ctx.route)(s,h.area,to);
  if(!path.length){if(t.status==='outward'){t.status='returning';h.goal=null;return heroMerchantPlan(s,ctx);}h.goal=null;return false;}
  ctx.goal(s,'merchantSell',to,58,'Продать свой дорожный груз',`Купленная партия остаётся в собственной сумке. Известная раньше выручка ◈${t.expected} могла измениться.`);return true;}
 if(!merchantEnabled(s)||h.profession!=='merchant')return false;observeMarket(s,p.id);const offer=offerForHero(s,ctx);if(!offer)return false;
 ctx.goal(s,'merchantBuy',h.area,58,'Купить небольшую торговую партию',`Известная выручка ◈${offer.expected}, покупка ◈${offer.cost}, провиант ◈${offer.foodCost}; после затрат остаётся резерв ◈${offer.reserve}.`,{merchantOffer:{to:offer.to}});return true;
}
export function heroMerchantAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],g=h.goal;h.goal=null;
 if(g.kind==='merchantBuy'){const offer=offerForHero(s,ctx);if(!offer||offer.to!==g.merchantOffer.to)return false;const t=buyMerchantLoad(s,p,offer);if(!t)return false;h.merchantTrip=t;h.energy=Math.max(0,h.energy-1);h.lastAction='trade';ctx.log(s,`Герой платит ◈${t.cost} за ${t.quantity} инструментов и берёт тот же груз в собственную сумку.`,'trade');return true;}
 const t=h.merchantTrip;if(!t)return false;if(h.area!==(t.status==='returning'?t.from:t.to))return false;
 const quantity=Math.min(t.quantity,p.marketCargo?.tools||0),r=merchantReceipt(s,p,t,quantity,t.status==='returning'?'returned':'delivered');delete h.merchantTrip;h.energy=Math.max(0,h.energy-1);h.lastAction='trade';ctx.log(s,`Продано инструментов ${r.sold} за ◈${r.revenue}. Денежный итог после покупки и провианта: ◈${r.net}; непроданных ${r.remaining}, они остаются в сумке.`,'trade');return true;
}
