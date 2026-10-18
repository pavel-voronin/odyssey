import {offerInvitation,declineInvitation,startInvitation} from './invitation-rhythm.js';
import {knownArea,revealArea} from '../actor-atlas.js';
import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import { choose, clamp, hasHabit, hasCondition, profile, stat, activePower, moral, repute } from './common.js';
import { addCondition } from './body.js';
import { receiveItem } from './inventory.js';

export function encounter(s, o, ctx) {
  const h = s.hero;
  if (o.resolved) return false;
  o.resolved = true; h.counters.encounters++; h.lastAction = 'talk';
  const skill = profile(h).skill;
  const kind = o.encounter;
  if (kind === 'pilgrim') {
    if ((h.personality.generosity > .5 || hasHabit(h, 'generous')) && h.gold >= 3) {
      h.gold -= 3; moral(s, 6); repute(s, 'lantern', 3);
      addCondition(s, 'inspiration', ctx); ctx.log(s, 'Герой делится тремя монетами с путником. Тот называет безопасную тропу и обещает рассказать о доброте.', 'choice');
      const unexplored = Object.values(s.areas).find(a => !knownArea(s,a)); if (unexplored) revealArea(s,unexplored);
    } else if (skill === 'steal' || h.alignment < -15) {
      const gold = 4 + Math.floor(ctx.random(s) * 7); h.gold += gold; moral(s, -8); repute(s, 'lantern', -4);
      ctx.log(s, `Герой обыскивает сумку путника: ◈${gold}. За монетами остаётся чужое молчание.`, 'choice');
    } else { ctx.log(s, 'Герой выслушивает путника, но оставляет свои последние деньги при себе.', 'choice'); }
  } else if (kind === 'shrine') {
    if (h.alignment < -10 && !hasHabit(h, 'superstitious') || hasHabit(h, 'gambler') && h.gold < 12) {
      h.gold += 18; moral(s, -5); addCondition(s, 'curse', ctx); ctx.log(s, 'Герой берёт монеты с алтаря. Святилище отдаёт золото и запоминает долг.', 'choice');
    } else {
      if (h.gold >= 2) h.gold -= 2;
      h.conditions = h.conditions.filter(c => c.id !== 'curse'); addCondition(s, 'blessing', ctx); moral(s, 3);
      ctx.log(s, 'Герой оставляет дар на алтаре. Дорога отвечает тихим благословением.', 'choice');
    }
  } else if (kind === 'sealed') {
    const safe = skill === 'steal' || hasHabit(h, 'suspicious') || stat(h,'guile') + stat(h,'luck') + ctx.random(s) * 6 > 9;
    if (safe) { h.gold += 9; h.counters.treasures++; receiveItem(s, ctx, 2); ctx.log(s, 'Печать раскрыта, ловушка обезврежена. Внутри чужой запасной план.', 'treasure'); }
    else if (h.personality.courage > .6 || hasHabit(h, 'gambler')) {
      h.hp = Math.max(1, h.hp - 7); addCondition(s, 'poison', ctx); h.gold += 14; ctx.log(s, 'Герой открывает сундук силой. Монеты настоящие. Ядовитая игла — тоже.', 'choice');
    } else ctx.log(s, 'Герой замечает ловушку на сундуке и предпочитает остаться без добычи.', 'choice');
  } else if (kind === 'familiar') {
    if (!enabled(s, 'companions') || h.companions.length >= 3 || !offerInvitation(s,'familiar',o.id)) { ctx.log(s, 'Маленькое существо провожает отряд взглядом и остаётся на знакомой тропе.', 'companion'); }
    else if (stat(h,'spirit') + h.personality.generosity * 4 + ctx.random(s) * 5 > 7 || skill === 'beast') {
      const returning=Boolean(o.existingPet),pet=o.existingPet||{...choose(s,ctx.random,PETS)};Object.assign(pet,{joined:s.tick,uid:pet.uid||`${o.id}-${s.generation}`,hp:pet.hp||24,maxHp:pet.maxHp||24,ethics:0});h.companions.push(pet);delete o.existingPet;h.counters.companions++;
      startInvitation(s,'familiar',o.id);moral(s, 2); ctx.log(s, returning?`${pet.name} ждал прежнего хозяина. Теперь он выбирает другого путника.`:`${pet.name} решает идти следом. Еда, тепло и осторожность теперь нужны не одному.`, 'companion');
    } else {declineInvitation(s,'familiar',o.id);ctx.log(s, 'Существо обнюхивает героя и исчезает. Доверие не покупается одним взглядом.', 'choice');}
  } else if (kind === 'gambler') {
    if ((hasHabit(h, 'gambler') || h.gold < 8 && h.personality.courage > .6) && h.gold >= 2) {
      if (ctx.random(s) + stat(h,'luck') * .035 > .6) { h.gold += 10; addCondition(s, 'inspiration', ctx); ctx.log(s, 'Кости показывают два рассвета. Герой выигрывает десять монет у незнакомца.', 'choice'); }
      else { const lost = Math.min(8, h.gold); h.gold -= lost; ctx.log(s, `Судьба забирает ◈${lost}. Герой запоминает, как выглядит чужая улыбка.`, 'choice'); }
    } else ctx.log(s, 'Герой проходит мимо игры в кости. Сегодня ему нужны надёжные монеты.', 'choice');
  } else if (kind === 'burial') {
    if (skill === 'spirit' || h.personality.generosity > .6) {
      moral(s, 4); repute(s, 'lantern', 2); ctx.gainXp(s, 5); addCondition(s, 'blessing', ctx);
      ctx.log(s, 'Герой даёт безымянной могиле имя. Ночью никто не станет идти за ним.', 'choice');
    } else if (hasHabit(h, 'hoarder') || h.alignment < -10) {
      if (enabled(s, 'equipment')) receiveItem(s, ctx, 2); moral(s, -7); addCondition(s, 'insomnia', ctx); ctx.log(s, 'Герой раскапывает могилу ради находки. Заснуть после этого будет труднее.', 'choice');
    } else ctx.log(s, 'Безымянная могила остаётся нетронутой.', 'choice');
  } else if (kind === 'spring') {
    if (skill === 'healing' || stat(h,'wit') > 3) { h.hp = Math.min(h.maxHp, h.hp + 8); h.hunger = Math.max(0, h.hunger - 15); ctx.log(s, 'Герой узнаёт целебный источник и набирает безопасной воды.', 'heal'); }
    else if (h.hp < h.maxHp * .6 || hasHabit(h, 'reckless')) { h.hp = Math.min(h.maxHp, h.hp + 8); addCondition(s, 'fever', ctx); ctx.log(s, 'Вода возвращает силы, но под вечер начинается лихорадка.', 'choice'); }
    else ctx.log(s, 'Запах воды настораживает. Герой предпочитает потерпеть до поселения.', 'choice');
  } else if (kind === 'cartographer') {
    const unknown = Object.values(s.areas).filter(a => !h.memory.places.includes(a.id));
    for (const a of unknown.slice(0, 3)) revealArea(s,a);
    h.memory.facts.push({ tick: s.tick, text: `Картограф отметил ${unknown.length ? unknown.slice(0, 3).map(a => a.name).join(', ') : 'уже знакомые дороги'}.` });
    ctx.gainXp(s, skill === 'relic' ? 8 : 3); ctx.log(s, 'Картограф дорисовывает тропы на карте. Теперь можно выбирать между несколькими неизвестностями.', 'talk');
  }
  h.goal = null;
  return true;
}

export function tryParley(s, enemy, ctx) {
  const h = s.hero;
  if (!enemy.tags?.includes('human') || enemy.parleyAttempted || !(hasHabit(h, 'mercy') || profile(h).skill === 'parley')) return false;
  enemy.parleyAttempted = true;
  if (stat(h,'spirit') + stat(h,'guile') + ctx.random(s) * 8 > 10) {
    enemy.pacified = true; enemy.resolved = true; moral(s, 5); repute(s, enemy.faction, 2); ctx.gainXp(s, 6);
    h.goal = null; h.lastAction = 'talk'; ctx.log(s, `${enemy.baseName} принимает разговор вместо боя. Дорога становится безопасной без новой могилы.`, 'choice'); return true;
  }
  ctx.log(s, 'Предложение мира отвергнуто. Спокойные слова не всегда меняют чужие планы.', 'talk'); return true;
}
