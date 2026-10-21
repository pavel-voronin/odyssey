import {heroLevel} from './progression-state.js';
import {partyAvailable} from './party-needs.js';
import {enabled} from '../rules.js';
import {legacyArmorDefense,armorExtra} from './armor.js';
import {delvePassage} from './delve-attempts.js';

export function expectedLoss(s,enemy){
  const h=s.hero,active=enabled(s,'route-memory'),help=active&&enabled(s,'companions')?h.companions.filter(c=>partyAvailable(s,c)).reduce((n,c)=>n+Math.max(0,c.attack||0),0):0;
  const physical=enabled(s,'armor-balance')&&enabled(s,'equipment')?Object.values(h.equipment||{}).reduce((n,i)=>n+(i?.stat==='defense'?i.power:0),0)+armorExtra(h):0;
  const hit=enemy.attack+1-legacyArmorDefense(h)-physical;
  return Math.ceil(enemy.hp/(5.5+h.weapon*3+heroLevel(h)/2+help))*(active?Math.max(1,hit):hit);
}
export function areaAvoided(s,id){
  const h=s.hero,known=enabled(s,'route-memory')&&h.memory.rejected?.[id];
  if(delvePassage(s,id,known?.enemy))return false;
  const passage=h.goal?.safePassage,c=passage&&s.storyCases?.find(c=>c.id===h.goal.story&&c.status==='active'&&c.owner===h.lineage);
  if(known&&passage?.kind==='debt'&&h.goal.area===id&&known.enemy===passage.enemy&&c?.kind==='pact'&&c.collector?.id===known.enemy&&enabled(s,'stories')&&enabled(s,'pacts')&&h.gold+h.bag.reduce((n,i)=>n+i.value,0)>=c.debt)return false;
  if(known)return expectedLoss(s,known)>h.maxHp*(.8+h.personality.courage*.5);
  return (h.memory.avoided[id]||0)>s.tick;
}
export function rememberRejected(s,enemy){
  if(!enabled(s,'route-memory')||!enemy.alive||enemy.resolved)return;
  const h=s.hero;h.memory.rejected ||= {};
  h.memory.rejected[h.area]={enemy:enemy.id,name:enemy.name,hp:enemy.hp,attack:enemy.attack,seen:s.tick};
}
export function observeRejected(s,area){
  if(!enabled(s,'route-memory')||area.id!==s.hero.area)return;
  const known=s.hero.memory.rejected?.[area.id];if(!known)return;
  const enemy=area.objects.find(o=>o.id===known.enemy);
  if(!enemy||!enemy.alive||enemy.resolved){delete s.hero.memory.rejected[area.id];delete s.hero.memory.avoided[area.id];return;}
  Object.assign(known,{hp:enemy.hp,attack:enemy.attack,seen:s.tick});
}
