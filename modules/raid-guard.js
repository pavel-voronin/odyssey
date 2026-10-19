import {npcAction,canStartNPCActivity} from './npc-control.js';
import {personNeeds} from './needs.js';
import {guardWeapon} from './commissioned-orders.js';
import {canHoldWeapon} from './limb-state.js';
import {woundForce} from './wound-state.js';
// The same real local defensive strike used by the existing merchant raid.
// No extra enemy round, strategic damage, cloned body or free second action.
export function strikeRaidGuard(s,p,e,defender,ctx,record=()=>{},x=defender?.x){
 if(!defender||!canStartNPCActivity(s,defender)||!npcAction(s,defender,'personal','raid-defense'))return false;
 defender.raidDefenseTick=s.tick;personNeeds(s,defender,ctx,{onlyUpkeep:true,migration:false});if(!defender.alive)return false;
 defender.needs.energy=Math.max(0,defender.needs.energy-2);const weapon=canHoldWeapon(defender)?guardWeapon(s,defender):null,damage=Math.max(1,Math.floor((2+(weapon?.power||0))*woundForce(s,defender))),before=e.hp;e.hp=Math.max(0,e.hp-damage);p.health=e.hp;record(s,p,'defended',{person:defender.id,before,after:e.hp});p.hostileLife.known.danger={person:defender.id,x,seen:s.tick};return true;
}
