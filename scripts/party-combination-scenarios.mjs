import assert from 'node:assert/strict';
import {step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {planFieldCamp} from '../modules/fieldcamp.js';
import {partyCombatFixture} from './party-combat-scenarios.mjs';
import {learnedPair} from '../modules/party-combination-policy.js';

// Prepared recruitment and approach; neither practice nor a combat action is
// fabricated. The same real bodies learn through actual engine rest turns.
export function pairCombatFixture({trained=false,campOnly=false}={}){
 const f=partyCombatFixture({roles:['guard','artisan']}),{s,h,e,ctx}=f;
 ctx.goal=(world,kind,area,x,intent,reason,extra={})=>{world.hero.goal={kind,area,x,started:world.tick,...extra};Object.assign(world.hero,{intent,reason});};
 for(const id of ['events','caravans','body'])setModule(s,id,false);
 const guard=f.members[0],striker=f.members[1];
 for(const {person:p}of f.members){p.agenda.duty=.8;p.agenda.curiosity=.8;p.agenda.sociability=.8;}
 if(trained||campOnly){
  h.area='a0';h.x=24;h.combat=null;h.goal=null;h.hp=h.maxHp;h.energy=60;h.hunger=0;h.magic.mana=h.magic.maxMana;
  for(const {person:p}of f.members){p.area=h.area;p.x=h.x-4;}
  syncActiveActor(s);assert.ok(planFieldCamp(s,ctx),'actual safe camp plan');
  if(campOnly){let n=0;while((!s.areas[h.area].temporaryCamp||Math.abs(h.x-68)>1)&&n++<100)step(s);assert.ok(s.areas[h.area].temporaryCamp&&Math.abs(h.x-68)<=1);for(const {person:p}of f.members){p.area=h.area;p.x=h.x-4;}return {...f,guard,striker};}
  let ticks=0;while(!learnedPair(s,guard.person.id,striker.person.id)&&ticks++<100)step(s);
  assert.ok(learnedPair(s,guard.person.id,striker.person.id),'three actual camp turns learned the pair method');
 }
 h.area='a2';h.x=e.x;h.combat=e.id;h.goal=null;h.hp=h.maxHp;h.energy=100;h.hunger=0;
 for(const {person:p,companion:c}of f.members){p.area=h.area;p.x=h.x-4;p.health=p.maxHealth||100;p.needs.energy=100;p.needs.hunger=10;p.needs.sleeping=false;c.hp=c.maxHp;}
 syncActiveActor(s);
 return {...f,guard,striker};
}
