import {stackRoom} from './container-state.js';
import {enabled} from '../rules.js';
import {goodsEnabled,takeGoods,putGoods,GOODS_CAPACITY} from './goods.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {physicalDistance} from '../geometry.js';
import {countMarket} from './market-metrics.js';
import {canBargain,skillBranchesEnabled,recordPracticalTrade} from './skill-branches.js';

export const MARKET_GOODS={food:{base:1,unit:'порция'},tools:{base:12,unit:'инструмент'}};
export function marketEnabled(s){return goodsEnabled(s)&&enabled(s,'local-market');}
// A bounded near-day need, not an omniscient scan of all residents in the world.
export function marketNeed(a,kind){
 const population=Math.max(0,a?.population?.length||0);
 return kind==='food'?{reserve:Math.min(12,Math.max(1,Math.ceil(population/2))),target:Math.min(64,16+population*2)}:{reserve:1,target:Math.min(12,3+Math.ceil(population/4))};
}
function unitPrice(s,a,kind,side,stock,trade){
 const {base}=MARKET_GOODS[kind],{reserve,target}=marketNeed(a,kind),overflow=a.goods?.overflow?.[kind]||0;
 const supply=Math.max(0,stock+overflow-reserve),need=target-reserve;
 const pressure=Math.max(.5,Math.min(2.5,2-supply/Math.max(1,need)));
 // A buy-back uses the identical stock edge as a preceding purchase. Spread
 // dominates every skill/tax modifier, including integer rounding.
 if(side==='sell')return Math.max(0,Math.floor(base*pressure*.55));
 const tax=enabled(s,'politics')?Math.max(0,Math.min(40,a.civic.tax||0))/100:0;
 return Math.max(1,Math.ceil(base*pressure*(trade?.95:1.1)*(1+tax)));
}
const quoteCaches=new WeakMap();
export function marketSignature(s,a,kind){return `${a.civic?.[kind]||0}/${a.goods?.overflow?.[kind]||0}/${a.population?.length||0}/${enabled(s,'politics')?a.civic?.tax||0:0}/${a.civic?.treasury||0}`;}
export function quoteMarket(s,a,kind,side,quantity=1,{trade=false,gold=Infinity,goods=Infinity}={}){
 countMarket(s,'quote');
 if(!enabled(s,'market-knowledge')||!marketEnabled(s)||!a?.civic||!Object.hasOwn(MARKET_GOODS,kind)||!['buy','sell'].includes(side)||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)return calculateQuote(s,a,kind,side,quantity,{trade,gold,goods});
 const signature=marketSignature(s,a,kind),key=`${kind}/${side}/${quantity}/${trade}/${gold}/${goods}`;
 let cache=quoteCaches.get(a);if(!cache){cache=new Map();quoteCaches.set(a,cache);}
 let group=cache.get(kind);if(!group||group.signature!==signature){group={signature,values:new Map()};cache.set(kind,group);}
 if(group.values.has(key)){countMarket(s,'quoteHit');return {...group.values.get(key)};}
 countMarket(s,'quoteMiss');const result=calculateQuote(s,a,kind,side,quantity,{trade,gold,goods});if(group.values.size>=16)group.values.clear();group.values.set(key,result);return {...result};
}
function calculateQuote(s,a,kind,side,quantity=1,{trade=false,gold=Infinity,goods=Infinity}={}){
 const empty={kind,side,requested:quantity,quantity:0,total:0,unit:MARKET_GOODS[kind]?.unit||null,reason:'unavailable'};
 if(!marketEnabled(s)||!a?.civic||!Object.hasOwn(MARKET_GOODS,kind)||!['buy','sell'].includes(side)||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||!(gold>=0)||!(goods>=0))return empty;
 const {reserve,target}=marketNeed(a,kind);let stock=a.civic[kind]||0,total=0,n=0,reason='filled';
 for(;n<quantity;n++){
  if(side==='buy'&&stock<=reserve){reason='reserve';break;}
  if(side==='sell'&&(stock>=target||stock>=GOODS_CAPACITY[kind])){reason='demand';break;}
  if(side==='sell'&&n>=goods){reason='cargo';break;}
  const price=unitPrice(s,a,kind,side,side==='sell'?stock+1:stock,trade);
  if(!price){reason='no-bid';break;}
  if(total+price>(side==='buy'?gold:Math.max(0,a.civic.treasury||0))){reason='money';break;}
  total+=price;stock+=side==='buy'?-1:1;
 }
 return {...empty,quantity:n,total,reason,reserve,target,nextStock:stock};
}
export function marketWallet(s,id){
 const p=s.people[id],h=s.actorStates?.[id]|| (s.hero?.lineage===id?s.hero:null);
 return selfDrivenActor(s,h)?h.gold:p?.agenda?.wealth??p?.actorLink?.wealth??0;
}
export function tradeGoods(s,a,id,kind,side,quantity,{trade=null}={}){
 const p=s.people[id],h=s.actorStates?.[id]||(s.hero?.lineage===id?s.hero:null),active=selfDrivenActor(s,h),area=active?h.area:p?.area;
 const cargo=kind==='food'?p?.roadSupplies:p?.marketCargo,available=cargo?.[kind]||0;
 if(!p?.alive||active&&h.transit||area!==a?.id||physicalDistance(a,active?h.x:p.x,kind==='tools'?58:42)>18)return {quantity:0,total:0,reason:'absent'};
 if(trade===null)trade=canBargain(s,id);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)return {quantity:0,total:0,reason:'request'};
 if(side==='buy'){quantity=Math.min(quantity,stackRoom(s,id,kind,quantity));if(!quantity)return {quantity:0,total:0,reason:'capacity'};}
 const money=marketWallet(s,id),q=quoteMarket(s,a,kind,side,quantity,{trade,gold:money,goods:available});
 if(!q.quantity)return q;
 if(side==='buy'){
  if(takeGoods(s,a,kind,q.quantity,{flow:'exported',reason:'market-buy',actor:id})!==q.quantity)return {quantity:0,total:0,reason:'stock-changed'};
  const bag=kind==='food'?(p.roadSupplies ||= {food:0,medicine:0}):(p.marketCargo ||= {tools:0});bag[kind]=(bag[kind]||0)+q.quantity;
  setActorMoney(s,p,money-q.total);a.civic.treasury=(a.civic.treasury||0)+q.total;
 }else{
  cargo[kind]-=q.quantity;putGoods(s,a,kind,q.quantity,{reason:'market-sell',actor:id});
  setActorMoney(s,p,money+q.total);a.civic.treasury-=q.total;
 }
 if(skillBranchesEnabled(s)){
  const event=a.goods.history.at(-1);if(event&&event.actor===id&&event.tick===s.tick){Object.assign(event,{id:`trade/${id}/${a.id}/${kind}/${s.tick}/${a.goods.revision}`,area:a.id,side,total:q.total});recordPracticalTrade(s,event);}
 }
 return q;
}
