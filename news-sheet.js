import {dateLabel} from './calendar.js';
export function newsHTML(s,escape){
 const notes=Object.values(s.people[s.hero.lineage]?.news?.known||{}).sort((a,b)=>b.heardAt-a.heardAt).slice(0,4);if(!notes.length)return '';
 return '<p class="detail-label">ИЗВЕСТИЯ О ЛЮДЯХ</p>'+notes.map(r=>{
  const source=r.mode==='witness'?'Личный очевидец':('Рассказал: '+(s.people[r.via.at(-1).from]?.name||'путник'));
  const text=r.status==='helped'?r.actor.name+' передал лекарство '+r.patient.name+'.':r.actor.name+' согласился помочь '+r.patient.name+'. Исход помощи ещё неизвестен.';
  return '<div class="habit"><p>'+escape(text)+'</p><p>'+escape(source)+' · узнал '+escape(dateLabel(s,r.heardAt))+'.<br>Событие: '+escape(s.areas[r.area]?.name||r.area)+' · '+escape(dateLabel(s,r.occurred,r.area))+'.</p>'+(r.mode==='reported'?'<p>Сведения со слов человека; собственного наблюдения события не было.</p>':'')+'</div>';
 }).join('');
}
