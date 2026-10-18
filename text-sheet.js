import {dateLabel} from './calendar.js';
import {heldTexts,textWork} from './modules/text-state.js';
export function textHTML(s,escape){
 const p=s.people[s.hero.lineage],items=heldTexts(s,p.id).filter(i=>i.writingMaterial);if(!items.length)return '';
 return '<p class="detail-label">ЗАПИСИ И ЭКЗЕМПЛЯРЫ</p>'+items.map(i=>{
  const w=textWork(s,i),read=w&&p.textCraft?.readings.some(e=>e.content===w.id);
  return `<div class="habit"><b>${escape(i.name)}</b>${w?`<p>Автор: ${escape(s.people[w.author]?.name||'неизвестен')} · редакция ${w.revision} · запись ${escape(dateLabel(s,w.written,w.source.area))}.</p><p>Экземпляр ${escape(i.id)} · ${i.textCopy.condition==='intact'?'цел':'повреждён дождём'}. Владелец: ${escape(s.people[i.textCopy.owner]?.name||i.textCopy.owner)}.</p><p>${read?escape(w.content.text):'Содержание ещё не прочитано этим персонажем. Получить бумагу и узнать содержание — разные действия.'}</p>`:'<p>Чистый лист из настоящего местного сырья. Записи ещё нет.</p>'}</div>`;
 }).join('');
}
