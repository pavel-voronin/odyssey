import {feastsOn} from './modules/feast-state.js';
export function feastHTML(s,escape){
 const c=s.localFeast,h=s.hero,p=s.people[h.lineage],e=c?.edition,invited=e?.invited[p.id];if(!c||!invited&&h.area!==c.area)return '';
 if(h.area!==c.area)return `<details><summary>Приглашение на местный праздник</summary><p>${escape(s.people[invited.by].name)} звал в ${escape(s.areas[c.area].name)} вечером 80-го дня. ${escape(invited.reason||'Решение ещё не принято.')}</p></details>`;
 const labels={preparing:'готовят стол',postponed:'ненадолго перенесён',active:'идёт малое застолье',finished:'завершён',cancelled:'отменён'};
 return `<details><summary>Местный праздник — ${escape(s.areas[c.area].name)}</summary><p>Местная дата: вечер 80-го дня года.${feastsOn(s)?'':' Подготовка приостановлена.'}</p>${e?`<p>${escape(e.status==='active'&&e.size==='feast'?'Праздничный стол открыт':labels[e.status])}. Ответственный: ${escape(s.people[e.organizer].name)}.</p>${invited?`<p>Пригласил ${escape(s.people[invited.by].name)}. ${escape(invited.reason||'Решение ещё не принято.')}${invited.paid?' За настоящую помощь или продукт получено 2 монеты.':''}</p>`:''}`:''}</details>`;
}
