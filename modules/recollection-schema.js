import {CACHE_FORGET_AFTER,PROMISE_FORGET_AFTER} from './recollection-state.js';
export function validateRecollection(s,fail){
 const time=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,actors=new Map(Object.values(s.actorStates||{}).map(h=>[h.lineage,h]));actors.set(s.hero.lineage,s.hero);
 for(const h of actors.values()){for(const q of h.quests)if(q.recalledAt!==undefined&&(!time(q.recalledAt)||q.recalledAt<q.accepted))fail('recollection.promiseTime');const r=h.recollection;if(r===undefined)continue;if(r?.version!==1||!Array.isArray(r.losses)||r.losses.length>24)fail('recollection');const active=new Set();for(const n of r.losses){const q=h.quests.find(q=>q.id===n.id),cache=Object.values(s.areas).flatMap(a=>a.objects).find(o=>o.id===n.id&&o.kind==='buriedMoney');if(!['cache','promise'].includes(n.domain)||typeof n.id!=='string'||!time(n.at)||!time(n.lastKnownAt)||n.lastKnownAt>n.at||!['neglect','head-impact'].includes(n.cause)||n.domain==='cache'&&!cache||n.domain==='promise'&&!q||n.restored!==null&&(!time(n.restored)||n.restored<n.at||!s.people[n.via])||n.restored===null&&n.via!==null)fail('recollection.loss');
   if(n.restored===null){const key=n.domain+'/'+n.id;if(active.has(key)||n.domain==='cache'&&s.people[h.lineage].moneyCaches?.places.some(p=>p.id===n.id))fail('recollection.known');active.add(key);}
   if(n.cause==='neglect'){if(n.source!==null||n.at-n.lastKnownAt<(n.domain==='cache'?CACHE_FORGET_AFTER:PROMISE_FORGET_AFTER))fail('recollection.neglect');}
   else {const c=n.source;if(!c||c.role!=='head'||!Number.isSafeInteger(c.wound)||c.wound<1||![2,3].includes(c.severity)||c.tick!==n.at||!s.areas[c.area]?.objects.some(e=>e.id===c.enemy&&e.kind==='enemy')||c.id!==JSON.stringify([h.lineage,c.tick,c.enemy,c.controller])||!['before','after','maximum'].every(k=>Number.isFinite(c[k]))||c.maximum<=0||c.before>c.maximum||c.after<=0||c.before-c.after<c.maximum*.2)fail('recollection.impact');}
   if(n.domain==='promise'&&n.restored!==null&&(!time(q.recalledAt)||q.recalledAt<n.restored))fail('recollection.reminder');
  }if(active.size>16)fail('recollection.limit');
 }
}
