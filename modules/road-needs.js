import {fieldMedicineCost} from './skill-branches.js';
import {enabled} from '../rules.js';
import {takeGoods} from './goods.js';
import {personNeeds,initializeNeeds} from './needs.js';
import {areaObservation,heroPresent} from './background-towns.js';
import {consumeCarriedSupplies} from './stores.js';

const active=s=>enabled(s,'npc-road-needs')&&enabled(s,'npc-needs');
export function reserveRoadSupplies(s,p,source){
  if(!active(s)||!enabled(s,'supply')||!source.civic)return;
  const food=Math.min(Math.max(0,source.civic.food),Math.max(0,2-(p.roadSupplies?.food||0)));
  const wounded=p.health<(p.maxHealth||100)*.75||p.ailment;
  const medicine=wounded?Math.min(Math.max(0,source.civic.medicine-2),Math.max(0,2-(p.roadSupplies?.medicine||0))):0;
  if(!food&&!medicine)return;
  p.roadSupplies ||= {food:0,medicine:0};takeGoods(s,source,'food',food,{flow:'exported',reason:'road-provisions',actor:p.id});source.civic.medicine-=medicine;p.roadSupplies.food=(p.roadSupplies.food||0)+food;p.roadSupplies.medicine=(p.roadSupplies.medicine||0)+medicine;
}
function take(s,p,cargo,key,amount){
  return enabled(s,'supply')&&consumeCarriedSupplies(p,cargo,key,amount);
}
function note(s,p,text,ctx,death=false){
  p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();
  const a=s.areas[p.area];if(death){
    const event={tick:s.tick,area:a.id,text,kind:'loss',...areaObservation(s,a,'needs')};s.society.events.unshift(event);if(s.society.events.length>160)s.society.events.length=160;
    s.changes.push({tick:s.tick,text,id:event.id,area:a.id,knownBy:[...event.knownBy]});
  }
  if(heroPresent(s,a))ctx.log(s,text,death?'loss':'npc');
}
export function roadNeeds(s,p,ctx,cargo=null){
  if(!active(s))return false;if(!p.alive)return true;
  if(p.roadNeeds?.tick===s.tick)return p.roadNeeds.blocked;
  initializeNeeds(p);const beforeSleep=Boolean(p.needs.sleeping);let used=false,activity=null;
  if(s.tick%8===0){
    used=personNeeds(s,p,ctx,{migration:false,localFood:!p.roadTransit,
      aid(){const max=p.maxHealth||100;if(!(p.health<max*.75||p.ailment)||!take(s,p,cargo,'medicine',fieldMedicineCost(s,p.id)))return false;p.health=Math.min(max,p.health+25);if(p.health>=max*.85)p.ailment=null;activity='medicine';return true;},
      meal(){if(!take(s,p,cargo,'food',1))return false;p.needs.hunger=Math.max(0,p.needs.hunger-48);p.needs.meals++;activity='eat';return true;},
      onDeath(){note(s,p,`${p.name} не пережил голод на дороге.`,ctx,true);}
    });
  }
  const sleeping=Boolean(p.needs.sleeping);
  if(!beforeSleep&&sleeping)note(s,p,`${p.name} останавливается на ночлег у дороги. Путь и поклажа остаются с ним.`,ctx);
  else if(beforeSleep&&!sleeping)note(s,p,`${p.name} просыпается и готов продолжить с прежнего места.`,ctx);
  if(activity==='eat')note(s,p,`${p.name} съедает часть дорожного запаса. Еда действительно заканчивается.`,ctx);
  if(activity==='medicine')note(s,p,`${p.name} расходует дорожные лекарства на свои раны.`,ctx);
  p.roadNeeds={tick:s.tick,blocked:used||sleeping||!p.alive,activity:activity||(sleeping?'sleep':null)};return p.roadNeeds.blocked;
}
