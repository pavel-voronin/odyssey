import {validateEraName} from './era-names.js';
import {readWorldEffect} from './world-changes.js';
export function validateWorldChanges(s,fail){
 const t=s.chronology.worldChanges;for(const p of s.chronology.periodHistory?.entries||[])if(p.naming!==undefined){const q=t?.causes?.['cause/'+p.naming?.source];if(!q||q.period!==p.id)fail('worldChange.naming-source');validateEraName(s,q,p,fail);}if(t===undefined)return;const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,text=(s,max)=>typeof s==='string'&&s.trim()&&s.length<=max,object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 if(t.version!==1||!object(t.causes))fail('worldChanges');
 const states=['captured','changed-again','local','domain-pending','stability-pending','cooldown','recorded','calendar-paused'];
 for(const [key,q]of Object.entries(t.causes)){const path='worldChange.'+key;if(q.version!==1||!text(q.id,300)||key!=='cause/'+q.id||!['geography','knowledge','economy','politics'].includes(q.domain)||!tick(q.causeTick)||q.source?.id!==q.id||q.source.tick!==q.causeTick||!text(q.source.text,4000)||!text(q.oldLimit,400)||!text(q.name,80)||!text(q.shortName,24)||!Array.isArray(q.actors)||q.actors.some(id=>!s.people[id])||!Array.isArray(q.effects)||q.effects.length<1||q.effects.length>32||new Set(q.effects.map(e=>JSON.stringify(e.ref))).size!==q.effects.length||!states.includes(q.status)||q.newState!==null&&!text(q.newState,400)||q.firstWorld!==null&&!tick(q.firstWorld)||q.lastSignature!==null&&typeof q.lastSignature!=='string'||!Array.isArray(q.reports)||q.reports.length>4)fail(path);
  for(const e of q.effects){if(readWorldEffect(s,e.ref)===null||!object(e.before)||typeof e.before.exists!=='boolean'||e.before.exists!==Object.hasOwn(e.before,'value')||e.after!==undefined&&(!object(e.after)||typeof e.after.exists!=='boolean'||e.after.exists!==Object.hasOwn(e.after,'value')))fail(path+'.effect');}
  for(const r of q.reports)if(!tick(r.at)||r.at<q.causeTick||!states.includes(r.status)||typeof r.reason!=='string')fail(path+'.report');
  if(q.lastAssessment!==undefined&&(!tick(q.lastAssessment)||q.lastAssessment<q.causeTick))fail(path+'.assessment');
  if(q.beforeNetwork!==null&&!object(q.beforeNetwork))fail(path+'.network');
  if(q.period!==null){const p=s.chronology.periodHistory?.entries.find(p=>p.id===q.period);if(!p||p.cause?.id!=='world-change/'+q.id||p.cause.domain!==q.domain||!tick(q.recordedAt)||q.recordedAt!==p.startTick||q.status!=='recorded'||q.firstWorld===null||q.firstWorld>=q.recordedAt)fail(path+'.period');}
 }
}
