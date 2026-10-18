import {restoreStructure} from './building-condition.js';
import {takeGoods} from './goods.js';
import {enabled} from '../rules.js';
import {reservedRepair} from './workshop-contract-state.js';
import {rootWorld} from '../world-ref.js';
import {actorView} from '../actor-view.js';
import {selfDrivenActor} from '../actor-projection.js';
import {commissionRepair} from './resident-orders.js';
import {witnessRepair} from './craft-respect.js';
import {recordCraftRepair} from './craft-practice.js';
import {fitWorkingPart} from './craft-practice.js';
import {npcDisputePlan,recordDisputeRepair} from './workshop-dispute.js';
import {skillBranchesEnabled,recordPracticalTrade} from './skill-branches.js';
const active=s=>enabled(s,'property')&&enabled(s,'property-damage');
const property=(s,area,id)=>s.areas[area]?.objects.find(o=>o.kind==='workshop'&&o.id===id);
export function recordWorkshop(s,a,o,text,kind,ctx,details={}){
  o.history.push({tick:s.tick,kind,owner:o.owner,text,...details});s.changes.push({tick:s.tick,text:a.name+': '+text});
  const root=rootWorld(s),actors=Object.values(root.actorStates||{hero:root.hero});
  for(const h of actors)if(h.alive&&!h.transit&&[a.id,o.workshopInterior?.area].includes(selfDrivenActor(root,h)?h.area:root.people[h.lineage]?.area)){
    const view=actorView(root,h);ctx.observeProperty?.(view,root.areas[h.area]||a);ctx.log(view,text,kind,a.id,{relay:false});
  }
  if(!root.hero.alive&&!root.hero.transit&&[a.id,o.workshopInterior?.area].includes(root.hero.area))ctx.log(root,text,kind,a.id);
}
export function restoreWorkshop(s,a,o,ctx,actor=s.hero.lineage){
  const details={actor,payer:o.repair?.payer||actor,damageAt:o.damagedAt,materialCost:18,...(o.repair?.purchase?{purchase:o.repair.purchase}:{})};
  restoreStructure(s,a,o,actor);o.state='intact';o.repair=null;recordWorkshop(s,a,o,'Ремонт закончен. В мастерской снова можно работать.','repair',ctx,details);
  witnessRepair(s,a,o,details);
  recordCraftRepair(s,a,o,details);
  recordDisputeRepair(s,a,o,details,ctx);
  ctx.workshopRepaired?.(s,a,o,details);
}
export function npcRepairPlan(s,p,ctx={}){
  if(!active(s))return false;const a=s.areas[p.area],o=a.objects.find(o=>o.kind==='workshop'&&o.owner===p.id&&o.state==='burned');if(!o)return false;
  if(reservedRepair(s,o,p.id)){p.agenda.due=s.tick+48;return true;}
  if(npcDisputePlan(s,p,o,ctx))return true;
  if(commissionRepair(s,p,o))return true;
  if(o.repair?.materials||p.agenda.wealth>=18&&a.civic?.tools>0)p.agenda.task={kind:'propertyRepair',target:a.id,x:o.x,remaining:o.repair?.remaining||3,property:o.id};
  else p.agenda.due=s.tick+48;
  return true;
}
export function npcRepairFinish(s,p,t,ctx){
  if(!active(s))return;const a=s.areas[p.area],o=property(s,p.area,t.property);
  if(!o||o.owner!==p.id||o.state!=='burned'||reservedRepair(s,o,p.id))return;
  if(!o.repair?.materials){if(p.agenda.wealth<18||!(a.civic?.tools>0))return;p.agenda.wealth-=18;a.civic.treasury+=18;takeGoods(s,a,'tools',1,{reason:'workshop-repair',actor:p.id});o.repair={materials:true,payer:p.id,paidAt:s.tick,remaining:0};}
  restoreWorkshop(s,a,o,ctx,p.id);
}
export function npcRepairAction(s,p,t,ctx){
 if(!skillBranchesEnabled(s))return false;
 const a=s.areas[p.area],o=property(s,p.area,t.property);
 if(!active(s)||!o||o.owner!==p.id||o.state!=='burned'||reservedRepair(s,o,p.id)){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
 if(!o.repair?.materials){
  if(p.agenda.wealth<18||!(a.civic?.tools>0)){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
  p.agenda.wealth-=18;a.civic.treasury+=18;takeGoods(s,a,'tools',1,{reason:'workshop-repair',actor:p.id});o.repair={materials:true,payer:p.id,paidAt:s.tick,remaining:Math.max(1,Math.min(3,t.remaining))};
  const event={id:`${o.id}/own-material/${o.damagedAt}`,tick:s.tick,actor:p.id,area:a.id,kind:'tools',side:'buy',quantity:1,total:18};o.repair.purchase=event;recordPracticalTrade(s,event);
  t.remaining=o.repair.remaining;p.needs.energy=Math.max(0,p.needs.energy-2);return true;
 }
 o.repair.remaining=Math.min(o.repair.remaining,t.remaining);fitWorkingPart(s,a,o,p.id);o.repair.remaining--;t.remaining=o.repair.remaining;p.needs.energy=Math.max(0,p.needs.energy-2);
 if(t.remaining<=0){restoreWorkshop(s,a,o,ctx,p.id);p.agenda.task=null;p.agenda.due=s.tick+48;}return true;
}
export function damagedWorkplace(s,p){return enabled(s,'property')&&s.areas[p.area]?.objects.some(o=>o.kind==='workshop'&&o.owner===p.id&&o.state==='burned');}
