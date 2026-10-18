import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {setModule} from '../rules.js';
import {collectionItems} from '../modules/collection-state.js';
import {syncActiveActor} from '../actor-projection.js';
export const refitContext={...forgingContext};
export function refitFixture({interior=false,mode='edge'}={}){
 const f=forgingFixture(),{s,h,a,o,p}=f;startKnife(s,f.worker,f.site,forgingContext);placeAtBench(f);for(let i=0;i<6;i++){s.tick++;workKnife(s,f.worker,forgingContext);}
 const item=collectionItems(s).find(i=>i.toolKind==='knife');
 setModule(s,'knife-refit',true);o.owner=p.id;Object.assign(p,{area:a.id,x:42,status:'resident',health:p.maxHealth||100});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});Object.assign(p.agenda,{task:null,wealth:40,job:'artisan',due:s.tick});
 h.memory.people.push(p.id);h.money.style='purposeful';h.habits=['collector'];h.profession=mode==='precision'?'ranger':'clockmaker';h.goal=null;h.x=42;h.energy=100;h.hunger=0;
 if(interior){setModule(s,'interiors',true);setModule(s,'workshop-interiors',true);}
 syncActiveActor(s);return {...f,item,client:s.people[h.lineage],master:p};
}
