import {layoutFixture,layoutContext} from './delve-layout-scenarios.mjs';
import {step} from '../engine.js';import {setModule} from '../rules.js';import {teachSpell} from '../modules/magic.js';
export const guardianContext=layoutContext;
export function guardianFixture({curiosity=.8,magic=false}={}){
 const f=layoutFixture({guardian:true}),{s,h}=f,r=f.layout.guardian,room=s.areas[r.area],node=room.objects.find(o=>o.id===r.node),enemy=room.objects.find(o=>o.id===r.enemy);h.personality.curiosity=curiosity;
 if(magic){setModule(s,'magic',true);if(!teachSpell(s,'spark',layoutContext,'Собственное прежнее обучение'))throw Error('No known spell');h.magic.mana=16;}
 return {...f,room,node,enemy,r};
}
export function untilGuardian(f,condition,limit=96){for(let i=0;i<limit;i++){if(condition(f))return i;if(!f.h.alive)throw Error('Body died before expected guardian event');step(f.s);}if(!condition(f))throw Error('Guardian action exceeded '+limit+' ticks');return limit;}
