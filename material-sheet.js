export function materialCargoHTML(s,h,escape){
 const cargo=h.workMaterials?.cargo||[];if(!cargo.length)return '';
 return '<p class="detail-label">МАТЕРИАЛЫ ЗАКАЗЧИКОВ</p>'+cargo.map(t=>`<div class="habit"><b>⚒ Инструмент для ремонта</b><p>Владелец: ${escape(s.people[t.owner]?.name||'Заказчик')}. ${h.alive?'Едет с этим персонажем.':'Остался среди вещей погибшего.'}</p><p class="empty">Куплен в «${escape(s.areas[t.source]?.name||'прежняя кладовая')}» за ◈${t.paid}. Это материальный запас, а не свободные деньги.</p></div>`).join('');
}
