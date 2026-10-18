import {commonFixture,commonContext} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {observeMaterials} from '../modules/work-materials.js';import {observeProperty} from '../modules/property.js';
import {commissionRepair,quoteRepair,servicePlan,acceptService,hasServiceTool,fundServiceRepair,serviceRepairAllowed,finishServiceRepair} from '../modules/resident-orders.js';
export const materialContext={...commonContext,hasRepairTool:hasServiceTool,repairFunding:fundServiceRepair,mayRepairProperty:serviceRepairAllowed,workshopRepaired(s,a,o,proof){finishServiceRepair(s,a,o,proof,materialContext);}};
export function materialFixture({known=true,local=0}={}){
 const f=commonFixture(),{s,h,a,o}=f;for(const id of ['work-materials','work-orders','property-damage'])setModule(s,id,true);
 const source=s.areas.a1;source.civic.tools=1;source.civic.treasury=30;a.civic.tools=local;a.civic.treasury=60;
 const p=Object.values(s.people).find(p=>p.id!==h.lineage&&p.alive&&p.area===a.id);Object.assign(p,{x:42,status:'resident'});Object.assign(p.agenda,{job:'artisan',wealth:40,duty:.5,task:null});o.owner=p.id;o.offer=null;o.state='burned';o.damagedAt=0;
 if(known){h.area=source.id;h.x=42;observeMaterials(s);h.area=a.id;h.x=42;}observeMaterials(s);observeProperty(s,a);syncActiveActor(s);
 if(!commissionRepair(s,p,o))throw Error('Prepared owner cannot meet a qualified helper');const c=Object.values(s.workOrders)[0];quoteRepair(s,p,p.agenda.task,materialContext);return {...f,p,c,source};
}
export function acceptMaterialFixture(f){if(!servicePlan(f.s,materialContext)||!acceptService(f.s,materialContext))throw Error('Prepared quote was not accepted');}
