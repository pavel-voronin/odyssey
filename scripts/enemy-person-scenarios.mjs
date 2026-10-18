import {meaningFixture} from './event-meaning-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {createEnemy} from '../engine.js';
import {setModule} from '../rules.js';
import {meetPerson} from '../modules/social.js';
import {syncActiveActor} from '../actor-projection.js';
export const enemyPersonContext={...commonContext,meetPerson,random:()=>1};
export function enemyPersonFixture({x=0,link=true,life=false,localFood=false}={}){
 const f=meaningFixture(),{s,h}=f,a=s.areas.a2;for(const o of a.objects)if(o.kind==='enemy')o.alive=false;
 for(const id of ['enemy-people','people','npc-control','npc-knowledge','relationships','item-originals','containers','remains'])setModule(s,id,true);setModule(s,'enemy-people',link);if(life)for(const id of ['hostile-life','npc-needs','supply'])setModule(s,id,true);if(localFood)setModule(s,'local-food',true);
 h.area=a.id;h.x=x;h.combat=null;h.goal=null;h.habits=[];h.personality.generosity=.9;h.hp=100;h.inventory.potions=0;h.energy=100;
 const held={id:'prepared-bandit-possession',kind:'workPart',base:'clamp',name:'Сменный зажим',value:4,found:s.tick,foundArea:a.id,history:[]};
 const enemy=createEnemy(s,a,{requestedSpecies:'bandit',x,items:[held],patrol:1});
 // spawn's zero coordinate is preserved by the actual settings spread.
 const p=s.people[enemy.person];syncActiveActor(s);return {...f,a,enemy,p,held};
}
