import {enabled} from '../rules.js';
import {itemWorking} from './item-condition.js';
export const WAYSTONE={capacity:6,initial:3,perCast:3,fillMana:2,price:4};
export const waystonesOn=s=>enabled(s,'waystones')&&enabled(s,'equipment');
export const heldWaystones=h=>[...h.bag,...Object.values(h.equipment).filter(Boolean)].filter(i=>i.waystone?.version===1&&i.physical?.holder?.kind==='person'&&i.physical.holder.id===h.lineage);
export function stoneFunding(s,h,total){
 const item=waystonesOn(s)&&enabled(s,'magic')?heldWaystones(h).find(i=>i.waystone.charge>0&&itemWorking(i)):null;
 const charge=item?Math.min(item.waystone.charge,WAYSTONE.perCast,Math.max(0,total-1),Math.max(0,total-h.magic.mana)):0;
 return {total,mana:total-charge,charge,item:charge?item.id:null};
}
export function spendSpellFunding(s,h,total,spell){
 if(!enabled(s,'magic')||!Number.isSafeInteger(total)||total<1||!h.magic.spells.includes(spell))return false;
 const q=stoneFunding(s,h,total);if(h.magic.mana<q.mana)return false;
 const item=q.item&&heldWaystones(h).find(i=>i.id===q.item),w=item?.waystone,cast=h.magic.casts+1;
 if(w?.lastUse?.actor===h.lineage&&w.lastUse.cast===cast)return false;
 if(w){const before=w.charge;w.charge-=q.charge;w.spent+=q.charge;w.lastUse={tick:s.tick,actor:h.lineage,spell,cast,total,mana:q.mana,charge:q.charge,before,after:w.charge};item.history.push({tick:s.tick,text:`Камень поддержал знакомое заклинание: израсходовано ${q.charge} сохранённой маны.`});}
 h.magic.mana-=q.mana;return true;
}
