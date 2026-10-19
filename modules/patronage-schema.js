export function validatePatronage(s,fail){
 const int=(n,min=0)=>Number.isSafeInteger(n)&&n>=min,tick=n=>int(n)&&n<=s.tick;
 for(const [id,c]of Object.entries(s.patronProjects||{})){
  const k='patronProjects.'+id,r=c.repair;
  if(c.version!==1||c.id!==id||!id.startsWith(c.donor+'/patronage/')||!s.people[c.donor]||!s.people[c.producer]||c.donor===c.producer||!s.areas[c.area]||typeof c.workshop!=='string'||!tick(c.accepted)||!tick(c.damageAt)||c.damageAt>c.accepted||!['repairing','awaiting-stock','working','selling','complete','stopped'].includes(c.status)||!int(c.lastAction,-1)||c.lastAction>s.tick||!int(c.after)||![0,1].includes(c.cargo)||!int(c.revenue))fail(k);
  if(!r||r.kind!=='workshop'||r.by!==c.donor||r.at!==c.accepted||r.amount!==18||r.source!==c.area||!int(r.toolsAfter)||r.toolsBefore-r.toolsAfter!==1)fail(k+'.repair');
  if(c.status!=='repairing'&&(!c.repaired||!tick(c.repaired.at)||!s.people[c.repaired.actor]||c.repaired.payer!==c.donor||c.repaired.damageAt!==c.damageAt))fail(k+'.restored');
  const m=c.material;if(m!==null&&(!m||m.quantity!==2||!['reserved','consumed'].includes(m.state)||typeof m.source!=='string'||!int(m.before,2)||!int(m.after)||m.before-m.after!==2||!tick(m.at)||m.at<c.repaired?.at||m.payer!==c.donor||m.price!==4))fail(k+'.material');
  if(['repairing','awaiting-stock','stopped'].includes(c.status)&&(m!==null||c.work!==null||c.cargo!==0||c.revenue!==0))fail(k+'.pending');
  if(c.status==='working'&&(!m||m.state!=='reserved'||c.work!==null||c.cargo!==0||c.revenue!==0))fail(k+'.working');
  if(['selling','complete'].includes(c.status)&&(!m||m.state!=='consumed'||!c.work||typeof c.work.id!=='string'||!tick(c.work.at)||c.work.at<m.at||c.work.actor!==c.producer||c.work.required!==3||!int(c.work.spent,3)))fail(k+'.work');
  if(c.status==='selling'&&(c.cargo!==1||c.revenue!==0))fail(k+'.cargo');
  if(c.status==='complete'&&(c.cargo!==0||!tick(c.sale?.at)||c.sale.at<c.work.at||c.sale.area!==c.area||c.sale.quantity!==1||c.sale.total!==c.revenue))fail(k+'.sale');
  if(c.status==='stopped'&&(!tick(c.stopped?.at)||c.stopped.by!==c.donor||c.stopped.reason!=='own-needs'))fail(k+'.stopped');
  if(c.supplyAttempt&&(!tick(c.supplyAttempt.at)||c.supplyAttempt.by!==c.donor||c.supplyAttempt.until!==c.supplyAttempt.at+96||c.supplyAttempt.reason!=='no-raw'))fail(k+'.supply');
  if(c.saleFailure&&(!tick(c.saleFailure.at)||typeof c.saleFailure.reason!=='string'))fail(k+'.saleFailure');
 }
 for(const h of Object.values(s.actorStates||{})){const m=h.patronMemory;if(!m)continue;if(m.version!==1||!int(m.after)||!Array.isArray(m.notes)||m.notes.length>12||m.notes.some(n=>!tick(n.at)||!s.people[n.person]||!s.areas[n.area]||typeof n.property!=='string'||!['refused','unavailable','repair','stopped','no-raw','stock'].includes(n.outcome)))fail(h.lineage+'.patronMemory');}
}
