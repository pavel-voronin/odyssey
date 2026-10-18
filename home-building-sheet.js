export function homeBuildingHTML(s,escape){
 const h=s.hero,rooms=Object.values(s.areas).filter(a=>a.extension&&(a.extension.owner===h.lineage||a.extension.hired?.person===h.lineage||[a.id,a.interior.parent,a.interior.exterior].includes(h.area)));
 if(!rooms.length)return '';
 return '<p class="detail-label">ПРИСТРОЙКА ЖИЛОЙ КОМНАТЫ</p>'+rooms.map(a=>{
  const r=a.extension,status=({planned:'План: ещё нужны материал и деньги',foundation:'Фундамент',frame:'Каркас',fitting:'Проверка пригодности',done:'Пристройка пригодна'})[r.status];
  return `<div class="habit"><b>${escape(a.name)}</b><p>${escape(status)} · работа ${r.steps.length}/6. Хозяин: ${escape(s.people[r.owner]?.name||'неизвестен')}.</p><p>Прежние ${r.baseCapacity} места и вещи сохраняются. ${r.status==='done'?'Готово одно дополнительное место.':'Дополнительное место ещё недоступно.'}</p>${r.hired?.person===h.lineage?`<p>За вашу действительную работу: ${r.payment.available} монет ждут у стройки, получено ${r.payment.paid}. Плата взята из средств хозяина; время договора ограничено.</p>`:''}</div>`;
 }).join('');
}
