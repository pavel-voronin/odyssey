import {enabled} from '../rules.js';
import {marketEnabled,marketWallet,quoteMarket} from './market.js';
import {marketKnowledgeEnabled} from './market-knowledge.js';
import {npcKnownRoute} from './npc-knowledge.js';
import {selfDrivenActor} from '../actor-projection.js';
import {physicalDistance} from '../geometry.js';
import {carriedFood} from './stores.js';
export const merchantEnabled=s=>enabled(s,'merchant-trips')&&marketKnowledgeEnabled(s)&&marketEnabled(s)&&enabled(s,'npc-logistics');
export function merchantOffer(s,id,ctx){
 if(!merchantEnabled(s))return null;const p=s.people[id],h=s.actorStates?.[id]||(s.hero.lineage===id?s.hero:null),hero=selfDrivenActor(s,h),a=s.areas[hero?h.area:p?.area];
 if(!p?.alive||!a?.civic||hero&&h.transit||p.needs?.sleeping||(hero?h.energy:p.needs?.energy??100)<45||(hero?h.hunger:p.needs?.hunger??0)>=60||(p.marketCargo?.tools||0)>0||(p.tradeBook?.after||0)>s.tick||physicalDistance(a,hero?h.x:p.x,58)>18)return null;
 const curiosity=hero?h.personality.courage:p.agenda.curiosity,cautious=hero?h.money.style==='cautious':curiosity<.45,wallet=marketWallet(s,id),reserve=enabled(s,'finances')?(hero?(ctx.merchantReserve??(cautious?10:6)):cautious?10:6):0;
 const food=carriedFood(p,hero?h.inventory:null),provisions=food>=1?{quantity:0,total:0}:quoteMarket(s,a,'food','buy',1,{gold:Math.max(0,wallet-reserve)});if(food<1&&!provisions.quantity)return null;
 const options=[];
 for(const e of (p.marketKnowledge?.entries||[]).filter(e=>e.kind==='tools'&&e.market!==a.id&&!e.closed&&s.tick-e.at<=1920&&e.at<=s.tick).sort((a,b)=>b.at-a.at).slice(0,4)){
  const path=hero?(ctx.knownRoute||ctx.route)(s,a.id,e.market):npcKnownRoute(p,a.id,e.market);if(path.length<2||path.length>5)continue;
  const hazards=hero?path.slice(1).filter(id=>(h.memory.avoided[id]||0)>s.tick).length:path.slice(1).filter(id=>p.navigation.places.some(k=>k.area===id&&k.hazardUntil>s.tick)).length;
  if(hazards&&(cautious||wallet<reserve+30))continue;
  const ticks=48+16*(path.length-1),time=Math.ceil(ticks/64),risk=hazards*(cautious?12:3),limit=Math.min(3,e.wanted);
  for(let n=1;n<=limit;n++){const buy=quoteMarket(s,a,'tools','buy',n,{gold:Math.max(0,wallet-reserve-provisions.total)});if(buy.quantity!==n)continue;const expected=e.bid*n,profit=expected-buy.total-provisions.total-time-risk;if(profit<(cautious?3:1))continue;
   options.push({person:id,from:a.id,to:e.market,name:e.name,path,kind:'tools',quantity:n,cost:buy.total,foodCost:provisions.total,provisions:provisions.quantity,expected,profit,reserve,walletBefore:wallet,seen:e.at,ticks,hazards});}
 }
 return options.sort((a,b)=>b.profit-a.profit||a.to.localeCompare(b.to)||a.quantity-b.quantity)[0]||null;
}
