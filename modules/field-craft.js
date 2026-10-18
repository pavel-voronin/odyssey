import {itemWearEnabled} from './item-condition.js';
import {fieldCraftEnabled,fieldNodeAvailable} from './field-craft-state.js';
import {collectionItems} from './collection-state.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {marketWallet,tradeGoods,quoteMarket} from './market.js';
import {localContact} from './npc-contacts.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {personNeeds} from './needs.js';
export const fieldKnife=i=>i?.toolKind==='knife'&&i.manufacture?.recipe==='working-knife'&&i.durability;
export function fieldBody(s,p){const actor=s.actorStates?.[p.id]||(s.hero.lineage===p.id?s.hero:null),h=selfDrivenActor(s,actor)?actor:null;return h?{h,area:h.area,x:h.x,energy:h.energy,hunger:h.hunger,health:h.hp,max:h.maxHp,herbs:h.inventory.herbs,interest:h.personality.curiosity}:p?.needs&&{h:null,area:p.area,x:p.x,energy:p.needs.energy,hunger:p.needs.hunger,health:p.health,max:p.maxHealth||100,herbs:p.roadSupplies?.medicine||0,interest:p.agenda.curiosity};}
export function safeFieldBody(s,p){const b=fieldBody(s,p);return p?.alive&&b&&!b.h?.transit&&!b.h?.combat&&!p.needs.sleeping&&b.health>=b.max*.75&&b.energy>=25&&b.hunger<55&&!s.areas[b.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&!o.hidden&&physicalDistance(s.areas[b.area],b.x,o.x)<=18);}
const ensure=p=>p.fieldCraft ||= {version:1,lessons:[],services:[],total:0,lastActionTick:-1,kit:{version:1,packed:0,remaining:0,spent:0,loads:[]}};
function energy(s,p,n){const b=fieldBody(s,p);if(b.h){b.h.energy=Math.max(0,b.h.energy-n);b.h.lastAction='work';}else p.needs.energy=Math.max(0,p.needs.energy-n);}
function herb(s,p){const b=fieldBody(s,p),before=b.herbs;if(before<1)return null;if(b.h)b.h.inventory.herbs--;else p.roadSupplies.medicine--;return {at:s.tick,owner:p.id,resource:b.h?'herbs':'medicine',before,after:before-1,quantity:1};}
function pack(s,p){const f=ensure(p);if(f.kit.remaining)return true;if((p.marketCargo?.tools||0)<1)return false;const before=p.marketCargo.tools;p.marketCargo.tools--;f.kit.packed+=2;f.kit.remaining+=2;f.kit.loads.push({at:s.tick,owner:p.id,kind:'tools',before,after:p.marketCargo.tools,units:2});if(f.kit.loads.length>8)f.kit.loads.shift();return true;}
export function buyFieldTool(s,p,ctx){const b=fieldBody(s,p),a=s.areas[b.area];if(!fieldCraftEnabled(s)||!safeFieldBody(s,p)||physicalDistance(a,b.x,58)>18||(p.marketCargo?.tools||0)>0)return false;const q=quoteMarket(s,a,'tools','buy',1,{gold:marketWallet(s,p.id)});if(!q.quantity||b.h&&ctx.maySpend&&!ctx.maySpend(s,'repair',q.total,ctx)||!b.h&&marketWallet(s,p.id)-q.total<8)return false;return tradeGoods(s,a,p.id,'tools','buy',1).quantity===1;}
export function fieldTeacher(s,p,id){const k=s.people[id],b=fieldBody(s,p),loc=k&&localContact(s,id,b.area);return k?.alive&&k.id!==p.id&&loc&&physicalDistance(s.areas[b.area],b.x,loc.x)<=9&&k.fieldCraft?.learned&&!k.needs.sleeping&&k.health>=(k.maxHealth||100)*.75&&k.needs.energy>=35&&k.needs.hunger<55&&npcController(s,k)==='personal'&&!k.agenda.task&&!k.refitCommission&&!k.itemRepairCommission&&!k.toolTeaching&&!k.brothTeaching&&canStartNPCActivity(s,k)&&k.fieldTeachTick!==s.tick?k:null;}
export function studyFieldCraft(s,p,node,ctx,{teacher=null}={}){
 if(!fieldCraftEnabled(s)||!fieldNodeAvailable(s,p.id,node)||!safeFieldBody(s,p)||p.fieldCraft?.lastActionTick===s.tick||!collectionItems(s,p.id).some(fieldKnife))return false;
 const old=p.fieldCraft?.study;if(old&&old.node!==node)return false;teacher=old?.teacher||teacher;const t=teacher&&fieldTeacher(s,p,teacher),b=fieldBody(s,p),fee=teacher?2:0;
 if(teacher&&!t||marketWallet(s,p.id)<fee||b.h&&fee&&ctx.maySpend&&!ctx.maySpend(s,'repair',fee,ctx))return false;
 if(!old&&(b.herbs<1||!p.fieldCraft?.kit.remaining&&(p.marketCargo?.tools||0)<1))return false;
 if(t&&!npcAction(s,t,'personal','field-teach'))return false;
 const f=ensure(p);if(!f.study){const material=herb(s,p);if(!material||!pack(s,p))return false;f.study={node,started:s.tick,area:b.area,teacher:teacher||null,required:node==='careful-maintenance'?2:teacher?2:3,progress:0,material,craft:p.skillPractice.craft.operations.slice(-3).map(e=>e.id),aid:p.skillPractice.aid.operations.slice(-3).map(e=>e.id),services:f.services.slice(-3).map(e=>e.id)};}
 if(t){if(s.tick%8===0)personNeeds(s,t,ctx,{onlyUpkeep:true});t.fieldTeachTick=s.tick;t.needs.energy=Math.max(0,t.needs.energy-2);setActorMoney(s,p,marketWallet(s,p.id)-fee);setActorMoney(s,t,marketWallet(s,t.id)+fee);}
 f.lastActionTick=s.tick;energy(s,p,2);f.study.progress++;const l={node,tick:s.tick,area:b.area,teacher:teacher||null,fee,step:f.study.progress};f.lessons.push(l);if(f.lessons.length>8)f.lessons.shift();
 if(f.study.progress>=f.study.required){const learned={node,at:s.tick,area:b.area,teacher:teacher||null,source:{craft:f.study.craft,aid:f.study.aid,services:f.study.services},material:f.study.material,actions:f.study.progress};if(node==='field-maintenance')f.learned=learned;else f.efficient=learned;f.study=null;if(f.goal)f.goal.status='done';ctx.log?.(s,node==='field-maintenance'?'Подтверждённые ремонт и помощь сложились в переносной способ: походный мастер. Прежняя профессия сохранена.':'Практика научила бережному обслуживанию: та же конечная деталь требует два рабочих действия вместо трёх.','skill');}return true;
}
export function serviceFieldKnife(s,p,item,ctx){
 const f=p.fieldCraft,b=fieldBody(s,p);if(!fieldCraftEnabled(s)||!itemWearEnabled(s)||!f?.learned||!safeFieldBody(s,p)||f.lastActionTick===s.tick||!fieldKnife(item)||!collectionItems(s,p.id).includes(item)||item.durability.current>item.durability.max*.25)return false;
 if(f.service&&f.service.item!==item.id)return false;if(!f.service&&!pack(s,p))return false;
 if(!f.service){f.kit.remaining--;f.kit.spent++;f.service={id:`field/${p.id}/${s.tick}`,item:item.id,started:s.tick,area:b.area,required:f.efficient?2:3,progress:0,steps:[],part:1,before:item.durability.current};}
 f.lastActionTick=s.tick;energy(s,p,2);f.service.steps.push({tick:s.tick,area:b.area});f.service.progress++;if(f.service.progress<f.service.required)return true;
 const d=item.durability,amount=Math.min(60,d.max-d.current),receipt={...f.service,finished:s.tick,finishedArea:b.area,beforeRepair:d.current,after:d.current+amount,restored:amount};d.current+=amount;d.restored+=amount;d.repairs++;d.lastRepair={tick:s.tick,master:p.id,order:receipt.id,restored:amount,method:'field-maintenance'};
 item.history.push({tick:s.tick,text:`Дорожное обслуживание тем же владельцем: +${amount} исправности, конечная деталь, ${receipt.progress} действий. Оригинал сохранён.`});f.services.push(receipt);f.total++;if(f.services.length>8)f.services.shift();f.service=null;ctx.log?.(s,`${item.name}: походное обслуживание восстановило ${amount} исправности. Это тот же нож; деталь из набора израсходована.`,'equipment');return true;
}
