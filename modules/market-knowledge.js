import {enabled} from '../rules.js';
import {marketEnabled,quoteMarket} from './market.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,actorPartyLeader} from '../actor-projection.js';
import {countMarket} from './market-metrics.js';

export const MARKET_MEMORY_LIMIT=24,MARKET_DESTINATIONS=4;
export function marketKnowledgeEnabled(s){return marketEnabled(s)&&enabled(s,'market-knowledge');}
function body(s,id){
 const p=s.people[id];if(!p?.alive||p.needs?.sleeping)return null;
 const actor=s.actorStates?.[id]||(s.hero?.lineage===id?s.hero:null),leader=actorPartyLeader(s,id),h=leader||(selfDrivenActor(s,actor)?actor:null);
 if(h)return h.transit?null:{person:p,area:h.area,x:h.x};
 return p.area&&['resident','wandering','guarding','caravan','travelling'].includes(p.status)?{person:p,area:p.area,x:p.x??42}:null;
}
function saveEntry(p,entry){
 p.marketKnowledge ||= {version:1,entries:[],revision:0};const m=p.marketKnowledge,index=m.entries.findIndex(e=>e.market===entry.market&&e.kind===entry.kind);
 if(index<0)m.entries.push(entry);else m.entries[index]=entry;
 if(m.entries.length>MARKET_MEMORY_LIMIT)m.entries.sort((a,b)=>a.at-b.at||a.learnedAt-b.learnedAt).splice(0,m.entries.length-MARKET_MEMORY_LIMIT);
 m.revision++;return entry;
}
export function observeMarket(s,id,{force=false}={}){
 if(!marketKnowledgeEnabled(s))return;const b=body(s,id);if(!b)return;const a=s.areas[b.area],presence=`${b.area}/${a?.civic&&physicalDistance(a,b.x,42)<=18}/${a?.civic&&physicalDistance(a,b.x,58)<=18}`,memory=b.person.marketKnowledge,arrived=memory?.presence!==presence;
 if(memory)memory.presence=presence;
 if(!a?.civic){
  // A lost market is learned on return, never from its remote removal. Keep
  // that dated negative observation so it cannot lure the same body forever.
  if(a&&memory)for(const kind of ['food','tools']){
   const old=memory.entries.find(e=>e.market===a.id&&e.kind===kind);if(!old||physicalDistance(a,b.x,kind==='food'?42:58)>18||!force&&!arrived&&s.tick-old.at<96)continue;
   saveEntry(b.person,{market:a.id,name:a.name,kind,available:0,wanted:0,ask:0,bid:0,prices:{normal:[0,0,0,0],trade:[0,0,0,0]},at:s.tick,learnedAt:s.tick,source:{kind:'visit',person:id,name:b.person.name},closed:true});countMarket(s,'observations');
  }
  return;
 }
 for(const kind of ['food','tools']){
  if(physicalDistance(a,b.x,kind==='food'?42:58)>18)continue;
  const old=b.person.marketKnowledge?.entries.find(e=>e.market===a.id&&e.kind===kind);
  if(!force&&!arrived&&old?.source.person===id&&s.tick-old.at<96)continue;
  const buy=quoteMarket(s,a,kind,'buy',100),sell=quoteMarket(s,a,kind,'sell',100),prices={normal:[],trade:[]};
  for(const trade of [false,true])for(let n=1;n<=4;n++){const q=quoteMarket(s,a,kind,'buy',n,{trade});prices[trade?'trade':'normal'].push(q.total);}
  saveEntry(b.person,{market:a.id,name:a.name,kind,available:buy.quantity,wanted:sell.quantity,ask:prices.normal[0],bid:quoteMarket(s,a,kind,'sell',1).total,prices,at:s.tick,learnedAt:s.tick,source:{kind:'visit',person:id,name:b.person.name}});b.person.marketKnowledge.presence=presence;countMarket(s,'observations');
 }
}
export function shareMarketKnowledge(s,from,to){
 if(!marketKnowledgeEnabled(s)||from===to)return 0;
 const donor=body(s,from),recipient=body(s,to);if(!donor||!recipient||donor.area!==recipient.area||physicalDistance(s.areas[donor.area],donor.x,recipient.x)>12)return 0;
 let count=0;for(const entry of donor.person.marketKnowledge?.entries||[]){
  if(entry.source.kind!=='visit'||entry.source.person!==from)continue;
  const old=recipient.person.marketKnowledge?.entries.find(e=>e.market===entry.market&&e.kind===entry.kind);if(old&&old.at>=entry.at)continue;
  saveEntry(recipient.person,{...structuredClone(entry),learnedAt:s.tick,via:{person:from,name:donor.person.name,at:s.tick}});count++;if(count>=2)break;
 }
 if(count)countMarket(s,'reports',count);return count;
}
export function rememberedMarket(s,id,market,kind){return marketKnowledgeEnabled(s)?s.people[id]?.marketKnowledge?.entries.find(e=>e.market===market&&e.kind===kind)||null:null;}
export function snapshotPrice(entry,quantity=1,trade=false){
 const price=entry.prices[trade?'trade':'normal'][quantity-1];
 // Early v1 development saves contained explicit quantity/total pairs.
 return typeof price==='number'?{quantity:Math.min(quantity,entry.available),total:price}:{...price};
}
export function rememberedQuote(s,id,market,kind,quantity=4,{trade=false,gold=Infinity}={}){
 const entry=rememberedMarket(s,id,market,kind);if(!entry||!Number.isInteger(quantity)||quantity<1||quantity>4)return null;
 let result={quantity:0,total:0};for(let n=1;n<=quantity;n++){const q=snapshotPrice(entry,n,trade);if(q.total<=gold)result=q;else break;}
 return {...result,at:entry.at,source:entry.source,market:entry.market,name:entry.name};
}
export function foodMarketOptions(s,{trade=false,gold=s.hero.gold}={}){
 if(!marketKnowledgeEnabled(s))return [];
 const h=s.hero,entries=(s.people[h.lineage]?.marketKnowledge?.entries||[]).filter(e=>e.kind==='food'&&h.atlas.known.includes(e.market));
 // Consider a bounded recent set. No scan over every world's market or route.
 return entries.sort((a,b)=>Number(b.market===h.area)-Number(a.market===h.area)||b.at-a.at||a.market.localeCompare(b.market)).slice(0,MARKET_DESTINATIONS).map(e=>({...rememberedQuote(s,h.lineage,e.market,'food',4,{trade,gold}),age:Math.max(0,s.tick-e.at),source:e.source})).filter(e=>e.quantity>0);
}
