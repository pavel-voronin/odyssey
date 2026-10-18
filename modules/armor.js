import {practicalClothingOn,clothingKind,clothingWalkExtra,clothingPreference,clothingSituation} from './clothing-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {itemWorking} from './item-condition.js';
const active=h=>h.ruleFlags?.['armor-balance']!==false&&h.ruleFlags?.equipment!==false;
const heavy=item=>['mail','доспех'].includes(item?.base||String(item?.name||'').split(':')[0]);
export function armorExtra(h,item=h.equipment?.armor){return active(h)&&itemWorking(item)&&item.slot==='armor'&&item.stat==='defense'&&heavy(item)?2:0;}
export function armorWalkExtra(s,item=s.hero.equipment?.armor){return enabled(s,'armor-balance')&&enabled(s,'equipment')&&item?.slot==='armor'&&heavy(item) ? .4 : 0;}
export function walkingEnergy(s,weather){return Math.max(.3,.7+armorWalkExtra(s)+clothingWalkExtra(s,s.hero.equipment?.armor,weather))*weather.energy;}
// The legacy leather rating is an underlay/fallback, not a second copy of the
// physical armor currently equipped. Preserve its stored ownership on removal.
export function legacyArmorDefense(h){return active(h)&&itemWorking(h.equipment?.armor)?0:(h.armor||0)*2;}
export function armorCoverage(h){return active(h)&&itemWorking(h.equipment?.armor)?Math.min(2,Math.max(0,Math.floor(((h.equipment.armor.stat==='defense'?h.equipment.armor.power:0)+armorExtra(h))/2))):h.armor||0;}
export function hasArmor(h){return Boolean(h.armor||active(h)&&itemWorking(h.equipment?.armor));}
export function armorEffect(s,item){if(!enabled(s,'armor-balance')||!enabled(s,'equipment')||item?.slot!=='armor')return null;return {defense:itemWorking(item)?(item.stat==='defense'?item.power:0)+armorExtra(s.hero,item):0,walkExtra:armorWalkExtra(s,item)+clothingWalkExtra(s,item,clothingSituation(s).weather),heavy:Boolean(armorWalkExtra(s,item)),clothing:practicalClothingOn(s)?clothingKind(item):null};}
export function armorDescription(s,item){const effect=armorEffect(s,item);return effect?`${effect.clothing==='warm'?'Тёплый плащ':effect.clothing==='light'?'Лёгкая одежда':effect.heavy?'Тяжёлый доспех':'Лёгкая одежда'} · защита +${effect.defense} · ${effect.walkExtra?'на шаг '+(effect.walkExtra>0?'+':'')+String(effect.walkExtra).replace('.',',')+' силы':'без дополнительной усталости на шаге'}.`:'';}
export function armorChoice(s,item,ctx){
 const effect=armorEffect(s,item);if(!effect)return null;
 const h=s.hero,g=h.goal?.kind==='clothingDress'||h.goal?.kind==='clothingBuy'?h.goal.resume||h.goal:h.goal;let walks=0;
 // Only known connected scenes; never inspect an unknown target's occupants.
 if(g?.area&&Number.isFinite(g.x)){
  const path=g.area===h.area?[h.area]:ctx?.knownRoute?.(s,h.area,g.area)||[];let x=h.x;
  for(let i=0;i<Math.min(path.length,3);i++){
   const a=s.areas[path[i]],next=path[i+1],to=next?(Number(next.slice(1))>Number(a.id.slice(1))?100:0):g.x;
   walks+=Math.ceil(Math.max(0,physicalDistance(a,x,to)-1)/6);if(next)x=to===100?5:95;
  }
 }
 const caution=1-h.personality.courage,need=Math.max(0,(55-h.energy)/40),risk=h.hp<h.maxHp*.65?1:0;
 const value=effect.defense*(1+caution*.35+risk*.3)-effect.walkExtra*(walks*(.55+need*.35)+need*5)+clothingPreference(s,item);
 const reason=effect.clothing==='warm'&&clothingSituation(s).cold?'Тёплый плащ уменьшает расход сил в настоящем холоде.':effect.clothing==='light'?'Лёгкая одежда удобнее в дальней дороге и в обычной работе.':effect.walkExtra?walks>=12?'Тяжёлый доспех защитит лучше, но известный путь потребует больше сил.':h.energy<25?'Сил мало: тяжёлый доспех утомит ещё сильнее.':'Тяжёлый доспех даёт больше защиты ценой сил в дороге.':'Лёгкая одежда не добавляет усталости на шаге.';
 return {value,walks,...effect,reason};
}
