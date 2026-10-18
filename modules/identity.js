import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import {rememberPracticalRole} from './skill-branches.js';
import { choose, clamp, hasHabit, hasCondition, profile, activePower, moral, repute } from './common.js';

export function initializeHero(s, h, rng) {
  if (h.profession) return;
  const p = choose(s, rng, PROFESSIONS), d = choose(s, rng, DESTINIES);
  const first = choose(s, rng, HABITS), second = choose(s, rng, HABITS.filter(x => x.id !== first.id));
  h.profession = p.id; h.destiny = { id: d.id, completed: false, progress: 0 };
  h.stats = Object.fromEntries(['might', 'wit', 'guile', 'luck', 'spirit'].map((key, i) => [key, p.stats[i]]));
  h.habits = [first.id, second.id]; h.conditions = []; h.alignment = 0;
  h.bag = []; h.equipment = { weapon: null, armor: null, charm: null }; h.companions = []; h.titles = [];
  h.counters = { relics: 0, kindness: 0, mischief: 0, encounters: 0, companions: 0, treasures: 0 };
  h.hunger = 8; h.reputation = Object.fromEntries(FACTIONS.map(f => [f.id, 0]));
  h.career = { xp: 0, rank: 1, path: ['bard','merchant','alchemist','clockmaker'].includes(p.id)?'peaceful':'adventure' }; h.nextItem = 0;
  if (hasHabit(h, 'reckless')) h.personality.courage = Math.min(.95, h.personality.courage + .18);
  if (hasHabit(h, 'generous')) h.personality.generosity = Math.max(.75, h.personality.generosity);
  if (hasHabit(h, 'homebody')) h.personality.courage = Math.max(.2, h.personality.courage - .12);
}

export function destinyTick(s, ctx) {
  const h = s.hero;
  const d = destiny(h.destiny.id);
  const value = ({ places: h.memory.places.length, gold: h.gold, quests: h.quests.filter(q => q.status === 'done').length, kills: h.kills, relics: h.counters.relics, companions: h.counters.companions, kindness: h.counters.kindness, mischief: h.counters.mischief, age: s.tick - h.born })[d.counter] || 0;
  h.destiny.progress = Math.min(d.target, value);
  if (enabled(s, 'identity') && !h.destiny.completed && value >= d.target) {
    h.destiny.completed = true; h.titles.push(d.reward.replace('Звание: ', '')); ctx.gainXp(s, 20);
    ctx.log(s, `Предназначение «${d.name}» исполнено. ${d.reward}.`, 'destiny');
  }
  return false;
}

export function advanceCareer(s,amount,ctx){
  if(!enabled(s,'identity'))return;const h=s.hero;h.career.xp+=amount;
  while(h.career.xp>=h.career.rank*18){
    h.career.xp-=h.career.rank*18;h.career.rank++;
    const p=profile(h),key=['might','wit','guile','luck','spirit'][p.stats.indexOf(Math.max(...p.stats))];
    h.stats[key]++;ctx.log(s,`${p.name}: мастерство ${h.career.rank}. ${p.talent} становится надёжнее.`,'career');
  }
  h.career.records ||= {};h.career.records[h.profession]={xp:h.career.xp,rank:h.career.rank};
}
export function changeProfession(s,id,ctx,reason){
  const h=s.hero,next=PROFESSIONS.find(p=>p.id===id);if(!next||h.profession===id||h.combat||!enabled(s,'identity'))return false;
  rememberPracticalRole(s,s.people[h.lineage],h);
  h.career.records ||= {};h.career.records[h.profession]={xp:h.career.xp,rank:h.career.rank};
  const from=h.profession;h.profession=id;const saved=h.career.records[id]||{xp:0,rank:1};h.career.xp=saved.xp;h.career.rank=saved.rank;h.career.records[id]={...saved};
  h.career.path=['bard','merchant','alchemist','clockmaker'].includes(id)?'peaceful':'adventure';h.career.lastChange=s.tick;h.career.history ||= [];h.career.history.push({tick:s.tick,from,to:id,reason});
  rememberPracticalRole(s,s.people[h.lineage],h);
  h.goal=null;h.workAfter=s.tick+24;ctx.log(s,`${h.name} меняет профессию: ${next.name}. ${reason} Прежнее мастерство сохранено.`,'choice');return true;
}
