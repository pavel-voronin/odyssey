import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {commissionRepair,quoteRepair,servicePlan} from '../modules/resident-orders.js';
import {npcRepairFinish} from '../modules/workshop-state.js';
import {craftFixture,demonstrateCraft,damageCraftRoom,craftContext as ctx} from './craft-respect-scenarios.mjs';
const dir='artifacts/craft-respect-105';await mkdir(dir,{recursive:true});
for(const name of ['expert','witness']){
 const f=craftFixture(),{s,h,p,o}=f;for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes'])setModule(s,id,true);
 if(name==='expert'){h.relations[p.id]={trust:-30,met:0,lastSeen:0,helped:0};p.agenda.bonds[h.lineage]=-30;demonstrateCraft(f);damageCraftRoom(f);if(!commissionRepair(s,p,o))throw Error('No prepared familiar expert');quoteRepair(s,p,p.agenda.task,ctx);servicePlan(s,ctx);}
 else{damageCraftRoom(f);npcRepairFinish(s,p,{property:o.id},ctx);h.goal={kind:'routeWait',area:h.area,x:h.x,until:10000};}
 syncActiveActor(s);await writeFile(`${dir}/${name}.before.json`,serialize(s));step(s);await writeFile(`${dir}/${name}.after.json`,serialize(s));console.log(name,h.goal?.kind,p.craftRelations);
}
