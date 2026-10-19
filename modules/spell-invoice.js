import {enchantmentStrength} from './enchantments.js';
import {stoneFunding} from './waystone-state.js';
import {localSpellExtra,knownSpellExtra} from './place-rule-state.js';
export function spellInvoice(s,h,spell,{area=h.area,known=false,discount=0,prepaid=0}={}){
 const baseManaCost=Math.max(1,spell.mana-enchantmentStrength(h,'time')-Math.max(0,discount)),localManaCost=known?knownSpellExtra(s,h,area):localSpellExtra(s,h,area),totalManaCost=baseManaCost+localManaCost,q=stoneFunding(s,h,Math.max(0,totalManaCost-prepaid),{prepaid});
 return {baseManaCost,localManaCost,totalManaCost,manaCost:q.mana,waystoneCost:q.charge,waystoneItem:q.item};
}
