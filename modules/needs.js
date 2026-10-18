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
  if(!enabled(s,'npc-needs'))return false;
  initializeNeeds(p);const n=p.needs,a=s.areas[p.area];if(!a)return false;
  n.hunger=Math.min(100,n.hunger+.4);n.energy=Math.max(0,n.energy-.8);n.loneliness=Math.min(100,n.loneliness+.4);
  const personal=!adapter&&enabled(s,'npc-personal-supplies'),maximum=p.maxHealth||100;
  if(!adapter?.onlyUpkeep){
  if(personal&&enabled(s,'supply')&&(p.health<maximum*.75||p.ailment)&&consumeCarriedSupplies(p,null,'medicine',fieldMedicineCost(s,p.id))){p.health=Math.min(maximum,p.health+25);if(p.health>=maximum*.85)p.ailment=null;return true;}
  if(adapter?.aid?.()||adapter?.migration!==false&&migrationAid(s,p,{skipPersonal:personal}))return true;
  if(n.hunger>=65&&personal&&enabled(s,'supply')&&consumeCarriedSupplies(p,null,'food',1)){n.hunger=Math.max(0,n.hunger-48);n.meals++;return true;}
  if(n.hunger>=65&&(adapter?.meal?.()||adapter?.migration!==false&&migrationMeal(s,p,{skipPersonal:personal})))return true;
  if(n.hunger>=65&&!p.roadTransit&&adapter?.localFood!==false&&a.civic&&(!enabled(s,'supply')||a.civic.food>0)){
    if(marketEnabled(s)&&enabled(s,'supply')){
      const deal=tradeGoods(s,a,p.id,'food','buy',1);
      if(deal.quantity)consumeCarriedSupplies(p,null,'food',1);
      else takeGoods(s,a,'food',1,{reason:'resident-relief',actor:p.id});
      n.hunger=Math.max(0,n.hunger-48);n.meals++;return true;
    }
    if(enabled(s,'supply'))takeGoods(s,a,'food',1,{reason:'resident-meal',actor:p.id});n.hunger=Math.max(0,n.hunger-48);n.meals++;
    if(p.agenda.wealth>0){p.agenda.wealth--;a.civic.treasury++;}return true;
  }
  }
  if(n.hunger>=95&&s.tick%96===0){
    p.health=Math.max(0,p.health-4);
    if(!p.health){p.alive=false;p.status='dead';p.died=s.tick;p.deathCause='Голод';if(adapter?.grave!==false)a.objects.push({id:'npc-grave-'+p.id,kind:'grave',name:p.name,x:p.x||42});if(adapter?.onDeath)adapter.onDeath(a);else{s.changes.push({tick:s.tick,text:p.name+' умер от голода.'});if(s.hero.area===p.area)ctx.log(s,p.name+' не пережил голод.','loss');}recordPersonRemains(s,p);return true;}
  }
  if((n.energy<25||n.sleeping)&&adapter?.sleep!==false&&!adapter?.onlyUpkeep){
    n.sleeping=true;n.energy=Math.min(100,n.energy+8);if(n.energy>=90){n.sleeping=false;n.sleeps++;}return true;
  }
  if(n.loneliness>65&&adapter?.social!==false&&!adapter?.onlyUpkeep){
    const other=(a.population||[]).map(id=>s.people[id]).find(q=>q?.alive&&q.id!==p.id&&q.area===p.area&&q.status==='resident');
    if(other){initializeNeeds(other);shareMarketKnowledge(s,p.id,other.id);shareMarketKnowledge(s,other.id,p.id);n.loneliness=Math.max(0,n.loneliness-45);other.needs.loneliness=Math.max(0,other.needs.loneliness-25);n.conversations++;p.agenda.bonds[other.id]=(p.agenda.bonds[other.id]||0)+1;other.agenda.bonds[p.id]=(other.agenda.bonds[p.id]||0)+1;return true;}
  }
  return false;
}
