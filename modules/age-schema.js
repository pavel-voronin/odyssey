export function validateAges(s,fail){
 const date=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 for(const p of Object.values(s.people)){
  const a=p.ageOrigin;if(a&&(!date(a.at)||!Number.isSafeInteger(a.years)||a.years<0))fail(p.id+'.ageOrigin');
  if(p.ageSource&&!['birth','initial-cohort','adult-arrival'].includes(p.ageSource))fail(p.id+'.ageSource');
  const b=p.birth;if(b&&(!a||a.years!==0||b.at!==a.at||!date(b.at)||!s.areas[b.area]||!Array.isArray(b.parents)||!b.parents.length||new Set(b.parents).size!==b.parents.length||JSON.stringify(b.parents)!==JSON.stringify(p.parents)||b.parents.some(id=>!s.people[id]||id===p.id)))fail(p.id+'.birth');
  if(p.ageSource==='birth'&&!b)fail(p.id+'.birth');
  if(p.lastBirth!==undefined&&!date(p.lastBirth))fail(p.id+'.lastBirth');
  if(p.maturedAt!==undefined&&(!b||!date(p.maturedAt)||p.maturedAt<b.at||p.role==='ребёнок'))fail(p.id+'.maturedAt');
  const w=p.ageWear;if(w&&(!a||!date(w.since)||!date(w.tick)||w.tick<w.since||!Number.isSafeInteger(w.loss)||w.loss<0||w.loss>100||!Number.isSafeInteger(w.doses)||w.doses<1||w.loss>w.doses))fail(p.id+'.ageWear');
 }
}
