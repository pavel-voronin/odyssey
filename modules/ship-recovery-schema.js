// Optional current records are validated, never reconstructed on restore.
export function validateShipRecovery(s,fail){
 const int=n=>Number.isSafeInteger(n)&&n>=0;
 for(const c of s.storyCases){
  const r=c.shipRecovery,l=c.launchResult,key=c.id+'.shipRecovery';
  if(l!==undefined&&(!l||l.version!==1||!int(l.tick)||l.tick>s.tick||l.actor!==c.owner||!s.areas[l.destination]||!s.areas[c.target]?.links.includes(l.destination)||![''+c.id+'/launch',c.id+'/recovery/1'].includes(l.action)))fail(c.id+'.launchResult');
  if(r===undefined)continue;
  const f=r?.failure,a=r?.attempt;
  if(r?.version!==1||c.kind!=='expedition'||c.variant!=='ship'||c.status!=='failed'||!c.broken||!['available','working','done','missing'].includes(r.status)||!f||f.id!==c.id+'/launch'||f.actor!==c.owner||f.object!==c.console||f.area!==c.target||!int(f.tick)||f.tick>s.tick||!Number.isFinite(f.hpBefore)||f.hpBefore<1||!Number.isFinite(f.hpAfter)||f.hpAfter<1||f.hpAfter!==Math.max(1,f.hpBefore-15)||f.fuel!==1||f.method!==null&&typeof f.method!=='string'||!s.people[f.actor])fail(key);
  if(a!==null){
   if(!a||a.id!==c.id+'/recovery/1'||a.actor!==c.owner||!int(a.started)||a.started<=f.tick||a.started>s.tick||!int(a.remaining)||a.remaining>2||a.material?.kind!=='tools'||!int(a.material.before)||a.material.before<1||a.material.after!==a.material.before-1||!Array.isArray(a.steps)||a.steps.length!==3-a.remaining||a.steps.some((e,i)=>e.id!==a.id+'/'+(i+1)||e.energy!==2||!int(e.tick)||e.tick<a.started||e.tick>s.tick||i>0&&e.tick<=a.steps[i-1].tick)||a.lastTick!==a.steps.at(-1)?.tick)fail(key+'.attempt');
  }
  if(r.status==='available'&&a!==null||r.status==='working'&&(!a||a.remaining===0)||r.status==='done'&&(!a||a.remaining!==0||a.finished!==a.lastTick||l?.action!==a.id)||r.status!=='done'&&l)fail(key+'.progress');
 }
}
