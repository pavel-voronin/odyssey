export function partyCombatBriefHTML(s,p,escape){
 if(!p)return '';
 const r=p.partyCombat,stock=p.roadSupplies?.medicine||0;
 const practice=Object.values(p.pairPractice?.partners||{}),knowledge=practice.length?`<section class="pair-practice"><p class="detail-label">СОВМЕСТНАЯ ПРАКТИКА</p>${practice.map(v=>`<p>${escape(s.people[v.partner]?.name||v.name)} · ${v.method?'Прикрытие размаха освоено':`Занятий: ${v.total} / 3`}</p>`).join('')}</section>`:'';
 const leader=r&&s.actorStates[r.leader],pair=leader?.pairCombat,progress=pair&&[pair.guard,pair.striker].includes(p.id)?`<p class="empty">${escape(pair.status==='preparing'?'Партнёр готовит размах. Следующий ход решит, удастся ли его завершить.':pair.status==='released'?'Совместный размах завершён.':pair.reason)}</p>`:'';
 if(!r)return knowledge+`<p class="empty">Лекарства при себе: ${stock}.</p>`;
 const name=s.people[r.target]?.name||'союзника',label=r.action==='heal'?`Перевязка ${name}: +${r.healed} здоровья, −${r.medicine} лекарства.`:r.action==='cover'?`Прикрытие ${name}: ${r.intercepted} урона из ответа принято на себя.`:r.action==='prepare'?'Готовит размах: этот ход потрачен без удара.':r.action==='paired-attack'?`Подготовленный размах: ${r.damage} урона.`:`Собственный удар: ${r.damage} урона.`;
 return knowledge+`<section class="party-combat"><p class="detail-label">ПОСЛЕДНЕЕ БОЕВОЕ ДЕЙСТВИЕ</p><p>${escape(label)}</p><p class="empty">${escape(r.reason)} Потрачено сил: ${r.energy}. Лекарства при себе: ${stock}.</p>${progress}</section>`;
}
