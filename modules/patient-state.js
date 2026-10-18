// Actual carried body reference; projections never create or move a patient.
export function supportedPatient(s,h=s.hero){const p=s.people[h?.injuredPassenger];return p?.alive&&p.partyInjury?.stage==='supported'&&p.partyInjury.leader===h.lineage?p:null;}
export const supportStride=(s,h=s.hero)=>supportedPatient(s,h)? .6:1;
export const supportForce=(s,h=s.hero)=>supportedPatient(s,h)? .55:1;
export const supportEnergy=(s,h=s.hero)=>supportedPatient(s,h)?1:0;
export const injuredPartyOn=s=>s.rules?.['injured-party']!==false&&s.rules?.companions!==false&&s.rules?.people!==false;
export function patientJourney(s,p){const d=p?.partyInjury,h=s.hero.lineage===d?.leader?s.hero:s.actorStates?.[d?.leader],t=d?.passage||(d?.stage==='supported'&&h?.transit);return t?{from:t.from,to:t.to,mode:t.mode,tick:s.tick}:null;}
