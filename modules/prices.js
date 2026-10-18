import {canBargain} from './skill-branches.js';
import {profile} from './common.js';
import {enabled} from '../rules.js';
import {marketEnabled,quoteMarket} from './market.js';
import {marketKnowledgeEnabled,rememberedQuote} from './market-knowledge.js';
import {physicalDistance} from '../geometry.js';
export function shopPrice(s,base){
  const a=s.areas[s.hero.area];return Math.max(1,Math.floor(base*(a.civic?.marketUntil>s.tick ? .85 : 1)*(enabled(s,'politics')?1+(a.civic?.tax||0)/100:1)));
}

// The food budget is four portions, not four complete travel rations.
export function foodPrice(s,area=s.hero.area){
 const h=s.hero,a=s.areas[area],trade=canBargain(s,h.lineage,profile(h).skill==='trade');
 if(marketKnowledgeEnabled(s)&&enabled(s,'supply')&&!(h.alive&&!h.transit&&area===h.area&&a?.civic&&physicalDistance(a,h.x,42)<=18))return rememberedQuote(s,h.lineage,area,'food',4,{trade})?.total??null;
 if(marketEnabled(s)&&a?.civic){
  return quoteMarket(s,a,'food','buy',4,{trade}).total;
 }
 return trade?2:3;
}
export function equipmentPrice(s,kind,area=s.hero.area){
  if(!s.areas[area])return null;
  if(kind==='weapon')return shopPrice(area===s.hero.area?s:{...s,hero:{...s.hero,area}},16+s.hero.weapon*15);
  return ({armor:22,potion:7})[kind]??null;
}
