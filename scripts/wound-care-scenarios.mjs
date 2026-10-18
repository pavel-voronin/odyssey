import {meaningFixture} from './event-meaning-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {recordLocalWound} from '../modules/wound-events.js';
import {woundsTick} from '../modules/wound-world.js';import {woundActivity} from '../modules/wound-state.js';
export const woundContext=commonContext;
export function woundCareFixture({damage=35,medicine=0,herbs=0}={}){
 const f=meaningFixture(),{s,h,enemy}=f,p=s.people[h.lineage];for(const id of ['local-wounds','wound-care'])setModule(s,id,true);
 h.race=p.race='human';p.anatomy={parts:['leftLeg']};enemy.species='wolf';enemy.damageType='cut';h.hp=100-damage;syncActiveActor(s);
 const w=recordLocalWound(s,p,enemy,{before:100,after:h.hp,maximum:100,area:h.area,controller:'test'});if(w?.kind!=='cut')throw Error('Prepared cut not selected');
 enemy.alive=false;h.combat=null;h.gold=0;h.inventory.herbs=herbs;p.roadSupplies={food:0,medicine};h.personality.courage=.3;h.goal={kind:'work',area:h.area,x:h.x,started:s.tick,job:'dock',remaining:4};syncActiveActor(s);return {...f,p,w};
}
export function woundIntervals(f,n,{rest=false,role='body'}={}){for(let i=0;i<n;i++){woundActivity(f.s,f.p,role,rest);f.s.tick++;woundsTick(f.s,{bleed(p,h,n){if(h)h.hp=Math.max(0,h.hp-n);else p.health=Math.max(0,p.health-n);}});}}
