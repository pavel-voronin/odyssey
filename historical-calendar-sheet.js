import {worldDate,dateLabel} from './calendar.js';
import {periodAt} from './modules/historical-calendar.js';
export function calendarCaption(s,tick=s.tick,area){const d=worldDate(s,tick,area);return [d.periodShort,d.year+' г.'].filter(Boolean).join(' · ');}
export function calendarSceneCaption(s){return worldDate(s).phase+' · '+calendarCaption(s);}
// Pure observation: a world date is common; the cause is not universal news.
export function calendarDetailsHTML(s,escape){
 const d=worldDate(s),p=periodAt(s),entries=s.chronology?.periodHistory?.entries||[];
 const source=q=>{if(!q?.knownStart)return '<p class="empty">Основание прежнего летосчисления не записано.</p>';
 const c=q.cause,person=s.people[s.hero.lineage],cause=c?.id?.startsWith('world-change/')&&s.chronology.worldChanges?.causes['cause/'+c.id.slice(13)],news=Object.values(person?.news?.known||{}),delivered=cause&&news.some(r=>r.source?.kind==='diplomacy-action'&&r.source.id===cause.id&&r.status==='implemented'||r.source?.kind==='clinical-method'&&r.source.id===cause.id&&r.status==='reproduced'),known=c&&(c.knownBy.includes(s.hero.lineage)||c.witnesses.includes(s.hero.lineage)||delivered);
 return '<p class="empty">Начало: '+escape(dateLabel(s,q.startTick,s.areas[q.cause?.area]))+' · '+escape(q.shortName)+'.</p><p class="empty">'+escape(known?q.reason:'Основание периода ещё не известно наблюдателю.')+(known&&q.naming?' Почему так называется: '+escape(q.naming.explanation):'')+(known&&s.areas[c.area]?' Источник: '+escape(s.areas[c.area].name)+'.':'')+'</p>';};
 const shift=d.temporalOffset?'<p class="empty">Временная сцена: '+d.sceneYear+' г. прежнего счёта (сдвиг '+(d.temporalOffset>0?'+':'')+d.temporalOffset+' лет). Общая мировая дата сохраняется.</p>':'';
 return '<section class="calendar-details"><p class="detail-label">ЛЕТОСЧИСЛЕНИЕ МИРА</p><b>'+escape(p?.name||'Прежний счёт')+' · '+d.year+' год</b><p class="empty">'+escape(d.seasonName)+', день '+d.seasonDay+' · день '+d.civilDayOfYear+' гражданского года. В году 80 дней.</p>'+source(p)+shift+(entries.length>1?'<details><summary>Прежние периоды · '+(entries.length-1)+'</summary>'+entries.slice(0,-1).reverse().map(q=>'<div class="habit"><b>'+escape(q.name)+'</b>'+source(q)+'</div>').join('')+'</details>':'')+'</section>';
}

const rendered=new WeakMap();
export function refreshCalendarDetails(panel,html){
 const section=panel.querySelector('.calendar-details');if(!section||rendered.get(section)===html)return false;
 const scroll=panel.scrollTop,details=section.querySelector('details'),open=details?.open,focused=details?.querySelector('summary')===section.ownerDocument.activeElement;
 section.outerHTML=html;const next=panel.querySelector('.calendar-details'),replacement=next.querySelector('details');
 if(replacement){replacement.open=!!open;if(focused)replacement.querySelector('summary').focus({preventScroll:true});}panel.scrollTop=scroll;rendered.set(next,html);return true;
}
