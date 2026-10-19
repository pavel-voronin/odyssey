import {usableWardScroll,spellTextMemory} from './spell-text-state.js';
import {consumeOriginal} from './item-originals.js';
export function finishScrollEffect(s,h,spell,{before,after,castsBefore}){
 const item=spell.scroll&&usableWardScroll(s,h,spell.scroll),condition=h.conditions.find(c=>c.id==='blessing'&&c.since===s.tick);if(!item||spell.id!=='ward'||!condition||h.magic.casts!==castsBefore+1)return false;
 const p=s.people[h.lineage],m=spellTextMemory(p),r={id:p.id+'/scroll-use/'+(++m.useSerial),actor:p.id,item:item.id,content:item.textCopy.content,spell:'ward',at:s.tick,area:h.area,cast:h.magic.casts,manaBefore:before,manaAfter:after,mana:before-after,charge:spell.waystoneCost,total:spell.totalManaCost,waystone:spell.waystoneItem,condition:'blessing',since:condition.since};
 h.bag.splice(h.bag.indexOf(item),1);consumeOriginal(s,item,{area:h.area,object:item.id,reason:'spell-scroll-effect'});m.uses.push(r);if(m.uses.length>24)m.uses.shift();return true;
}
