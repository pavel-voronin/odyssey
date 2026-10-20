import {controlBlocked} from './building-control-state.js';
import {reservedWorkshop,reservedRepair} from './workshop-contract-state.js';
import {authoritiesOn,authorityAt,authorityBody} from './authority-state.js';
import {diplomaticReady,nearDiplomat,diplomaticSpeech} from './diplomacy-state.js';
import {physicalDistance} from '../geometry.js';import {workshopPosition} from './workshop-place.js';
export const publicRepairsOn=s=>authoritiesOn(s)&&s.rules['public-repairs']!==false&&s.rules.property!==false&&s.rules['property-damage']!==false;
export const publicInstitution=(s,area)=>s.publicRepairs?.byArea[area]||null;
export const publicCase=(s,id)=>Object.values(s.publicRepairs?.byArea||{}).flatMap(i=>Object.values(i.cases)).find(q=>q.id===id)||null;
export const publicProperty=(s,q)=>s.areas[q.area]?.objects.find(o=>o.kind==='workshop'&&o.id===q.property);
export function publicContact(s,p,i){const chief=s.people[i?.officer],state=i&&authorityAt(s,i.area),b=authorityBody(s,p.id);return Boolean(state?.id===i.authority&&state.ruler===i.officer&&chief?.alive&&diplomaticReady(s,p)&&diplomaticReady(s,chief)&&b.area===i.area&&physicalDistance(s.areas[i.area],b.x,42)<=6&&nearDiplomat(s,p,chief)&&diplomaticSpeech(s,p,chief));}
export function publicClaimValid(s,q){const o=publicProperty(s,q);return Boolean(s.people[q.actor]?.alive&&o?.owner===q.actor&&o.state==='burned'&&o.damagedAt===q.damageAt&&!o.repair?.materials&&!reservedWorkshop(s,o));}
export function knownPublicNeed(s,p,o,area){
 if(!o)return null;const body=authorityBody(s,p.id);if(body.area!==area)return null;
 for(const h of Object.values(s.actorStates)){const lease=h.goal?.workspace,witness=s.people[h.lineage],b=witness&&authorityBody(s,witness.id);if(witness?.alive&&h.lineage!==p.id&&b.area===area&&diplomaticReady(s,witness)&&nearDiplomat(s,p,witness)&&diplomaticSpeech(s,p,witness)&&lease?.kind==='lease'&&lease.id===o.id&&lease.owner===p.id&&lease.until>=s.tick)return {kind:'paid-bench',id:'lease/'+h.lineage+'/'+o.id+'/'+lease.paid,person:h.lineage,property:o.id,owner:p.id,paid:lease.paid,until:lease.until,heard:s.tick,area,gap:physicalDistance(s.areas[area],body.x,b.x)};}
 return null;
}
export function publicRepairMaterial(s,id,o){const c=s.people[id]?.publicRepairCargo;return c?.status==='carried'&&c.property===o?.id&&c.owner===id&&c.damageAt===o.damagedAt?c:null;}
export function depositPublicRepairMaterial(s,p,a,o){const c=publicRepairMaterial(s,p.id,o),b=authorityBody(s,p.id),pos={area:a.id,x:o.x};if(!c||!p.alive||b.transit||b.combat||p.roadTransit||p.fordCrossing||p.liftTransit||p.needs.sleeping||(b.lineage?b.energy:p.needs.energy)<2||controlBlocked(s,a,o)||reservedRepair(s,o,p.id)||s.rules.property===false||s.rules['property-damage']===false||o.owner!==p.id||o.state!=='burned'||o.repair?.materials||b.area!==pos.area||physicalDistance(s.areas[pos.area],b.x,pos.x)>3)return false;
 const q=publicCase(s,c.case);if(!q||q.actor!==p.id)return false;c.status='deposited';c.deposited=s.tick;q.status='material-deposited';q.deposited={at:s.tick,actor:p.id,area:pos.area,x:b.x,property:o.id,cargo:c.id};const known=p.publicRepairKnown?.[q.area];if(known){known.status=q.status;known.heard=s.tick;known.reason='Материал оставлен в собственной мастерской; нужны три действительных рабочих действия.';}o.repair={materials:true,remaining:3,payer:p.id,paidAt:s.tick,publicGrant:c.id,materialCost:c.kind==='public'?0:c.paid};return true;}

export function publicRepairRevision(s,g){if(!g.kind.startsWith('publicRepair')&&g.kind!=='propertyRepair')return null;const h=s.hero,p=s.people[h.lineage],i=publicInstitution(s,h.area),visible=i&&publicContact(s,p,i);return [s.rules['public-repairs'],p.publicRepairKnown,p.publicRepairCargo,visible&&[i.pool,Object.values(i.cases).map(q=>[q.id,q.status,q.review?.status,q.award?.at])],i?.officer&&[s.people[i.officer].alive,s.people[i.officer].needs.sleeping]];}
