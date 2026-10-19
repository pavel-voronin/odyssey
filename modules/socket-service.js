import {socketsOn,socketCompatible,isSocketComponent,SOCKET_COMPONENTS} from './socket-state.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {profile} from './common.js';
import {itemWorking} from './item-condition.js';
import {packContents,fitsPack} from './container-state.js';
import {presentItem,itemLocation,actorItemLocation} from './item-originals.js';
import {workshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {productionSources} from './goods.js';
import {marketWallet} from './market.js';
const actor=(s,p)=>{const h=s.actorStates?.[p.id]||(s.hero.lineage===p.id?s.hero:null);return selfDrivenActor(s,h)?h:null;};
const body=(s,p)=>actor(s,p)||p;
const energy=(s,p)=>actor(s,p)||p.needs;
const bag=(s,p)=>packContents(s,p.id).items;
function storeInBag(s,p,item){const h=packContents(s,p.id).h;(h?h.bag:(p.looseItems ||= [])).push(item);actorItemLocation(s,item,p.id);}
const held=(s,p)=>[...bag(s,p),...Object.values(packContents(s,p.id).h?.equipment||{}).filter(Boolean)];
const magic=(s,p)=>actor(s,p)?.magic||p.magic;
const relics=(s,p)=>actor(s,p)?.inventory.relics??p.marketCargo?.relics??0;
function setRelics(s,p,n){const h=actor(s,p);if(h)h.inventory.relics=n;else{p.marketCargo ||= {tools:0};p.marketCargo.relics=n;}}
const skilled=(s,p)=>actor(s,p)?['craft','time'].includes(profile(actor(s,p)).skill):p.agenda.job==='artisan';
function healthy(s,p){const h=actor(s,p);return p?.alive&&!p.needs.sleeping&&!p.ailment&&(h?!h.combat&&!h.transit&&h.hp>=h.maxHp*.75:p.health>=(p.maxHealth||100)*.75&&!p.roadTransit)&&energy(s,p).energy>=25&&energy(s,p).hunger<60;}
function close(s,p,q,range=2){const a=body(s,p),b=body(s,q);return a.area===b.area&&physicalDistance(s.areas[a.area],a.x,b.x)<=range;}
function siteReady(s,site,master){return site&&!site.home&&site.object.owner===master.id&&site.object.state==='intact'&&!site.object.closed&&workToolReady(s,site.object)&&skilled(s,master)&&healthy(s,master);}
function atBench(s,p,site){const b=body(s,p),pos=workshopPosition(s,site.area,site.object);return b.area===pos.area&&physicalDistance(s.areas[b.area],b.x,pos.x)<=2;}
function authorized(s,o,p){return o.client===p.id||!s.people[o.client].alive&&s.people[o.client].estate?.heir===p.id;}
function workState(p){return p.socketWork ||= {version:1,serial:0,orders:{},active:null,after:0};}
function orderById(s,id){for(const p of Object.values(s.people)){const o=p.socketWork?.orders[id];if(o)return o;}return null;}
function lawful(s,p,item){return held(s,p).includes(item)&&(!item.inheritance?.owner||item.inheritance.owner===p.id||!s.people[item.inheritance.owner]?.alive);}
export function requestSocketService(s,p,master,site,operation,{base=null,component=null}={}){
 if(!socketsOn(s)||!healthy(s,p)||!master||!siteReady(s,site,master)||!close(s,p,master)||!atBench(s,p,site)||!atBench(s,master,site)||workState(p).active||(master.socketQueue?.length||0)>=4||!['create','install','extract'].includes(operation))return null;
 if(operation==='create'&&(!magic(s,p)?.spells.includes('ward')||magic(s,p).mana<3||relics(s,p)<1))return null;
 if(operation!=='create'&&(!base||!lawful(s,p,base)||!socketCompatible(base)))return null;
 if(operation==='install'&&(!itemWorking(base)||base.socket?.component||!component||!lawful(s,p,component)||!isSocketComponent(component)))return null;
 if(operation==='extract'&&!isSocketComponent(base.socket?.component))return null;
 const fee=operation==='create'?4:2;if(marketWallet(s,p.id)<fee+4)return null;
 const state=workState(p),id=p.id+'/socket-work/'+(++state.serial),pos=workshopPosition(s,site.area,site.object),o={version:1,id,client:p.id,master:master.id,workshop:site.object.id,area:site.area.id,place:pos.area,x:pos.x,operation,base:base?.id??null,component:component?.id??base?.socket?.component?.id??null,asked:s.tick,until:s.tick+96,status:'pending',attended:null,fee,payment:{reserved:fee,paid:0,refunded:0},relic:null,raw:null,result:null,collected:null,history:[]};
 setActorMoney(s,p,marketWallet(s,p.id)-fee);
 if(operation==='create'){const before=relics(s,p);setRelics(s,p,before-1);magic(s,p).mana-=3;o.relic={owner:p.id,before,after:before-1,mana:3,talent:'ward',state:'reserved'};}
 state.orders[id]=o;state.active=id;master.socketQueue ||= [];master.socketQueue.push(id);return o;
}
function releaseQueue(master,id){if(master.socketQueue)master.socketQueue=master.socketQueue.filter(x=>x!==id);}
export function performSocketService(s,master,id){
 const o=orderById(s,id),p=o&&s.people[o.client],site=o&&workshopSite(s,o.area,o.workshop);if(!socketsOn(s)||!o||o.status!=='pending'||o.master!==master.id||o.asked>=s.tick||!healthy(s,master)||!siteReady(s,site,master)||!atBench(s,master,site))return false;
 const actual=workshopPosition(s,site.area,site.object);if(actual.area!==o.place||actual.x!==o.x){o.status='refused';o.finished=s.tick;releaseQueue(master,id);return true;}
 if(s.tick>o.until||!p?.alive){o.status='refused';o.finished=s.tick;releaseQueue(master,id);return true;}
 if(!healthy(s,p)||!atBench(s,p,site))return false;
 const base=o.base?held(s,p).find(i=>i.id===o.base):null,gem=o.component?held(s,p).find(i=>i.id===o.component):null;
 if(o.operation==='create'){
  const raw=productionSources(s,site.area).materials;if(raw.stock<1||!fitsPack(s,p.id,{items:[...bag(s,p),{slot:'charm'}]})){o.status='refused';o.finished=s.tick;releaseQueue(master,id);return true;}
  const before=raw.stock;raw.stock--;raw.used++;o.raw={source:raw.id,before,after:raw.stock,quantity:1};o.relic.state='consumed';
  const component={id:o.id+'/ward',base:'ward-chip',name:SOCKET_COMPONENTS.ward.name,kind:'socketComponent',slot:'charm',stat:'magic',power:0,rarity:1,value:7,modifier:'plain',physical:{version:1,holder:{kind:'socket-order',id:o.id},movedAt:s.tick},found:s.tick,foundArea:o.area,creator:master.id,history:[{tick:s.tick,text:'Вырезано из настоящей реликвии и заготовки по известному владельцу щитовому знаку.'}],socketComponent:{version:1,type:'ward',order:o.id,maker:master.id,client:p.id,born:s.tick,uses:0,lastUse:null}};
  itemLocation(s,component,{kind:'socket-order',id:o.id});o.result=component;
 }else{
  if(!base||!lawful(s,p,base)||!socketCompatible(base)||o.operation==='install'&&(!itemWorking(base)||base.socket?.component||!gem||!lawful(s,p,gem)||!isSocketComponent(gem))||o.operation==='extract'&&(!isSocketComponent(base.socket?.component)||base.socket.component.id!==o.component||!fitsPack(s,p.id,{items:[...bag(s,p),base.socket.component]}))){o.status='refused';o.finished=s.tick;releaseQueue(master,id);return true;}
  if(o.operation==='install'){const index=bag(s,p).indexOf(gem);if(index<0){o.status='refused';o.finished=s.tick;releaseQueue(master,id);return true;}bag(s,p).splice(index,1);base.socket ||= {version:1,id:base.id+'/socket/1',kind:'focus',component:null,history:[]};base.socket.component=gem;itemLocation(s,gem,{kind:'socket',id:base.id});base.socket.history.push({at:s.tick,master:master.id,client:p.id,operation:'install',component:gem.id,order:o.id});}
  else{const component=base.socket.component;base.socket.component=null;storeInBag(s,p,component);base.socket.history.push({at:s.tick,master:master.id,client:p.id,operation:'extract',component:component.id,order:o.id});}
  if(base.socket.history.length>12)base.socket.history.shift();
 }
 const rawPayment=o.operation==='create'?3:0;site.area.civic.treasury+=rawPayment+(p.id===master.id?o.fee-rawPayment:0);if(p.id!==master.id)setActorMoney(s,master,marketWallet(s,master.id)+o.fee-rawPayment);o.payment.paid=o.fee;o.status='completed';o.finished=s.tick;energy(s,master).energy-=2;releaseQueue(master,id);o.history.push({at:s.tick,master:master.id,operation:o.operation,energy:2});return true;
}
export function collectSocketService(s,p,id){
 const o=orderById(s,id);if(!socketsOn(s)||!o||!authorized(s,o,p)||o.collected!==null||o.master===p.id&&o.finished===s.tick||!healthy(s,p)||body(s,p).area!==o.place||physicalDistance(s.areas[o.place],body(s,p).x,o.x)>2)return false;
 if(o.status==='pending'){if(s.tick<=o.until)return false;o.status='refused';o.finished=s.tick;releaseQueue(s.people[o.master],id);}
 if(o.status==='completed'&&o.result){if(!fitsPack(s,p.id,{items:[...bag(s,p),o.result]}))return false;storeInBag(s,p,o.result);o.component=o.result.id;o.result=null;}
 if(o.status==='refused'){const refund=o.payment.reserved-o.payment.paid-o.payment.refunded;setActorMoney(s,p,marketWallet(s,p.id)+refund);o.payment.refunded+=refund;if(o.relic?.state==='reserved'){setRelics(s,p,relics(s,p)+1);o.relic.state='returned';}}
 if(!['completed','refused'].includes(o.status))return false;o.collected=s.tick;o.collectedBy=p.id;const state=s.people[o.client].socketWork;state.active=null;state.after=s.tick+192;return true;
}
export function socketMasterTurn(s,p){if(!socketsOn(s)||!healthy(s,p))return false;for(const id of p.socketQueue||[])if(performSocketService(s,p,id))return true;return false;}
function chooseSocket(s,p){
 if(!socketsOn(s)||!healthy(s,p))return null;const state=p.socketWork,current=state?.orders[state.active],b=body(s,p);
 if(current){if(current.status==='completed'&&current.result&&!fitsPack(s,p.id,{items:[...bag(s,p),current.result]}))return null;if(current.status!=='pending'||s.tick>current.until)return {stage:'collect',order:current,area:current.place,x:current.x};if(current.master===p.id)return {stage:'work',order:current,area:current.place,x:current.x};if(b.area!==current.place||physicalDistance(s.areas[b.area],b.x,current.x)>2)return {stage:'attend',order:current,area:current.place,x:current.x};return null;}
 for(const id of p.socketQueue||[]){const offered=orderById(s,id);if(!offered||offered.status!=='pending'||offered.client===p.id)continue;const site=workshopSite(s,offered.area,offered.workshop),client=s.people[offered.client];if(siteReady(s,site,p)&&(!atBench(s,p,site)||client&&atBench(s,client,site)||s.tick>offered.until))return {stage:'work',order:offered,area:offered.place,x:offered.x};}
 if((state?.after||0)>s.tick)return null;
 const a=s.areas[b.area],site=workshopSite(s,a);if(!site)return null;const master=s.people[site.object.owner];if(!master||!siteReady(s,site,master)||!atBench(s,master,site)||body(s,master).area!==b.area)return null;
 const inventory=held(s,p),base=inventory.find(i=>socketCompatible(i)&&lawful(s,p,i)),gem=inventory.find(isSocketComponent);if(base?.socket?.component&&!itemWorking(base))return {stage:'request',operation:'extract',base,site,master,area:b.area,x:body(s,master).x};
 if(base&&!base.socket?.component&&itemWorking(base)&&gem&&magic(s,p)?.spells.includes('ward'))return {stage:'request',operation:'install',base,component:gem,site,master,area:b.area,x:body(s,master).x};
 if(base&&!base.socket?.component&&!gem&&magic(s,p)?.spells.includes('ward')&&magic(s,p).mana>=3&&relics(s,p)>=1&&marketWallet(s,p.id)>=8)return {stage:'request',operation:'create',site,master,area:b.area,x:body(s,master).x};return null;
}
export function socketPlan(s,ctx){if(s.hero.goal)return false;const c=chooseSocket(s,s.people[s.hero.lineage]);if(!c)return false;ctx.goal(s,'socketService',c.area,c.x,c.stage==='collect'?'Получить работу мастера':'Подготовить осколок и сокет','Компонент и основа остаются настоящими вещами; цена, доступ и способность проверяются при работе.',{socketStage:c.stage,order:c.order?.id,operation:c.operation,base:c.base?.id,component:c.component?.id,master:c.master?.id,workshop:c.site?.object.id,exterior:c.site?.area.id});return true;}
export function npcSocketPlan(s,p){const c=chooseSocket(s,p);if(!c)return null;if(bothAreasDiffer(s,p,c.area))p.status='wandering';return {kind:'socketService',target:c.area,x:c.x,remaining:1,socketStage:c.stage,order:c.order?.id,operation:c.operation,base:c.base?.id,component:c.component?.id,master:c.master?.id,workshop:c.site?.object.id,exterior:c.site?.area.id,knownNavigation:true};}
function bothAreasDiffer(s,p,area){return body(s,p).area!==area;}
export function socketAction(s,p,g){
 if(!socketsOn(s)||!healthy(s,p))return false;if(g.socketStage==='request')return Boolean(requestSocketService(s,p,s.people[g.master],workshopSite(s,g.exterior,g.workshop),g.operation,{base:held(s,p).find(i=>i.id===g.base),component:bag(s,p).find(i=>i.id===g.component)}));
 if(g.socketStage==='collect')return collectSocketService(s,p,g.order);if(g.socketStage==='work')return performSocketService(s,p,g.order);const o=orderById(s,g.order);if(g.socketStage==='attend'&&o?.status==='pending'&&body(s,p).area===o.place&&physicalDistance(s.areas[o.place],body(s,p).x,o.x)<=2){o.attended=s.tick;return true;}return false;
}
export function socketRevision(s,g){if(g.kind!=='socketService')return null;const p=s.people[s.hero.lineage],o=orderById(s,g.order),client=o&&s.people[o.client],nearClient=client&&body(s,client).area===s.hero.area?[body(s,client).x,healthy(s,client)]:null;return [s.rules.sockets,p.socketWork,p.socketQueue,nearClient,o&&[o.status,o.attended,o.collected,s.tick>o.until],held(s,p).map(i=>[i.id,i.durability?.current,i.socket?.component?.id]),relics(s,p)];}
