import {dateLabel} from './calendar.js';
export function newsHTML(s,escape){
 const notes=Object.values(s.people[s.hero.lineage]?.news?.known||{}).sort((a,b)=>b.heardAt-a.heardAt).slice(0,4);if(!notes.length)return '';
 return '<p class="detail-label">ИЗВЕСТИЯ О ЛЮДЯХ</p>'+notes.map(r=>{
  const source=r.mode==='witness'?'Личный очевидец':('Рассказал: '+(s.people[r.via.at(-1).from]?.name||'путник'));
  const housing=r.source?.kind==='housing-action'?r.housing:null,people=r.actor.name+' и '+r.patient.name;
  const diplomacy=r.source?.kind==='diplomacy-action'?r.diplomacy:null;
  const political=diplomacy?(r.status==='proposed'?r.actor.name+' сообщил о личных расходах на границе.':r.status==='accepted'?r.actor.name+' согласился обсуждать общий въезд; исполнение ещё не подтверждено.':r.status==='vetoed'?r.actor.name+' отказал в общем въезде.':r.status==='implemented'?'Служитель ввёл общее право въезда без прежней пошлины.':r.actor.name+' передал две собственные порции для переговоров.')+' Стороны: '+diplomacy.fromName+' и '+diplomacy.toName+'.':null;
  const administration=r.administration?(r.administration.phase==='death'?r.patient.name+' умер; административная должность пока не передана.':r.actor.name+' принимает административную должность после '+r.patient.name+'. Будущий въезд: '+r.administration.law.fee+' золотых; прежние оплаченные права сохраняются.'):null;
  const clinical=r.clinical?(r.clinical.phase==='publication'?r.actor.name+' записал проверенный способ очищения от жара. Книгу ещё нужно понять и освоить.':r.actor.name+' воспроизвёл очищение от жара; '+r.patient.name+' действительно вернулся к работе без расхода лекарств на эту пробу.'):null;
  const text=clinical||administration||political|| (housing?(housing.mode==='help'?'Ночлег на день без платы. Участники: '+people+'.':housing.mode==='lease'?'Место на день за ◈2. Договорились: '+people+'.':housing.mode==='claim'?'Претензия на занятое место. Участники: '+people+'.':housing.reason==='capacity'?'В общем доме нет свободных мест. Участники: '+people+'.':housing.reason==='poor'?'Договор о ночлеге не заключён: не хватает платы.':housing.reason==='word'?'Соглашение о ночлеге не подтверждено со свидетелем.':'Общий дом пока недоступен.'):r.status==='helped'?r.actor.name+' передал лекарство '+r.patient.name+'.':r.actor.name+' согласился помочь '+r.patient.name+'. Исход помощи ещё неизвестен.');
  return '<div class="habit"><p>'+escape(text)+'</p><p>'+escape(source)+' · узнал '+escape(dateLabel(s,r.heardAt))+'.<br>Событие: '+escape(s.areas[r.area]?.name||r.area)+' · '+escape(dateLabel(s,r.occurred,r.area))+'.</p>'+(r.mode==='reported'?'<p>Сведения со слов человека; собственного наблюдения события не было.</p>':'')+'</div>';
 }).join('');
}
