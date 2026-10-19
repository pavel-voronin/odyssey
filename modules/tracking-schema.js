export function validateTracking(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,source=v=>v&&['person','pet','enemy'].includes(v.kind)&&typeof v.id==='string'&&v.id.length>0&&(v.kind!=='person'||Boolean(s.people[v.id]));
 for(const [key,e]of Object.entries(s.edges))if(e.traces!==undefined){
  if(!Array.isArray(e.traces)||e.traces.length>8||new Set(e.traces.map(t=>t.source.kind+'/'+t.source.id)).size!==e.traces.length)fail(key+'.traces');
  for(const t of e.traces)if(!source(t.source)||!['person','pet'].includes(t.source.kind)||[t.from,t.to].sort().join('|')!==key||t.from===t.to||t.id!==key+'/trail/'+t.source.kind+'/'+t.source.id||!tick(t.at)||t.expires!==t.at+240||!Number.isFinite(t.fromX)||!Number.isFinite(t.toX)||typeof t.wet!=='boolean')fail(key+'.trace');
 }
 for(const p of Object.values(s.people)){
  const m=p.tracking;if(m!==undefined){
   if(m.version!==1||!Array.isArray(m.notes)||m.notes.length>8||!Number.isSafeInteger(m.lastActionTick)||m.lastActionTick< -1||m.lastActionTick>s.tick)fail(p.id+'.tracking');
   for(const n of m.notes)if(!source(n.source)||typeof n.trace!=='string'||n.id!=='tracking/'+n.trace+'/'+n.at||!s.areas[n.area]||!s.areas[n.studiedArea]||!s.areas[n.from]||!s.areas[n.to]||!tick(n.at)||!tick(n.studiedAt)||n.studiedAt<n.at||!['fresh','washed','faded'].includes(n.quality)||![null,-1,1,'passage'].includes(n.direction)||n.confirmedAt!==undefined&&(!tick(n.confirmedAt)||n.confirmedAt<=n.studiedAt))fail(p.id+'.tracking.note');
  }
  const q=p.skillPractice?.tracking;if(q){
   if(!Array.isArray(q.operations)||q.operations.length>16||!Number.isInteger(q.total)||q.total<0||q.total>2||q.total!==q.operations.length||new Set(q.operations.map(e=>e.source)).size!==q.operations.length)fail(p.id+'.tracking.practice');
   for(const r of q.operations)if(!tick(r.tick)||typeof r.source!=='string'||typeof r.trace!=='string'||!tick(r.studiedAt)||r.studiedAt>=r.tick)fail(p.id+'.tracking.proof');
   if(q.method){const k=q.method;if(k.id!=='read-trail-direction'||!tick(k.learnedAt)||!['practice','lesson'].includes(k.origin)||!Array.isArray(k.source)||k.origin==='practice'&&(q.total<2||k.source.length!==2||new Set(k.source).size!==2||!k.source.every(id=>q.operations.some(e=>e.id===id)))||k.origin==='lesson'&&(!s.people[k.teacher]||k.teacher===p.id||k.source.length!==1))fail(p.id+'.tracking.method');}
  }
 }
}
