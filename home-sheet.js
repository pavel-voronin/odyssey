import {homeAdmission} from './modules/home-place.js';
import {itemUnits} from './modules/container-state.js';
export function homeHTML(s,escape){
 const rooms=Object.values(s.areas).filter(a=>a.home?.tenant===s.hero.lineage);if(!rooms.length)return '';
 return '<p class="detail-label">ЖИЛАЯ КОМНАТА</p>'+rooms.map(a=>{
  const h=a.home,chest=a.objects.find(o=>o.id===h.chest),items=chest?.items||[],access=homeAdmission(s,a,s.hero.lineage);
  return `<div class="habit"><b>${escape(a.name)}</b><p>${h.state==='building'?`Оборудование: осталось ${h.remaining} действия.`:h.configuration==='bench'?'Рабочий стол и личный сундук':'Очаг с котелком и личный сундук'} · ${a.residence?(access?'право на свой дом действует':'оборудование пока недоступно'):(access?'оплаченный доступ действует':'для доступа нужна действующая аренда')}</p><p>Хозяин: ${escape(s.people[h.owner]?.name||'неизвестен')}. Право собственности остаётся у него; ежедневного дохода нет.</p><p>Сундук ${items.reduce((n,i)=>n+itemUnits(i),0)}/${chest?.capacity||12}: ${items.map(i=>escape(i.name)).join(', ')||'пуст'}. Эти вещи находятся здесь, в дорожной сумке их нет.</p></div>`;
 }).join('');
}
