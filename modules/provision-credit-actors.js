import {creditEnabled,creditSupplier,creditStatus,askCredit,decideCredit,creditWork} from './provision-credit.js';
import {localContact} from './npc-contacts.js';
export function heroCreditPlan(s,ctx,{request=false}={}){
 const h=s.hero,p=s.people[h.lineage];creditStatus(s,p,ctx);const q=p.provisionCredit;
 if(q&&['requested','offered','accepted','working'].includes(q.status)&&creditEnabled(s)){
  if(request&&['accepted','working'].includes(q.status))return false;
  const supplier=localContact(s,q.supplier,q.area);if(q.status==='requested'){ctx.goal(s,'creditWait',h.area,h.x,'Ждать ответа поставщика','Просьба ещё не означает выдачу еды. Поставщик ответит своим ходом.');return true;}
  if(q.status==='offered'){ctx.goal(s,'creditDecide',q.area,supplier?.x??h.x,'Оценить условия помощи','Можно принять полную партию, доступную меньшую или отказаться от нового обязательства.');return true;}
  ctx.goal(s,'creditWork',q.area,42,'Отработать полученные припасы',`Нужно ${q.required} настоящих действий на этих угодьях до тика ${q.deadline}. Сделано ${q.task.goodsWork?.spent||0}; зарплата за ту же работу не выдаётся.`);return true;
 }
 if(!request||!creditEnabled(s))return false;const k=creditSupplier(s,p);if(!k)return false;ctx.goal(s,'creditAsk',h.area,k.x,'Попросить припасы за будущую работу','Здесь есть действительный поставщик. Условия и согласие ещё неизвестны.',{supplier:k.id});return true;
}
export function heroCreditAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],g=h.goal;creditStatus(s,p,ctx);
 if(g.kind==='creditWait'){if(p.provisionCredit?.status!=='requested')h.goal=null;h.lastAction='idle';return;}
 h.goal=null;if(g.kind==='creditAsk')askCredit(s,p,g.supplier,ctx);else if(g.kind==='creditDecide')decideCredit(s,p,ctx);else creditWork(s,p,ctx);
}
export function npcCreditTask(s,p){
 if(!creditEnabled(s))return null;const q=p.provisionCredit;if(q&&['requested','offered','accepted','working'].includes(q.status))return {kind:['accepted','working'].includes(q.status)?'creditWork':'creditTalk',target:q.area,x:['accepted','working'].includes(q.status)?42:s.people[q.supplier]?.x??42,person:q.supplier,credit:q.id,remaining:1,knownNavigation:true};
 const k=creditSupplier(s,p);return k?{kind:'creditTalk',target:p.area,x:k.x,person:k.id,remaining:1}:null;
}
export function npcCreditAction(s,p,ctx){
 const t=p.agenda.task,q=p.provisionCredit;creditStatus(s,p,ctx);if(!creditEnabled(s))return;
 if(t.kind==='creditWork')creditWork(s,p,ctx);else if(!q||!['requested','offered','accepted','working'].includes(q.status))askCredit(s,p,t.person,ctx);else if(q.status==='offered')decideCredit(s,p,ctx);
 const current=p.provisionCredit;if(!current||['refused','failed','fulfilled','accepted'].includes(current.status)||t.kind==='creditTalk'&&current.status==='working')p.agenda.task=null;
}
