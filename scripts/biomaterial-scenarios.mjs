import {forgingFixture,forgingContext,placeAtBench} from './forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {setModule} from '../rules.js';
import {changeProfession} from '../modules/identity.js';
import {bodyRemains} from '../modules/remains.js';
import {step} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
export const biomaterialContext=forgingContext;
export function biomaterialFixture({interior=false,wear=false}={}){
 const f=forgingFixture({interior}),{s,h}=f;if(wear)setModule(s,'item-wear',true);startKnife(s,f.worker,f.site,forgingContext);placeAtBench(f);for(let i=0;i<6;i++){s.tick++;workKnife(s,f.worker,forgingContext);}const knife=h.equipment.weapon;
 for(const id of ['animal-materials','remains','identity'])setModule(s,id,true);changeProfession(s,'ranger',forgingContext,'Практика лесного пути.');
 const area=s.areas.a2,enemy=area.objects.find(e=>e.kind==='enemy'&&e.species==='wolf');Object.assign(h,{area:area.id,x:enemy.x,hp:h.maxHp,energy:100,hunger:0,combat:enemy.id,goal:{kind:'hunt',area:area.id,x:enemy.x,object:enemy.id,started:s.tick}});enemy.hp=1;enemy.attack=0;step(s);if(enemy.alive)throw Error('Prepared real wolf kill failed');const remains=bodyRemains(s,enemy);syncActiveActor(s);return {...f,knife,enemy,remains,area,collector:s.people[h.lineage]};
}
