import {tradeGoods,marketWallet} from './market.js';
export function buyMerchantLoad(s,p,offer){
 const a=s.areas[offer.from];if(offer.provisions){const food=tradeGoods(s,a,p.id,'food','buy',offer.provisions);if(food.quantity!==offer.provisions)return null;offer={...offer,foodCost:food.total};}
 const deal=tradeGoods(s,a,p.id,'tools','buy',offer.quantity);if(deal.quantity!==offer.quantity)return null;
 return {version:1,owner:p.id,kind:'tools',quantity:deal.quantity,cost:deal.total,foodCost:offer.foodCost,expected:offer.expected,reserve:offer.reserve,walletBefore:offer.walletBefore,from:offer.from,to:offer.to,started:s.tick,seen:offer.seen,status:'outward'};
}
export function merchantReceipt(s,p,trade,quantity,outcome){
 const a=s.areas[p.area],deal=a?.civic?tradeGoods(s,a,p.id,'tools','sell',quantity):{quantity:0,total:0};
 const result={...trade,ended:s.tick,area:p.area,status:outcome,sold:deal.quantity,remaining:quantity-deal.quantity,revenue:deal.total,net:deal.total-trade.cost-trade.foodCost,walletAfter:marketWallet(s,p.id)};
 const book=(p.tradeBook ||= {version:1,after:0,history:[]});book.after=s.tick+192;book.history.push(result);if(book.history.length>8)book.history.shift();return result;
}

export function finishMerchantFreight(s,c,outcome){
 const p=s.people[c.person];p.marketCargo ||= {tools:0};p.marketCargo.tools+=c.tools||0;const result=merchantReceipt(s,p,c.trade,c.tools||0,outcome);c.tools=0;return result;
}
