import {collectionStatus,collectionsOn,collectionEmergency} from './modules/collection-state.js';
export function collectionHTML(s,escape){
 const v=collectionStatus(s);if(!v)return '';const c=v.collection;
 return `<div class="habit"><b>Работы ${escape(c.masterName)} · ${v.count}/${v.target}</b><p>${v.complete?'Собрание сейчас полное.':v.count?'Ещё не все разные работы найдены.':'Экземпляров при себе не осталось.'} ${c.showWish?'Хочется однажды показать эти вещи другим.':''} ${collectionsOn(s)?'':'Интерес сохранён; механика приостановлена.'}</p><p>Начало интереса: «${escape(c.source.name)}».</p>${v.representatives.map(i=>`<p>• ${escape(i.name)}</p>`).join('')}${v.surplus.length?`<p>Повторные и лишние работы: ${v.surplus.length}. Можно предложить обмен при встрече.</p>`:''}${collectionEmergency(s)?'<p>Пайков и монет не осталось. Он готов расстаться с работой ради еды.</p>':''}${c.lastOffer?.reason?`<p>Последний ответ: ${escape(c.lastOffer.reason)}</p>`:''}</div>`;
}
