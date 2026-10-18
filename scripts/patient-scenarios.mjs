import {partyCombatFixture} from './party-combat-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
export const patientContext=commonContext;
export function patientFixture({load=0,generosity=.8}={}){
 const f=partyCombatFixture({roles:['guard']}),{s,h,e}=f;for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['injured-party','identity','people','companions','relationships','npc-control','npc-needs','containers'])setModule(s,id,true);
 const p=f.guard.person,c=f.guard.companion;p.health=20;c.hp=Math.ceil(c.maxHp*.2);h.hp=h.maxHp=100;h.energy=100;h.stats.might=12;h.personality.generosity=generosity;h.gold=50;h.combat=null;h.goal=null;h.inventory.potions=0;h.inventory.herbs=0;h.inventory.rations=load;
 for(const o of s.areas[h.area].objects)if(o.kind==='enemy')o.alive=false;
 const doctor=Object.values(s.people).find(p=>p.alive&&p.area==='a1'&&p.agenda.job==='healer');doctor.x=68;doctor.agenda.task=null;doctor.agenda.due=1e9;const body=s.areas.a1.objects.find(o=>o.person===doctor.id);if(body)body.x=68;
 syncActiveActor(s);return {...f,p,c,doctor};
}
