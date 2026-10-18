export function validateVerdictReviews(s,fail){
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 for(const c of s.storyCases){
  const r=c.verdictReview;if(r===undefined)continue;const key=c.id+'.verdictReview',p=s.people[r?.official],q=r?.proof,v=r?.result;
  if(r?.version!==1||r.id!==c.id+'/review/1'||c.kind!=='mystery'||c.status!=='done'||c.verdictKnowledge?.version!==1||r.owner!==c.owner||r.originalVerdict!==c.verdict||!s.people[c.verdict]||!p||[c.accused,c.other,c.owner].includes(p.id)||!['checking','ready','done','unavailable'].includes(r.status)||!integer(r.requested)||r.requested<c.verdictKnowledge.verdictAt||r.requested>s.tick||r.until!==r.requested+240||r.area!==c.source||!Number.isFinite(r.meetingX)||r.meetingX<0||r.meetingX>100||typeof r.source!=='string'||typeof r.object!=='string')fail(key);
  if(q!==null&&(!q||q.reader!==r.official||q.area!==r.area||q.object!==r.object||q.record!==c.id+'/sealed-ledger'||!integer(q.readAt)||q.readAt<r.requested||q.readAt>s.tick||q.pointsTo===c.verdict||!s.people[q.pointsTo]))fail(key+'.proof');
  if(['ready','done'].includes(r.status)&&!q||r.status==='done'&&!v||r.status!=='done'&&v!==null)fail(key+'.progress');
  if(v!==null){
   if(!integer(v.tick)||v.tick<q.readAt||v.tick>s.tick||v.exonerated!==c.verdict||v.pointsTo!==q.pointsTo||typeof v.released!=='boolean'||typeof v.posthumous!=='boolean'||v.posthumous&&v.released||v.claim!==12||!integer(v.paid)||v.paid>12||!integer(v.treasuryBefore)||!integer(v.treasuryAfter)||v.treasuryAfter!==v.treasuryBefore-v.paid||v.recipient!==null&&!s.people[v.recipient]||!v.recipient&&v.paid)fail(key+'.result');
   const receipt=s.people[c.verdict].courtMemory?.find(e=>e.case===c.id&&e.tick===v.tick);
   if(!receipt||receipt.version!==1||receipt.official!==r.official||receipt.exonerated!==true||receipt.paid!==v.paid||receipt.recipient!==v.recipient||receipt.claim!==v.claim||!integer(receipt.elapsed))fail(key+'.receipt');
  }
 }
}
