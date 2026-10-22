import {stackRoom} from './container-state.js';
import {enabled} from '../rules.js';
import {goodsEnabled,takeGoods,productionSources,goodsWorkReceipt,completeGoodsWork} from './goods.js';
import {marketWallet,marketNeed,quoteMarket} from './market.js';
import {serviceStaff} from './service-access.js';
import {localContact} from './npc-contacts.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {carriedFood} from './stores.js';
export const creditEnabled=s=>enabled(s,'provision-credit')&&goodsEnabled(s)&&enabled(s,'supply');
const active=q=>q&&['requested','offered','accepted','working'].includes(q.status);
function body(s,p){const h=s.actorStates?.[p.id]||(s.hero?.lineage===p.id?s.hero:null);return selfDrivenActor(s,h)?{h,area:h.area,x:h.x,hunger:h.hunger,energy:h.energy,hp:h.hp,max:h.maxHp}:p&&{h:null,area:p.area,x:p.x,hunger:p.needs.hunger,energy:p.needs.energy,hp:p.health,max:p.maxHealth||100};}
function note(s,p,text,ctx){if(s.hero&&(p.id===s.hero.lineage||p.area===s.hero.area))ctx?.log?.(s,text,'trade');}
function relations(s,p,q,delta){if(!enabled(s,'relationships'))return;const supplier=s.people[q.supplier];if(!supplier?.alive)return;supplier.agenda.bonds[p.id]=(supplier.agenda.bonds[p.id]||0)+Math.sign(delta);const h=body(s,p)?.h;if(h&&enabled(s,'relationships')){const r=h.relations[supplier.id] ||= {trust:0,met:q.asked,lastSeen:s.tick,helped:0};r.trust=Math.max(-100,Math.min(100,r.trust+delta));r.lastSeen=s.tick;if(delta>0)r.helped++;}return true;}
function end(s,p,status,reason,ctx){const q=p.provisionCredit;if(!active(q))return;q.status=status;q.reason=reason;q.ended=s.tick;q.after=s.tick+192;if(['failed','fulfilled'].includes(status)){if(relations(s,p,q,status==='fulfilled'?6:-6))q.relationshipApplied=s.tick;}note(s,p,reason,ctx);}
export function creditStatus(s,p,ctx){const q=p.provisionCredit;if(!creditEnabled(s)||!active(q))return;
 if(['requested','offered'].includes(q.status)&&s.tick>q.until)end(s,p,'refused','Предложение о припасах истекло; запасы не переданы.',ctx);
 else if(['accepted','working'].includes(q.status)&&(s.tick>q.deadline||!p.alive&&p.area===q.area))end(s,p,'failed',!p.alive&&p.area===q.area?'Местный работник погиб до отработки; выданные припасы не возвращаются сами.':'В срок обещанная работа не получена; выданные припасы не возвращаются сами.',ctx);
}
export function creditSupplier(s,p){
 if(!creditEnabled(s))return null;const b=body(s,p),a=s.areas[b?.area],q=p.provisionCredit;
 if(!p.alive||b.h?.transit||active(q)||(q?.after||0)>s.tick||!a?.civic||b.hunger<45||b.energy<25||b.hp<b.max*.55||carriedFood(p,b.h?.inventory)>0||marketWallet(s,p.id)>=quoteMarket(s,a,'food','buy',2).total)return null;
 return serviceStaff(s,a,'food').filter(k=>k.id!==p.id&&localContact(s,k.id,a.id)&&physicalDistance(a,b.x,k.x)<=30&&k.creditRequest?.status!=='pending').sort((x,y)=>x.id.localeCompare(y.id))[0]||null;
}
export function askCredit(s,p,supplier,ctx){
 const b=body(s,p),k=s.people[supplier],a=s.areas[b.area];if(!creditEnabled(s)||k?.id===p.id||!k?.alive||k.area!==b.area||physicalDistance(a,b.x,k.x)>1||k.creditRequest?.status==='pending')return false;
 if(p.provisionCredit){if(active(p.provisionCredit))return false;p.creditHistory ||= [];p.creditHistory.push(p.provisionCredit);if(p.creditHistory.length>4)p.creditHistory.shift();}
 const q=p.provisionCredit={version:1,id:`credit/${p.id}/${s.tick}`,client:p.id,supplier:k.id,area:a.id,owner:a.goods?.owner||'civic/'+(a.city||a.id),asked:s.tick,acted:s.tick,until:s.tick+48,status:'requested'};k.creditRequest={version:1,id:q.id,client:p.id,area:a.id,asked:s.tick,until:q.until,status:'pending'};
 if(b.h){b.h.energy=Math.max(0,b.h.energy-1);if(!b.h.memory.people.includes(k.id))b.h.memory.people.push(k.id);}else p.needs.energy=Math.max(0,p.needs.energy-1);note(s,p,`${p.name} просит у ${k.name} припасы с отсроченной работой, не бесплатную выплату.`,ctx);return true;
}
export function creditSupplierTurn(s,k,ctx){
 const r=k.creditRequest;if(!creditEnabled(s)||r?.status!=='pending')return false;const p=s.people[r.client],q=p?.provisionCredit,b=p&&body(s,p),a=s.areas[k.area];
 const valid=q?.id===r.id&&q.status==='requested'&&p.alive&&b.area===k.area&&physicalDistance(a,b.x,k.x)<=1&&s.tick<=r.until&&!k.agenda.task&&!k.needs.sleeping&&k.needs.energy>=25&&k.needs.hunger<65&&k.agenda.duty>=.4&&serviceStaff(s,a,'food').some(provider=>provider.id===k.id)&&a.civic&&a.civic.food>=marketNeed(a,'food').reserve+2&&productionSources(s,a).field.stock>=2;
 r.status=valid?'offered':'refused';r.answered=s.tick;if(!valid){if(q?.id===r.id)end(s,p,'refused','Поставщик сейчас не может выделить припасы за будущую работу.',ctx);return true;}
 q.status='offered';q.offered=s.tick;q.until=s.tick+48;q.deadline=s.tick+120;q.terms=[{quantity:2,required:5},...(k.agenda.duty>=.75?[{quantity:1,required:3}]:[])];k.needs.energy=Math.max(0,k.needs.energy-1);note(s,p,`${k.name} предлагает 2 порции из кладовой за 5 рабочих действий здесь до тика ${q.deadline}.${q.terms.length>1?' Можно договориться на 1 порцию и 3 действия.':''}`,ctx);return true;
}
export function decideCredit(s,p,ctx){
 const q=p.provisionCredit,b=body(s,p),k=s.people[q?.supplier],a=s.areas[q?.area];if(!creditEnabled(s)||q?.status!=='offered'||q.acted===s.tick)return false;q.acted=s.tick;if(b.h)b.h.energy=Math.max(0,b.h.energy-1);else p.needs.energy=Math.max(0,p.needs.energy-1);
 const generosity=b.h?b.h.personality.generosity:p.agenda.duty,curiosity=b.h?b.h.personality.curiosity:p.agenda.curiosity,courage=b.h?b.h.personality.courage:p.agenda.duty;
 const urgent=b.h?.quests.some(q=>q.status==='active'&&q.deadline&&q.deadline<=s.tick+16),declines=urgent||b.energy<25||b.hp<b.max*.55||courage<.25&&generosity<.4&&b.hunger<75;
 const small=curiosity>.65&&generosity<.5,term=small?q.terms.find(t=>t.quantity===1):q.terms[0];
 if(declines||!term){end(s,p,'refused','Получатель не принимает новые условия: собственное дело или меньшая партия важнее.',ctx);return true;}
 if(!k?.alive||b.area!==q.area||k.area!==q.area||physicalDistance(a,b.x,k.x)>1||s.tick>q.until||!a.civic||a.civic.food<marketNeed(a,'food').reserve+term.quantity){end(s,p,'refused','К моменту согласия поставщик или доступный запас изменился; выдачи нет.',ctx);return true;}
 if(stackRoom(s,p.id,'food',term.quantity)<term.quantity){end(s,p,'refused','В рюкзаке нет места: припасы и новое обязательство не приняты.',ctx);return true;}
 const before=a.civic.food;if(takeGoods(s,a,'food',term.quantity,{flow:'exported',reason:'provision-credit',actor:p.id})!==term.quantity)return false;
 Object.assign(q,{status:'accepted',accepted:s.tick,quantity:term.quantity,required:term.required,transfer:{at:s.tick,from:q.owner,to:p.id,before,after:a.civic.food,quantity:term.quantity},task:{kind:'provisionWork',remaining:term.required}});p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food+=term.quantity;
 note(s,p,`${p.name} принимает ${term.quantity} порц. за ${term.required} будущих действий на угодьях. Кладовая ${before} → ${a.civic.food}; денег и готовой отработки не выдано.`,ctx);return true;
}
export function creditWork(s,p,ctx){
 creditStatus(s,p,ctx);const q=p.provisionCredit,b=body(s,p),a=s.areas[q?.area];if(!creditEnabled(s)||!['accepted','working'].includes(q?.status)||!p.alive||q.acted===s.tick||b.area!==q.area||physicalDistance(a,b.x,42)>1||!a.civic||b.energy<10||productionSources(s,a).field.stock<=0)return false;
 const before=productionSources(s,a).field.stock;q.acted=s.tick;q.status='working';goodsWorkReceipt(s,p,q.task,q.required);q.task.remaining--;if(b.h){b.h.energy=Math.max(0,b.h.energy-2);b.h.lastAction='work';}else p.needs.energy=Math.max(0,p.needs.energy-2);
 if(q.task.remaining<=0){const result=completeGoodsWork(s,a,q.task.goodsWork,{units:q.required===5?6:3});if(result.quantity>0){if(b.h)b.h.counters.peacefulWork=(b.h.counters.peacefulWork||0)+1;else p.agenda.work++;q.settlement={id:result.id,at:s.tick,produced:result.quantity,fieldBefore:before,fieldAfter:productionSources(s,a).field.stock};end(s,p,'fulfilled','Настоящая работа закончена, урожай остался у получателя обязательства. Долг закрыт без второй зарплаты.',ctx);}else end(s,p,'failed','Завершённая попытка не дала действительного урожая; обязательство не считается исполненным.',ctx);}
 return true;
}
