import {physicalDistance} from './geometry.js';
// Actual nearby objects only. The archive never supplies an available item.
export function itemCustodyHTML(s,escape){
 const h=s.hero,a=s.areas[h.area];if(!a||h.transit)return '';
 const caches=a.objects.filter(o=>!o.taken&&o.items?.length&&physicalDistance(a,h.x,o.x)<=18&&(o.itemOriginals===1||o.items.some(i=>i.physical?.version===1)));
 const warning=h.itemBuyerFull?'<p class="empty">Сава не смог принять все вещи: его склад заполнен. Непроданное осталось в сумке.</p>':'';
 if(!caches.length)return warning;
 return warning+'<p class="detail-label">ПОКЛАЖА РЯДОМ · ВНЕ СУМКИ</p>'+caches.map(o=>`<div class="habit"><b>${escape(o.name)}</b><p>${o.items.map(i=>escape(i.name)).join(' · ')}</p><p>Осталось вещей: ${o.items.length}. Для взятия нужно место в сумке.</p></div>`).join('');
}
