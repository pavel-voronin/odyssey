import {guardWeapon} from './commissioned-orders.js';
import {woundForce,woundActivity} from './wound-state.js';
import {canHoldWeapon} from './limb-state.js';
import {wearOwnedItem} from './item-condition.js';
import {recordLastingInjury} from './injury-events.js';
import {recordPersonRemains} from './remains.js';
import {actorFact} from '../actor-facts.js';
// A physical strike on one canonical native body; no strategic damage pool.
export function strikeNativePerson(s,attacker,target,ctx){
 const weapon=canHoldWeapon(attacker)?guardWeapon(s,attacker):null,before=target.health,damage=Math.max(1,Math.floor((2+(weapon?.power||0))*woundForce(s,attacker)));
 woundActivity(s,attacker,'arm');attacker.needs.energy=Math.max(0,attacker.needs.energy-2);target.health=Math.max(0,before-damage);if(weapon)wearOwnedItem(s,weapon,attacker.id,'attack',target.id,ctx);actorFact(s,'attack',attacker.id,target.id);actorFact(s,'hurt',target.id,attacker.id,before-target.health);
 recordLastingInjury(s,target,{id:attacker.id,person:attacker.id,name:attacker.name,species:'guard',alive:attacker.alive,damageType:weapon&&['dagger','sword','spear','knife','working-knife'].includes(weapon.base)?'cut':'impact'},{before,after:target.health,maximum:target.maxHealth||100,area:target.area,controller:'orders',physical:true},ctx);
 if(!target.health){target.alive=false;target.status='dead';target.died=s.tick;target.deathCause='Погиб в бою с '+attacker.name;target.agenda.task=null;if(target.borderDuty)target.borderDuty.active=false;const a=s.areas[target.area];if(!a.objects.some(o=>o.id==='grave-'+target.id))a.objects.push({id:'grave-'+target.id,kind:'grave',name:target.name,x:target.x});recordPersonRemains(s,target);}
 return {at:s.tick,by:attacker.id,target:target.id,before,after:target.health,damage:before-target.health};
}
