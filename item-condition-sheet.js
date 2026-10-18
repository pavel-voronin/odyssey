import {itemWorking,itemWorth} from './modules/item-condition.js';
export function itemConditionHTML(item,escape){
 const d=item.durability;if(!d)return '';
 return `<p>${itemWorking(item)?'Исправность':'Сломано'}: ${escape(d.current)} / ${escape(d.max)} · ремонтов ${escape(d.repairs)}${itemWorking(item)?'':'. Рабочий эффект и печать не действуют; сам предмет сохранён.'}</p>`;
}
export function itemRepairHTML(s,escape){
 const q=s.people[s.hero.lineage]?.itemRepair,o=q&&(q.orders[q.active]||Object.values(q.orders).at(-1));if(!o)return '';
 const status={material:'Мастер оплачен. Нужен один настоящий материал.',working:`Работа: ${o.progress} / ${o.required}. Материал и оплата сохранены.`,completed:'Исправность восстановлена. Тот же экземпляр, прежние владельцы и история.',expired:'Срок встречи истёк. Жизнь продолжается; предмет и запись вложенного материала сохранены.','lost-item':'Вещь больше не у заказчика. Этот ремонт прекращён.',unavailable:'Место или мастер недоступны. Этот ремонт прекращён.'};
 return `<section><p class="detail-label">РЕМОНТ ЗНАКОМОЙ ВЕЩИ</p><p>${escape(s.people[o.master]?.name||'Знакомый мастер')} · ◈${escape(o.fee)}${o.material?' · материал оплачен':''}</p><p class="empty">${escape(status[o.status]||o.status)}${q.active?' Срок встречи: ещё '+Math.max(0,Math.ceil((o.deadline-s.tick)/240))+' дн.':''}</p></section>`;
}
export {itemWorking,itemWorth};
