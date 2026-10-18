import {validSequence,sequenceSignature,SEQUENCE_TOKENS} from './sequence-memory.js';
export function validateSequences(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,order=n=>validSequence(n)&&n.length===3;
 const source=n=>n&&typeof n.kind==='string'&&s.people[n.person]&&tick(n.tick)&&typeof n.id==='string';
 for(const e of Object.values(s.edges)){
  const g=e.mechanism,n=g?.sequence;if(n===undefined)continue;
  if(n?.version!==1||n.id!==g.id+'/sequence'||n.created!==g.created||g.holding||!order(n.order)||!Array.isArray(n.marks)||n.marks.length!==3||n.marks.some(t=>t!==null&&!SEQUENCE_TOKENS.includes(t)))fail('mechanism.sequence');
  for(const op of g.operations)if(op.sequence!==undefined&&(op.state!=='open'||!order(op.sequence)||sequenceSignature(op.sequence)!==sequenceSignature(n.order)))fail('mechanism.sequence.operation');
 }
 for(const p of Object.values(s.people)){
  const entries=p.mechanisms?.sequences;if(entries===undefined)continue;
  if(!entries||typeof entries!=='object'||Array.isArray(entries))fail(p.id+'.mechanisms.sequences');
  for(const [node,n]of Object.entries(entries)){
   const g=s.edges[n?.key]?.mechanism,key=p.id+'.mechanisms.sequence';
   if(n?.version!==1||n.node!==node||g?.id!==node||!g.sequence||n.area!==g.lever.area||n.x!==g.lever.x||typeof n.name!=='string'||!Array.isArray(n.parts)||n.parts.length>3||!Array.isArray(n.failures)||n.failures.length>6||!Array.isArray(n.reports)||!Number.isInteger(n.after)||n.after<0||n.after>s.tick+8||n.lastStudyTick!==(n.parts.at(-1)?.tick??-1))fail(key);
   for(const [i,e]of n.parts.entries())if(e.index!==i||!tick(e.tick)||i>0&&e.tick<=n.parts[i-1].tick||e.token!==null&&!SEQUENCE_TOKENS.includes(e.token))fail(key+'.part');
   if(n.hint!==null){const h=n.hint;if(!validSequence(h?.order)||h.complete!==(h.order.length===3)||typeof h.verified!=='boolean'||!source(h.source)||!tick(h.learnedAt)||h.source.tick>h.learnedAt||h.verified&&(!['performed-operation','witnessed-operation'].includes(h.source.kind)||sequenceSignature(h.order)!==sequenceSignature(g.sequence.order)))fail(key+'.hint');}
   const failures=new Set();for(const f of n.failures){if(!tick(f.tick)||!order(f.order)||f.signature!==sequenceSignature(f.order)||!source(f.source)||failures.has(f.signature))fail(key+'.failure');failures.add(f.signature);}
   const reports=new Set();for(const r of n.reports){if(typeof r.signature!=='string'||!s.people[r.person]||!tick(r.tick)||![0,1].includes(r.paid)||!validSequence(r.order)||r.complete!==(r.order.length===3)||reports.has(r.signature))fail(key+'.report');reports.add(r.signature);}
  }
 }
}
