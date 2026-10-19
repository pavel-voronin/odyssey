import {recordEstatePickup,estateReceipt as receipt} from './estate-pickup.js';
import {estateClaimsOn,estateActor,estateBody,estateReady,estateById,estateSource,observeEstateClaims} from './estate-claim-state.js';
import {physicalDistance} from '../geometry.js';
import {setActorMoney} from '../actor-projection.js';
import {marketWallet} from './market.js';
import {presentItem,actorItemLocation} from './item-originals.js';
import {packContents,fitsPack} from './container-state.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {localContact} from './npc-contacts.js';
import {carriedFood} from './stores.js';
export function passEstateClaims(s,dead,heir,estate){
 if(!estateClaimsOn(s))return;
 for(const p of Object.values(s.people)){const e=p.estate;if(!e||e===estate||e.heir!==dead.id)continue;
  e.heirHistory ||= [];e.heirHistory.push({at:s.tick,from:dead.id,to:heir?.id??null,estate:estate.id});if(e.heirHistory.length>8)e.heirHistory.shift();e.heir=heir?.id??null;
  const area=e.assets[0]?.area||estateSource(s,p)?.area||dead.area;if(s.areas[area])estate.assets.push({kind:'estate-claim',area,id:e.id});
  for(const a of e.assets.filter(a=>a.kind==='item')){const item=presentItem(s,a.id)?.item;if(item?.inheritance?.estate===e.id&&item.inheritance.owner===dead.id)item.inheritance.owner=e.heir;}
 }
}
function near(s,p,at,range=2){const b=estateBody(s,p);return at&&!at.transit&&b.area===at.area&&!b.transit&&!p.roadTransit&&physicalDistance(s.areas[b.area],b.x,at.x)<=range;}
function accessible(s,p,at){return near(s,p,at)&&!s.areas[at.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[at.area],o.x,at.x)<18);}
function allowed(e,p){return e.heir===p.id||e.heir===null;}
export function takeEstateCash(s,p,id,{consentingCarrier=null}={}){
 const dead=estateById(s,id),e=dead?.estate,at=e&&estateSource(s,dead);if(!estateClaimsOn(s)||!estateReady(s,p)||!e?.cash||!allowed(e,p)||!accessible(s,p,at)||at.carrier&&at.carrier!==p.id&&at.carrier!==consentingCarrier||e.lastClaimTick>=s.tick)return 0;
 const n=e.cash;e.cash=0;e.paid+=n;e.status=e.heir===null?'claimed':'distributed';e.claimedBy=p.id;e.lastClaimTick=s.tick;setActorMoney(s,p,marketWallet(s,p.id)+n);receipt(e,{kind:'cash',at:s.tick,person:p.id,amount:n,area:at.area,source:at.object||e.custody?.id||null});
 const o=at.object&&s.areas[at.area].objects.find(o=>o.id===at.object);if(o?.kind==='estateFunds')o.spent=true;return n;
}
function receive(s,p,item){const h=estateActor(s,p),held=packContents(s,p.id);if(!fitsPack(s,p.id,{items:[...held.items,item]}))return false;(h?h.bag:(p.looseItems ||= [])).push(item);actorItemLocation(s,item,p.id);return true;}
function remove(s,p,item){const h=s.actorStates?.[p.id];if(p.prosthetic?.item===item||Object.values(h?.equipment||{}).some(i=>i===item))return false;let removed=false;for(const list of new Set([h?.bag,p.looseItems,p.legacy?.keepsakes].filter(Array.isArray))){const i=list.indexOf(item);if(i>=0){list.splice(i,1);removed=true;}}return removed;}
export function takeEstateItem(s,p,id,itemId){
 const dead=estateById(s,id),e=dead?.estate,b=estateBody(s,p),a=s.areas[b.area],source=e&&estateSource(s,dead);if(s.rules.equipment===false||!estateClaimsOn(s)||!estateReady(s,p)||!e||!allowed(e,p)||source?.transit||!a)return false;
 const cache=a.objects.find(o=>(o.items||[]).some(i=>i.id===itemId)),item=cache?.items.find(i=>i.id===itemId);if(!item||item.inheritance?.estate!==id||item.textCopy||item.libraryLoan||item.libraryTheft||!accessible(s,p,{area:a.id,x:cache.x,transit:null}))return false;
 observeEstateClaims(s,p);if(!receive(s,p,item))return false;cache.items.splice(cache.items.indexOf(item),1);cache.taken=cache.items.length===0&&!(cache.gold>0);recordEstatePickup(s,p,cache,[item]);return true;
}
export function requestEstateItem(s,p,holder,id,item){
 const e=estateById(s,id)?.estate,a=estateBody(s,p),b=holder&&estateBody(s,holder),note=p.estateNotes?.[id],seen=note?.holders[item];if(!estateClaimsOn(s)||!estateReady(s,p)||!estateReady(s,holder)||e?.heir!==p.id||!seen||seen.person!==holder.id||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>2||holder.estateRequest?.status==='pending'||packContents(s,p.id).items.some(i=>i.id===item))return false;
 const request={version:1,id:id+'/request/'+p.id+'/'+s.tick,estate:id,client:p.id,holder:holder.id,item,area:a.area,asked:s.tick,until:s.tick+48,status:'pending'};p.estateClaim=structuredClone(request);holder.estateRequest=request;return true;
}
export function estateResponse(s,holder){
 const r=holder?.estateRequest;if(!estateClaimsOn(s)||r?.status!=='pending'||!estateReady(s,holder))return false;const p=s.people[r.client],e=estateById(s,r.estate)?.estate,client=p?.estateClaim;
 if(s.tick>r.until||!p?.alive||client?.id!==r.id){r.status='expired';r.answered=s.tick;return true;}
 const b=estateBody(s,holder),a=estateBody(s,p);if(b.area!==a.area||physicalDistance(s.areas[b.area],b.x,a.x)>2)return false;
 const found=presentItem(s,r.item),item=found?.kind==='person'&&found.id===holder.id?found.item:null,willing=holder.agenda.duty>=.55||(holder.agenda.bonds[p.id]||0)>0;
 let outcome=item&&!willing?'disputed':'unavailable';if(e?.heir===p.id&&item?.inheritance?.estate===r.estate&&item.inheritance.owner===p.id&&!item.textCopy&&!item.libraryLoan&&!item.libraryTheft&&willing){const equipped=Object.values(s.actorStates?.[holder.id]?.equipment||{}).includes(item);if(!equipped&&fitsPack(s,p.id,{items:[...packContents(s,p.id).items,item]})&&remove(s,holder,item)&&receive(s,p,item)){item.inheritance.received={at:s.tick,person:p.id};if(p.estateNotes?.[e.id])p.estateNotes[e.id].holders[item.id]={person:p.id,area:a.area,x:a.x,seen:s.tick,witness:p.id};item.history ||= [];item.history.push({tick:s.tick,text:holder.name+' возвращает наследственную вещь '+p.name+'.'});receipt(e,{kind:'item-return',at:s.tick,person:p.id,from:holder.id,item:item.id,area:a.area});outcome='returned';}}
 r.status=outcome;r.answered=s.tick;client.status=outcome;client.answered=s.tick;p.estateAfter=s.tick+192;
 if(outcome==='disputed'){p.estateDisputes ||= [];const key=[r.estate,r.item,holder.id].join('|');if(!p.estateDisputes.some(d=>d.key===key)){p.estateDisputes.push({key,estate:r.estate,item:r.item,holder:holder.id,at:s.tick,area:a.area});if(p.estateDisputes.length>8)p.estateDisputes.shift();if(s.rules.relationships!==false){p.agenda.bonds[holder.id]=(p.agenda.bonds[holder.id]||0)-1;holder.agenda.bonds[p.id]=(holder.agenda.bonds[p.id]||0)-1;}}}
 return true;
}
function choice(s,p,ctx=null){
 if(!estateClaimsOn(s)||!estateReady(s,p))return null;observeEstateClaims(s,p);const incoming=p.estateRequest,client=incoming&&s.people[incoming.client],clientAt=client&&localContact(s,client.id,estateBody(s,p).area);if(incoming?.status==='pending'&&(s.tick>incoming.until||clientAt&&physicalDistance(s.areas[clientAt.area],estateBody(s,p).x,clientAt.x)<=2))return {stage:'reply',estate:p.estateRequest.estate,area:estateBody(s,p).area,x:estateBody(s,p).x};if((p.estateAfter||0)>s.tick)return null;
 const pending=p.estateClaim;if(pending?.status==='pending'){if(s.tick<=pending.until)return null;pending.status='unanswered';pending.answered=s.tick;p.estateAfter=s.tick+192;return null;}
 const b=estateBody(s,p),reachable=area=>{if(area===b.area)return true;const path=estateActor(s,p)&&ctx?.knownRoute?ctx.knownRoute(s,b.area,area):npcKnownRoute(p,b.area,area,knownNPCHazards(s,p));return path.length>=2&&path.length<=9&&carriedFood(p,b.inventory)>=Math.ceil((path.length-1)/3);};for(const n of Object.values(p.estateNotes||{}).sort((a,b)=>b.received-a.received)){if(n.heir!==p.id&&n.heir!==null)continue;
  const here=b.area===n.area&&physicalDistance(s.areas[b.area],b.x,n.x)<=12;
  if(n.cash>0){if(!reachable(n.area))continue;return {stage:'cash',estate:n.estate,area:n.area,x:n.x};}
  if(s.rules.equipment===false)continue;for(const item of n.items){const held=n.holders[item];if(held?.person===p.id||held&&n.heir===null)continue;if(held){const at=localContact(s,held.person,b.area);if(!reachable(at?b.area:held.area))continue;return {stage:'ask',estate:n.estate,item,person:held.person,area:at?b.area:held.area,x:at?.x??held.x};}if(here){const source=s.areas[n.area].objects.find(o=>o.items?.some(i=>i.id===item));if(source)return {stage:'item',estate:n.estate,item,area:n.area,x:source.x};}else if(reachable(n.area))return {stage:'item',estate:n.estate,item,area:n.area,x:n.x};}
 }return null;
}
export function estateClaimPlan(s,ctx){if(s.hero.goal)return false;const c=choice(s,s.people[s.hero.lineage],ctx);if(!c)return false;ctx.goal(s,'inheritanceClaim',c.area,c.x,c.stage==='ask'?'Обсудить наследственную вещь':c.stage==='reply'?'Ответить на претензию':'Получить наследственное имущество','Право и известный адрес сохраняются; получение проверяется при настоящем доступе.',{estate:c.estate,estateStage:c.stage,...(c.item?{item:c.item}:{}),...(c.person?{person:c.person}:{})});return true;}
export function npcEstateClaimPlan(s,p){const c=choice(s,p);if(!c)return null;if(p.area!==c.area)p.status='wandering';return {kind:'inheritanceClaim',target:c.area,x:c.x,remaining:1,estate:c.estate,estateStage:c.stage,...(c.item?{item:c.item}:{}),...(c.person?{person:c.person}:{}),knownNavigation:true};}
export function estateClaimAction(s,p,g,ctx={}){
 if(!estateClaimsOn(s)||!estateReady(s,p))return false;let ok=false;observeEstateClaims(s,p);
 if(g.estateStage==='cash')ok=takeEstateCash(s,p,g.estate)>0;else if(g.estateStage==='item')ok=takeEstateItem(s,p,g.estate,g.item);else if(g.estateStage==='ask')ok=requestEstateItem(s,p,s.people[g.person],g.estate,g.item);else if(g.estateStage==='reply')ok=estateResponse(s,p);
 if(!ok){p.estateAfter=s.tick+96;p.estateSearch={estate:g.estate,at:s.tick,area:estateBody(s,p).area,outcome:'not-accessible'};}else (estateActor(s,p)||p.needs).energy=Math.max(0,(estateActor(s,p)||p.needs).energy-1);
 ctx.log?.(s,ok?'Наследственное дело прошло при настоящей встрече с имуществом или человеком.':'В указанном месте имущество пока не получено. Прежняя претензия сохраняется.','heritage');return ok;
}
export function estateRevision(s,g){if(g.kind!=='inheritanceClaim')return null;const p=s.people[s.hero.lineage],n=p.estateNotes?.[g.estate],local=n?.area===s.hero.area,dead=local&&estateById(s,g.estate);return [s.rules['estate-claims'],n,p.estateClaim,p.estateRequest,(p.estateAfter||0)>s.tick,local&&dead?.estate.cash,local&&dead?.estate.heir];}
