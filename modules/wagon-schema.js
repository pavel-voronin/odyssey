import {wagons,wagonById,wagonLoad} from './wagon-state.js';
export function validateWagons(s,fail){
 const all=wagons(s),tick=n=>Number.isInteger(n)&&n>=0&&n<=s.tick,int=(n,a,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=a&&n<=b;if(all.length>1)fail('wagons.count');
 for(const {w,a}of all){const key='wagon.'+w.id,o=w.source;if(w.version!==1||typeof w.id!=='string'||!s.people[w.owner]||w.capacity!==48||!int(w.condition,0,12)||!int(w.wear,0,11)||!int(w.lastMove,-1,s.tick)||!int(w.lastAction,-1,s.tick)||!Number.isFinite(w.x)||w.x<0||w.x>100||!Array.isArray(w.items)||wagonLoad(s,w)>48||!Array.isArray(w.history)||w.history.length>12)fail(key);
  if(!o||!tick(o.at)||!s.areas[o.area]||!s.people[o.owner]||o.wood?.units!==4||o.wood.before-o.wood.after!==4||o.wood.after<0||typeof o.wood.id!=='string'||o.tools?.units!==2||o.tools.before-o.tools.after!==2||o.tools.after<0)fail(key+'.source');
  for(const k of ['driver','passenger'])if(w[k]!==null&&!s.people[w[k]])fail(key+'.'+k);if(w.horse!==null&&!s.horses?.byId[w.horse]||w.convoy!==null&&!s.logistics.convoys.some(c=>c.id===w.convoy&&c.wagon===w.id&&c.person===w.driver))fail(key+'.binding');
  if(w.driver&&(!w.horse||w.owner!==w.driver)||w.passenger&&s.people[w.passenger]?.caravanPassenger?.wagon!==w.id)fail(key+'.actor');
  if(w.manifest){const m=w.manifest;if(!tick(m.at)||typeof m.convoy!=='string'||w.convoy||!['food','medicine','tools'].every(k=>int(m[k],0)))fail(key+'.manifest');}
  if(w.journey){const t=w.journey;if(!s.areas[t.from]||!s.areas[t.to]||!Number.isFinite(t.metric?.travelled)||t.metric.travelled<0||t.metric.travelled>t.metric.distance)fail(key+'.journey');}
  for(const e of w.history)if(!tick(e.at)||typeof e.kind!=='string')fail(key+'.history');
 }
 for(const p of Object.values(s.people)){const r=p.caravanPassenger;if(!r)continue;const f=wagonById(s,r.wagon);if(r.version!==1||!f||f.w.passenger!==p.id||!s.people[r.driver]||!s.areas[r.to]||!tick(r.boarded)||!['fare','work'].includes(r.mode)||r.paid!==(r.mode==='fare'?4:0)||r.work!==(r.mode==='work'?1:0)||typeof r.convoy!=='string')fail(p.id+'.caravanPassenger');}
 for(const c of s.logistics.convoys)if(c.wagon){const f=wagonById(s,c.wagon);if(!f||f.w.convoy!==c.id||f.w.driver!==c.person)fail(c.id+'.wagon');}
}
