import {skillBranchesEnabled,SKILL_METHODS} from './modules/skill-branches.js';
import {profession} from './content.js';
export function skillBranchesHTML(s,escape){
 if(!skillBranchesEnabled(s))return '';
 const h=s.hero,p=s.people[h.lineage],skills=p?.skillPractice||{};
 const rows=Object.entries(SKILL_METHODS).map(([id,def])=>{const state=skills[id],learned=state?.method?.id===def.method,count=state?.total||0,unit=id==='craft'?'восстановлений':id==='aid'?'оказаний помощи':'разных товаров';return `<div><p>${escape(def.name)} · ${escape(count)} ${unit}</p><p class="empty">${learned?escape(def.label)+(state.method.teacher?' · урок у '+escape(state.method.teacherName||s.people[state.method.teacher]?.name||'попутчика'):state.method.origin==='role'?' · известно по подготовке':state.method.origin==='career'?' · сохранено из прежнего мастерства':' · освоено на практике'):state?.study?'Учёба: осталось '+escape(state.study.remaining)+' действий.':id==='craft'&&count>=def.threshold?'Опыт накоплен: осталось освоить приём.':`До первого приёма: ${escape(Math.max(0,def.threshold-count))}.`}</p></div>`;}).join('');
 const records=Object.entries(h.career?.records||{}).filter(([,r])=>Number.isFinite(r.rank));
 return `<section><p class="detail-label">ПРАКТИКА И ПРИЁМЫ</p>${rows}${records.length?`<p class="detail-label">ПРОФЕССИОНАЛЬНОЕ МАСТЕРСТВО</p>${records.map(([id,r])=>`<div class="fact"><span>${escape(profession(id).name)}</span><b>${escape(r.rank)}</b></div>`).join('')}<p class="empty">Приёмы остаются при смене профессии. Профессиональные ступени не превращаются в новую практику.</p>`:''}</section>`;
}
