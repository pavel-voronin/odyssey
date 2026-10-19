import {copyOrders,copyDesk} from './copy-order-state.js';
export function validateCopyOrders(s,fail){
 const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,states=['working','completed','error','cancelled'];
 const orders=new Map();
 for(const p of Object.values(s.people)){
  const m=p.copyWork;if(m===undefined)continue;
  if(m?.version!==1||!Number.isSafeInteger(m.serial)||m.serial<1||!m.orders||Array.isArray(m.orders)||copyOrders(p).length!==m.serial||m.serial>16)fail('copy-order.state');
  let active=0;const contents=new Set();
  for(const [id,o]of Object.entries(m.orders)){
   const w=s.literature?.works[o.content],d=copyDesk(s,o),pay=o.payment;
   if(o.version!==1||o.id!==id||!id.startsWith(p.id+'/copy-order/')||o.client!==p.id||!s.people[o.master]||o.master===p.id||!w||!['employment-note','mechanism-sequence'].includes(w.content.kind)||contents.has(w.id)||!s.areas[o.area]?.civic||!Number.isFinite(o.x)||o.x<0||o.x>100||!d||d.kind!=='copyDesk'||d.id!==id+'/desk'||d.owner!==p.id||d.x!==o.x||!Array.isArray(d.items)||!time(o.asked)||o.asked<w.written||!Number.isInteger(o.progress)||o.progress<0||o.progress>3||!states.includes(o.status)||typeof o.source!=='string'||typeof o.paper!=='string'||o.source===o.paper||!Array.isArray(o.history)||o.history.length!==o.progress||o.status==='working'&&(o.progress>=3||o.finished!==null)||o.status!=='working'&&!time(o.finished)||['completed','error'].includes(o.status)&&o.progress!==3||o.collected!==null&&(!time(o.collected)||o.status==='working'||o.collected<o.finished)||o.progress===0&&(o.draft!==null||o.lastWork!==-1)||o.progress>0&&(!time(o.lastWork)||o.lastWork!==o.history.at(-1)?.at||s.literature.works[o.draft]?.parent!==o.content))fail('copy-order.'+id);
   if(o.finished!==null&&o.finished<Math.max(o.asked,o.lastWork)||o.status==='completed'&&o.history.at(-1)?.after<34||o.status==='error'&&o.history.at(-1)?.after>=34)fail('copy-order.finish');
   if(!pay||pay.reserved!==4||pay.paid!==(o.status==='completed'?4:0)||pay.refunded!==(o.collected!==null?4-pay.paid:0)||!Number.isFinite(pay.clientBefore)||pay.clientBefore<8||pay.clientAfter!==pay.clientBefore-4||o.status==='completed'&&(!pay.wage||pay.wage.at!==o.finished||!Number.isFinite(pay.wage.before)||pay.wage.after!==pay.wage.before+4)||o.status!=='completed'&&pay.wage!==null)fail('copy-order.payment');
   let last=o.asked;for(const [i,h]of o.history.entries()){if(!time(h.at)||h.at<=last||h.worker!==o.master||h.progress!==i+1||h.energy!==2||!Number.isFinite(h.before)||h.before<30||h.after!==h.before-2)fail('copy-order.history');last=h.at;}
   if(o.collected===null){active++;if(d.taken||d.items.length!==2||!d.items.some(i=>i.id===o.source&&i.textCopy?.content===o.content&&i.textCopy.owner===p.id)||!d.items.some(i=>i.id===o.paper&&(o.progress?i.textCopy?.owner===p.id&&i.textCopy.writer===o.master&&i.textCopy.sourceCopy===o.source&&i.textCopy.content===(o.status==='completed'?o.content:o.draft):i.kind==='writingPaper')))fail('copy-order.custody');for(const i of d.items)if(i.physical?.holder.kind!=='cache'||i.physical.holder.area!==o.area||i.physical.holder.object!==d.id)fail('copy-order.holder');}
   else if(d.items.length||!d.taken)fail('copy-order.return');
   contents.add(w.id);orders.set(id,o);
  }
  if(active>1)fail('copy-order.active');
 }
 const masters=new Set();for(const o of orders.values())if(o.status==='working'){if(masters.has(o.master))fail('copy-order.master');masters.add(o.master);}
 for(const a of Object.values(s.areas))for(const d of a.objects)if(d.kind==='copyDesk'&&orders.get(d.copyOrder)?.desk!==d.id)fail('copy-order.desk');
 for(const g of [s.hero.goal,...Object.values(s.actorStates).map(h=>h.goal),...Object.values(s.people).map(p=>p.agenda?.task)])if(['textOrderRequest','textOrderWork','textOrderCollect'].includes(g?.kind)&&(g.kind==='textOrderRequest'? !s.people[g.person]||typeof g.source!=='string'||typeof g.item!=='string':!orders.has(g.order)))fail('copy-order.goal');
}
