import {enabled} from '../rules.js';
export const causewayKey=(a,b)=>[a,b].sort().join('|');
export const causewaysOn=s=>enabled(s,'causeways');
export const causewayProject=(s,key)=>s.edges?.[key]?.causeway||null;
export function causewayReady(s,key){const e=s.edges?.[key],q=e?.causeway;return Boolean(causewaysOn(s)&&e.mode==='road'&&e.ford?.version===1&&s.areas[e.a]?.links.includes(e.b)&&s.areas[e.b]?.links.includes(e.a)&&q?.status==='done'&&e.causewayAccess?.project===q.id&&q.maintenance.remaining>0&&q.passages.filter(p=>p.outcome==='crossing').length<12);}
export function causewayCargoLoad(s,id){let n=0;for(const key of s.people[id]?.causewayActivity?.owned||[]){const q=causewayProject(s,key);if(q?.owner===id&&q.cargo.kind==='person')n+=q.materials.timber+q.materials.tools;}return n;}
export function startCausewayPassage(s,b,key,{carrier=false}={}){
 if(!causewayReady(s,key))return null;const q=causewayProject(s,key),id=b.lineage||b.id,c=carrier&&s.logistics.convoys.find(c=>c.person===id&&c.path[c.index]===b.area&&causewayKey(c.path[c.index],c.path[c.index+1])===key),quantity=c?(c.food||0)+(c.medicine||0)+(c.tools||0):0;
 if(q.passages.length>=12){const i=q.passages.findIndex(p=>p.outcome!=='crossing');if(i<0)return null;q.passages.splice(i,1);}q.maintenance.remaining--;q.maintenance.used++;q.serial++;
 const r={id:q.id+'/passage/'+q.serial,project:q.id,at:s.tick,actor:id,from:b.area,to:key.split('|').find(a=>a!==b.area),carrier:Boolean(carrier),convoy:c?.id||null,quantity,ended:null,outcome:'crossing'};q.passages.push(r);return {id:r.id,key,project:q.id};
}
export function finishCausewayPassage(s,b,crossing){
 const ref=crossing.causeway;if(!ref)return false;const q=causewayProject(s,ref.key),r=q?.passages.find(p=>p.id===ref.id);if(!r||r.outcome!=='crossing'||r.actor!==(b.lineage||b.id)||r.from!==crossing.from||r.to!==crossing.to)return false;
 r.ended=s.tick;r.outcome='crossed';q.completed++;const c=r.convoy&&s.logistics.convoys.find(c=>c.id===r.convoy&&c.person===r.actor);if(c&&r.quantity>0){c.causewayUses ||= [];if(!c.causewayUses.some(n=>n.id===r.id))c.causewayUses.push({...r});if(c.causewayUses.length>12)c.causewayUses.shift();}return true;
}
// Called only by the actual freight owner after finite cargo reached its destination.
export function recordCausewayDelivery(s,c,accepted){
 const quantity=accepted.food+accepted.medicine+accepted.tools;if(!quantity||c.source===c.to)return;
 for(const use of c.causewayUses||[]){const q=Object.values(s.edges).map(e=>e.causeway).find(q=>q?.id===use.project);if(!q||q.firstDelivery||use.outcome!=='crossed'||!use.convoy||use.convoy!==c.id||use.actor!==c.person||use.quantity<1)continue;
  q.firstDelivery={id:q.id+'/delivery/'+c.id,at:s.tick,convoy:c.id,driver:c.person,source:c.source,to:c.to,passage:use.id,crossedAt:use.ended,cargo:{...accepted}};
 }
}
