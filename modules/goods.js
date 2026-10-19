import {stackRoom} from './container-state.js';
import {enabled} from '../rules.js';
import {weatherAt} from './weather.js';
import {workToolReady} from './workshop-tool-state.js';
import {rootWorld} from '../world-ref.js';
import {countMarket} from './market-metrics.js';
import {workshopSite,workshopPosition,workshopInteriorsOn} from './workshop-place.js';
import {physicalDistance} from '../geometry.js';

export const GOODS_CAPACITY={food:100,tools:20},GOODS_PHASE=96;
const flows=['produced','imported','consumed','exported','lost'];
const valid=n=>Number.isFinite(n)&&n>=0;
const hash=(seed,id)=>{let n=seed>>>0;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
export function goodsEnabled(s){return enabled(s,'goods-cycle');}
export function initializeGoodsArea(s,a){
 if(!goodsEnabled(s)||!a?.civic||a.goods)return a?.goods;
 const ledger={};for(const kind of Object.keys(GOODS_CAPACITY))ledger[kind]={initial:a.civic[kind]||0,produced:0,imported:0,consumed:0,exported:0,lost:0};
 // Existing civic quantities stay canonical. Overflow starts empty, never another initial warehouse.
 return a.goods={version:1,owner:'civic/'+(a.city||a.id),place:a.id,overflow:{food:0,tools:0},ledger,history:[],revision:0};
}
export function goodsBatch(s,a,kind,slot='main'){
 if(!a?.civic||!Object.hasOwn(GOODS_CAPACITY,kind)||!['main','overflow'].includes(slot))return null;
 const quantity=slot==='main'?a.civic[kind]||0:a.goods?.overflow[kind]||0;
 return {id:`goods/${a.id}/${kind}/${slot}`,owner:a.goods?.owner||'civic/'+(a.city||a.id),place:a.id,kind,slot,quantity,unit:kind==='food'?'portion':'tool'};
}
export function goodsBalance(a,kind){
 const l=a?.goods?.ledger[kind];if(!l)return null;const expected=l.initial+l.produced+l.imported-l.consumed-l.exported-l.lost,actual=(a.civic[kind]||0)+(a.goods.overflow[kind]||0);return {expected,actual,difference:actual-expected};
}
function record(s,a,kind,quantity,flow,reason,actor){
 const g=initializeGoodsArea(s,a);if(!g||!quantity)return;
 if(!flows.includes(flow))throw new Error('Unknown goods flow');g.ledger[kind][flow]+=quantity;g.revision++;
 const entry={tick:s.tick,kind,quantity,flow,reason,actor:actor||null};g.history.push(entry);if(g.history.length>12)g.history.shift();
}
export function takeGoods(s,a,kind,quantity,{flow='consumed',reason='use',actor}={}){
 if(!flows.includes(flow))throw new Error('Unknown goods flow');
 if(!a?.civic||!Object.hasOwn(GOODS_CAPACITY,kind)||!valid(quantity)||!quantity||(a.civic[kind]||0)<quantity)return 0;
 if(goodsEnabled(s))initializeGoodsArea(s,a);a.civic[kind]-=quantity;if(goodsEnabled(s))record(s,a,kind,quantity,flow,reason,actor);return quantity;
}
export function putGoods(s,a,kind,quantity,{flow='imported',reason='delivery',actor,legacyCap=100}={}){
 if(!flows.includes(flow))throw new Error('Unknown goods flow');
 if(!a?.civic||!Object.hasOwn(GOODS_CAPACITY,kind)||!valid(quantity)||!quantity)return 0;
 if(!goodsEnabled(s)){const before=a.civic[kind]||0;a.civic[kind]=Math.min(legacyCap,before+quantity);return a.civic[kind]-before;}
 const g=initializeGoodsArea(s,a),accepted=Math.min(quantity,Math.max(0,GOODS_CAPACITY[kind]-(a.civic[kind]||0)));
 a.civic[kind]=(a.civic[kind]||0)+accepted;g.overflow[kind]+=quantity-accepted;record(s,a,kind,quantity,flow,reason,actor);return quantity;
}
export function transferGoods(s,from,to,kind,quantity,{actor,reason='transfer'}={}){
 if(!from?.civic||!to?.civic||from===to||!Object.hasOwn(GOODS_CAPACITY,kind)||!valid(quantity)||!quantity||(from.civic[kind]||0)<quantity)return 0;
 takeGoods(s,from,kind,quantity,{flow:'exported',actor,reason});putGoods(s,to,kind,quantity,{flow:'imported',actor,reason});return quantity;
}
// Optional stock-transfer adapters keep generic cargo free of a world/production dependency.
export const goodsTaker=(s,options)=>((a,kind,n)=>{if(Object.hasOwn(GOODS_CAPACITY,kind))return takeGoods(s,a,kind,n,{flow:'exported',...options});a.civic[kind]=(a.civic[kind]||0)-n;return n;});
export const goodsPutter=(s,options)=>((a,kind,n)=>{const tracked=goodsEnabled(s)&&Object.hasOwn(GOODS_CAPACITY,kind),accepted=Math.min(n,Math.max(0,(tracked?GOODS_CAPACITY[kind]:100)-(a.civic[kind]||0)));if(tracked)return putGoods(s,a,kind,accepted,options);a.civic[kind]=(a.civic[kind]||0)+accepted;return accepted;});
function resourceOwner(s,a){return s.areas[a.city]||a;}
export function productionSources(s,a){
 if(!goodsEnabled(s)||!a?.civic)return null;
 const home=resourceOwner(s,a),g=initializeGoodsArea(s,home);if(!g)return null;
 if(!g.sources){const harsh=['desert','mountain','undercity'].includes(home.type)||home.realm==='underground',capacity=harsh?24:48;
  const initial=8+hash(s.seed,home.id)%9;g.sources={field:{id:home.id+'/fields',place:home.id,initial:capacity,stock:capacity,capacity,regrown:0,harvested:0,renewedAt:Math.floor(s.tick/GOODS_PHASE)*GOODS_PHASE},materials:{id:home.id+'/raw-materials',place:home.id,initial,stock:initial,delivered:0,used:0}};
 }return g.sources;
}
export function rawSite(s,a){
 if(!goodsEnabled(s)||!a||!(['forest','mountain','cave','ruins','island'].includes(a.type)||a.foundedSettlement&&a.foundation?.originalType==='forest')||a.interior||a.temporaryCamp)return null;
 a.goodsRaw ||= {id:a.id+'/raw-source',owner:'world',place:a.id,initial:16+hash(s.seed,a.id+'/raw')%17,remaining:16+hash(s.seed,a.id+'/raw')%17,extracted:0};return a.goodsRaw;
}
export function extractRaw(s,a,quantity){const source=rawSite(s,a);if(!source||!valid(quantity)||source.remaining<quantity)return 0;source.remaining-=quantity;source.extracted+=quantity;return quantity;}
export function deliverRaw(s,a,carrier,quantity){
 const source=productionSources(s,a);if(!source||!carrier||!valid(quantity)||(carrier.goodsRawCargo?.quantity||0)<quantity||carrier.area!==a.id)return 0;
 carrier.goodsRawCargo.quantity-=quantity;source.materials.stock+=quantity;source.materials.delivered+=quantity;return quantity;
}
export function workshopFor(s,a,actor){
 const p=s.people[actor];if(!p?.alive)return null;
 const o=a.objects.find(o=>o.kind==='workshop'&&o.state==='intact'&&o.owner===actor&&workToolReady(s,o));if(!o)return null;
 const position=workshopPosition(s,a,o);return p.area===position.area&&(!workshopInteriorsOn(s)||!workshopSite(s,a,o.id)?.room||physicalDistance(s.areas[position.area],p.x,position.x)<=9)?o:null;
}
// The existing action controller supplies an actual completed work receipt, not a second worker loop.
export function completeGoodsWork(s,a,receipt,{kind='food',units=6,productionDeal=null,patronProject=null}={}){
 countMarket(s,'production');
 if(productionDeal&&patronProject||(productionDeal||patronProject)&&kind!=='tools'||!goodsEnabled(s)||!a?.civic||!receipt||!receipt.id||!valid(units)||!valid(receipt.spent)||!valid(receipt.required)||receipt.spent<receipt.required||!(receipt.required>0))return {quantity:0,reason:'no-work'};
 const p=s.people[receipt.actor];if(!p?.alive||p.needs?.sleeping||p.area!==a.id&&!(kind==='tools'&&workshopFor(s,a,p.id)))return {quantity:0,reason:'absent-worker'};
 if(p.goodsWork?.id===receipt.id)return {quantity:0,reason:'duplicate',repeated:true};
 const source=productionSources(s,a);let quantity=0,reason;
 if(kind==='food'){
  quantity=Math.min(source.field.stock,Math.max(0,Math.round(units*weatherAt(s,a).harvest)));
  source.field.stock-=quantity;source.field.harvested+=quantity;reason=quantity?'harvest':'exhausted-field';
 }else if(kind==='tools'){
  if(!workshopFor(s,a,p.id))reason='unavailable-workshop';
  else if(productionDeal||patronProject){const c=productionDeal?s.productionDeals?.[productionDeal]:s.patronProjects?.[patronProject];if(!enabled(s,productionDeal?'production-finance':'patronage')||c?.status!=='working'||c.producer!==p.id||c.area!==a.id||c.workshop!==workshopFor(s,a,p.id)?.id||c.material.state!=='reserved'||c.material.quantity!==2||units!==1||receipt.required!==3||stackRoom(s,p.id,'tools',1)<1)reason='invalid-financed-work';else{quantity=1;reason=productionDeal?'financed-craft':'gifted-craft';c.material.state='consumed';}}
  else if(source.materials.stock<2)reason='no-materials';
  else{quantity=Math.min(Math.floor(units),Math.floor(source.materials.stock/2));source.materials.stock-=quantity*2;source.materials.used+=quantity*2;reason='craft';}
 }else throw new Error('Unknown manufactured goods');
 if(quantity){putGoods(s,a,kind,quantity,{flow:'produced',reason,actor:p.id});if(productionDeal||patronProject){takeGoods(s,a,kind,quantity,{flow:'exported',reason:productionDeal?'financed-cargo':'gifted-cargo',actor:p.id});(p.marketCargo ||= {tools:0}).tools+=quantity;}}
 return p.goodsWork={id:receipt.id,at:s.tick,kind,quantity,reason};
}
export function goodsWorkReceipt(s,p,task,required=3){
 if(!task.goodsWork)task.goodsWork={id:`${p.id}/${s.tick}/${task.kind}`,actor:p.id,required,spent:Math.max(0,required-task.remaining)};
 task.goodsWork.spent++;return task.goodsWork;
}
export function requestHarvest(s,a,reason){
 if(!goodsEnabled(s)||!a?.civic)return false;const g=initializeGoodsArea(s,a);g.harvestRequest={since:s.tick,until:s.tick+240,reason};return true;
}
export function goodsTick(input){
 const s=rootWorld(input);if(!goodsEnabled(s))return;
 if(s.goodsAreaCount!==s.nextArea){for(const a of Object.values(s.areas))initializeGoodsArea(s,a);s.goodsAreaCount=s.nextArea;}
 if(s.tick%GOODS_PHASE)return;
 countMarket(s,'productionPhase');
 for(const a of Object.values(s.areas))if(a.goods&&a.civic){
  for(const kind of Object.keys(GOODS_CAPACITY)){const moved=Math.min(a.goods.overflow[kind],Math.max(0,GOODS_CAPACITY[kind]-(a.civic[kind]||0)));a.civic[kind]+=moved;a.goods.overflow[kind]-=moved;}
  const field=a.goods.sources?.field;if(field&&s.tick-field.renewedAt>=GOODS_PHASE){const growth=Math.min(field.capacity-field.stock,Math.max(1,Math.round(8*weatherAt(s,a).harvest)));field.stock+=growth;field.regrown+=growth;field.renewedAt=s.tick;}
 }
}
