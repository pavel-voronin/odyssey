export function validatePatients(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,point=n=>Number.isFinite(n)&&n>=0&&n<=100,actors=[s.hero,...Object.values(s.actorStates)],actor=id=>actors.find(h=>h.lineage===id),active=new Set();
 const book=s.partyPatients;if(book!==undefined&&(book?.version!==1||!Array.isArray(book.active)||new Set(book.active).size!==book.active.length))fail('partyPatients');
 for(const p of Object.values(s.people)){
  const d=p.partyInjury;if(d===undefined)continue;const h=actor(d.leader),m=d.member;
  if(d?.version!==1||!h||!['waiting','supported','joined','left','dead'].includes(d.stage)||!tick(d.started)||!tick(d.tick)||d.tick<d.started||!tick(d.lastActionTick)||d.lastActionTick<d.started||!s.areas[d.station?.area]||!point(d.station.x)||m?.person!==p.id||m.uid!==p.id||!Number.isFinite(m.hp)||!Number.isFinite(m.maxHp)||m.maxHp<=0||m.hp<0||m.hp>m.maxHp||typeof m.loyalty!=='number'||typeof d.reason!=='string'||!Object.hasOwn(d,'refusal')||!Object.hasOwn(d,'carrier'))fail(p.id+'.partyInjury');
  if(d.refusal!==null&&(!s.areas[d.refusal?.area]||!tick(d.refusal.tick)))fail(p.id+'.patientRefusal');
  if(['waiting','supported'].includes(d.stage)){
   active.add(p.id);if(!book?.active.includes(p.id)||actors.some(a=>a.companions.some(c=>c.person===p.id))||p.alive&&!['injury-wait','injury-supported'].includes(p.status))fail(p.id+'.patientBody');
   if(d.stage==='supported'&&(d.carrier!==h.lineage||h.injuredPassenger!==p.id||p.alive&&(p.area!==h.area||p.x!==h.x)))fail(p.id+'.patientCarrier');
   if(d.stage==='waiting'&&d.carrier!==null)fail(p.id+'.patientWaiting');
  }else if(d.carrier!==null)fail(p.id+'.patientFinished');
  const t=d.passage;if(t!==undefined&&(!s.areas[t.from]||!s.areas[t.to]||!s.areas[t.from].links.includes(t.to)||!['stairs','road'].includes(t.mode)||!Number.isInteger(t.remaining)||t.remaining<1||!Number.isInteger(t.total)||t.total<t.remaining||!point(t.arrivalX)||!tick(t.admitted)||!tick(t.lastTick)||t.lastTick<t.admitted||d.stage!=='waiting'||p.alive&&(p.area!==null||p.x!==null)))fail(p.id+'.patientPassage');
 }
 if(book?.active.some(id=>!active.has(id)))fail('partyPatients.active');
 for(const h of actors){
  if(h.injuredPassenger!==undefined&&h.injuredPassenger!==null){const p=s.people[h.injuredPassenger];if(p?.partyInjury?.stage!=='supported'||p.partyInjury.leader!==h.lineage)fail(h.lineage+'.injuredPassenger');}
  if(h.patientNotes!==undefined){if(!h.patientNotes||typeof h.patientNotes!=='object'||Array.isArray(h.patientNotes)||Object.keys(h.patientNotes).length>8)fail(h.lineage+'.patientNotes');for(const [id,n]of Object.entries(h.patientNotes))if(!s.people[id]||n.person!==id||typeof n.name!=='string'||!s.areas[n.area]||!point(n.x)||!tick(n.seen)||!['waiting','supported','joined','left','dead'].includes(n.stage))fail(id+'.patientNote');}
  if(h.goal?.kind==='patientClinic'&&(!s.people[h.goal.patient]||s.people[h.goal.patient].partyInjury?.leader!==h.lineage))fail(h.lineage+'.patientClinic');
 }
}
