import {campaignsOn,campaignNear} from './campaign-state.js';
import {walkCampOrder} from './camp-route.js';
import {watchNeeds} from './watch-needs.js';
import {guardWeapon} from './commissioned-orders.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
import {strikeNativePerson} from './person-strike.js';
import {physicalDistance} from '../geometry.js';
function release(s,o,op,reason){const p=s.people[o.person],m=op.members.find(m=>m.person===p.id);m.finished={at:s.tick,reason,area:p.area,x:p.x};s.society.orders=s.society.orders.filter(v=>v!==o);if(p.alive){p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+8;}if(!s.society.orders.some(v=>v.campaign===op.id)&&op.status!=='captured'){op.status='retreated';op.ended=s.tick;op.reason=reason;}}
function turnBack(s,o,reason){o.stage='returning';s.people[o.person].status='returning';o.reason=reason;}
export function campaignOrderTick(s,o,ctx){
 if(!campaignsOn(s))return;const op=s.authorities?.campaigns?.operations[o.campaign],p=s.people[o.person];if(!op)return;if(!p?.alive){release(s,o,op,'Погибший не возвращается и не заменяется.');return;}
 if(op.status==='captured'&&campaignNear(s,p,op.target,op.x,12)){if(!op.knownBy.includes(p.id))op.knownBy.push(p.id);release(s,o,op,'Приказ завершён; продолжает собственную жизнь.');return;}
 const needs=watchNeeds(s,p,ctx,o.stage==='fighting');if(!p.alive){release(s,o,op,'Смерть в пути.');return;}if(needs.blocked)return;
 const member=op.members.find(m=>m.person===p.id),commander=s.people[op.commander];if(o.stage!=='returning'&&(campaignNear(s,commander,p.area,p.x,12)&&(!commander.alive||s.society.orders.some(v=>v.campaign===op.id&&v.person===commander.id&&v.stage==='returning'))||!guardWeapon(s,p,member.weapon)||p.health<(p.maxHealth||100)*.5||p.needs.energy<25||p.needs.hunger>=65&&!(p.roadSupplies?.food>0)||s.tick-op.started>240))turnBack(s,o,'Раны, потеря командира, оружия, сил или снабжения срывают поход.');
 if(o.stage==='returning'){const result=walkCampOrder(s,p,o.from,42,{...ctx,route:()=>[...member.path].reverse().slice([...member.path].reverse().indexOf(p.area))},o);p.needs.energy=Math.max(0,p.needs.energy-1);if(result==='arrived'||result==='blocked')release(s,o,op,result==='blocked'?'Обратный путь закрыт; остаётся с этой стороны.':o.reason||'Отступление.');return;}
 if(o.stage==='marching'){const result=walkCampOrder(s,p,op.target,op.x,{...ctx,route:()=>member.path.slice(member.path.indexOf(p.area))},o);p.needs.energy=Math.max(0,p.needs.energy-1);if(result==='blocked')turnBack(s,o,'На настоящем маршруте обнаружена преграда.');else if(result==='arrived'){o.stage='fighting';p.status='guarding';}return;}
 const defender=s.people[op.defender],atPost=defender?.alive&&campaignNear(s,defender,op.target,op.x,12);
 if(atPost){if(defender.needs.sleeping||npcController(s,defender)!=='personal'||!canStartNPCActivity(s,defender)||!npcAction(s,defender,'personal','campaign-defense'))return;
 if(defender.health>=(defender.maxHealth||100)*.5&&defender.needs.energy>=20){const hit=strikeNativePerson(s,p,defender,ctx);op.battles.push(hit);for(const witness of Object.values(s.people))if(witness.alive&&!op.members.some(m=>m.person===witness.id)&&witness.id!==defender.id&&['resident','wandering'].includes(witness.status)&&!witness.needs.sleeping&&campaignNear(s,witness,op.target,op.x,12))witness.campaignDanger={version:1,operation:op.id,at:s.tick,area:op.target,x:op.x,by:p.id,target:defender.id};if(defender.alive)op.battles.push(strikeNativePerson(s,defender,p,ctx));if(op.battles.length>24)op.battles.splice(0,op.battles.length-24);return;}
 // A living defender yields this single post, retaining identity/property/kin.
 defender.borderDuty.active=false;defender.agenda.task=null;defender.x=Math.max(0,Math.min(100,defender.x+(op.x>50?-1:1)*5));const body=s.areas[defender.area].objects.find(v=>v.person===defender.id);if(body)body.x=defender.x;}
 if(!p.alive)return;op.status='captured';op.reason='Отряд занял один переход; новая служба берёт одну монету в казну своей власти. Прежние земли и частные вещи не захвачены.';op.ended=s.tick;op.knownBy=op.members.filter(m=>campaignNear(s,s.people[m.person],op.target,op.x,12)).map(m=>m.person);op.control={version:1,operation:op.id,edge:op.edge,state:op.fromState,guard:p.id,at:s.tick,rule:'paid-entry',fee:1};s.edges[op.edge].militaryControl={...op.control};p.campaignPost={operation:op.id,area:op.target,x:op.x};release(s,o,op,'Остаётся настоящим стражем занятого перехода; прежняя должность правителя не присваивается.');
}
