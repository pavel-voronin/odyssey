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
  const personal=!adapter&&enabled(s,'npc-personal-supplies'),maximum=p.maxHealth||100;
  if(!adapter?.onlyUpkeep){
  if(n.hunger>=65&&eatGameMeal(s,p,ctx,{inTurn:true,need:true}))return true;
  if(personal&&(!biologicalNeed(s,p).food||p.health<maximum*.2)&&enabled(s,'supply')&&(p.health<maximum*.75||p.ailment)&&consumeCarriedSupplies(p,null,'medicine',fieldMedicineCost(s,p.id))){p.health=Math.min(maximum,p.health+25);if(p.health>=maximum*.85)p.ailment=null;return true;}
  if(adapter?.aid?.()||adapter?.migration!==false&&migrationAid(s,p,{skipPersonal:personal}))return true;
  if(n.hunger>=65&&personal&&enabled(s,'supply')&&consumeCarriedSupplies(p,null,'food',1)){n.hunger=Math.max(0,n.hunger-48);n.meals++;return true;}
  if(n.hunger>=65&&(adapter?.meal?.()||adapter?.migration!==false&&migrationMeal(s,p,{skipPersonal:personal})))return true;
  if(n.hunger>=65&&!p.roadTransit&&adapter?.localFood!==false&&a.civic&&a.civic.food>0){
    if(marketEnabled(s)&&enabled(s,'supply')){
      const deal=tradeGoods(s,a,p.id,'food','buy',1);
      if(deal.quantity)consumeCarriedSupplies(p,null,'food',1);
      else takeGoods(s,a,'food',1,{reason:'resident-relief',actor:p.id});
      n.hunger=Math.max(0,n.hunger-48);n.meals++;return true;
    }
    takeGoods(s,a,'food',1,{reason:'resident-meal',actor:p.id});n.hunger=Math.max(0,n.hunger-48);n.meals++;
    if(p.agenda.wealth>0){p.agenda.wealth--;a.civic.treasury++;}return true;
  }
  }
  if(p.health<=0){
    if(!p.health){p.alive=false;p.status='dead';p.died=s.tick;p.deathCause='Голод';ctx.dropRemains?.(s,p,'носитель погиб');a=s.areas[p.area];if(adapter?.grave!==false&&p.area===a.id)a.objects.push({id:'npc-grave-'+p.id,kind:'grave',name:p.name,x:p.x||42});if(adapter?.onDeath)adapter.onDeath(a);else{s.changes.push({tick:s.tick,text:p.name+' умер от голода.'});if(s.hero?.area===p.area)ctx.log(s,p.name+' не пережил голод.','loss');}recordPersonRemains(s,p);return true;}
  }
  if((n.energy<25||n.sleeping)&&adapter?.sleep!==false&&!adapter?.onlyUpkeep){
    n.sleeping=true;n.energy=Math.min(100,n.energy+8);if(n.energy>=(biologicalNeed(s,p).food?16:40)){n.sleeping=false;n.sleeps++;}return true;
  }
  if(!biologicalNeed(s,p).food&&n.loneliness>65&&adapter?.social!==false&&!adapter?.onlyUpkeep){
    const other=(a.population||[]).map(id=>s.people[id]).find(q=>q?.alive&&q.id!==p.id&&q.area===p.area&&q.status==='resident');
    if(other){initializeNeeds(other);shareEstateKnowledge(s,p,other);shareEstateKnowledge(s,other,p);shareMarketKnowledge(s,p.id,other.id);shareMarketKnowledge(s,other.id,p.id);n.loneliness=Math.max(0,n.loneliness-45);other.needs.loneliness=Math.max(0,other.needs.loneliness-25);n.conversations++;p.agenda.bonds[other.id]=(p.agenda.bonds[other.id]||0)+1;other.agenda.bonds[p.id]=(other.agenda.bonds[p.id]||0)+1;return true;}
  }
  return false;
}
