export function validateRivalry(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 for(const p of Object.values(s.people)){
  if(p.rivalActionTick!==undefined&&!tick(p.rivalActionTick))fail(p.id+'.rivalAction');
  const q=p.rivalOrder;if(q!==undefined){
   if(q?.version!==1||q.client!==p.id||q.id!==p.id+'/knife-request/'+q.posted||!s.areas[q.area]||!Number.isFinite(q.x)||q.x<0||q.x>100||!tick(q.posted)||q.closes!==q.posted+16||q.deadline!==q.posted+192||!['open','reserved','done','cancelled'].includes(q.status)||q.price!==10||![0,10].includes(q.escrow)||![0,10].includes(q.paid)||!Array.isArray(q.bids)||q.bids.length>2||new Set(q.bids.map(b=>b.person)).size!==q.bids.length)fail(p.id+'.rivalOrder');
   for(const b of q.bids){if(!s.people[b.person]||b.person===p.id||!tick(b.seen)||b.seen<q.posted||b.seen>=q.closes||!['waiting','winner','lost'].includes(b.status)||!int(b.skill,6,100)||!['held','forge'].includes(b.quote?.method)||!int(b.quote?.ticks,1,512)||b.quote.method==='held'&&typeof b.quote.item!=='string'||b.quote.method==='forge'&&b.quote.item!==null)fail(p.id+'.rivalBid');}
   if(q.status==='open'&&(q.winner!==null||q.escrow!==0||q.paid!==0)||q.status==='reserved'&&(q.escrow!==10||q.paid!==0)||q.status==='done'&&(q.escrow!==0||q.paid!==10||typeof q.item!=='string'||!tick(q.finished)||q.finished>q.deadline||q.finished<q.accepted)||q.status==='cancelled'&&(q.escrow!==0||q.paid!==0||!tick(q.ended)))fail(p.id+'.rivalBalance');
   if(['reserved','done'].includes(q.status)&&q.winner===null||q.status==='open'&&q.bids.some(b=>b.status!=='waiting')||q.status==='cancelled'&&q.winner!==null&&q.refunded!==10)fail(p.id+'.rivalOwnership');
   if(q.winner!==null){if(!s.people[q.winner]||q.bids.filter(b=>b.status==='winner').length!==1||!q.bids.some(b=>b.status==='winner'&&b.person===q.winner)||!tick(q.accepted)||q.accepted<q.closes||q.accepted>q.deadline||q.deposit?.tick!==q.accepted||!Number.isFinite(q.deposit.before)||!Number.isFinite(q.deposit.after)||q.deposit.before-q.deposit.after!==10||q.deposit.after<6)fail(p.id+'.rivalWinner');}
   if(q.status==='done'){const r=q.payment;if(r?.person!==q.winner||r.tick!==q.finished||r.amount!==10||!Number.isFinite(r.before)||r.before<0||r.after-r.before!==10)fail(p.id+'.rivalPayment');}
   if(q.refunded!==undefined&&q.refunded!==10)fail(p.id+'.rivalRefund');
  }
  const j=p.rivalJob;if(j!==undefined){const o=s.people[j?.client]?.rivalOrder;if(j?.version!==1||o?.id!==j.order||!o.bids.some(b=>b.person===p.id)||!['waiting','active','lost','done','withdrawn'].includes(j.status)||!tick(j.lastKnown)||j.status==='done'&&(o.status!=='done'||o.winner!==p.id))fail(p.id+'.rivalJob');}
  if(p.rivalHistory!==undefined&&(!Array.isArray(p.rivalHistory)||p.rivalHistory.length>8||p.rivalHistory.some(e=>typeof e.order!=='string'||!tick(e.tick)||!s.people[e.other]||!['resentment','other-work'].includes(e.outcome))))fail(p.id+'.rivalHistory');
 }
}
