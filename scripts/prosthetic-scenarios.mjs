import {limbFixture,quietLimb,limbContext} from './limb-loss-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {woundsTick} from '../modules/wound-world.js';
import {woundActivity} from '../modules/wound-state.js';
import {productionSources} from '../modules/goods.js';
export const prostheticContext=limbContext;
export function prostheticFixture({healed=false}={}){
 const f=limbFixture({part:'rightLeg'}),{s,h,p}=f;quietLimb(f);
 for(const id of ['prosthetics','forging','goods-cycle','property','item-originals','containers','npc-control','people'])setModule(s,id,true);
 h.area='a6';h.x=42;h.gold=100;h.energy=100;h.hunger=0;h.goal=null;h.bag=[];h.inventory.herbs=0;
 const a=s.areas.a6,o=a.objects.find(o=>o.kind==='workshop'),master=s.people[o.owner];
 Object.assign(master,{area:a.id,x:o.x,status:'resident',health:master.maxHealth||100});Object.assign(master.needs,{energy:100,hunger:0,sleeping:false});master.agenda.task=null;master.agenda.due=s.tick;productionSources(s,a);syncActiveActor(s);
 // One isolated recovering body, at most80 intervals; blood uses its actual HP.
 if(healed)for(let i=0;i<80;i++){woundActivity(s,p,'body',true);s.tick++;woundsTick(s,{bleed(_p,_h,n){h.hp-=n;}});}
 syncActiveActor(s);return {...f,a,o,master};
}
