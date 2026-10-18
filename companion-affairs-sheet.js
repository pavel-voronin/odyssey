import {postponedCompanionAffair,companionAffairsEnabled} from './modules/companion-affair-state.js';
function discussionHTML(s,p,escape,quote){
 const n=p?.companionAffairs,last=n?.history.at(-1);if(!last)return '';const agreement=n.agreement,postponed=n.postponed&&postponedCompanionAffair(s,p,n.postponed.id);
 return `<section class="companion-affairs"><p class="detail-label">ОБЩАЯ ДОРОГА</p>${quote?`<p>Последний разговор: «${escape(last.reason)}»</p>`:''}${companionAffairsEnabled(s)&&agreement&&s.tick<agreement.until?`<p class="empty">Договорились лишь на короткий общий отрезок: ${escape(agreement.toName)}. Личные дела и прежние сроки сохраняются.</p>`:''}${postponed?`<p class="empty">${escape(postponed)}</p>`:''}</section>`;
}
export function companionAffairsHTML(s,p,escape){return discussionHTML(s,p,escape,true);}
export function companionAffairsBriefHTML(s,p,escape){
 const g=p?.personalJourney,family=Object.values(p?.familyNeeds?.cases||{}).filter(c=>['known','active'].includes(c.status));
 const facts=g?.kind==='seekMentor'&&g.status==='active'&&family.length?`<p class="empty">Помнит два дела. Учёба у ${escape(g.name)}: оплачено ${g.lessons.length} / 3 занятий. Семейная нужда: ${family.slice(0,2).map(c=>escape(c.name)).join(', ')}.</p>`:'';
 return facts+discussionHTML(s,p,escape,p?.companionAffairs?.history.at(-1)?.outcome!=='shared');
}
