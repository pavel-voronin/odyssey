import {knownNPCDeeds} from './modules/npc-deeds.js';
export function npcDeedsHTML(s,p,escape){
 if(!p.npcIntentions&&!p.familyNeeds)return '';const current=p.npcIntentions?.current,deeds=knownNPCDeeds(s,p),cases=Object.values(p.familyNeeds?.cases||{}).filter(c=>!['known','active'].includes(c.status)).slice(-4),status={supplied:'Лекарство передано',unneeded:'Помощь уже не нужна',missing:'По известному адресу не найден'};
 return `<section><p class="detail-label">СОХРАНЁННЫЕ ДЕЛА</p>${deeds.map(d=>`<div class="habit"><b>${escape(d.title)}</b><p>${d.id===current?.id?'Сейчас':d.available?'Может подождать':'Пока недоступно'}. ${escape(d.reason)}</p></div>`).join('')}${cases.map(c=>`<p class="empty">${escape(c.name)}: ${escape(status[c.status]||c.status)}. ${escape(c.reason||'')}${c.receipt?' Передано лекарств: '+escape(c.receipt.medicine)+'.':''}</p>`).join('')}</section>`;
}
