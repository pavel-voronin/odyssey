import {dateLabel} from './calendar.js';
export function migrationKnowledgeHTML(s,escape){
 const p=s.people[s.hero.lineage],notes=Object.values(p?.migrationKnowledge?.places||{}).sort((a,b)=>b.received-a.received).slice(0,4);if(!notes.length)return '';
 return '<p class="detail-label">ЗНАКОМЫЕ МЕСТА И ИЗВЕСТИЯ</p>'+notes.map(n=>'<div class="habit"><p>'+escape(n.name)+' · наблюдение '+escape(dateLabel(s,n.observed,n.area))+'.</p><p>'+escape(n.mode==='seen'?'Видел на месте.':'Рассказал: '+(s.people[n.from]?.name||'путник')+' · встреча '+dateLabel(s,n.received))+`</p><p>По этим сведениям: еды ${Math.floor(n.food)}, ${n.work?'были средства и пригодное место для работы':'доступная работа не была подтверждена'}, ${n.habitable?'сохранялось пригодное жильё':'пригодной кровли не осталось'}${n.damage?'; есть повреждённые здания':''}. На месте условия могут измениться.</p></div>`).join('');
}
