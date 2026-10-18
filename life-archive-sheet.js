import {archiveKey} from './life-history.js';
import {semanticEvent,semanticCause} from './event-text.js';
import {deathSheet} from './death-sheet.js';
import {profession} from './content.js';
import {observedAge,ageLabel} from './modules/age.js';
import {elapsedLabel} from './calendar.js';
import {enabled} from './rules.js';
export function archiveSheet(s,escape,lifeName,eventDate){
 if(!s.lives.length)return '<p class="empty">Пока нет сохранённых этапов. Здесь останутся важные повороты и завершённые жизни.</p>';
 return s.lives.slice().reverse().map(l=>{
  const name=l.actorMode==='npc'?l.name:[l.name,l.family].filter(Boolean).join(' ');
  const dateNote=l.deathDateKnown===false?'Точный момент гибели не записан.':l.recordedAt!==undefined?'Сведения получены: '+eventDate({tick:l.recordedAt,area:l.area},true)+'.':'';
  const duration=l.deathDateKnown===false?'длительность не записана':elapsedLabel(l.ended-l.born);
  const portrait=enabled(s,'outfit-appearance')&&l.outfitSnapshot?`<div class="archive-outfit"><canvas width="32" height="34" data-life-portrait="${escape(archiveKey(l))}"></canvas><span>Облик этого этапа${l.outfitSnapshot.garmentName?' · '+escape(l.outfitSnapshot.garmentName):''}</span></div>`:'';
  if(l.outcome==='dead'&&l.deathReport){const recorded=deathSheet(s,l);if(recorded)return `<details class="habit"><summary>† ${escape(name)} · ${lifeName(l)}</summary>${portrait}${recorded}<button data-life-log="${escape(archiveKey(l))}">Подробный журнал этого этапа</button></details>`;}
  return `<details class="habit"><summary>${l.outcome==='dead'?'†':'⌂'} ${escape(name)} · ${lifeName(l)}</summary>${portrait}<p>${escape(profession(l.profession).name)} · ур. ${l.level} · ${duration}${l.startAge===undefined?'':' · '+ageLabel(l.deathDateKnown===false?null:observedAge(l,l.ended))}</p><p>${semanticCause(s,l.cause,l.causeMeaning)}</p>${dateNote?`<p class="empty">${escape(dateNote)}</p>`:''}${l.wealthBasis==='recorded-estate'?`<p>Монеты при получении сведений: ◈${l.wealth}.</p>`:''}<p>Место: ${escape(s.areas[l.area]?.name||'Неизвестно')} · мест ${(l.places||[]).length} · побед ${l.kills||0} · работ ${l.counters?.peacefulWork||0} · выполненных обещаний ${(l.quests||[]).filter(q=>q.status==='done').length}</p><p>${(l.items||[]).map(i=>escape(i.name)).join(', ')||'Вещи не записаны.'}</p><ol class="full-log">${(l.milestones||[]).map(e=>`<li><time>${eventDate(e,true)}</time> ${semanticEvent(s,e,{details:true})}</li>`).join('')}</ol><button data-life-log="${escape(archiveKey(l))}">Подробный журнал этого этапа</button></details>`;
 }).join('');
}

