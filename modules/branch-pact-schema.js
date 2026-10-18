import {FACTIONS} from '../content.js';
export function validateBranchPacts(s,fail){
 for(const p of Object.values(s.people)){const r=p.aidRequest;if(r?.residence!==undefined&&(!r.residence||r.residence.area!==r.area||!s.areas[r.residence.area]||!FACTIONS.some(f=>f.id===r.residence.faction)))fail(p.id+'.aidRequest.residence');}
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,object=o=>o&&typeof o==='object'&&!Array.isArray(o),actors=[s.hero,...Object.values(s.actorStates||{})],seen=new Set();
 for(const h of actors){if(seen.has(h.lineage))continue;seen.add(h.lineage);const b=h.branchPact,key=h.lineage+'.branchPact';if(b===undefined)continue;
  if(b?.version!==1||b.member!==h.lineage||!tick(b.issued)||b.id!==`branch-pact/${b.member}/${b.issued}`||b.faction!=='crown'||b.branch!=='marshal'||b.against!=='tide'||!s.areas[b.area]||!s.people[b.leader]||b.leader===b.member||!object(b.cases)||!Number.isSafeInteger(b.after)||b.after<0)fail(key);
  for(const [id,c]of Object.entries(b.cases)){
   if(c?.request!==id||!s.people[c.patient]||!id.startsWith(c.patient+'/aid/')||!s.areas[c.area]||!tick(c.decided)||c.decided<b.issued||!['help','obey'].includes(c.choice)||typeof c.reason!=='string'||![null,'suspended','explain'].includes(c.review)||![null,'negotiated','accepted','refused'].includes(c.answer)||typeof c.blocked!=='boolean')fail(key+'.case');
   for(const k of ['performed','heard','reviewed','notified'])if(c[k]!==null&&(!tick(c[k])||c[k]<c.decided))fail(key+'.'+k);
   const f=s.newsEvents?.events['news/aid/'+id]?.versions[2];
   if(c.performed!==null&&(c.choice!=='help'||f?.occurred!==c.performed||f.actor.id!==b.member||f.patient.id!==c.patient||f.area!==c.area))fail(key+'.performed');
   if(c.review!==null&&(c.performed===null||c.heard===null||c.reviewed===null||c.heard<c.performed||c.reviewed<c.heard||s.people[b.leader].news?.effects['news/aid/'+id]?.revision!==2))fail(key+'.review');
   if(c.review===null&&(c.heard!==null||c.reviewed!==null||c.notified!==null||c.answer!==null||c.blocked)||c.notified!==null&&(c.reviewed===null||c.notified<c.reviewed)||c.answer!==null&&c.notified===null||c.answer==='negotiated'&&c.blocked||c.blocked&&c.review!=='suspended')fail(key+'.resolution');
  }
 }
}
