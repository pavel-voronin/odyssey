export function knifeRefitHTML(s,escape){
 const q=s.people[s.hero.lineage]?.knifeRefit;if(!q)return '';const o=q.orders[q.active]||Object.values(q.orders).at(-1);if(!o)return '';
 return `<section><p class="detail-label">ПЕРЕДЕЛКА ЗНАКОМОЙ ВЕЩИ</p><p>${o.mode==='precision'?'Рукоять для точного сбора':'Боевая заточка'} · ${escape(s.people[o.master]?.name||'Знакомый мастер')}</p><p class="empty">${o.status==='material'?'Мастер оплачен. Нужен один настоящий материал.':o.status==='completed'?'Тот же нож, прежние владельцы и история. Доработка завершена.':`Работа: ${escape(o.progress)} / ${escape(o.required)}. Материал и оплата сохранены; нужны встреча и время у верстака.`}</p></section>`;
}
