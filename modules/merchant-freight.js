import {merchantEnabled,merchantOffer} from './merchant-policy.js';
import {buyMerchantLoad} from './merchant-settlement.js';
import {availableFreightDriver,freightEvent} from './freight-memory.js';
import {departFreight} from './freight.js';
import {observeMarket} from './market-knowledge.js';
export function merchantDispatch(s,ctx){
 if(!merchantEnabled(s))return null;
 for(const a of Object.values(s.areas))if(a.civic)for(const id of a.population||[]){const p=s.people[id];if(p?.agenda?.job!=='merchant'||!availableFreightDriver(s,p,a))continue;observeMarket(s,id);const offer=merchantOffer(s,id,ctx);if(!offer)continue;const trade=buyMerchantLoad(s,p,offer);if(!trade)continue;
  p.marketCargo.tools-=trade.quantity;const c=departFreight(s,a,s.areas[offer.to],{driver:p,author:id,path:offer.path,market:{name:offer.name,seen:offer.seen},kind:'tools',quantity:trade.quantity},ctx,trade);
  freightEvent(s,c,a,`${p.name} покупает ${trade.quantity} инструментов за ◈${trade.cost}. По сведениям от тика ${trade.seen} рассчитывает на ◈${trade.expected}; провиант ◈${trade.foodCost}, резерв ◈${trade.reserve}. Выручка к приезду не обещана.`,ctx);return c;
 }
 return null;
}
