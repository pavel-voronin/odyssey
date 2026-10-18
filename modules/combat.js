import {cacheItems} from './item-originals.js';
import {partyAvailable} from './party-needs.js';
import {aggregatePartyAttack} from './party-combat-state.js';
import {braceDamage} from './brace.js';
import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import { choose, clamp, hasHabit, hasCondition, profile, stat, activePower, moral, repute } from './common.js';
import { addCondition } from './body.js';
import { itemBonus, receiveItem } from './inventory.js';
import { racialDefense } from './lineage.js';
import { advanceCareer } from './identity.js';
import { enchantedAttack,enchantedDefense,enchantedVictory } from './enchantments.js';
import { enemyDamage } from './adversaries.js';
import {armorCoverage} from './armor.js';
import {styleDamage,weaponStylesOn} from './weapon-styles.js';

export function combatAttack(s, enemy, raw, ctx,style=null) {
  const h = s.hero, skill = profile(h).skill;
  let damage = raw + profile(h).attack + itemBonus(h, 'attack') + (enabled(s, 'identity') ? Math.floor(stat(h,'might') / 3) : 0);
  if (skill === 'magic') damage += Math.floor(stat(h,'wit') / 2) + itemBonus(h, 'magic');
  if (skill === 'beast' && enemy.tags?.includes('beast')) damage += 3;
  if (skill === 'spirit' && enemy.tags?.includes('spirit')) damage += 4;
  if (hasCondition(h, 'inspiration')) damage += 2;
  if (hasCondition(h, 'curse')) damage = Math.max(1, damage - 2);
  damage=styleDamage(damage,weaponStylesOn(s)?style:null);
  damage += aggregatePartyAttack(s);
  if (activePower(s, enemy, 'armored') && skill !== 'magic') damage = Math.max(1, damage - 3);
  if (activePower(s, enemy, 'temporal') && skill !== 'time' && ctx.random(s) < .22) {
    ctx.log(s, 'Противник прячется между мгновениями. Удар не находит цели.', 'combat'); damage = 0;
  }
  return damage===0?0:enemyDamage(s,enemy,enchantedAttack(s,enemy,damage,ctx),'physical',ctx);
}

export function enemyRecovery(s,enemy,magical){if(activePower(s,enemy,'regrowth')&&!magical)enemy.hp=Math.min(enemy.maxHp,enemy.hp+2);}
export function combatProtection(s,enemy,raw,{blessed=hasCondition(s.hero,'blessing'),enemyHp=enemy.hp}={}){
  const h=s.hero;let received=Math.max(1,raw-itemBonus(h,'defense')-(blessed?1:0));
  if(activePower(s,enemy,'fury')&&enemyHp<enemy.maxHp*.35)received+=3;
  if(activePower(s,enemy,'swarm'))received+=Math.max(0,2-armorCoverage(h));
  return received;
}
export function combatResponse(s, enemy, raw, ctx) {
  const h = s.hero;
  let received = combatProtection(s,enemy,raw);
  enemyRecovery(s,enemy,h.lastAction!=='windup'&&(profile(h).skill==='magic'||h.lastAction==='spell'));
  received=racialDefense(s,enchantedDefense(s,received,ctx),ctx);
  received=braceDamage(s,enemy,received);
  if (activePower(s, enemy, 'vampire')) enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.ceil(received / 3));
  if (activePower(s, enemy, 'thief') && h.gold > 0) { const gold = Math.min(h.gold, 2); h.gold -= gold; enemy.stolen += gold; }
  for (const [power, condition] of [['venom', 'poison'], ['frost', 'frost'], ['hex', 'curse'], ['spore', 'fever']]) {
    if (activePower(s, enemy, power) && ctx.random(s) < .18) addCondition(s, condition, ctx);
  }
  return received;
}

export function afterVictory(s, enemy, ctx) {
  const h = s.hero;
  if(enemy.items?.length){cacheItems(s,enemy.items,{area:h.area,x:enemy.x,leftBy:h.lineage,name:'Перехваченная поклажа'});enemy.items=[];}
  if (enemy.stolen) { h.gold += enemy.stolen; enemy.stolen = 0; }
  advanceCareer(s,3,ctx);
  enchantedVictory(s,enemy,ctx);
  if (enabled(s, 'equipment') && (ctx.random(s) < .38 || hasHabit(h, 'collector'))) receiveItem(s, ctx);
}
