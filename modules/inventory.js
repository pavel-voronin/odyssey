import {cargoPrivateHold} from './cargo-provenance.js';
import {willHold} from './will-records.js';
import {estateClaimsOn,observeEstateClaims,estateById,estateSource} from './estate-claim-state.js';
import {recordEstatePickup} from './estate-pickup.js';
import {practicalClothingOn,clothingKind} from './clothing-state.js';
import {navigationToolsOn,isRopeItem} from './navigation-tool-state.js';
import {reserveArmor,refreshReserve,spareNeedsMoney} from './spare-outfit.js';
import {physicalDistance} from '../geometry.js';
import {containersOn,packView,fitsPack,itemUnits} from './container-state.js';
import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import { choose, clamp, hasHabit, hasCondition, profile, activePower, moral, repute } from './common.js';
import { addCondition } from './body.js';
import { initializeItemMemory,itemBearer,enchantmentPreference,enchantmentStrength } from './enchantments.js';
import {beginLootResult,recordLootDiscard,lootSaleMeaning,settleLootResults} from './loot-results.js';
import {armorExtra,armorChoice,armorEffect} from './armor.js';
import {markNewWeapon,weaponAcquisitionValue} from './weapon-styles.js';
import {originalsOn,ITEM_CAPACITY,actorItemLocation,itemLocation,cacheItems,presentItem} from './item-originals.js';
import {observeOwnCollection,refreshCollection,collectionKeep} from './collection-state.js';
import {initializeNewItemCondition,itemWorking,itemWorth} from './item-condition.js';

export function itemBonus(h, stat) {
  if (h.ruleFlags?.equipment === false) return 0;
  return Object.values(h.equipment || {}).reduce((total, item) => total + (itemWorking(item)&&item.stat === stat ? item.power : 0), 0)+(stat==='defense'?armorExtra(h):0);
}

export function makeItem(s, ctx, rarity = null) {
  const h = s.hero, base = choose(s, ctx.random, ITEM_BASES.filter(b=>!b.craftOnly)), epithet = choose(s, ctx.random, ITEM_EPITHETS);
  const origin = choose(s, ctx.random, ITEM_ORIGINS);
  const tier = rarity ?? (ctx.random(s) < .06 ? 4 : ctx.random(s) < .25 ? 2 : 1);
  const power = tier + Math.floor(Math.min(8, s.areas[h.area].depth) / 3);
  const adults=Object.values(s.people||{}).filter(p=>p.alive&&p.role!=='ребёнок'&&p.role!=='герой');
  const masters=adults.filter(p=>p.agenda?.job==='artisan');
  const creator=choose(s,ctx.random,masters.length?masters:adults);
  const item={ id: `item-${s.generation}-${h.nextItem++}`, base:base.id, name: `${base.name}: ${origin} · ${epithet.name}`, slot: base.slot, stat: base.stat, power, rarity: tier, modifier: epithet.modifier, value: power * 5 + tier * 3, found: s.tick, foundArea:h.area, creator:creator?.id||null, history:[{tick:Math.max(0,s.tick-32),text:`Создано: ${creator?.name||'неизвестный мастер'}. Найдено в месте «${s.areas[h.area].name}».`}] };
  markNewWeapon(s,item);initializeItemMemory(item);initializeNewItemCondition(s,item);return item;
}

export function receiveItem(s, ctx, rarity = null, existing = null, {crafted=false,purchased=false} = {}) {
  if (!enabled(s, 'equipment')) return null;
  if(existing&&(containersOn(s)||originalsOn(s)||existing.physical||existing.durability)){const present=presentItem(s,existing.id);if(present)return present.kind==='person'&&present.id===s.hero.lineage?present.item:null;if(existing===s.itemArchive?.[existing.id])return null;}
  const h = s.hero, item = existing || makeItem(s, ctx, rarity), equipped = h.equipment[item.slot];
  itemBearer(s,item);
  actorItemLocation(s,item);
  item.history ||= [];item.history.push({tick:s.tick,text:`${crafted?'Принято из собственного заказа':purchased?'Куплено':'Найдено'}: ${h.name} ${h.family||''}.`});
  const canUse = itemWorking(item)&&!['workPart','bioMaterial','prosthesis','fieldTool','textCopy','writingPaper','waystone','socketComponent'].includes(item.kind)&&(!enabled(s,'enchantments')||item.modifier !== 'curse' || hasHabit(h, 'gambler') || h.alignment < -20);
  const weight = value => itemWorking(value)?(armorChoice(s,value,ctx)?.value??value.power) + (value.stat === 'magic' && profile(h).skill === 'magic' ? 2 : 0)+enchantmentPreference(h,value)+weaponAcquisitionValue(s,value):0;
  let used=canUse && (!equipped ? !armorChoice(s,item,ctx)||weight(item)>0 : weight(item) > weight(equipped));if(containersOn(s)){
    if(used&&equipped&&!fitsPack(s,h.lineage,{items:[...h.bag,equipped]}))used=false;
    if(!used&&!fitsPack(s,h.lineage,{items:[...h.bag,item]})){const meaning=crafted||purchased?undefined:beginLootResult(s,item);cacheItems(s,[item]);recordLootDiscard(s,[item]);ctx.log(s,'В рюкзаке нет места: '+item.name+'. Оригинал остаётся в доступной поклаже.','loot',h.area,{meaning});settleLootResults(s);return item;}
  }
  const meaning=crafted||purchased?undefined:beginLootResult(s,item,used?equipped:null);
  if(meaning&&armorEffect(s,item)){meaning.item.armorEffect=armorEffect(s,item);meaning.result.choiceReason=armorChoice(s,item,ctx).reason;}
  if (used) {
    if (equipped) h.bag.push(equipped);
    h.equipment[item.slot] = item;
    if (item.modifier === 'curse'&&enabled(s,'enchantments')) addCondition(s, 'curse', ctx);
    ctx.log(s, `${crafted?'Изделие':purchased?'Покупка':'Находка'}: ${item.name}. Герой сам меняет снаряжение: ${{attack:'удар',magic:'магия',defense:'защита'}[item.stat]||item.stat} +${item.power}.`, 'equipment',h.area,{meaning});
  } else {
    h.bag.push(item); ctx.log(s, `${crafted?'Изделие':purchased?'Покупка':'Находка'} отправляется в сумку: ${item.name}.`, 'loot',h.area,{meaning});
  }
  actorItemLocation(s,item);if(equipped&&used)actorItemLocation(s,equipped);
  observeOwnCollection(s,ctx);
  if (!containersOn(s)&&h.bag.length > 24) {
    const wanted=collectionKeep(s);
    h.bag.sort((a, b) => Number(Boolean(wanted?.has(b.id)))-Number(Boolean(wanted?.has(a.id)))||itemWorth(b)-itemWorth(a));
    const abandoned = h.bag.splice(24);
    const physical=abandoned.filter(i=>originalsOn(s)||i.physical?.version===1||i.durability),untracked=abandoned.filter(i=>!physical.includes(i));
    if(physical.length)cacheItems(s,physical);
    if(untracked.length)s.areas[h.area].objects.push({ id: 'discard-' + item.id, kind: 'loot', name: 'Оставленная поклажа', x: h.x, gold: Math.ceil(untracked.reduce((n, i) => n + i.value, 0) / 3), taken: false });
    recordLootDiscard(s,abandoned);
    ctx.log(s, physical.length?`Сумка переполнена. На дороге остаётся поклажа: ${physical.map(i=>i.name).join('; ')}.`:'Сумка переполнена. Даже скопидому приходится оставить часть поклажи на дороге.', 'loot');
  }
  settleLootResults(s);refreshCollection(s,ctx);refreshReserve(s);return item;
}

export function recoverHeirloom(s,object,ctx){
  if(estateClaimsOn(s)&&object.estate&&(estateSource(s,estateById(s,object.estate))?.transit||s.hero.transit||!s.areas[s.hero.area]?.objects.includes(object)||physicalDistance(s.areas[s.hero.area],s.hero.x,object.x)>1))return;
  const estateBefore=estateClaimsOn(s)&&object.estate?[...(object.items||[])]:[];if(estateBefore.length)observeEstateClaims(s,s.people[s.hero.lineage]);
  if(object.taken||containersOn(s)&&(s.hero.transit||!s.areas[s.hero.area]?.objects.includes(object)||physicalDistance(s.areas[s.hero.area],s.hero.x,object.x)>1))return;
  s.hero.gold+=object.gold||0;object.gold=0;
  if(enabled(s,'equipment')){
    const physical=originalsOn(s)||object.itemOriginals===1;
    if(containersOn(s)){for(const item of [...object.items]){if(willHold(s,item.id,s.hero.lineage)||cargoPrivateHold(s,item,s.hero.lineage))continue;if(!fitsPack(s,s.hero.lineage,{items:[...s.hero.bag,item]}))continue;object.items.splice(object.items.indexOf(item),1);receiveItem(s,ctx,null,item);}}
    else {const items=object.items.filter(i=>!willHold(s,i.id,s.hero.lineage)&&!cargoPrivateHold(s,i,s.hero.lineage)).slice(0,physical?Math.max(0,ITEM_CAPACITY-s.hero.bag.length):object.items.length);for(const item of items){object.items.splice(object.items.indexOf(item),1);receiveItem(s,ctx,null,item);}}
  }
  object.taken=object.items.length===0;
  if(estateBefore.length)recordEstatePickup(s,s.people[s.hero.lineage],object,estateBefore.filter(i=>!object.items.includes(i)));
  ctx.log(s,`Найдена поклажа прежнего путника: ${object.name}. Вещи продолжают историю.`,'heritage');
}

export function sellBag(s, ctx) {
  const h = s.hero;
  if(containersOn(s)&&(h.transit||h.area!==s.merchant.area||physicalDistance(s.areas[h.area],h.x,58)>1))return;
  if (!h.bag.length || !spareNeedsMoney(s,ctx)&&(hasHabit(h, 'hoarder') && h.bag.length < 18||enchantmentStrength(h,'greed')&&h.bag.length<12)) return;
  const collection=collectionKeep(s),keep=collection?h.bag.filter(i=>collection.has(i.id)):hasHabit(h, 'collector') ? h.bag.filter(i => i.rarity >= 2) : [];
  s.merchant.items ||= [];
  const physical=containersOn(s)||originalsOn(s)||s.merchant.itemOriginalsVersion===1||h.bag.some(i=>i.physical?.version===1||i.durability);
  const reserve=spareNeedsMoney(s,ctx)?null:reserveArmor(s);
  const candidates=h.bag.filter(i => !i.waystone&&!keep.includes(i)&&i!==reserve&&i.kind!=='rawMeat'&&i.kind!=='meatFuel'&&i.kind!=='bioMaterial'&&i.kind!=='prosthesis'&&i.kind!=='textCopy'&&i.kind!=='writingPaper'&&(!practicalClothingOn(s)||!clothingKind(i))&&(!navigationToolsOn(s)||!isRopeItem(i)));
  let sold;if(containersOn(s)){let occupied=s.merchant.items.reduce((n,i)=>n+itemUnits(i),0);sold=candidates.filter(i=>{const units=itemUnits(i);if(occupied+units>ITEM_CAPACITY)return false;occupied+=units;return true;});}else sold=physical?candidates.slice(0,Math.max(0,ITEM_CAPACITY-s.merchant.items.length)):candidates;
  if(!sold.length&&physical){if(candidates.length&&h.itemBuyerFull!==s.merchant.items.length){h.itemBuyerFull=s.merchant.items.length;ctx.log(s,'У Савы нет места для новых вещей. Непроданные находки остаются в сумке.','trade');}return;}
  const income = sold.reduce((n, i) => n + itemWorth(i), 0) * (profile(h).skill === 'trade' ? 1 : .7);
  s.itemArchive ||= {};s.merchant.items ||= [];
  if(physical)s.merchant.itemOriginalsVersion=1;
  if(physical&&sold.length<candidates.length)h.itemBuyerFull=s.merchant.items.length+sold.length;else delete h.itemBuyerFull;
  for(const item of sold){item.history ||= [];item.history.push({tick:s.tick,text:`Продано торговцу Саве героем ${h.name}.`});if(physical)itemLocation(s,item,{kind:'merchant',id:'merchant'});s.itemArchive[item.id]=physical?JSON.parse(JSON.stringify(item)):item;s.merchant.items.push(item);}
  if(!physical&&s.merchant.items.length>24)s.merchant.items.splice(0,s.merchant.items.length-24);
  h.gold += Math.floor(income); h.bag = h.bag.filter(item=>!sold.includes(item));
  if (sold.length) ctx.log(s, `Сава покупает ${sold.length} находок: ◈${Math.floor(income)}.`, 'trade',h.area,{meaning:lootSaleMeaning(s,sold,Math.floor(income))});
  settleLootResults(s);refreshReserve(s);
}
