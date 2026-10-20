import assert from 'node:assert/strict';
import {returnFixture,ritualAct,returnContext} from './return-ritual-scenarios.mjs';
import {decayRemains} from '../modules/remains-cycle-state.js';
import {setModule} from '../rules.js';
import {recordLocalWound} from '../modules/wound-events.js';
import {syncActiveActor} from '../actor-projection.js';
import {createPerson} from '../modules/lineage.js';
import {personNeeds} from '../modules/needs.js';
export function skeletonFixture({injured=false,olderGrave=false}={}){
 const f=returnFixture({beforeDeath({s,h,a,enemy,caster,dead:p}){
  if(olderGrave){const id=createPerson(s,{name:'Прежний житель',race:'human',area:a.id,x:h.x+6},{initialJob:'guard'}),old=s.people[id];old.health=1;old.needs.hunger=100;old.biology={tick:-8,deficit:11,loss:0};setModule(s,'npc-needs',true);assert.equal(personNeeds(s,old,returnContext,{onlyUpkeep:true,migration:false,localFood:false}),true);assert.equal(old.alive,false);setModule(s,'npc-needs',false);}
  if(injured){setModule(s,'local-wounds',true);setModule(s,'limb-loss',true);enemy.id='return-limb-46';enemy.species='wolf';enemy.damageType='cut';h.combat=enemy.id;h.goal.object=enemy.id;h.maxHp=100;h.hp=60;syncActiveActor(s);recordLocalWound(s,p,enemy,{before:100,after:60,maximum:100,area:a.id,controller:'actor',scarPart:'rightLeg'},returnContext);assert.ok(p.limbLosses?.events.length);}
 }});
 // A selected physical decay boundary and the healer's arrival, not a replayed life.
 f.s.tick=f.b.death.tick+720;decayRemains(f.s,f.b);assert.equal(f.b.stage,'bones');assert.equal(f.b.substance.flesh.remaining,0);f.caster.needs.energy=100;f.caster.needs.hunger=0;return f;
}
export function returnedSkeleton(settings={}){const f=skeletonFixture(settings);for(let i=0;i<4;i++)ritualAct(f);assert.equal(f.dead.returnEpisode?.form,'skeleton');return f;}
