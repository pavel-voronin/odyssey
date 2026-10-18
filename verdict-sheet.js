export function verdictKnowledgeHTML(s,c,escape,date){
 if(c.verdictKnowledge?.version!==1)return '';
 const entry=s.hero.verdictMemory?.cases.find(e=>e.case===c.id);if(!entry)return '';
 const status=({unverified:'Основание приговора ещё не проверено',confirmed:'Лично прочитанная запись согласуется с приговором',rebutted:'Лично прочитанная запись противоречит приговору','reported-confirmed':'Пересказ свидетеля поддерживает приговор','reported-error':'Свидетель сообщил сведения против приговора'})[entry.status]||'Истина не установлена';
 return `<div class="habit"><b>${escape(status)}</b><p>Пересмотр суда — отдельное дело; эта запись сама никого не освобождает.</p>${entry.sources.map(source=>`<p>${escape(source.kind==='report'?'Пересказ · '+source.reporterName:'Личное чтение · подписанный реестр')}<br>${escape(source.known.text)}<br>Событие: ${date({tick:source.eventAt},true)} · узнано: ${date({tick:source.learnedAt},true)}</p>`).join('')}${entry.trace&&!entry.sources.length?'<p>Помнит место осмотренного следа. Может вернуться к реестру, если сочтёт проверку важной.</p>':''}</div>`;
}
