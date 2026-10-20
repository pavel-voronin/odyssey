export function validateReturnCare(s,fail){const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,whole=n=>Number.isSafeInteger(n)&&n>=0,point=n=>n&&s.areas[n.area]&&Number.isFinite(n.x),person=id=>s.people[id];
 for(const p of Object.values(s.people)){if(p.returnCareActionTick!==undefined&&!time(p.returnCareActionTick))fail(p.id+'.returnCareActionTick');const q=p.returnEpisode,c=q?.care;if(!c){if(q?.restored!==undefined)fail(p.id+'.return-care.missing');continue;}const key=p.id+'.return-care';if(c.version!==1||!Array.isArray(c.doctors)||c.doctors.length>4||!Array.isArray(c.resources)||c.resources.length>4||!Array.isArray(c.blocked)||c.blocked.length>4||!whole(c.serial)||!Number.isSafeInteger(c.lastAction)||c.lastAction< -1||c.lastAction>s.tick||!whole(c.restored)||c.restored!==(q.restored||0)||!whole(c.droppedGain)||!Array.isArray(c.receipts)||c.receipts.length>8)fail(key);
  for(const n of c.doctors)if(!point(n)||!person(n.person)||!time(n.seen)||![true,false,null].includes(n.ready)||typeof n.origin!=='boolean')fail(key+'.doctor');
  for(const n of c.resources)if(!point(n)||!time(n.seen)||typeof n.available!=='boolean'||!s.areas[n.area].objects.some(o=>o.id===n.object&&o.kind==='relic'))fail(key+'.resource');
  for(const n of c.blocked)if(typeof n.key!=='string'||typeof n.basis!=='string'||!time(n.at)||typeof n.reason!=='string')fail(key+'.blocked');
  if(c.inventory&&(s.actorStates[p.id]||!['herbs','potions','relics','rations'].every(k=>whole(c.inventory[k]))))fail(key+'.inventory');
  if(c.request){const r=c.request;if(r.version!==1||!r.id.startsWith(p.id+'/care/')||!person(r.doctor)?.returnRite||!point(r)||!time(r.asked)||!time(r.lastTick)||r.lastTick<r.asked||!whole(r.progress)||r.progress>2)fail(key+'.request');}
  if(c.trip&&(!point(c.trip)||!['returnCareCollect','returnCareVisit','returnCareRequest'].includes(c.trip.kind)))fail(key+'.trip');
  if(c.decision&&(!time(c.decision.at)||!['seek-rite','last-work'].includes(c.decision.kind)||![1,2].includes(c.decision.cohesion)||typeof c.decision.reason!=='string'))fail(key+'.decision');
  let gain=c.droppedGain;const ids=new Set();for(const r of c.receipts){if(ids.has(r.id)||!r.id.startsWith(p.id+'/care/')||!person(r.doctor)?.returnRite||!s.areas[r.area]||!time(r.asked)||!time(r.at)||r.at<=r.asked||r.actions!==3||![1,2].includes(r.before)||r.after>3||r.after!==r.before+r.gain||r.gain!==Math.min(2,3-r.before)||!whole(r.relicAfter)||r.relicBefore!==r.relicAfter+1)fail(key+'.receipt');ids.add(r.id);gain+=r.gain;}if(gain!==c.restored)fail(key+'.balance');
 }
}

