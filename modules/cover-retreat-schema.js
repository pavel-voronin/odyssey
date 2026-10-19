export function validateCoverRetreat(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 for(const p of Object.values(s.people)){const q=p.skillPractice?.combat;if(!q)continue;const path=p.id+'.coverPractice';if(!Array.isArray(q.operations)||q.operations.length>2||q.total!==q.operations.length||new Set(q.operations.map(e=>e.enemy)).size!==q.total)fail(path);
  for(const e of q.operations)if(e.id!==p.id+'/protection/'+e.enemy||!tick(e.tick)||!s.areas[e.area]?.objects.some(o=>o.id===e.enemy&&o.kind==='enemy')||!s.people[e.target]||e.target===p.id||![e.before,e.after,e.amount].every(Number.isFinite)||e.amount<=0||e.before-e.after!==e.amount||e.after<=0)fail(path+'.proof');
  const i=q.instruction;if(i&&(!tick(i.at)||!s.areas[i.area]||!s.people[i.partner]||i.partner===p.id||i.energy!==2||i.id!==p.id+'/retreat-drill/'+i.at||q.total!==2||q.operations.some(e=>e.tick>i.at)))fail(path+'.instruction');
  const m=q.method;if(m&&(m.id!=='cover-withdrawal'||m.origin!=='practice'||!tick(m.learnedAt)||m.learnedAt!==i?.at||m.instruction!==i?.id||!Array.isArray(m.source)||m.source.length!==2||!m.source.every(id=>q.operations.some(e=>e.id===id))))fail(path+'.method');
  if(p.retreatDrillTick!==undefined&&!tick(p.retreatDrillTick))fail(path+'.tick');
 }
 const seen=new Set();for(const h of [s.hero,...Object.values(s.actorStates)]){if(seen.has(h))continue;seen.add(h);const r=h.coverRetreat;if(!r)continue;const key=h.lineage+'.coverRetreat';if(r.version!==1||typeof r.id!=='string'||!s.people[r.guard]||r.guard===h.lineage||!s.areas[r.area]?.objects.some(e=>e.id===r.enemy&&e.kind==='enemy')||!['actor','convoy'].includes(r.kind)||r.kind==='actor'&&r.target!==h.lineage||typeof r.target!=='string'||![-1,1].includes(r.direction)||!tick(r.started)||!tick(r.lastGuardTick)||r.lastGuardTick<r.started||!Number.isFinite(r.guardX)||r.guardX<0||r.guardX>100||!Number.isSafeInteger(r.steps)||r.steps<1||!['active','ended'].includes(r.status)||r.status==='ended'&&(!tick(r.ended)||typeof r.reason!=='string'))fail(key);}
 for(const c of s.logistics.convoys){const p=c.coverWithdrawal;if(p&&(!s.people[p.leader]||typeof p.id!=='string'))fail(c.id+'.coverWithdrawal');}
}
