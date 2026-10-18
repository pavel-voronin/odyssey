import {meaningFixture} from './event-meaning-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {step} from '../engine.js';import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {recordLocalWound} from '../modules/wound-events.js';import {recordAreaVisit,revealRoad} from '../actor-atlas.js';
export const limbContext=commonContext;
// Fixed conditional causes, not a sample of natural injury frequency.
export function limbFixture({part='rightArm',race='human',damage=40,loss=true,actual=false}={}){
 const f=meaningFixture(),{s,h,enemy}=f,p=s.people[h.lineage];setModule(s,'local-wounds',true);setModule(s,'limb-loss',loss);h.race=p.race=race;h.profession='smith';enemy.id=part==='rightLeg'?'limb-source-26':'limb-source-204';enemy.species='wolf';enemy.damageType='cut';enemy.attack=41;h.combat=enemy.id;h.goal.object=enemy.id;h.gold=0;h.inventory.herbs=0;recordAreaVisit(s,'a1');recordAreaVisit(s,h.area);revealRoad(s,'a1',h.area);syncActiveActor(s);
 if(actual)step(s);else {s.tick=1;h.hp=100-damage;syncActiveActor(s);recordLocalWound(s,p,enemy,{before:100,after:h.hp,maximum:100,area:h.area,controller:'actor'});}
 return {...f,p,w:p.localWounds?.active[0],event:p.limbLosses?.events[0]};
}
export function quietLimb(f){for(const e of f.s.areas[f.h.area].objects)if(e.kind==='enemy')e.alive=false;f.h.combat=null;f.h.goal=null;}
