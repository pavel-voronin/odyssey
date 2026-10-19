export function validateBuildingRuins(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,part=n=>Number.isInteger(n)&&n>=0&&n<=3;
 for(const a of Object.values(s.areas)){
  for(const p of a.facades?.profiles||[]){
   const r=p.structure,key='building.structure.'+p.id;if(r===undefined)continue;
   if(r?.version!==1||!tick(r.created)||!tick(r.checked)||r.checked<r.created||!Number.isInteger(r.emptyDays)||r.emptyDays<0||r.emptyDays>24||!part(r.roof)||!part(r.walls)||!Array.isArray(r.history)||r.history.length>16)fail(key);
   for(const [i,e]of r.history.entries()){
    if(!tick(e.tick)||e.tick<r.created||i>0&&e.tick<r.history[i-1].tick||!['neglect','fire','earthquake','repair','recovery','dismantle','observed-damage'].includes(e.kind)||!part(e.roof)||!part(e.walls))fail(key+'.history');
    if(e.kind==='observed-damage'&&(e.tick!==r.created||i!==0||e.roof!==1||e.walls!==2||!a.objects.some(o=>o.id===e.source&&o.building===p.id)))fail(key+'.observed');
    if(e.kind==='repair'&&(!s.people[e.actor]||!s.people[e.payer]||!tick(e.paidAt)||e.paidAt>e.tick||e.materialCost!==18||e.roof!==3||e.walls!==3))fail(key+'.repair');
    if(e.kind==='fire'&&(e.roof>1||e.walls>2)||e.kind==='neglect'&&e.roof===3)fail(key+'.damage');
    if(i>0&&!['repair','recovery'].includes(e.kind)&&(e.roof>r.history[i-1].roof||e.walls>r.history[i-1].walls))fail(key+'.unearned-restoration');
   }
   const last=r.history.at(-1);if(last?(last.roof!==r.roof||last.walls!==r.walls):r.roof!==3||r.walls!==3)fail(key+'.current');
  }
  for(const o of a.objects){const d=o.structuralDamage;if(d===undefined)continue;const p=a.facades?.profiles.find(p=>p.id===d?.building),r=p?.structure;
   if(d?.version!==1||o.building!==p?.id||!['workshop','tavern'].includes(o.kind)||o.state!=='burned'||!['fire','neglect','earthquake'].includes(d.cause)||!tick(d.tick)||!r||r.roof>=2&&r.walls>=2||!r.history.some(e=>e.kind===d.cause&&e.tick===d.tick))fail('building.structuralDamage.'+o.id);
  }
 }
}
