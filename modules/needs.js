import {carriedFood} from './stores.js';
import {consumedFood,wantsFood,sleepPhase,nutritionView} from './nutrition-state.js';
import {eatGameMeal} from './meat-cooking.js';
import {biologicalDose,biologicalNeed} from './biology.js';
import {shareEstateKnowledge} from './estate-claim-state.js';
import {fieldMedicineCost} from './skill-branches.js';
import {recordPersonRemains} from './remains.js';
import {migrationMeal,migrationAid} from './migrations.js';
import {shareMarketKnowledge} from './market-knowledge.js';
import {takeGoods} from './goods.js';
import {marketEnabled,tradeGoods} from './market.js';
import {enabled} from '../rules.js';
import {consumeCarriedSupplies} from './stores.js';
export function initializeNeeds(p){p.needs ||= {hunger:10,energy:100,loneliness:0,meals:0,sleeps:0,conversations:0};}
// Returns true when a personal need occupies this NPC's present action.
export function personNeeds(s,p,ctx,adapter=null){
  if(p.returnEpisode){initializeNeeds(p);p.needs.hunger=0;if(!adapter?.onlyUpkeep&&p.needs.energy<25){p.needs.energy=Math.min(100,p.needs.energy+8);return true;}return false;}
  if(!enabled(s,'npc-needs'))return false;
  initializeNeeds(p);const n=p.needs;let a=s.areas[p.area]||s.areas[p.roadTransit?.from]||s.areas[adapter?.area];if(!a)return false;
  const dose=biologicalDose(s,p,{native:true});if(dose.damage||dose.ceiling!==undefined&&p.health>dose.ceiling)p.health=Math.max(0,Math.min(p.health-dose.damage,dose.ceiling));
  if(p.health<=0){
    if(!p.health){p.alive=false;p.status='dead';p.died=s.tick;p.deathCause='Голод';ctx.dropRemains?.(s,p,'носитель погиб');a=s.areas[p.area];if(adapter?.grave!==false&&p.area===a.id)a.objects.push({id:'npc-grave-'+p.id,kind:'grave',name:p.name,x:p.x||42});if(adapter?.onDeath)adapter.onDeath(a);else{s.changes.push({tick:s.tick,text:p.name+' умер от голода.'});if(s.hero?.area===p.area)ctx.log(s,p.name+' не пережил голод.','loss');}recordPersonRemains(s,p);return true;}
  }
  const personal=!adapter&&enabled(s,'npc-personal-supplies'),maximum=p.maxHealth||100,mealUnits=Math.min(2,carriedFood(p,p.actorLink?.inventory));
  if(!adapter?.onlyUpkeep){
  if(wantsFood(s,p)&&eatGameMeal(s,p,ctx,{inTurn:true,need:true}))return true;
  if(personal&&(!biologicalNeed(s,p).food||p.health<maximum*.2)&&enabled(s,'supply')&&(p.health<maximum*.75||p.ailment)&&consumeCarriedSupplies(p,null,'medicine',fieldMedicineCost(s,p.id))){p.health=Math.min(maximum,p.health+25);if(p.health>=maximum*.85)p.ailment=null;return true;}
  if(adapter?.aid?.()||adapter?.migration!==false&&migrationAid(s,p,{skipPersonal:personal}))return true;
  if(wantsFood(s,p)&&personal&&enabled(s,'supply')&&mealUnits>0&&consumeCarriedSupplies(p,null,'food',mealUnits)){consumedFood(s,p,{portions:mealUnits,source:'native-meal'});n.meals++;return true;}
  if(wantsFood(s,p)&&(adapter?.meal?.()||adapter?.migration!==false&&migrationMeal(s,p,{skipPersonal:personal})))return true;
  if(wantsFood(s,p)&&!p.roadTransit&&adapter?.localFood!==false&&a.civic&&a.civic.food>0){
    if(marketEnabled(s)&&enabled(s,'supply')){
      const units=Math.min(2,a.civic.food),deal=tradeGoods(s,a,p.id,'food','buy',units);
      const eaten=deal.quantity||takeGoods(s,a,'food',units,{reason:'resident-relief',actor:p.id});if(deal.quantity)consumeCarriedSupplies(p,null,'food',eaten);
      consumedFood(s,p,{portions:eaten,source:'native-meal'});n.meals++;return true;
    }
    const units=takeGoods(s,a,'food',Math.min(2,a.civic.food),{reason:'resident-meal',actor:p.id});consumedFood(s,p,{portions:units,source:'native-meal'});n.meals++;
    if(p.agenda.wealth>0){const paid=Math.min(units,p.agenda.wealth);p.agenda.wealth-=paid;a.civic.treasury+=paid;}return true;
  }
  }
  if((nutritionView(s,p).sleep||n.energy<25||n.sleeping)&&adapter?.sleep!==false&&!adapter?.onlyUpkeep){
    if(nutritionView(s,p).sleep||p.nutrition?.sleep.active){const phase=sleepPhase(s,p,{native:true});n.sleeping=Boolean(p.nutrition?.sleep.active);if(phase?.done)n.sleeps++;}else{n.energy=Math.min(nutritionView(s,p).energyLimit,n.energy+8);n.sleeping=false;}return true;
  }
  if(!biologicalNeed(s,p).food&&n.loneliness>65&&adapter?.social!==false&&!adapter?.onlyUpkeep){
    const other=(a.population||[]).map(id=>s.people[id]).find(q=>q?.alive&&q.id!==p.id&&q.area===p.area&&q.status==='resident');
    if(other){initializeNeeds(other);shareEstateKnowledge(s,p,other);shareEstateKnowledge(s,other,p);shareMarketKnowledge(s,p.id,other.id);shareMarketKnowledge(s,other.id,p.id);n.loneliness=Math.max(0,n.loneliness-45);other.needs.loneliness=Math.max(0,other.needs.loneliness-25);n.conversations++;p.agenda.bonds[other.id]=(p.agenda.bonds[other.id]||0)+1;other.agenda.bonds[p.id]=(other.agenda.bonds[p.id]||0)+1;return true;}
  }
  return false;
}
