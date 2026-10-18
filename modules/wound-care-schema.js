export function validateWoundCare(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 for(const p of Object.values(s.people)){
  const t=p.woundCare;if(t!==undefined){
   if(t?.version!==1||!int(t.lastActionTick,-1,s.tick)||!int(t.treatments,0,Number.MAX_SAFE_INTEGER)||!Object.hasOwn(t,'decision')||!Object.hasOwn(t,'failedClinic'))fail(p.id+'.woundCare');
   if(t.decision!==null){const d=t.decision;if(!tick(d?.tick)||!['rest','clinic','recovered'].includes(d.method)||typeof d.reason!=='string'||d.wound!==null&&!int(d.wound,1,p.localWounds?.serial||0))fail(p.id+'.woundDecision');}
   if(t.failedClinic!==null&&(!s.areas[t.failedClinic?.area]||!int(t.failedClinic.until,0,s.tick+80)))fail(p.id+'.woundClinic');
  }
  for(const w of p.localWounds?.active||[]){
   const d=w.dressing;if(d!==undefined){if(d?.version!==1||!tick(d.applied)||!s.people[d.by]||!['self','companion','clinic'].includes(d.method)||!['medicine','herbs','clinic'].includes(d.material)||d.units!==1||d.quality!==(d.material==='herbs'?12:20)||!int(d.remaining,0,d.quality)||!int(d.age,0,s.tick-d.applied)||d.method==='self'&&d.by!==p.id||d.method!=='self'&&d.by===p.id||d.method==='clinic'&&d.material!=='clinic'||!t||t.treatments<1||t.lastActionTick<d.applied)fail(p.id+'.woundDressing');}
   if(w.strain!==undefined&&!int(w.strain,0,11))fail(p.id+'.woundStrain');
   if(w.reopened!==undefined&&(!tick(w.reopened?.tick)||w.reopened.role!==w.role||w.kind!=='cut'||w.severity<2))fail(p.id+'.woundReopened');
  }
 }
}
