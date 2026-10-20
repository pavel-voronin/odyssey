import {YEAR_TICKS} from '../calendar-units.js';
import {personAgeAt,ageLimits} from './age-state.js';

// Adult age at the start of observation, not simulated prehistory or a new birth.
const adults={human:[18,28],elf:[45,76],dwarf:[30,51],goblin:[16,20],orc:[18,23],halfling:[22,34],fae:[25,76],dragonkin:[20,36],automaton:[3,28],myconid:[8,23],revenant:[24,47],gnome:[25,46]};
function initialAge(s,h){
  let value=s.seed>>>0;for(const c of `adult:${h.lineage}:${h.born}`)value=Math.imul(value^c.charCodeAt(0),16777619)>>>0;
  const [min,range]=adults[h.race]||adults.human;return min+value%range;
}
export function initializeAge(s,h){
  const p=s.people?.[h.lineage];
  if(h.actorMode==='npc'&&!p?.ageOrigin){h.startAge=null;return;}
  h.startAge ??= p?.ageOrigin?.at===h.born?p.ageOrigin.years:initialAge(s,h);
  if(p&&!p.ageOrigin)p.ageOrigin={at:h.born,years:h.startAge};
}
export function observedAge(h,tick){
  if(!Number.isFinite(h.startAge))return null;
  return h.startAge+Math.floor(Math.max(0,(!h.alive&&Number.isFinite(h.life?.endedAt)?Math.min(tick,h.life.endedAt):tick)-h.born)/YEAR_TICKS);
}
export function personAge(s,p){return personAgeAt(p,s.tick);}
export function ageLabel(age){
  if(age===null)return 'возраст неизвестен';
  const last=age%10,teen=age%100;return `${age} ${teen>=11&&teen<=14?'лет':last===1?'год':last>=2&&last<=4?'года':'лет'}`;
}

export function ageStage(p,tick){const n=personAgeAt(p,tick);if(n===null)return 'Возрастная ступень не записана';const [adult,old,terminal]=ageLimits(p);return n<adult?'Ребёнок: взрослый труд и родительство недоступны':n<old?'Взрослый':n<terminal?'Пожилой: старение тела продолжается':'Предельный возраст: каждый прожитый день истощает тело';}
