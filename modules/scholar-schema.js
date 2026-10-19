import {textWitnesses,witnessVerdict,comparisonKey} from './scholar-state.js';
export function validateScholar(s,fail){
 const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 for(const p of Object.values(s.people)){
  const m=p.scholarStudy,q=p.skillPractice?.scholar;if(m===undefined){if(q)fail('scholar.missing-proof');continue;}
  if(m?.version!==1||!Array.isArray(m.comparisons)||m.comparisons.length>24||!Array.isArray(m.inspections)||m.inspections.length>24||!Number.isInteger(m.lastActionTick)||m.lastActionTick<0||m.lastActionTick>s.tick)fail('scholar.state');
  const witnesses=textWitnesses(s,p),keys=new Set(),ids=new Set();let last=-1;
  for(const [i,c]of m.comparisons.entries()){
   const a=witnesses.find(w=>w.id===c.sources?.[0]),b=witnesses.find(w=>w.id===c.sources?.[1]);
   if(c.id!==p.id+'/witness-comparison/'+(i+1)||c.actor!==p.id||!time(c.tick)||c.tick<=last||c.tick>m.lastActionTick||!a||!b||c.tick<Math.max(a.received,b.received)||c.key!==comparisonKey(a.id,b.id)||keys.has(c.key)||c.area!==a.area||JSON.stringify(c.authors)!==JSON.stringify([a.author,b.author])||JSON.stringify(c.values)!==JSON.stringify([a.available,b.available])||JSON.stringify(c.dates)!==JSON.stringify([a.observed,b.observed])||c.verdict!==witnessVerdict(a,b)||!['tentative-reports','assessed-reports'].includes(c.confidence)||c.confidence==='assessed-reports'&&(!q?.method||q.method.learnedAt>c.tick)||c.inspection===null&&m.inspections.some(o=>o.comparison===c.id)||c.inspection!==null&&m.inspections.filter(o=>o.comparison===c.id).at(-1)?.id!==c.inspection)fail('scholar.comparison');keys.add(c.key);ids.add(c.id);last=c.tick;
  }
  last=-1;for(const [i,o]of m.inspections.entries()){
   const c=m.comparisons.find(c=>c.id===o.comparison);const previous=m.inspections.filter(n=>n.comparison===o.comparison&&n.tick<o.tick).at(-1);if(o.previous!==(previous?.id??null)||previous&&previous.available===o.available||o.id!==p.id+'/witness-inspection/'+(i+1)||o.actor!==p.id||!c||c.verdict==='insufficient'||!time(o.tick)||o.tick<=last||o.tick<=c.tick||o.tick>m.lastActionTick||o.area!==c.area||!s.areas[o.area]?.civic||o.x!==42||typeof o.available!=='boolean'||o.result!==(c.verdict==='contradiction'?'dated-conflict':o.available===c.values[0]?'confirmed-here':'outdated-reports')||o.energy!==1)fail('scholar.inspection');ids.add(o.id);last=o.tick;
  }
  const l=m.lesson;if(l!==null){const c=m.comparisons.find(c=>c.id===l.comparison),teacher=s.people[l.teacher],tm=teacher?.skillPractice?.scholar?.method;if(l.id!==p.id+'/witness-lesson'||l.actor!==p.id||!teacher||teacher===p||!tm||tm.learnedAt>=l.tick||!c||c.verdict==='insufficient'||l.tick<=c.tick||!time(l.tick)||l.tick>m.lastActionTick||!s.areas[l.area]||l.paid!==1||!Number.isFinite(l.before)||l.before<1||l.after!==l.before-1||!Number.isFinite(l.teacherBefore)||l.teacherAfter!==l.teacherBefore+1||!c.sources.some(id=>s.literature.works[id]?.language===l.language))fail('scholar.lesson');}
  if(!q)continue;
  if(!Array.isArray(q.operations)||q.operations.length>2||q.total!==q.operations.length||new Set(q.operations.map(e=>e.area)).size!==q.total)fail('scholar.practice');
  for(const e of q.operations){const o=m.inspections.find(o=>o.id===e.id);if(!o||o.tick!==e.tick||o.area!==e.area||o.comparison!==e.comparison||e.inspection!==o.id||o.result!=='confirmed-here'||!o.skillCredits?.some(c=>c.branch==='scholar'&&c.id===o.id)||!e.credits?.some(c=>c.branch==='scholar'&&c.id===o.id))fail('scholar.practice-proof');}
  const method=q.method;if(method&&(method.id!=='compare-witnesses'||!time(method.learnedAt)||!Array.isArray(method.source)||!['practice','lesson'].includes(method.origin)||method.origin==='practice'&&(q.total!==2||method.source.length!==2||!method.source.every(id=>q.operations.some(e=>e.id===id))||method.learnedAt!==q.operations.at(-1).tick)||method.origin==='lesson'&&(!l||method.teacher!==l.teacher||method.learnedAt!==l.tick||method.source.length!==1||method.source[0]!==l.id)))fail('scholar.method');
  if(q.total===2&&!method)fail('scholar.unfinished-method');
 }
}
