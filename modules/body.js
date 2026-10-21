import {consumedFood,wantsFood} from './nutrition-state.js';
import {restoreHealth} from './fresh-reply.js';
import {biologicalDose,ordinaryRecovery} from './biology.js';
import {boneBody} from './anatomy-state.js';
import {knownArea} from '../actor-atlas.js';
import {partyAvailable} from './party-needs.js';
import {foodPrice} from './prices.js';
import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import { choose, clamp, hasHabit, hasCondition, profile, activePower, moral, repute, isTown } from './common.js';
import { foodPlan,buyFood,clinicTreatment,serviceReachable } from './supply.js';
import { enchantedRest } from './enchantments.js';
import {knownServiceAllows,denyService} from './service-access.js';

export function addCondition(s, id, ctx, duration = CONDITIONS[id].duration) {
  if (!enabled(s, 'body')) return;
  const h = s.hero, existing = h.conditions.find(c => c.id === id);
  if (existing) { existing.until = Math.max(existing.until, s.tick + duration); return; }
  h.conditions.push({ id, until: s.tick + duration, since: s.tick });
  ctx.log(s, `${CONDITIONS[id].name}: ${CONDITIONS[id].text}`, 'condition');
}

export function bodyTick(s, ctx) {
  const h = s.hero;
  const dose=biologicalDose(s,h);if(!dose.fresh)return !h.alive;
  for (const condition of enabled(s, 'body') ? [...h.conditions] : []) {
    if (s.tick >= condition.until) {
      h.conditions = h.conditions.filter(c => c !== condition);
      ctx.log(s, `${CONDITIONS[condition.id].name} проходит.`, 'heal'); continue;
    }
    if (!boneBody(s.people[h.lineage])&&condition.id === 'poison' && s.tick % (enabled(s,'lineage')&&['dwarf','revenant'].includes(h.race)?16:8) === 0) {
      const hpBefore=h.hp;h.hp -= 1; h.lastAction = 'hurt';
      if (h.hp <= 0) { ctx.die(s, { name: 'Отравление' },{kind:'poison',damage:1,hpBefore}); return true; }
    }
    if (!boneBody(s.people[h.lineage])&&condition.id === 'fever') h.energy = Math.max(0, h.energy - (enabled(s,'lineage')&&h.race==='myconid'?.03:.18));
  }
  if (dose.damage||dose.ceiling!==undefined&&h.hp>dose.ceiling) {
    const hpBefore=h.hp;h.hp=Math.min(h.hp-dose.damage,dose.ceiling);
    if (h.hp <= 0) { ctx.die(s, { name: 'Голод' },{kind:'starvation',damage:hpBefore-h.hp,hpBefore}); return true; }
  }
  return false;
}

export function traitsPlan(s, ctx) {
  const h = s.hero;
  if (wantsFood(s,h) && h.goal?.kind !== 'provision') {
    if(foodPlan(s,ctx))return true;
    const town = ctx.closest(s, a => knownArea(s,a) && isTown(a));
    if (town) { ctx.goal(s, 'provision', town.id, 42, 'Найти еду в поселении', `Голод ${Math.round(h.hunger)} / 100. Пустой желудок важнее дальнего пути.`); return true; }
  }
  if (h.conditions.some(c => ['fever', 'curse'].includes(c.id)||c.id==='poison'&&!enabled(s,'poison-care')) && h.hp < h.maxHp * .8 && !['rest', 'provision'].includes(h.goal?.kind)) {
    const town = ctx.closest(s, a => knownArea(s,a) && isTown(a)&&knownServiceAllows(s,a,'clinic',{units:2})&&(!enabled(s,'supply')||a.civic.medicine>=2&&serviceReachable(s,a,68,ctx)));
    if (town) { ctx.goal(s, 'rest', town.id, 68, 'Найти лекаря', 'Болезнь не исчезнет от храбрости. Герой помнит, где лечат путников.'); return true; }
  }
  return false;
}

export function provisions(s, ctx) {
  if(buyFood(s,ctx))return;
  if(denyService(s,ctx,'food')){s.hero.goal=null;return;}
  const h = s.hero, price = foodPrice(s),stock=s.areas[h.area]?.civic;if(!stock||stock.food<4){h.goal=null;h.reason='Нет настоящей еды в кладовой.';return;}stock.food-=4;
  if (h.gold >= price) { h.gold -= price; const civic=s.areas[h.area]?.civic;if(enabled(s,'service-access')&&civic)civic.treasury=(Number.isFinite(civic.treasury)?civic.treasury:0)+price;ctx.log(s, 'Горячая еда, хлеб в дорогу. Голод больше не определяет маршрут.', 'food'); }
  else { h.energy = Math.max(0, h.energy - 5); moral(s, 1); ctx.log(s, 'За помощь на кухне герой получает еду. Без денег тоже можно выжить.', 'food'); }
  consumedFood(s,h,{portions:4,source:'kitchen-service'}); h.lastAction = 'eat'; h.goal = null;
  for (const c of h.companions) c.loyalty = Math.min(100, c.loyalty + 4);
}

export function traitsRest(s, ctx) {
  const h = s.hero, a = s.areas[h.area];
  if (enabled(s, 'body') && isTown(a)) {
    const ailments = h.conditions.filter(c => !['blessing', 'inspiration'].includes(c.id));
    if (ailments.length&&!clinicTreatment(s,ctx)) { h.conditions = h.conditions.filter(c => ['blessing', 'inspiration'].includes(c.id)); ctx.log(s, 'Лекарь снимает жар, лечит отравление и стирает проклятую печать.', 'heal'); }
  }
  if (hasHabit(h, 'tea') && h.inventory.herbs && !h.goal?.tea) {
    h.inventory.herbs--; h.energy = Math.min(100, h.energy + 8); restoreHealth(s,4); h.conditions = h.conditions.filter(c => c.id !== 'insomnia');
    if (h.goal) h.goal.tea = true; ctx.log(s, 'Травяной чай у огня. Старый ритуал помогает телу и мыслям.', 'rest');
  }
  if (hasCondition(h, 'insomnia')) h.energy = Math.max(0, h.energy - 7);
  const healing = (enabled(s, 'companions') ? h.companions.filter(c=>partyAvailable(s,c)).reduce((n, c) => n + c.healing, 0) : 0) + (profile(h).skill === 'healing' ? 2 : 0);
  restoreHealth(s,ordinaryRecovery(s,h,healing));
  enchantedRest(s,ctx);
}
