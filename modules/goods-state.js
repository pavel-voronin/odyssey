import {rootWorld} from '../world-ref.js';
const total=(a,k)=>(a.civic[k]||0)+(a.goods.overflow[k]||0);
const expected=l=>l.initial+l.produced+l.imported-l.consumed-l.exported-l.lost;
// Explicit setting transition only. Never repair an unexplained on-mode stock change.
export function goodsSettingChanged(input,value){
 const s=rootWorld(input),previous=s.goodsMode;
 if(!value){const stocks={};for(const a of Object.values(s.areas||{}))if(a.civic&&a.goods?.version===1){stocks[a.id]={};for(const k of ['food','tools'])stocks[a.id][k]={quantity:total(a,k),difference:total(a,k)-expected(a.goods.ledger[k])};}s.goodsMode={version:1,enabled:false,since:s.tick,stocks};return;}
 if(previous?.enabled===false)for(const a of Object.values(s.areas||{}))if(a.civic&&a.goods?.version===1&&previous.stocks[a.id]){
  const g=a.goods,period={disabledFrom:previous.since,resumed:s.tick,ledger:structuredClone(g.ledger),delta:{},preexistingDifference:{}};
  for(const k of ['food','tools']){const old=previous.stocks[a.id][k];period.delta[k]=total(a,k)-old.quantity;period.preexistingDifference[k]=old.difference;
   if(old.difference===0)g.ledger[k]={initial:total(a,k),produced:0,imported:0,consumed:0,exported:0,lost:0};
   else g.accountingGap={since:previous.since,kind:k,difference:old.difference,reason:'unrecorded-before-disabling'};
  }
  (g.closedPeriods ||= []).push(period);if(g.closedPeriods.length>2)g.closedPeriods.shift();g.revision++;
 }
 s.goodsMode={version:1,enabled:true,since:s.tick};
}
