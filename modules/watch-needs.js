import {fieldMedicineCost} from './skill-branches.js';
import {goodsTaker} from './goods.js';
import {enabled} from '../rules.js';
import {personNeeds,initializeNeeds} from './needs.js';
import {reserveCargo,consumeCarriedSupplies} from './stores.js';
import {areaObservation,heroPresent} from './background-towns.js';

export const watchNeedsActive=s=>enabled(s,'npc-watch-needs')&&enabled(s,'npc-needs');
export function provisionWatch(s,p,source){
  if(!watchNeedsActive(s)||!enabled(s,'supply'))return;
  const goods=reserveCargo(source,{food:Math.max(0,2-(p.roadSupplies?.food||0)),medicine:Math.max(0,2-(p.roadSupplies?.medicine||0))},{medicine:2},goodsTaker(s,{reason:'watch-provisions',actor:p.id}));
  if(!goods.food&&!goods.medicine)return;p.roadSupplies ||= {food:0,medicine:0};
  for(const key of ['food','medicine'])p.roadSupplies[key]=(p.roadSupplies[key]||0)+goods[key];
}
export function watchNote(s,p,text,ctx,kind='npc'){
  p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();
  const a=s.areas[p.area],event={tick:s.tick,area:a.id,text,kind,...areaObservation(s,a,'guard')};
  if(p.alive&&!event.witnesses.includes(p.id))event.witnesses.push(p.id);
  s.society.events.unshift(event);if(s.society.events.length>160)s.society.events.length=160;
  s.changes.push({tick:s.tick,text,id:event.id,area:a.id,knownBy:[...event.knownBy]});
  if(heroPresent(s,a))ctx.log(s,text,kind);return event;
}
export function watchNeeds(s,p,ctx,inCombat=false,requestedRetreat=false){
  if(!watchNeedsActive(s))return {blocked:false,retreat:false};
  if(p.watchNeeds?.tick===s.tick)return p.watchNeeds;
  initializeNeeds(p);const n=p.needs,max=p.maxHealth||100,beforeSleep=Boolean(n.sleeping);
  const medicine=enabled(s,'supply')&&(p.roadSupplies?.medicine||0)>=2;
  const retreat=inCombat&&(requestedRetreat||n.energy<25||n.sleeping||p.health<max*.3&&!medicine);
  let used=false,activity=null;
  if(s.tick%8===0)used=personNeeds(s,p,ctx,{migration:false,sleep:!inCombat,social:!inCombat,onlyUpkeep:retreat,
    aid(){if(!(p.health<max*.75||p.ailment)||!enabled(s,'supply')||!consumeCarriedSupplies(p,null,'medicine',fieldMedicineCost(s,p.id)))return false;p.health=Math.min(max,p.health+25);if(p.health>=max*.85)p.ailment=null;activity='medicine';return true;},
    meal(){if(!enabled(s,'supply')||!consumeCarriedSupplies(p,null,'food',1))return false;n.hunger=Math.max(0,n.hunger-48);n.meals++;activity='eat';return true;},
    onDeath(){watchNote(s,p,`${p.name} не пережил голод на поручении.`,ctx,'loss');}
  });
  if(!beforeSleep&&n.sleeping)watchNote(s,p,`${p.name} останавливается на ночлег. Поручение остаётся незавершённым.`,ctx);
  else if(beforeSleep&&!n.sleeping)watchNote(s,p,`${p.name} просыпается и продолжает поручение.`,ctx);
  if(activity==='medicine')watchNote(s,p,`${p.name} тратит ход на дорожную аптечку.`,ctx);
  if(activity==='eat')watchNote(s,p,`${p.name} тратит ход на свой паёк.`,ctx);
  p.watchNeeds={tick:s.tick,blocked:used||Boolean(n.sleeping)||!p.alive,activity:activity||(n.sleeping?'sleep':null),retreat};return p.watchNeeds;
}
