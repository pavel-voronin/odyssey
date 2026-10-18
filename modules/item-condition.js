import {enabled} from '../rules.js';

export const ITEM_DURABILITY={weapon:240,armor:320};
export const itemWearEnabled=s=>enabled(s,'item-wear')&&enabled(s,'equipment');
// A missing record means untracked, not hundreds of guessed former uses.
// Physical damage persists when the wear controller is switched off.
export const itemWorking=item=>Boolean(item)&&(!item.durability||item.durability.current>0);
export function initializeNewItemCondition(s,item){
 if(!itemWearEnabled(s)||!item||item.durability||!ITEM_DURABILITY[item.slot])return;
 const max=ITEM_DURABILITY[item.slot];item.durability={version:1,born:s.tick,max,initial:max,current:max,used:0,restored:0,repairs:0,lastTick:-1,lastUse:null};
}
export function itemWorth(item){const d=item?.durability;return d?Math.floor(item.value*(.25+.75*d.current/d.max)):item?.value||0;}
function ownItems(s,id){const h=s.hero.lineage===id?s.hero:s.actorStates?.[id],p=s.people[id];return h?[...h.bag,...Object.values(h.equipment).filter(Boolean)]:p?.looseItems||[];}
// Operation owners call this only after a real completed use. It is not a
// timer, a render hook, an initializer, or an interpretation of enchantment XP.
export function wearOwnedItem(s,item,actor,kind,source,ctx=null){
 const d=item?.durability,p=s.people[actor];
 if(!itemWearEnabled(s)||!d||!itemWorking(item)||d.lastTick>=s.tick||!p?.alive||!['attack','armor','spell','gather'].includes(kind)||!ownItems(s,actor).includes(item))return false;
 d.current--;d.used++;d.lastTick=s.tick;d.lastUse={tick:s.tick,actor,kind,source};
 if(d.current===0){d.brokenAt=s.tick;item.history ||= [];item.history.push({tick:s.tick,text:`${item.name}: износ после настоящего использования. Нужен ремонт.`});if(ctx&&(s.hero.lineage===actor||s.hero.area===p.area))ctx.log(s,`${item.name} сломан. Рабочий эффект пропал; сам предмет остаётся у владельца.`,'equipment');}
 return true;
}
export function wearWeaponHit(s,e,damage,before,ctx){
 const h=s.hero;if(h.lastAction!=='attack'||h.combat!==e.id||!(damage>0)||before-e.hp!==damage||!s.areas[h.area].objects.includes(e))return false;
 return wearOwnedItem(s,h.equipment.weapon,h.lineage,'attack',e.id,ctx);
}
export function wearArmorHit(s,e,received,before,ctx){
 const h=s.hero;if(h.combat!==e.id||!(received>0)||before-h.hp!==received||!s.areas[h.area].objects.includes(e))return false;
 return wearOwnedItem(s,h.equipment.armor,h.lineage,'armor',e.id,ctx);
}
export function wearFocusCast(s,before,spell,ctx){
 const h=s.hero,item=h.equipment.weapon;if(h.lastAction!=='spell'||h.magic.casts!==before+1||item?.stat!=='magic')return false;
 return wearOwnedItem(s,item,h.lineage,'spell',spell,ctx);
}
