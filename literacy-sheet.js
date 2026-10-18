import {dateLabel} from './calendar.js';
import {literacyCaps,LANGUAGE_NAMES} from './modules/literacy-state.js';
import {textActor} from './modules/text-state.js';
export function literacyHTML(s,escape){
 const p=s.people[s.hero.lineage],l=p?.literacy;if(!l)return '';const caps=literacyCaps(s,p,textActor(s,p.id)),names=list=>list.map(id=>escape(LANGUAGE_NAMES[id]||id)).join(', ')||'пока не освоено';
 const courses=l.courses.map(c=>`<p>${escape(({reading:'Чтение',writing:'Письмо',language:'Понимание языка'})[c.branch])} · ${escape(LANGUAGE_NAMES[c.language]||c.language)}: ${c.steps.length}/3 занятия, уплачено ◈${c.steps.length}.</p>`).join('');
 const reports=l.reports.map(r=>`<p>Пересказ: ${escape(s.people[r.helper]?.name||'читатель')} · ${escape(dateLabel(s,r.at))}${r.partial?' · неполный':''}.<br>${escape(r.known.name)} · наблюдение ${escape(dateLabel(s,r.known.observed,r.known.area))}. ${Object.hasOwn(r.known,'available')?(r.known.available?'По словам читателя, средства на оплату тогда были.':'По словам читателя, средств на оплату тогда не хватало.'):'О наличии оплаты читатель не сообщил.'}</p>`).join('');
 return `<p class="detail-label">ЧТЕНИЕ И ЯЗЫКИ</p><div class="habit"><p>Читает: ${names(caps.reading)}.</p><p>Пишет: ${names(caps.writing)}.</p><p>Понимает речь: ${names(caps.spoken)}.</p>${courses}${reports}${p.textCraft?.readings.length?`<p>Сведения из ${p.textCraft.readings.length} прочитанных записей остаются в памяти.</p>`:''}</div>`;
}
