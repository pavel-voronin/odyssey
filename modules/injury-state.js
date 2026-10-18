import {enabled} from '../rules.js';
import {RACES} from '../content.js';

const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
const emptyLook=Object.freeze([]),looks=new WeakMap();
export function injuryPart(p,kind){
 if(!RACES.some(r=>r.id===p.race)||p.race==='automaton'&&kind!=='burn')return null;
 const part=p.race==='myconid'?'cap':p.race==='automaton'?'plating':'face';
 return p.anatomy?.missing?.includes(part)||Array.isArray(p.anatomy?.parts)&&!p.anatomy.parts.includes(part)?null:part;
}
export function recordLastingInjury(s,p,enemy,{before,after,maximum,area,controller='combat'},ctx){
 if(!enabled(s,'lasting-injuries')||!p?.alive||!enemy?.id||!s.areas[area]||![before,after,maximum].every(Number.isFinite)||maximum<=0||before>maximum||after<=0||after>=before)return null;
 const body=s.actorStates?.[p.id];if(!s.areas[area].objects.includes(enemy)||(body&&body.actorMode!=='npc'?body.hp:p.health)!==after)return null;
 const damage=before-after;if(damage<Math.max(6,Math.ceil(maximum*.22)))return null;
 const kind=enabled(s,'elements')&&enemy.element==='fire'?'burn':['bandit','skeleton','wolf','rat','dragon'].includes(enemy.species)||enemy.damageType==='cut'?'scar':null;
 const part=kind&&injuryPart(p,kind),id=`injury/${p.id}/${s.tick}/${enemy.id}`;
 if(!part||hash(s.seed+'/'+id)%12!==0||p.trauma?.marks.some(m=>m.id===id||m.kind===kind&&m.part===part))return null;
 const mark={id,tick:s.tick,race:p.race,kind,part,cause:{enemy:enemy.id,name:enemy.name||enemy.baseName||enemy.id,area,before,after,damage,maximum,controller}};
 (p.trauma ||= {version:1,marks:[]}).marks.push(mark);
 ctx?.log?.(s,`${p.name}: ${kind==='burn'?'сильный ожог оставляет постоянный след':'режущий удар оставляет постоянный шрам'}. Причина — ${mark.cause.name}.`,'condition');return mark;
}
export function injuryLook(p){const t=p?.trauma;if(!t?.marks.length)return emptyLook;const old=looks.get(t);if(old?.last===t.marks.at(-1)&&old.length===t.marks.length)return old.value;const value=t.marks.map(({kind,part})=>Object.freeze({kind,part}));looks.set(t,{last:t.marks.at(-1),length:t.marks.length,value:Object.freeze(value)});return value;}
export function injurySummary(p){return (p?.trauma?.marks||[]).map(m=>`${m.kind==='burn'?'Ожог':'Шрам'} (${({face:'лицо',cap:'шляпка',plating:'обшивка'})[m.part]}): ${m.cause.name}`).join('; ');}
