import {materialContracts} from './modules/material-delivery-state.js';
import {dateLabel} from './calendar.js';
const labels={quoted:'Предложение, ответ ещё не получен',outward:'Идёт к известному источнику',collecting:'Добывает конечную партию',returning:'Везёт сырьё заказчику',declined:'Не договорились',completed:'Партия принята',partial:'Принята часть партии',failed:'Источник не дал материала',unresolved:'Результат не подтверждён'};
export function materialDeliveriesHTML(s,p,escape){
 const orders=materialContracts(s,p?.id).slice(-8).reverse();if(!orders.length)return '';
 return `<section class="material-deliveries"><p class="detail-label">ДОГОВОРЁННОСТИ О СЫРЬЕ</p>${orders.map(o=>{
  const customer=o.client===p.id,other=s.people[customer?o.carrier:o.client],pending=['quoted','outward','collecting','returning'].includes(o.status),status=customer&&pending&&o.status!=='quoted'?'Ожидает заказанное сырьё':labels[o.status]||'Доставка';
  return `<div class="habit"><b>${escape(status)}</b><p>${customer?'Исполнитель':'Заказчик'}: ${escape(other?.name||'Знакомый путник')}</p><p>${escape(o.sourceName)} → ${escape(s.areas[o.home]?.name||'Названная мастерская')} · сырьё: ${o.delivered} / ${o.quantity}</p><p>Плата <b>◈${o.fee}</b> · уже передано <b>◈${o.paid}</b>${o.escrow?` · отложено <b>◈${o.escrow}</b>`:''}${o.advanceDebt?` · неподтверждённый аванс <b>◈${o.advanceDebt}</b>`:''}</p>${pending?`<p class="empty">Срок: ${escape(dateLabel(s,o.deadline,s.areas[o.home]))} ${o.status==='quoted'?'Аванс ещё не передан.':'Аванс уже у исполнителя.'}</p>`:''}<p>${escape(o.outcome||o.reason)}</p></div>`;
 }).join('')}</section>`;
}
export function deliveryCargoHTML(s,p,escape){
 const c=p?.materialCargo;if(!c)return '';
 return `<section class="delivery-cargo"><p class="detail-label">ГРУЗ ПО ДОГОВОРЁННОСТИ</p><div class="habit"><b>Сырьё для мастерской · ${c.quantity}</b><p>Владелец: ${escape(s.people[c.owner]?.name||'Заказчик')}. Носитель: ${escape(p.name)}.</p><p class="empty">Источник: ${escape(s.areas[c.source]?.name||'Ранее посещённое место')}. Партия пока у носителя и ещё не принята заказчиком.</p></div></section>`;
}
