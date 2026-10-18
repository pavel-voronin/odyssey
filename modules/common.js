import { profession, race, BIOMES } from '../content.js';
import { enabled } from '../rules.js';
import {reputationShift} from './diplomacy.js';
import {itemWorking} from './item-condition.js';
export const choose = (s, rng, list) => list[Math.floor(rng(s) * list.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const hasHabit = (h, id) => h.ruleFlags?.identity !== false && h.habits?.includes(id);
export const hasCondition = (h, id) => h.ruleFlags?.body !== false && h.conditions?.some(c => c.id === id);
export const profile = h => h.ruleFlags?.identity === false ? { skill: 'none', attack: 0, stats: [1,1,1,1,1], name: 'Путник', talent: 'Практика' } : profession(h.profession);
export const activePower = (s, enemy, id) => enabled(s, 'enemies') && enemy.powers?.includes(id);
export const stat = (h,id) => (h.ruleFlags?.identity===false?1:h.stats?.[id]||1)+(h.ruleFlags?.lineage===false?0:race(h.race).bonus[id]||0)+(h.ruleFlags?.equipment===false?0:Object.values(h.equipment||{}).reduce((n,i)=>n+(itemWorking(i)&&i.stat===id?i.power:0),0));
export function moral(s, amount) { s.hero.alignment = clamp(s.hero.alignment + amount,-100,100); if(amount>0)s.hero.counters.kindness++;else s.hero.counters.mischief++; }
export function repute(s,id,amount){reputationShift(s,id,amount);}
export const isTown = a => Boolean(BIOMES[a.type]?.town);
export const isRefuge = a => isTown(a)||a.type==='camp';
