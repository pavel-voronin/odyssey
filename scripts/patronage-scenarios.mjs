import {financeFixture,financeContext,financeSave,manufactureFixture} from './production-finance-scenarios.mjs';
import {setModule} from '../rules.js';
import {damageStructure} from '../modules/building-condition.js';
import {transferGoods} from '../modules/goods.js';
import {patronagePlan,acceptPatronage,patronStock} from '../modules/patronage.js';
import {npcRepairPlan,npcRepairAction} from '../modules/workshop-state.js';
export {financeContext as patronContext,financeSave as patronSave,manufactureFixture as patronManufacture};
export function patronFixture(){
 const f=financeFixture();for(const id of ['patronage','facades','building-ruins','property-damage','work','skill-branches'])setModule(f.s,id,true);f.p.agenda.duty=.8;f.h.personality.generosity=.9;if(!f.h.memory.people.includes(f.p.id))f.h.memory.people.push(f.p.id);f.h.x=f.p.x=f.o.x;
 const profile=f.a.facades.profiles.find(p=>p.id===f.o.building);if(!damageStructure(f.s,f.a,profile,'fire'))throw Error('No actual damaged workshop');const donor=Object.values(f.s.areas).find(a=>a.id!==f.a.id&&a.civic?.tools>1);if(transferGoods(f.s,donor,f.a,'tools',1)!==1)throw Error('No actual repair tool');return f;
}
export function patronGift(f=patronFixture()){if(!patronagePlan(f.s,financeContext))throw Error('No actual patron proposal');f.c=acceptPatronage(f.s,financeContext);if(!f.c)throw Error('No accepted patron gift');return f;}
export function patronRepair(f){if(!npcRepairPlan(f.s,f.p,financeContext))throw Error('No ordinary repair plan');for(let n=0;n<3;n++){f.s.tick++;if(!npcRepairAction(f.s,f.p,f.p.agenda.task,financeContext))throw Error('No ordinary repair action');}return f;}
export function patronFirstStock(f){f.s.tick++;if(!patronagePlan(f.s,financeContext)||!patronStock(f.s,financeContext))throw Error('No actual second gift');return f;}
