import {SPELLS} from '../content.js';
import {enabled} from '../rules.js';
import {localSpellExtra,knownSpellExtra,placeRuleArea} from './place-rule-state.js';
import {spellInvoice} from './spell-invoice.js';
export function observePlaceRule(s,ctx){
 const h=s.hero,a=placeRuleArea(s,h.area);if(!h.alive||h.transit||!localSpellExtra(s,h))return null;
 const notes=h.memory.localRules ||= {};if(notes[a.id])return notes[a.id];
 const note=notes[a.id]={version:1,area:a.id,seen:s.tick,sign:'pale-runes',extraMana:a.localRule.extraMana,casts:0,lastCast:null};
 ctx.log(s,`В тихой ложбине под ногами бледнеют рунические следы. ${enabled(s,'magic')&&h.magic.spells.length?'Знакомые чары требуют здесь ещё две меры маны. Можно идти и работать без колдовства.':'Обычному шагу и работе они не мешают.'}`,'discover');return note;
}
export function recordPlaceCast(s,spell,before,ctx){
 const h=s.hero;if(!spell.localManaCost)return;const note=observePlaceRule(s,ctx);if(!note)return;
 if(note.lastCast?.cast===h.magic.casts)return;
 note.casts++;note.lastCast={tick:s.tick,atArea:h.area,cast:h.magic.casts,spell:spell.id,base:spell.baseManaCost,total:spell.totalManaCost,manaBefore:before,manaAfter:h.magic.mana,charge:spell.waystoneCost,item:spell.waystoneItem};
 if(note.casts===1)ctx.log(s,`Бледные следы потянулись к чарам: местное правило действительно добавило ${spell.localManaCost} маны к цене. Это расход заклинания, не проклятие тела.`,'magic');
}
export function knownLawBurden(s,area){
 const h=s.hero;if(!enabled(s,'magic')||!knownSpellExtra(s,h,area)||h.personality.courage>=.55)return false;
 const spells=SPELLS.filter(sp=>h.magic.spells.includes(sp.id));return spells.length>0&&spells.every(sp=>spellInvoice(s,h,sp,{area,known:true}).manaCost>h.magic.mana);
}
