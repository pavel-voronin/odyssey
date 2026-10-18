import {rootWorld} from '../world-ref.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {npcController,npcAction} from './npc-control.js';
import {localContact} from './npc-contacts.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {fordBlocked,fordKey} from './fords.js';
import {pauseMentorJourney} from './mentor-journey.js';
import {rawSite,extractRaw,productionSources} from './goods.js';
import {ownedWorkshopSite,workshopPosition} from './workshop-place.js';
import {materialDeliveryEnabled as on,MATERIAL_DELIVERY_POLICY as P,pendingMaterialContract,materialDeliverySpent} from './material-delivery-state.js';

const detailed=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
const body=(s,p)=>detailed(s,p)||p;
const money=(s,p)=>detailed(s,p)?.gold??p.agenda?.wealth??0;
const energy=(s,p)=>detailed(s,p)?.energy??p.needs?.energy??0;
const ratio=(s,p)=>{const h=detailed(s,p);return h?h.hp/h.maxHp:p.health/(p.maxHealth||100);};
const awake=(s,p)=>p?.alive&&!p.needs?.sleeping&&!detailed(s,p)?.combat&&!detailed(s,p)?.transit&&['actor','personal'].includes(npcController(s,p));
const memory=p=>p.materialMemory ||= {version:1,sources:{},stores:{},after:0,lastActionTick:-1,history:[]};
const current=(s,id)=>Object.values(s.materialDeliveries?.orders||{}).find(o=>o.carrier===id&&['outward','collecting','returning'].includes(o.status));
// A small paid delivery never assumes that an old rejected threat is now safe.
// Its planner reads the person's recorded refusal/ford facts only. Execution
// still uses the existing physical route controller; no action module import.
const path=(s,p,from,to)=>{const h=detailed(s,p),blocked=new Set(fordBlocked(s,h||p)),roads=h?(h.atlas?.roads||[]).map(key=>{const [from,to]=key.split('|');return {from,to};}):p.navigation?.roads||[],avoided=h?(h.atlas?.known||[]).filter(id=>id!==from&&((h.memory.avoided[id]||0)>s.tick||s.rules?.['route-memory']!==false&&h.memory.rejected?.[id])):knownNPCHazards(s,p);return npcKnownRoute({navigation:{roads:roads.filter(r=>!blocked.has(fordKey(r.from,r.to)))}},from,to,avoided);};
function note(s,p,text,ctx){const h=s.actorStates[p.id];if(h)ctx.log(actorView(rootWorld(s),h),text,'work');else if(s.hero.area===p.area)ctx.log(s,text,'work');const m=memory(p);m.history.push({tick:s.tick,text});if(m.history.length>8)m.history.shift();}
function contact(s,a,b){const pos=body(s,a),other=localContact(s,b.id,pos.area);return other&&physicalDistance(s.areas[pos.area],pos.x,other.x)<=9?other:null;}
function knows(s,p,id){const h=detailed(s,p);return h?Boolean(h.memory.people.includes(id)||h.relations[id]):Object.hasOwn(p.agenda?.bonds||{},id)||(p.navigation?.contacts||[]).some(c=>c.person===id)||Boolean(p.craftRelations?.[id]);}
function claim(s,p){if(!awake(s,p)||materialDeliverySpent(s,p.id))return false;if(p.actionControl?.tick===s.tick&&p.actionControl.phases.some(v=>!['act','decision'].includes(v)))return false;if(!npcAction(s,p,detailed(s,p)?'actor':'personal','material-delivery'))return false;memory(p).lastActionTick=s.tick;return true;}
function spend(s,p,n=P.effort){const h=detailed(s,p);if(h){h.energy=Math.max(0,h.energy-n);h.lastAction='work';}else p.needs.energy=Math.max(0,p.needs.energy-n);}

// Only the actual body at a source or warehouse may observe its finite stock.
// An adjacent place name or a distant change is not a resource observation.
export function observeDeliveryMaterials(input,p){
 const s=rootWorld(input);if(!on(s)||!awake(s,p))return;const at=body(s,p),a=s.areas[at.area];if(!a||a.interior||a.temporaryCamp||physicalDistance(a,at.x,42)>18)return;
 if(a.civic){const source=productionSources(s,a);if(source)memory(p).stores[a.id]={area:a.id,name:a.name,quantity:source.materials.stock,seen:s.tick};}
 else {const source=rawSite(s,a);if(source)memory(p).sources[a.id]={area:a.id,name:a.name,quantity:source.remaining,seen:s.tick,x:42};}
 const m=p.materialMemory;if(m)for(const map of [m.sources,m.stores])for(const entry of Object.values(map).sort((a,b)=>b.seen-a.seen||a.area.localeCompare(b.area)).slice(24))delete map[entry.area];
}
function need(s,p){
 const at=body(s,p),site=ownedWorkshopSite(s,at.area,p.id);if(!site||site.object.state!=='intact'||site.object.closed)return null;
 const store=p.materialMemory?.stores[site.area.id];if(!store||store.quantity>=P.quantity)return null;
 const h=detailed(s,p),committed=Boolean(p.refitCommission||p.itemRepairCommission||h?.quests.some(q=>q.status==='active')||Object.values(s.workOrders||{}).some(o=>o.helper===p.id&&o.status==='active'));
 if(!committed&&ratio(s,p)>=.85)return null;
 const sources=Object.values(p.materialMemory.sources).filter(k=>k.quantity>0&&path(s,p,at.area,k.area).length&&path(s,p,k.area,at.area).length).sort((a,b)=>path(s,p,at.area,a.area).length-path(s,p,at.area,b.area).length||a.area.localeCompare(b.area));
 return sources[0]?{site,store,source:sources[0],quantity:Math.min(P.quantity,P.quantity-store.quantity),reason:committed?'У него уже есть принятое обязательство; собственная поездка отнимет время работы.':'Раны делают собственную поездку слишком дорогой.'}:null;
}
export function assessMaterialOffer(input,p,offer){
 const s=rootWorld(input),h=detailed(s,p),other=pendingMaterialContract(s,p.id);if(!on(s)||!awake(s,p)||energy(s,p)<35||ratio(s,p)<.75||p.role==='ребёнок'||p.materialCargo||other&&other.id!==offer.id)return {accept:false,reason:p.materialCargo?'Он уже несёт прежнюю непереданную партию.':'Сейчас не хватает здоровья, сил или свободного времени.'};
 const at=body(s,p),out=path(s,p,at.area,offer.source),back=path(s,p,offer.source,offer.returnArea);
 if(!out.length||!back.length)return {accept:false,reason:'Нужная дорога ему неизвестна.'};
 const due=p.personalJourney?.status==='active'&&p.personalJourney.kind==='seekMentor'?p.personalJourney.due:null;
 if(p.refitCommission||p.itemRepairCommission||p.forging?.active||due!=null&&due-s.tick<240||(h?.quests||[]).some(q=>q.status==='active'&&q.deadline&&q.deadline-s.tick<240)||Object.values(p.familyNeeds?.cases||{}).some(c=>['known','active'].includes(c.status)&&c.health/c.maximum<.35))return {accept:false,reason:'Собственное срочное дело несовместимо с этой поездкой.'};
 const fee=(h?h.personality.generosity<.35:p.agenda.duty<.35)?P.negotiatedFee:P.fee;
 return {accept:true,fee,reason:fee>P.fee?'За отрыв от своих занятий он просит большую плату.':'Известный путь и свободное время позволяют взять эту работу.'};
}
export function offerMaterialDelivery(input,client,carrier,ctx){
 const s=rootWorld(input);if(!on(s)||client.id===carrier.id||!awake(s,client)||!awake(s,carrier)||materialDeliverySpent(s,client.id)||materialDeliverySpent(s,carrier.id)||pendingMaterialContract(s,client.id)||pendingMaterialContract(s,carrier.id)||purseBlocked(client,s.tick)||!contact(s,client,carrier)||!knows(s,client,carrier.id))return null;
 const n=need(s,client);if(!n)return null;
 // Only the address and roads actually known by the customer can be offered.
 // The first prototype requires the carrier to know that road too; it does not
 // hand over an omniscient atlas together with the work.
 if(money(s,client)<P.fee)return null;
 if(!claim(s,client))return null;spend(s,client,1);memory(client).after=s.tick+P.cooldown;
 const registry=s.materialDeliveries ||= {version:1,serial:0,orders:{}};prune(registry,s);const id='material-delivery/'+(++registry.serial),from=body(s,client),budget=Math.min(P.negotiatedFee,money(s,client));
 const order={id,client:client.id,carrier:carrier.id,property:n.site.object.id,home:n.site.area.id,source:n.source.area,sourceName:n.source.name,returnArea:from.area,returnX:from.x,workplace:workshopPosition(s,n.site.area,n.site.object),checkedWorkplace:false,quantity:n.quantity,status:'quoted',offered:s.tick,quoteUntil:s.tick+48,deadline:s.tick+P.window,budget,fee:P.fee,advance:0,escrow:budget,paid:0,delivered:0,work:0,lastWorkTick:-1,reason:n.reason,paused:null};
 registry.orders[id]=order;setActorMoney(s,client,money(s,client)-budget);
 note(s,client,`${client.name} просит ${carrier.name} привезти ${n.quantity} сырья из «${n.source.name}». Предлагает ◈${P.fee}, может согласиться до ◈${budget}. Если его нет здесь, просит проверить его мастерскую. Бюджет отложен; согласия и аванса ещё нет. ${n.reason}`,ctx);
 return order;
}
const purseBlocked=(p,tick)=>(p.materialMemory?.after||0)>tick;
function prune(registry,s){
 const removable=Object.values(registry.orders).filter(o=>['completed','partial','declined','failed'].includes(o.status)&&!o.escrow&&!o.advanceDebt&&!Object.values(s.people).some(p=>p.materialCargo?.order===o.id)).sort((a,b)=>(a.ended||0)-(b.ended||0)||a.id.localeCompare(b.id));
 for(const o of removable.slice(0,Math.max(0,removable.length-P.records)))delete registry.orders[o.id];
}

// Quoting and answering occupy separate body turns. A conversation never
// reaches into a second controller and spends that person's action in advance.
export function answerMaterialOffer(input,carrier,ctx){
 const s=rootWorld(input),o=Object.values(s.materialDeliveries?.orders||{}).find(o=>o.carrier===carrier.id&&o.status==='quoted');if(!o||!on(s)||s.tick>o.quoteUntil)return false;
 const client=s.people[o.client];if(!client?.alive||!contact(s,carrier,client)||!awake(s,carrier)||!claim(s,carrier))return false;
 spend(s,carrier,1);const answer=assessMaterialOffer(s,carrier,o);
 if(!answer.accept||answer.fee>o.budget){o.status='declined';o.ended=s.tick;o.outcome=answer.reason||'Запрошенная плата не помещается в настоящий бюджет.';setActorMoney(s,client,money(s,client)+o.escrow);o.refunded=o.escrow;o.escrow=0;note(s,carrier,`${carrier.name} не берётся за доставку: ${o.outcome} Отложенные деньги остаются заказчику.`,ctx);return true;}
 const h=detailed(s,carrier);o.fee=answer.fee;o.advance=P.advance;o.paid=P.advance;o.accepted=s.tick;o.status='outward';o.paused=h?{kind:'actor',goal:h.goal}:{kind:'personal',task:carrier.agenda.task};
 if(carrier.personalJourney?.kind==='seekMentor'&&carrier.personalJourney.status==='active')pauseMentorJourney(s,carrier);
 const excess=o.escrow-o.fee;if(excess){setActorMoney(s,client,money(s,client)+excess);o.refunded=excess;o.escrow-=excess;}
 o.escrow-=P.advance;setActorMoney(s,carrier,money(s,carrier)+P.advance);if(h)h.goal=null;else{carrier.agenda.task=null;carrier.agenda.due=s.tick;}
 note(s,carrier,`${carrier.name} принимает доставку за ◈${o.fee}. ${answer.reason} Получен аванс ◈${P.advance}; сырьё ещё предстоит добыть и довезти.`,ctx);return true;
}

export function materialDeliveryFor(input,id){return current(rootWorld(input),id);}

function resume(s,p,o){
 const h=detailed(s,p),old=o.paused;o.paused=null;
 if(h){if(h.goal?.delivery===o.id)h.goal=null;if(!h.goal&&old?.kind==='actor')h.goal=old.goal;}
 else if(p.agenda){if(p.agenda.task?.delivery===o.id)p.agenda.task=null;if(!p.agenda.task&&old?.kind==='personal')p.agenda.task=old.task;p.agenda.due=s.tick+8;if(npcController(s,p)==='personal')p.status=p.agenda.task?.target&&p.agenda.task.target!==p.area?'wandering':'resident';}
}
function close(s,o,status,reason,ctx,{refund=true}={}){
 const client=s.people[o.client],carrier=s.people[o.carrier];o.status=status;o.ended=s.tick;o.outcome=reason;o.advanceDebt=Math.max(0,o.advance-Math.floor(o.fee*o.delivered/o.quantity));
 // This is the customer's unspent reserved balance. Paid advances are absent
 // from escrow and are never recreated by cancellation or a carrier's death.
 if(refund&&o.escrow>0&&client){setActorMoney(s,client,money(s,client)+o.escrow);o.refunded=(o.refunded||0)+o.escrow;o.escrow=0;}
 if(o.accepted!==undefined&&carrier?.alive){resume(s,carrier,o);note(s,carrier,`${carrier.name}: ${reason}${o.advanceDebt?` За неполученное сырьё уже уплачено ◈${o.advanceDebt}.`:''}`,ctx);}
 else if(o.accepted===undefined&&client?.alive)note(s,client,`${client.name}: предложение закрыто без принятого обязательства. Отложенный бюджет снова доступен.`,ctx);
}
export function expireMaterialDelivery(input,p,ctx){
 const s=rootWorld(input),o=pendingMaterialContract(s,p.id);if(!o)return false;
 const expired=s.tick>(o.status==='quoted'?o.quoteUntil:o.deadline);
 if(!expired&&on(s))return false;
 if(!claim(s,p))return false;
 close(s,o,o.status==='quoted'?'declined':'unresolved',expired?'Срок доставки прошёл. Доставленный результат не подтверждён; груз остаётся у действительного носителя.':'Новые условия доставки отключены. Имеющийся груз и полученные деньги сохраняются.',ctx);return true;
}
export function materialDeliveryDestination(input,p){
 const s=rootWorld(input),o=current(s,p.id);if(!o||!on(s))return null;
 const at=body(s,p),returnArea=o.checkedWorkplace?o.workplace.area:o.returnArea,returnX=o.checkedWorkplace?o.workplace.x:o.returnX,visible=o.status==='returning'&&at.area===returnArea?localContact(s,o.client,at.area):null,x=visible&&physicalDistance(s.areas[at.area],at.x,visible.x)<=24?visible.x:returnX;
 return o.status==='returning'?{kind:'materialReturn',target:returnArea,x,remaining:1,delivery:o.id,knownNavigation:true}:{kind:'materialCollect',target:o.source,x:42,remaining:1,delivery:o.id,knownNavigation:true};
}
export function workMaterialDelivery(input,p,ctx){
 const s=rootWorld(input),o=current(s,p.id);if(!o||!on(s)||!awake(s,p)||s.tick>o.deadline||energy(s,p)<P.effort)return false;
 const at=body(s,p),destination=materialDeliveryDestination(s,p);if(at.area!==destination.target||physicalDistance(s.areas[at.area],at.x,destination.x)>9||!claim(s,p))return false;
 if(o.status!=='returning'){
  if(p.materialCargo){close(s,o,'unresolved','Место под отдельную партию занято прежним грузом. Товар не возникает поверх него.',ctx);return true;}
  o.status='collecting';o.lastWorkTick=s.tick;o.work++;spend(s,p);
  if(o.work<P.work)return true;
  const a=s.areas[o.source],source=rawSite(s,a),quantity=source?Math.min(o.quantity,source.remaining):0;
  if(!quantity||extractRaw(s,a,quantity)!==quantity){close(s,o,'failed','По известному адресу сырьё закончилось. Оплаченного результата нет.',ctx);return true;}
  p.materialCargo={id:o.id+'/cargo',order:o.id,kind:'workshop-raw',source:o.source,owner:o.client,holder:p.id,quantity,collected:s.tick};o.cargo=p.materialCargo.id;o.collected=s.tick;o.status='returning';
  memory(p).sources[o.source]={area:o.source,name:a.name,x:42,quantity:source.remaining,seen:s.tick};
  const h=detailed(s,p);if(h)h.goal=null;else p.agenda.task=null;
  note(s,p,`${p.name} добывает сырьё: ${quantity}/${o.quantity}. Теперь партия отправляется к заказчику.`,ctx);return true;
 }
 const client=s.people[o.client],cargo=p.materialCargo;
 if(!client?.alive||!contact(s,p,client)){
  if(!o.checkedWorkplace&&(o.workplace.area!==o.returnArea||physicalDistance(s.areas[o.returnArea],o.workplace.x,o.returnX)>9)&&path(s,p,at.area,o.workplace.area).length){o.checkedWorkplace=true;spend(s,p,1);const h=detailed(s,p);if(h)h.goal=null;else p.agenda.task=null;note(s,p,`${p.name} не находит заказчика у прежнего места встречи и идёт проверить названную в договорённости мастерскую. Груз остаётся при нём.`,ctx);return true;}
  close(s,o,'unresolved','Заказчика нет по согласованным адресам. Товар не передан и оплата результата не получена.',ctx);return true;
 }
 const site=ownedWorkshopSite(s,body(s,client).area,client.id);
 if(!site||site.object.id!==o.property||site.object.state!=='intact'||site.object.closed){close(s,o,'unresolved','Прежняя мастерская больше не принимает эту партию. Груз остаётся у носителя.',ctx);return true;}
 if(!cargo||cargo.id!==o.cargo||cargo.order!==o.id||cargo.kind!=='workshop-raw'||cargo.source!==o.source||cargo.owner!==client.id||cargo.holder!==p.id||!(cargo.quantity>0&&cargo.quantity<=o.quantity)){
  close(s,o,'unresolved','Не предъявлена согласованная партия сырья. За чужой или потерянный товар заказчик не платит.',ctx);return true;
 }
 const store=productionSources(s,site.area);if(!store){close(s,o,'unresolved','Прежняя кладовая недоступна. Передачи не произошло.',ctx);return true;}
 spend(s,p,1);o.delivered=cargo.quantity;o.receipt={tick:s.tick,from:p.id,to:client.id,cargo:cargo.id,source:cargo.source,quantity:cargo.quantity,store:store.materials.id};store.materials.stock+=cargo.quantity;store.materials.delivered+=cargo.quantity;delete p.materialCargo;
 const earned=Math.floor(o.fee*o.delivered/o.quantity),payment=Math.max(0,Math.min(o.escrow,earned-o.paid));if(payment){setActorMoney(s,p,money(s,p)+payment);o.escrow-=payment;o.paid+=payment;}
 memory(client).stores[site.area.id]={area:site.area.id,name:site.area.name,quantity:store.materials.stock,seen:s.tick};
 close(s,o,o.delivered===o.quantity?'completed':'partial',`В кладовую мастерской передано ${o.delivered}/${o.quantity} сырья. Всего заработано ◈${o.paid}${o.escrow?'; остаток резерва вернулся владельцу':''}.`,ctx);return true;
}

export function materialOfferTurn(input,p,ctx){
 const s=rootWorld(input);if(materialDeliverySpent(s,p.id))return true;
 if(expireMaterialDelivery(s,p,ctx))return true;
 if(!on(s)||!awake(s,p))return false;
 observeDeliveryMaterials(s,p);
 if(answerMaterialOffer(s,p,ctx))return true;
 const pending=pendingMaterialContract(s,p.id);
 if(pending?.status==='quoted'&&pending.client===p.id){const h=detailed(s,p);if(h)h.lastAction='talk';return true;}
 if(pending||purseBlocked(p,s.tick)||!need(s,p))return false;
 const h=detailed(s,p),known=h?[...h.memory.people,...Object.keys(h.relations)]:[...Object.keys(p.agenda.bonds),...(p.navigation?.contacts||[]).map(c=>c.person),...Object.keys(p.craftRelations||{})];
 for(const id of [...new Set(known)].sort()){
  const carrier=s.people[id];if(!carrier||carrier.id===p.id||!contact(s,p,carrier))continue;
  if(offerMaterialDelivery(s,p,carrier,ctx))return true;
 }
 return false;
}
export function npcMaterialDeliveryPlan(input,p){
 const destination=materialDeliveryDestination(input,p);if(!destination)return false;
 if(p.agenda.task?.delivery!==destination.delivery||p.agenda.task.kind!==destination.kind)p.agenda.task=destination;else p.agenda.task.x=destination.x;
 if(p.area!==destination.target)p.status='wandering';return true;
}
export function actorMaterialDeliveryPlan(input,ctx){
 const s=rootWorld(input),p=s.people[input.hero.lineage],destination=materialDeliveryDestination(s,p);if(!destination)return false;
 if(ratio(s,p)<.75||energy(s,p)<35||input.hero.hunger>=65)return false;
 ctx.goal(input,destination.kind,destination.target,destination.x,destination.kind==='materialCollect'?'Добыть обещанное сырьё':'Довезти сырьё заказчику',destination.kind==='materialCollect'?'Аванс получен. Нужно добыть сырьё.':'Несёт сырьё к заказчику за остатком платы.',{delivery:destination.delivery});return true;
}
// A funded order is a real personal commitment. When no earlier work, urgent
// promise or need has selected an action, optional exploration should not make
// the customer abandon the address it has just agreed to use for payment.
export function materialClientPlan(s,ctx){
 const o=pendingMaterialContract(rootWorld(s),s.hero.lineage);if(!on(s)||!o||o.client!==s.hero.lineage||o.status==='quoted')return false;
 ctx.goal(s,'materialWait',o.workplace.area,o.workplace.x,'Дождаться заказанного сырья','Остаётся у мастерской принять сырьё.',{deliveryClient:o.id});return true;
}
export function materialClientAction(s){
 const o=pendingMaterialContract(rootWorld(s),s.hero.lineage);if(!on(s)||!o||o.id!==s.hero.goal?.deliveryClient||o.client!==s.hero.lineage){s.hero.goal=null;return false;}
 s.hero.energy=Math.min(100,s.hero.energy+1);s.hero.lastAction='wait';return true;
}
