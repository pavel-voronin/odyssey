import {weatherAt} from './weather.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {ENEMY_SPECIES} from '../content.js';
import {dateLabel} from '../calendar.js';

const on=s=>enabled(s,'bestiary'),speciesKnown=id=>ENEMY_SPECIES.some(e=>e.id===id);
const memory=p=>(p.bestiary ||= {version:1,species:[],studyAfter:0});
function body(s,p){const h=selfDrivenActor(s,p?.id)?s.actorStates[p.id]:null;return h?(h.transit?null:{area:h.area,x:h.x}):p&&localContact(s,p.id,p.area);}
function entry(p,species){const m=memory(p);let e=m.species.find(e=>e.id===species);if(!e){e={id:species,traces:[],encounters:[]};m.species.push(e);if(m.species.length>16)m.species.shift();}return e;}
function visible(s,p,e){const b=body(s,p);return on(s)&&p?.alive&&!p.needs?.sleeping&&b&&s.areas[b.area].objects.includes(e)&&e.kind==='enemy'&&e.alive&&!e.resolved&&!e.hidden&&speciesKnown(e.species)&&physicalDistance(s.areas[b.area],b.x,e.x)<=30?b:null;}
export function creatureTrace(s,a,e,oldX){
 if(!on(s)||s.tick%24!==0||e.hidden||!e.alive||!speciesKnown(e.species)||!a.objects.includes(e)||e.x===oldX)return null;
 const id='creature-trace/'+e.id,group=a.objects.some(o=>o!==e&&o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&o.species===e.species&&physicalDistance(a,o.x,e.x)<=15);
 let trace=a.objects.find(o=>o.id===id&&o.kind==='creatureTrace');if(!trace){trace={id,kind:'creatureTrace',name:'Следы существа',x:oldX};a.objects.push(trace);}
 trace.x=oldX;trace.trace={direction:Math.sign(e.x-oldX),wet:['rain','storm'].includes(weatherAt(s,a).id),version:1,enemy:e.id,species:e.species,habitat:a.type,group,created:s.tick,expires:s.tick+240};return trace;
}
export function observeBestiaryTraces(s,p,ctx){
 const b=p&&body(s,p);if(!on(s)||!p?.alive||p.needs?.sleeping||!b)return;
 const a=s.areas[b.area];for(const o of a.objects){if(o.kind!=='creatureTrace'||o.trace.expires<=s.tick||physicalDistance(a,b.x,o.x)>12)continue;
  const e=entry(p,o.trace.species),old=e.traces.find(t=>t.id===o.id);if(old&&old.created>=o.trace.created)continue;
  const record={id:o.id,created:o.trace.created,seen:s.tick,area:a.id,habitat:o.trace.habitat,group:o.trace.group,witness:p.id};if(old)Object.assign(old,record);else{e.traces.push(record);if(e.traces.length>4)e.traces.shift();}
  if(p.id===s.hero.lineage)ctx?.log?.(s,`На земле видны ${record.group?'перекрывающиеся следы нескольких существ':'следы существа'}: ${ENEMY_SPECIES.find(k=>k.id===e.id).name}. Это запись о следах, а не о скрытых свойствах их хозяина.`,'knowledge');
 }
}
export function encounterBestiary(s,p,e){
 const b=visible(s,p,e);if(!b)return null;
 const a=s.areas[b.area],record=entry(p,e.species),pack=a.objects.some(o=>o!==e&&visible(s,p,o)&&o.species===e.species&&physicalDistance(a,o.x,e.x)<=15),charged=enabled(s,'tactics')&&e.tactic==='charged'&&e.battle?.intent==='strike';
 let old=record.encounters.find(r=>r.enemy===e.id);
 if(old?.witness===p.id){old.lastSeen=s.tick;old.pack ||= pack;old.charged ||= charged;return old;}
 const note={enemy:e.id,tick:s.tick,lastSeen:s.tick,area:a.id,habitat:a.type,pack,charged,witness:p.id};
 if(old){delete old.via;delete old.received;Object.assign(old,note);}else{record.encounters.push(note);if(record.encounters.length>4)record.encounters.shift();}return note;
}
export function bestiaryCaution(s,e){
 const h=s.hero,p=s.people[h.lineage],b=visible(s,p,e),known=p.bestiary?.species.find(k=>k.id===e.species);if(!b||!known||!known.traces.some(t=>t.habitat===s.areas[b.area].type))return null;
 const meetings=known.encounters.filter(r=>r.habitat===s.areas[b.area].type),pack=meetings.filter(r=>r.pack).length>=2,charge=meetings.filter(r=>r.charged).length>=2;if(!pack&&!charge)return null;
 const last=Math.max(...meetings.map(r=>r.lastSeen)),age=s.tick-last,reason=`${age>480?'По давним записям':'По двум прежним встречам'} этот вид здесь ${pack?'может ходить стаей':'может готовить сильный разгон'}. Это склонность, не знание свойств нынешнего противника.`;
 return {avoid:h.personality.courage<.65&&(h.energy<60||h.hp<h.maxHp*.9),pack,charge,age,uncertain:true,reason};
}
export function studyBestiaryPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!on(s)||h.combat||h.transit||!['ranger','scholar'].includes(h.profession)||h.energy<35||h.hunger>60||(p.bestiary?.studyAfter||0)>s.tick)return false;
 const a=s.areas[h.area],target=a.objects.find(e=>visible(s,p,e)&&physicalDistance(a,h.x,e.x)>12&&!p.bestiary?.species.find(k=>k.id===e.species)?.encounters.some(r=>r.enemy===e.id&&r.witness===p.id));if(!target)return false;
 ctx.goal(s,'studyCreature',h.area,h.x,'Понаблюдать за существом','Он сохраняет дистанцию и тратит время на проверяемое наблюдение вместо немедленного боя.',{enemy:target.id});return true;
}
export function studyBestiaryAction(s,ctx){const h=s.hero,p=s.people[h.lineage],g=h.goal;if(g?.kind!=='studyCreature')return false;const e=s.areas[h.area].objects.find(e=>e.id===g.enemy);h.goal=null;if(!visible(s,p,e)||physicalDistance(s.areas[h.area],h.x,e.x)<=12||h.energy<2)return false;encounterBestiary(s,p,e);h.energy-=2;memory(p).studyAfter=s.tick+48;h.lastAction='study';ctx.log(s,`${h.name} наблюдает ${e.baseName||e.name}. Запись касается этого экземпляра и увиденного поведения; чужие мутации и уязвимости остаются неизвестны.`,'knowledge');return true;}
export function shareBestiary(s,from,to){
 const p=s.people[from],q=s.people[to],a=p&&body(s,p),b=q&&body(s,q);if(!on(s)||!p?.alive||!q?.alive||p.needs?.sleeping||q.needs?.sleeping||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12)return false;
 let changed=false;for(const observed of p.bestiary?.species||[]){const e=entry(q,observed.id);for(const field of ['traces','encounters'])for(const note of observed[field]){
   const key=field==='traces'?'id':'enemy';if(e[field].some(n=>n[key]===note[key]))continue;e[field].push({...structuredClone(note),via:from,received:s.tick});if(e[field].length>4)e[field].shift();changed=true;
  }}return changed;
}
export function bestiaryHTML(s,escape){const rows=s.people[s.hero.lineage]?.bestiary?.species||[];if(!rows.length)return '';return '<p class="detail-label">БЕСТИАРИЙ · ЛИЧНЫЕ НАБЛЮДЕНИЯ</p>'+rows.map(e=>{const last=e.encounters.slice().sort((a,b)=>b.lastSeen-a.lastSeen)[0];return `<div class="habit"><b>${escape(ENEMY_SPECIES.find(k=>k.id===e.id)?.name||e.id)}</b><p>${e.traces.length} записей следов · ${e.encounters.length} разных встреч. ${e.encounters.filter(r=>r.pack).length>=2?'Дважды замечен рядом с сородичами. ':''}${e.encounters.filter(r=>r.charged).length>=2?'Дважды замечена подготовка разгона. ':''}Последняя встреча: ${last?escape(dateLabel(s,last.lastSeen,s.areas[last.area])):'не записана'}.</p></div>`;}).join('');}
