import {refitFixture,refitContext} from './knife-refit-scenarios.mjs';
import {setModule} from '../rules.js';
import {initializeNewItemCondition,wearOwnedItem} from '../modules/item-condition.js';
import {syncActiveActor} from '../actor-projection.js';
export const repairContext=refitContext;
export function repairFixture(options={}){
 const f=refitFixture(options),{s,item,h}=f;
 setModule(s,'knife-refit',false);setModule(s,'item-wear',true);
 initializeNewItemCondition(s,item);
 // The fixture performs actual use; it does not infer previous damage from XP.
 for(let i=0;i<240;i++){s.tick++;wearOwnedItem(s,item,h.lineage,'gather','fixture/actual-work',refitContext);}
 syncActiveActor(s);return f;
}
