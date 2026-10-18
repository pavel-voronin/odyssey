import {SEQUENCE_NAMES} from './modules/sequence-memory.js';
import {dateLabel} from './calendar.js';
export function sequenceHTML(s,escape){
 const notes=Object.values(s.people[s.hero.lineage]?.mechanisms?.sequences||{});if(!notes.length)return '';
 return '<p class="detail-label">ЗНАКОМЫЕ МЕХАНИЗМЫ</p>'+notes.map(n=>'<div class="habit"><p>'+escape(n.name)+'</p><p>Изучено частей: '+n.parts.length+'/3. '+(n.hint?escape(n.hint.order.map(t=>SEQUENCE_NAMES[t]).join(' → '))+(n.hint.complete?'':' · неполный порядок')+'<br>'+escape(({ 'observed-components':'Личный осмотр','heard-witness':'Со слов свидетеля','understood-text':'Из понятной записки','heard-text-reader':'Со слов читателя','performed-operation':'Применён лично','witnessed-operation':'Увидел в работе'})[n.hint.source.kind]||'Личные сведения')+' · '+escape(dateLabel(s,n.hint.learnedAt))+(n.hint.verified?' · проверен в действии':' · ещё не проверен'):'Порядок пока неизвестен.')+'</p>'+(n.failures.length?'<p>Неудачных подсказок: '+n.failures.length+'. Их точное повторение исключено.</p>':'')+'</div>').join('');
}
