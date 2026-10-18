import {actorView} from '../actor-view.js';
import {foodWalkingStride} from './hearth-food.js';
import {woundStride} from './wound-state.js';
import {canHoldWeapon,limbWorkAllows} from './limb-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {profile} from './common.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {collectionItems} from './collection-state.js';
import {npcLooseItems,actorItemLocation} from './item-originals.js';
import {itemWorking} from './item-condition.js';
import {fitsPack} from './container-state.js';
import {ownedWorkshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {productionSources} from './goods.js';
import {craftRespect} from './craft-respect.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {startKnife,workKnife} from './forging.js';
import {guardWeapon} from './commissioned-orders.js';

export const rivalryOn=s=>['craft-rivalry','forging','equipment','property','goods-cycle','relationships','craft-respect'].every(id=>enabled(s,id));
const actor=(s,p)=>s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id];
const body=(s,p)=>selfDrivenActor(s,actor(s,p))?actor(s,p):p;
const purse=(s,p)=>actor(s,p)?.gold??p.agenda.wealth;
const near=(s,a,b,d=9)=>a?.area===b?.area&&Number.isFinite(a.x)&&Number.isFinite(b.x)&&physicalDistance(s.areas[a.area],a.x,b.x)<=d;
const healthy=(s,p)=>{const h=body(s,p),n=h===p?p.needs:h;return p.alive&&!p.needs.sleeping&&(h.hp??p.health)>=(h.maxHp??p.maxHealth??100)*.75&&n.energy>=35&&n.hunger<65;};
const knife=(s,p)=>collectionItems(s,p.id).find(i=>i.toolKind==='knife'&&itemWorking(i)&&i.manufacture?.recipe==='working-knife');
const active=q=>q&&['open','reserved'].includes(q.status);
const mark=(s,p)=>{p.rivalActionTick=s.tick;};
function tell(s,p,ctx,text){const h=actor(s,p);if(h)ctx.log(actorView(s,h),text,'craft');}
function craftSite(s,p){const b=body(s,p),site=ownedWorkshopSite(s,b.area,p.id);return site?.object.state==='intact'&&!site.object.closed&&workToolReady(s,site.object)?site:null;}
function bidQuote(s,p,client){
 const b=body(s,p),h=actor(s,p),ready=knife(s,p);if(!healthy(s,p)||!canHoldWeapon(p)||p.id===client.id||craftRespect(s,client.id,p.id)<6||h&&selfDrivenActor(s,h)&&!['craft','time'].includes(profile(h).skill)||!selfDrivenActor(s,h)&&p.agenda.job!=='artisan')return null;
 if(ready)return {method:'held',ticks:1,item:ready.id};
 const site=craftSite(s,p),raw=site&&productionSources(s,site.area)?.materials;if(!site||!limbWorkAllows(p,'repair')||raw.stock<2||purse(s,p)<6)return null;
 const period=selfDrivenActor(s,h)?1:8,walk=Math.ceil(physicalDistance(s.areas[b.area],b.x,site.object.x)/(selfDrivenActor(s,h)?foodWalkingStride(s,h):6*woundStride(s,p))),work=knowsPracticalMethod(s,p.id,'craft')?4:6;
 return {method:'forge',ticks:(work+3+walk*2+(site.room?8:0))*period,item:null};
}
export function postKnifeOrder(s,p,ctx){
 if(!rivalryOn(s)||p.rivalOrder||!healthy(s,p)||p.agenda.job!=='guard'||npcController(s,p)!=='personal'||p.agenda.task||p.agenda.wealth<16||guardWeapon(s,p)||!s.areas[p.area]?.civic||!canStartNPCActivity(s,p)&&p.actionControl?.owner!=='personal')return null;
 const known=Object.values(s.people).some(other=>other.id!==p.id&&other.alive&&near(s,p,body(s,other),18)&&craftRespect(s,p.id,other.id)>=6);if(!known||!npcAction(s,p,'personal','knife-request'))return null;
 const q=p.rivalOrder={version:1,id:p.id+'/knife-request/'+s.tick,client:p.id,area:p.area,x:p.x,posted:s.tick,closes:s.tick+16,deadline:s.tick+192,status:'open',price:10,escrow:0,paid:0,winner:null,item:null,bids:[]};mark(s,p);return q;
}
export function applyKnifeOrder(s,p,client,ctx){
 const q=client?.rivalOrder,b=body(s,p),h=actor(s,p);if(!rivalryOn(s)||q?.status!=='open'||s.tick>=q.closes||p.rivalActionTick===s.tick||!near(s,b,client)||q.bids.length>=2||q.bids.some(b=>b.person===p.id)||['waiting','active'].includes(p.rivalJob?.status)&&active(s.people[p.rivalJob.client]?.rivalOrder)||!selfDrivenActor(s,h)&&(npcController(s,p)!=='personal'||p.agenda.task)||selfDrivenActor(s,h)&&(h.combat||h.transit||h.goal))return false;
 const quote=bidQuote(s,p,client);if(!quote||quote.ticks>q.deadline-q.closes)return false;
 if(!selfDrivenActor(s,h)&&!npcAction(s,p,'personal','knife-bid'))return false;
 q.bids.push({person:p.id,seen:s.tick,quote,skill:craftRespect(s,client.id,p.id),status:'waiting'});p.rivalJob={version:1,client:client.id,order:q.id,status:'waiting',lastKnown:s.tick};mark(s,p);if(h){h.lastAction='talk';h.action='ЗАКАЗ';h.intent='Предложить рабочий нож';h.reason='Заказчик выбирает мастера и заплатит за готовый нож.';h.speech='Могу изготовить рабочий нож.';}
 tell(s,p,ctx,`${client.name} ищет один рабочий нож за ◈10. ${p.name} предлагает ${quote.method==='held'?'своё готовое изделие':'изготовить нож'}; заказ пока никому не передан.`);return true;
}
function notifyResult(s,p,q,status,ctx){
 const job=p.rivalJob;if(job?.order!==q.id)return;job.status=status;job.lastKnown=s.tick;const h=actor(s,p);if(h){h.intent=status==='active'?'Выполнить заказ на нож':'Искать другое дело';h.reason=status==='active'?'Заказчик зарезервировал плату; заработать её можно только передачей изделия.':'Единственный заказ получил другой мастер. Своё время и вещи можно направить на другое дело.';}
 if(status==='lost'){
  const sour=p.agenda.sociability<.35;p.rivalHistory ||= [];p.rivalHistory.push({order:q.id,tick:s.tick,other:q.winner,outcome:sour?'resentment':'other-work'});if(p.rivalHistory.length>8)p.rivalHistory.shift();
  if(sour&&q.winner)p.agenda.bonds[q.winner]=Math.max(-100,(p.agenda.bonds[q.winner]||0)-2);
  p.agenda.due=s.tick+8;tell(s,p,ctx,`${s.people[q.client].name} отдаёт единственный заказ ${s.people[q.winner]?.name||'другому мастеру'}. ${p.name} ${sour?'сохраняет неприязнь, но ищет другое дело':'возвращается к своим занятиям'}.`);
 }
}
export function reserveKnifeOrder(s,client,ctx){
 const q=client?.rivalOrder;if(!rivalryOn(s)||q?.status!=='open'||s.tick<q.closes||s.tick>q.deadline||client.rivalActionTick===s.tick||!healthy(s,client)||npcController(s,client)!=='personal')return false;
 const bids=q.bids.filter(b=>{const p=s.people[b.person],h=p&&actor(s,p);return p&&p.rivalJob?.order===q.id&&p.rivalJob.status==='waiting'&&healthy(s,p)&&near(s,body(s,p),client)&&b.quote.ticks<=q.deadline-s.tick&&(!selfDrivenActor(s,h)||!h.combat&&!h.transit)&&(!selfDrivenActor(s,h)?npcController(s,p)==='personal':true);});
 bids.sort((a,b)=>b.skill-a.skill||a.quote.ticks-b.quote.ticks||a.seen-b.seen||a.person.localeCompare(b.person));
 if(!bids.length||client.agenda.wealth<16)return false;if(!npcAction(s,client,'personal','knife-reserve'))return false;
 const win=bids[0],before=purse(s,client);q.deposit={tick:s.tick,before,after:before-q.price};setActorMoney(s,client,before-q.price);q.escrow=q.price;q.status='reserved';q.winner=win.person;q.accepted=s.tick;mark(s,client);
 for(const bid of q.bids){bid.status=bid===win?'winner':'lost';const p=s.people[bid.person];if(p&&near(s,body(s,p),client))notifyResult(s,p,q,bid===win?'active':'lost',ctx);}return true;
}
export function deliverKnifeOrder(s,p,ctx){
 const job=p.rivalJob,client=s.people[job?.client],q=client?.rivalOrder,h=actor(s,p),i=knife(s,p);
 if(!rivalryOn(s)||q?.status!=='reserved'||q.winner!==p.id||q.id!==job.order||s.tick>q.deadline||p.rivalActionTick===s.tick||!i||!near(s,body(s,p),client)||!healthy(s,p)||!client.alive||!fitsPack(s,client.id,{items:[...npcLooseItems(s,client),i]}))return false;
 if(!selfDrivenActor(s,h)&&!npcAction(s,p,'personal','knife-deliver'))return false;
 const bag=npcLooseItems(s,p);if(bag.includes(i))bag.splice(bag.indexOf(i),1);else if(h?.equipment.weapon===i)h.equipment.weapon=null;else return false;
 npcLooseItems(s,client).push(i);actorItemLocation(s,i,client.id);q.status='done';q.item=i.id;q.finished=s.tick;q.paid=q.escrow;q.payment={tick:s.tick,person:p.id,before:purse(s,p),after:purse(s,p)+q.escrow,amount:q.escrow};setActorMoney(s,p,purse(s,p)+q.escrow);q.escrow=0;job.status='done';job.lastKnown=s.tick;mark(s,p);
 if(h){h.lastAction='trade';h.goal=null;h.intent='Заказанный нож передан';h.reason='Нож передан заказчику. Он заплатил договорённую сумму.';}else{p.agenda.task=null;p.agenda.due=s.tick+8;}
 i.history.push({tick:s.tick,text:`Заказ ${q.id}: передано ${client.name} за ◈10.`});tell(s,p,ctx,`${p.name} передаёт один изготовленный нож ${client.name} и получает ◈10 из его резерва. Заказ исполнен.`);return true;
}
export function rivalryTick(s){
 for(const client of Object.values(s.people)){const q=client.rivalOrder;if(!active(q))continue;
  const winner=q.winner&&s.people[q.winner];if(rivalryOn(s)&&client.alive&&s.tick<=q.deadline&&(!winner||winner.alive))continue;
  if(q.escrow){setActorMoney(s,client,purse(s,client)+q.escrow);q.refunded=q.escrow;q.escrow=0;}q.status='cancelled';q.ended=s.tick;
 }
}
function knownOrder(s,p){const job=p.rivalJob,q=s.people[job?.client]?.rivalOrder;return job&&q?.id===job.order?q:null;}
function awaitReply(s,p,q,ctx){
 const j=p.rivalJob;if(j?.status!=='waiting'||!q)return false;
 const client=s.people[q.client];if(q.winner&&near(s,body(s,p),client)){notifyResult(s,p,q,q.winner===p.id?'active':'lost',ctx);mark(s,p);return true;}
 if(s.tick<=q.closes+8){const h=actor(s,p);if(h&&selfDrivenActor(s,h)){h.intent='Ждать ответа заказчика';h.reason='Предложение сделано при встрече. Решение ещё не известно.';}return true;}
 j.status='withdrawn';j.lastKnown=s.tick;p.agenda.due=s.tick;return false;
}
export function rivalryNPCTurn(s,p,ctx){
 if(!rivalryOn(s)||p.rivalActionTick===s.tick)return false;
 const own=p.rivalOrder;if(own?.status==='open'&&s.tick>=own.closes&&reserveKnifeOrder(s,p,ctx))return true;if(own?.status==='reserved')return true;
 const q=knownOrder(s,p),job=p.rivalJob;
 if(awaitReply(s,p,q,ctx))return true;
 if(q?.status==='reserved'&&job.status==='active'&&q.winner===p.id){
  if(deliverKnifeOrder(s,p,ctx))return true;
  const client=s.people[q.client];if(knife(s,p)){p.agenda.task={kind:'return',target:q.area,x:q.x,remaining:1,knownNavigation:true};return false;}
  const site=craftSite(s,p);if(!site)return true;const at=workshopPosition(s,site.area,site.object);
  if(!near(s,p,at)){p.agenda.task={kind:'return',target:at.area,x:at.x,remaining:1,knownNavigation:true};return false;}
  const done=p.forging?.active?workKnife(s,p,ctx):startKnife(s,p,site,ctx);if(done)mark(s,p);return true;
 }
 if(postKnifeOrder(s,p,ctx))return true;if(p.agenda.job!=='artisan'||!healthy(s,p))return false;
 for(const client of Object.values(s.people))if(client.rivalOrder?.status==='open'&&client.id!==p.id&&near(s,p,client)&&applyKnifeOrder(s,p,client,ctx))return true;return false;
}
export function rivalryTurn(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(h.goal?.kind==='rivalDelivery'&&knownOrder(s,p)?.status!=='reserved')h.goal=null;if(!rivalryOn(s)||h.actorMode==='npc'||h.combat||h.transit||!healthy(s,p))return false;
 const q=knownOrder(s,p),job=p.rivalJob;
 if(awaitReply(s,p,q,ctx)){h.lastAction='rest';return true;}
 if(q?.status==='reserved'&&q.winner===p.id&&job.status==='active'){
  if(deliverKnifeOrder(s,p,ctx))return true;
  if(knife(s,p)){const client=s.people[q.client];if(h.goal?.kind!=='rivalDelivery')ctx.goal(s,'rivalDelivery',q.area,q.x,'Передать заказанный нож','Оплата остаётся в резерве до действительной передачи.',{person:client.id});return false;}
  if(!['forgeSupply','forgeWork'].includes(h.goal?.kind)){const site=craftSite(s,p);if(site)ctx.goal(s,'forgeSupply',site.area.id,42,'Изготовить нож по заказу','Нужно потратить собственные материалы и рабочие действия.',{property:site.object.id});}return false;
 }
 if(!['craft','time'].includes(profile(h).skill))return false;for(const client of Object.values(s.people))if(client.rivalOrder?.status==='open'&&client.id!==p.id&&near(s,h,client)&&applyKnifeOrder(s,p,client,ctx))return true;return false;
}
