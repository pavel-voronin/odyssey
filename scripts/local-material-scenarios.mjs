import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {collectionItems} from '../modules/collection-state.js';
import {teachSpell} from '../modules/magic.js';
import {createGrate,observeGrate} from '../modules/mechanisms.js';
import {connectAreas} from '../engine.js';
import {recordAreaVisit} from '../actor-atlas.js';
import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';
export const materialContext=forgingContext;
export function woodFixture({knife=false,roof=false}={}){
 const f=forgingFixture({npc:true}),{s,h,worker}=f;let tool=null;
 if(knife){setModule(s,'item-wear',true);if(!startKnife(s,worker,f.site,forgingContext))throw Error('No actual knife order');placeAtBench(f);for(let i=0;i<6;i++){s.tick++;if(!workKnife(s,worker,forgingContext))throw Error('No actual knife work');}tool=collectionItems(s,worker.id).find(i=>i.toolKind==='knife');}
 for(const k of Object.keys(s.rules))setModule(s,k,false);for(const k of ['local-materials','mechanisms','travel','magic','equipment','item-wear','weather','climate','facades','building-ruins'])setModule(s,k,true);
 let g=Object.values(s.edges).find(e=>e.mechanism?.material).mechanism;if(roof){const to=f.a.links[0],bypass=f.a.links.find(id=>id!==to);connectAreas(s,to,bypass);g=createGrate(s,f.a.id,to,bypass,{wood:true});if(!g)throw Error('No actual adjacent barrier');}
 Object.assign(h,{area:g.from,x:g.lever.x,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null});h.quests=[];h.companions=[];h.conditions=[];h.habits=[];h.magic.spells=[];h.magic.mana=18;teachSpell(s,'spark',forgingContext,'Подготовленное знание учителя');for(const e of s.areas[g.from].objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}recordAreaVisit(s,g.from);syncActiveActor(s);observeGrate(s,s.people[h.lineage],g.from,g.to);
 return {...f,g,key:[g.from,g.to].sort().join('|'),tool,client:s.people[h.lineage]};
}
