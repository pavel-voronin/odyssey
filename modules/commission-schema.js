export function validateCommissions(s,fail){
 const object=o=>o&&typeof o==='object'&&!Array.isArray(o),tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,money=n=>Number.isFinite(n)&&n>=0,key='commission';
 const ids=new Set();
 function receipt(c,from,to,worker,finished=false){
  const book=s.areas[from]?.commandLedger;
  if(c?.version!==1||!book||typeof c.id!=='string'||!c.id.startsWith(`commission/${from}/`)||!Number.isSafeInteger(Number(c.id.split('/').at(-1)))||Number(c.id.split('/').at(-1))<1||Number(c.id.split('/').at(-1))>book.serial||ids.has(c.id)||c.worker!==worker||!s.people[worker]||!s.people[c.chief]||c.chief===worker||!tick(c.issued)||c.wage!==4||!money(c.treasuryBefore)||c.treasuryBefore<4||!money(c.walletBefore)||typeof c.weapon!=='string'||!c.weapon||!Array.isArray(c.path)||c.path[0]!==from||c.path.at(-1)!==to||c.path.some(id=>!s.areas[id])||new Set(c.path).size!==c.path.length||c.deadline!==c.issued+c.path.length*80+96||typeof c.completed!=='boolean'||!(c.failure===null||typeof c.failure==='string'))fail(key+'.receipt');
  ids.add(c.id);
  if(finished){if(!tick(c.ended)||c.ended<c.issued||!['returned','lost','stranded'].includes(c.outcome)||!(c.notified===null||tick(c.notified)&&c.notified>=c.ended)||c.notified!==null&&(c.outcome!=='returned'||!money(c.authorityBefore)||!money(c.authorityAfter)||c.authorityAfter>c.authorityBefore||c.authorityBefore-c.authorityAfter>1))fail(key+'.closed');}
 }
 for(const a of Object.values(s.areas)){
  const b=a.commandLedger;if(b===undefined)continue;
  if(b?.version!==1||!Number.isSafeInteger(b.serial)||b.serial<0||!Array.isArray(b.history)||!object(b.notices)||!object(b.reportedThreats)||!(b.attempt===null||tick(b.attempt?.tick)&&s.people[b.attempt.chief]&&typeof b.attempt.reason==='string'))fail(key+'.ledger');
  for(const r of b.history)receipt(r,a.id,r.area,r.worker,true);
  for(const [enemy,r]of Object.entries(b.reportedThreats))if(typeof enemy!=='string'||!enemy||!r?.order?.startsWith(`commission/${a.id}/`)||!tick(r.tick))fail(key+'.threatReceipt');
  for(const [id,n]of Object.entries(b.notices))if(!id.startsWith(`commission/${a.id}/`)||!tick(n?.tick)||!s.people[n.chief]||!s.people[n.worker]||!money(n.authorityBefore)||!money(n.authorityAfter)||n.authorityAfter!==Math.max(0,n.authorityBefore-1))fail(key+'.notice');
 }
 const workers=new Set();for(const o of s.society.orders){const c=o.commission;if(c===undefined)continue;receipt(c,o.from,o.to,o.person);if(o.owner!==c.chief||workers.has(o.person)||!['marching','fighting','returning'].includes(o.stage)||!c.path.includes(s.people[o.person].area)||o.stage==='fighting'&&s.people[o.person].area!==o.to)fail(key+'.body');workers.add(o.person);}
}
