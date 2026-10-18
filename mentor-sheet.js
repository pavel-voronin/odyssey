export function mentorStoryHTML(p,escape){
 const g=p?.personalJourney;if(g?.kind!=='seekMentor')return '';
 const names={active:'Ищет наставника',done:'Учёба завершена',missed:'Мастер не найден',deferred:'Учёба отложена',failed:'Жизнь ученика завершена'},paid=g.lessons.reduce((n,e)=>n+e.paid,0);
 return `<p class="detail-label">ЛИЧНОЕ ДЕЛО · ПОДГОНКА ЗАЖИМА</p><div class="habit"><b>${escape(names[g.status]||g.status)}</b><p>${escape(g.name)} · ${escape(g.placeName)}</p><p>Оплачено занятий: ${g.lessons.length} / 3 · потрачено своих монет: ${paid}.</p><p>${escape(g.reason||(g.phase==='together'?'Идёт вместе, пока совпадает дорога. Личный срок остаётся прежним.':'Направляется по последнему известному адресу. Сначала нужно застать мастера и договориться.'))}</p></div>`;
}
