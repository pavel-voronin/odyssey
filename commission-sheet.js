import {localContact} from './modules/npc-contacts.js';
import {physicalDistance} from './geometry.js';
function pending(s,a,r,escape,stage=null){
 const notice=a.commandLedger.notices[r.id],text=stage?({marching:'Идёт по поручению.',fighting:'Рядом идёт бой.',returning:'Возвращается.'})[stage]:'Нового личного отчёта пока нет.';
 return '<p>'+escape(s.people[r.worker].name)+': известный маршрут — '+escape(s.areas[r.path.at(-1)].name)+'; предоплата 4 монеты из казны. '+escape(text)+(notice?' Срок возвращения пропущен; причина неизвестна.':'')+'</p>';
}
export function commissionHTML(s,escape){
 const id=s.hero.lineage,active=s.society.orders.filter(o=>o.commission?.chief===id),books=Object.values(s.areas).filter(a=>a.commandLedger&&(a.commandLedger.history.some(r=>r.chief===id)||a.commandLedger.attempt?.chief===id||active.some(o=>o.from===a.id)));if(!books.length)return '';
 return '<details><summary>Поручения совета</summary>'+books.map(a=>{
  const b=a.commandLedger,attempt=b.attempt?.chief===id?'<p>'+escape(b.attempt.reason)+'</p>':'';
  const travelling=active.filter(o=>o.from===a.id).map(o=>{const at=localContact(s,o.person,s.hero.area),near=at&&physicalDistance(s.areas[s.hero.area],s.hero.x,at.x)<=12;return pending(s,a,o.commission,escape,near?o.stage:null);}).join('');
  const unknown=b.history.filter(r=>r.chief===id&&r.notified===null).map(r=>pending(s,a,r,escape)).join('');
  const reports=b.history.filter(r=>r.chief===id&&r.notified!==null).slice(-4).map(r=>'<p>'+escape(s.people[r.worker].name)+': '+escape(r.completed?'угроза устранена, возвращение подтверждено':r.failure||'поручение не выполнено')+'. Предоплата 4 монеты не повторяется.</p>').join('');
  return '<p>'+escape(a.name)+'</p>'+attempt+travelling+unknown+reports;
 }).join('')+'</details>';
}
