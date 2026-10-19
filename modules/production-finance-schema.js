export function validateProductionFinance(s,fail){
 const int=(n,min=0)=>Number.isSafeInteger(n)&&n>=min,tick=n=>int(n)&&n<=s.tick;
 for(const [id,c]of Object.entries(s.productionDeals||{})){
  const k='productionDeals.'+id,m=c.material,f=c.funding;
  if(c.version!==1||c.id!==id||!id.startsWith(c.investor+'/production/')||!s.people[c.investor]||!s.people[c.producer]||c.investor===c.producer||!s.areas[c.area]||typeof c.workshop!=='string'||typeof c.buyer!=='string'||!tick(c.accepted)||!tick(c.seen)||c.seen>c.accepted||c.advance!==4||c.share!==.5||c.quantity!==1||!int(c.expected,8)||!['working','selling','payable','done'].includes(c.status)||!int(c.lastAction,-1)||c.lastAction>s.tick||!int(c.after)||![0,1].includes(c.cargo)||!int(c.revenue)||!int(c.escrow)||!int(c.paid))fail(k);
  if(!m||typeof m.source!=='string'||m.quantity!==2||!['reserved','consumed'].includes(m.state)||!int(m.before,2)||!int(m.after)||m.before-m.after!==2||!f||!int(f.investorBefore,24)||!int(f.producerBefore)||!int(f.treasuryBefore))fail(k+'.funding');
  if(c.status==='working'&&(c.work!==null||m.state!=='reserved'||c.cargo!==0||c.revenue!==0||c.escrow!==0||c.paid!==0))fail(k+'.pending');
  if(c.status!=='working'&&(!c.work||c.work.actor!==c.producer||typeof c.work.id!=='string'||!tick(c.work.at)||c.work.at<c.accepted||c.work.required!==3||!int(c.work.spent,3)||m.state!=='consumed'))fail(k+'.work');
  if(c.status==='selling'&&(c.cargo!==1||c.revenue!==0||c.escrow!==0||c.paid!==0))fail(k+'.cargo');
  if(['payable','done'].includes(c.status)&&(!tick(c.sold)||c.sold<c.work.at||c.cargo!==0||c.sale?.quantity!==1||c.sale.area!==c.area||c.sale.total!==c.revenue||c.escrow+c.paid!==Math.floor(c.revenue/2)))fail(k+'.sale');
  if(c.status==='payable'&&c.paid!==0||c.status==='done'&&(c.escrow!==0||!tick(c.ended)||c.ended<c.sold))fail(k+'.paid');
 }
 for(const h of Object.values(s.actorStates||{})){const b=h.productionFinance;if(!b)continue;if(b.version!==1||!int(b.after)||!Array.isArray(b.decisions)||b.decisions.length>12||b.decisions.some(d=>!tick(d.at)||!s.people[d.producer]||!s.areas[d.area]||!['accepted','declined'].includes(d.status)||!['known-distrust','local-order'].includes(d.reason)))fail(h.lineage+'.productionFinance');}
}
