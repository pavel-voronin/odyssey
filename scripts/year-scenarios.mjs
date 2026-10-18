import {meaningFixture} from './event-meaning-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export function yearFixture({periodic=false,death=false}={}){
 const f=meaningFixture(),{s,h,enemy}=f;
 if(death){h.hp=h.maxHp=152;enemy.attack=100;}
 else for(const id of ['people','npc-control','npc-needs','supply','background-towns'])setModule(s,id,true);
 if(periodic)s.tick=239;
 syncActiveActor(s);return f;
}
