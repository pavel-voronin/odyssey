import {heldWaystones,waystonesOn} from './waystone-state.js';
import {waystoneDecision,fillWaystone,transferWaystone} from './waystones.js';
import {localContact} from './npc-contacts.js';
export function waystonePlan(s,ctx){
 const h=s.hero;if(!waystonesOn(s)||h.goal||h.combat||h.transit||h.energy<35||h.hunger>=60)return false;const item=heldWaystones(h)[0];if(!item)return false;
 const d=waystoneDecision(s,h,item);if(!d)return false;const old=item.waystone.choices[h.lineage];if(!old||old.kind!==d.kind)item.waystone.choices[h.lineage]={tick:s.tick,kind:d.kind,reason:d.reason};
 if(d.kind==='keep'){
  if(item.waystone.charge<3&&h.magic.mana>=8){ctx.goal(s,'waystoneFill',h.area,h.x,'Сохранить немного маны для дороги',d.reason,{item:item.id,remaining:1});return true;}
  return false;
 }
 if(d.kind==='wait')return false;const p=s.people[d.person],b=localContact(s,p.id,h.area);if(!b)return false;
 ctx.goal(s,'waystoneTransfer',h.area,b.x,d.kind==='sale'?'Предложить путевой камень покупателю':'Подарить путевой камень',d.reason,{item:item.id,person:p.id,mode:d.kind,remaining:1});return true;
}
export function waystoneAction(s,ctx){
 const h=s.hero,g=h.goal,item=heldWaystones(h).find(i=>i.id===g?.item);if(!waystonesOn(s)){h.lastAction='wait';return false;}
 const ok=g?.kind==='waystoneFill'?fillWaystone(s,h,item):transferWaystone(s,h,item,s.people[g?.person],g?.mode);
 h.goal=null;if(ok)ctx.log(s,g.kind==='waystoneFill'?'Камень принял одну меру заряда, потратив две меры личной маны.':g.mode==='sale'?'Покупатель заплатил из собственного кошелька. Тот же камень и его остаток перешли к нему.':'Путевой камень передан с тем же остатком. Умения прежнего владельца остались при нём.','magic');return ok;
}
