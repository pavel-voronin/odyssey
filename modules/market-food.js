import {canBargain} from './skill-branches.js';
import {physicalDistance} from '../geometry.js';
import {knownArea} from '../actor-atlas.js';
import {profile} from './common.js';
import {quoteMarket} from './market.js';
import {marketKnowledgeEnabled,foodMarketOptions} from './market-knowledge.js';
import {countMarket} from './market-metrics.js';

export function knownFoodChoice(s,ctx,{allowed=()=>true,reachable=()=>true}={}){
 if(!marketKnowledgeEnabled(s))return null;
 countMarket(s,'foodPlans');const h=s.hero,options=foodMarketOptions(s,{trade:canBargain(s,h.lineage,profile(h).skill==='trade')});let best=null;
 for(const option of options){
  const a=s.areas[option.market];if(!a||!knownArea(s,a)||!allowed(a))continue;
  countMarket(s,'foodCandidates');const path=(ctx.knownRoute||ctx.route)(s,h.area,a.id);
  if(!path.length||!reachable(a,path))continue;
  const score=option.total/option.quantity+(path.length-1)*.35+Math.min(2,option.age/240*.05);
  if(!best||score<best.score)best={...option,area:a.id,path,score};
 }
 return best;
}
export function foodBudgetMarket(s,allowed=()=>true){
 if(!marketKnowledgeEnabled(s))return null;
 const h=s.hero,here=s.areas[h.area],options=foodMarketOptions(s,{trade:canBargain(s,h.lineage,profile(h).skill==='trade'),gold:Infinity});
 // A local inspection is available without mutating knowledge from a budget
 // query. Remote options stay saved reports; budgets do not query routes.
 if(h.alive&&!h.transit&&here?.civic&&knownArea(s,here)&&physicalDistance(here,h.x,42)<=18&&allowed(here)){
  const q=quoteMarket(s,here,'food','buy',4,{trade:canBargain(s,h.lineage,profile(h).skill==='trade')});if(q.quantity)return here;
 }
 const selected=options.find(q=>q.market===h.goal?.area&&h.goal.kind==='provision'&&allowed(s.areas[q.market]))||options.find(q=>allowed(s.areas[q.market]));return selected?s.areas[selected.market]:null;
}
