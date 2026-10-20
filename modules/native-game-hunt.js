import {woundForce,woundActivity} from './wound-state.js';
import {wearOwnedItem} from './item-condition.js';
import {knowsGameMeat,meatKnife,meatCanAct,meatSpend} from './meat-state.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {guardWeapon} from './commissioned-orders.js';
import {enemyDamage,enemyReply} from './adversaries.js';
import {recordPersonRemains} from './remains.js';
import {recordLastingInjury} from './injury-events.js';
import {actorFact} from '../actor-facts.js';
export function nativeGameHunt(s,p,t,ctx){const a=s.areas[p.area],e=a.objects.find(e=>e.id===t.object&&e.alive&&e.ecology);if(!e||physicalDistance(a,p.x,e.x)>24||!knowsGameMeat(s,p)||!meatKnife(s,p)||p.needs.energy<25||p.needs.hunger>=90||p.health<(p.maxHealth||100)*.5||++t.attempts>8){p.agenda.task=null;return false;}if(!meatCanAct(s,p,{inTurn:true}))return false;if(physicalDistance(a,p.x,e.x)>2){p.x+=areaStep(a,p.x,e.x,6);t.x=e.x;meatSpend(s,p);return true;}woundActivity(s,p,'arm');const weapon=guardWeapon(s,p),before=e.hp,damage=enemyDamage(s,e,Math.max(1,(2+(weapon?.power||0))*woundForce(s,p)),'physical',ctx,false);if(weapon)wearOwnedItem(s,weapon,p.id,'attack',e.id,ctx);e.hp=Math.max(0,e.hp-damage);meatSpend(s,p,2);actorFact(s,'attack',p.id,e.id);actorFact(s,'hurt',e.id,p.id,before-e.hp);if(!e.hp){ctx.npcVictory(s,a,e,p);p.agenda.task=null;return true;}const health=p.health,reply=enemyReply(s,e,e.attack,{...ctx,combatArea:a.id},p);p.health=Math.max(0,p.health-reply);recordLastingInjury(s,p,e,{before:health,after:p.health,maximum:p.maxHealth||100,area:a.id,controller:'orders',physical:true},ctx);if(!p.health){p.alive=false;p.status='dead';p.died=s.tick;p.deathCause='Охота: '+e.name;p.agenda.task=null;a.objects.push({id:'grave-'+p.id,kind:'grave',name:p.name,x:p.x});recordPersonRemains(s,p);}return true;}
