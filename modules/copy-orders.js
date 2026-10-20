import {dateNewDocument} from './period-date.js';
import {textValue} from './text-values.js';
import {copyOrders,copyOrder,copyDesk,copySheets,draftContent} from './copy-order-state.js';
import {textsOn,textActor,heldTexts,canWriteText,canReadText,textWork,textMemory} from './text-state.js';
import {registerLiteracy} from './literacy-state.js';
import {physicalDistance} from '../geometry.js';
import {personLocation} from '../person-location.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {fitsPack} from './container-state.js';
import {itemLocation,actorItemLocation} from './item-originals.js';
import {canStartNPCActivity,npcController,npcAction} from './npc-control.js';
const body=(s,p)=>textActor(s,p?.id)||(p?.alive?personLocation(s,p.id):null);
const vital=(s,p)=>textActor(s,p?.id)||p?.needs;
function ready(s,p){const h=textActor(s,p?.id),b=body(s,p);return textsOn(s)&&p?.alive&&b&&!h?.combat&&!h?.transit&&!p.roadTransit&&!p.needs.sleeping&&!p.ailment&&vital(s,p).energy>=30&&vital(s,p).hunger<60&&(h?h.hp>=h.maxHp*.75:p.health>=(p.maxHealth||100)*.75);}
const at=(s,p,o)=>{const b=body(s,p);return b?.area===o.area&&physicalDistance(s.areas[o.area],b.x,o.x)<=2;};
const lawful=(p,i)=>i&&(!i.textCopy||i.textCopy.owner===p.id)&&i.libraryLoan?.returned!==null&&i.libraryTheft?.returned!==null;
function sourceReady(s,p,i){const w=textWork(s,i);return lawful(p,i)&&i.textCopy?.condition==='intact'&&['employment-note','mechanism-sequence','spell-manual'].includes(w?.content.kind)&&heldTexts(s,p.id).filter(k=>k.textCopy?.content===w.id&&k.textCopy.condition==='intact').length===1;}
const freeMaster=(s,p)=>!Object.values(s.people).some(q=>copyOrders(q).some(o=>o.master===p.id&&o.status==='working'));
function suitable(s,p,q,w){const b=body(s,q),a=b&&s.areas[b.area];return p.id!==q?.id&&ready(s,q)&&a?.civic&&!a.interior&&physicalDistance(a,b.x,42)<=3&&canReadText(s,q,w.language)&&canWriteText(s,q,w.language)&&freeMaster(s,q)&&(textActor(s,q.id)||npcController(s,q)==='personal'&&canStartNPCActivity(s,q,{inTurn:true}));}
export function requestCopyOrder(s,p,q,sourceID,paperID){
 const b=body(s,p),source=heldTexts(s,p.id).find(i=>i.id===sourceID),paper=heldTexts(s,p.id).find(i=>i.id===paperID&&i.kind==='writingPaper'),w=textWork(s,source),orders=copyOrders(p);
 if(!ready(s,p)||!sourceReady(s,p,source)||!paper||!lawful(p,paper)||marketWallet(s,p.id)<8||orders.length>=16||orders.some(o=>o.content===w.id||o.collected===null)||!suitable(s,p,q,w)||body(s,q).area!==b.area||physicalDistance(s.areas[b.area],b.x,body(s,q).x)>2||(p.textCraft?.lastActionTick??-1)>=s.tick)return null;
 const state=p.copyWork ||= {version:1,serial:0,orders:{}},id=p.id+'/copy-order/'+(++state.serial),o={version:1,id,client:p.id,master:q.id,content:w.id,source:source.id,paper:paper.id,area:b.area,x:body(s,q).x,desk:id+'/desk',asked:s.tick,lastWork:-1,progress:0,status:'working',draft:null,finished:null,collected:null,payment:{reserved:4,paid:0,refunded:0,clientBefore:marketWallet(s,p.id),clientAfter:marketWallet(s,p.id)-4,wage:null},history:[]};
 const desk={id:o.desk,kind:'copyDesk',name:'Рукописный заказ · '+q.name,x:o.x,copyOrder:id,owner:p.id,items:[source,paper],gold:0,taken:false};s.areas[o.area].objects.push(desk);
 const bag=heldTexts(s,p.id);for(const i of desk.items){bag.splice(bag.indexOf(i),1);itemLocation(s,i,{kind:'cache',area:o.area,object:desk.id});i.history.push({tick:s.tick,text:'Передано на хранение для конечного рукописного заказа. Право клиента на вещь сохраняется.'});}
 state.orders[id]=o;setActorMoney(s,p,marketWallet(s,p.id)-4);textMemory(p).lastActionTick=s.tick;return o;
}
export function workCopyOrder(s,p,id,{inTurn=false}={}){
 const o=copyOrder(s,id),sheets=o&&copySheets(s,o),source=sheets?.find(i=>i.id===o.source),paper=sheets?.find(i=>i.id===o.paper),w=o&&s.literature.works[o.content];
 if(!o||o.master!==p.id||o.status!=='working'||o.asked>=s.tick||o.lastWork>=s.tick||!ready(s,p)||!at(s,p,o)||!s.people[o.client].alive||!source||source.textCopy?.content!==o.content||source.textCopy.owner!==o.client||source.textCopy.condition!=='intact'||!paper||!canReadText(s,p,w.language)||!canWriteText(s,p,w.language)||(p.textCraft?.lastActionTick??-1)>=s.tick)return false;
 if(!textActor(s,p.id)&&(!canStartNPCActivity(s,p,{inTurn})||!inTurn&&!npcAction(s,p,'personal')))return false;
 if(!o.progress){if(paper.kind!=='writingPaper')return false;const lib=s.literature,id='text-work/'+w.author+'/'+(++lib.serial);o.draft=id;lib.works[id]={version:1,id,author:w.author,editor:p.id,revision:w.revision+1,parent:w.id,written:s.tick,language:w.language,title:'Незавершённая перепись · '+w.title,source:{kind:'scribal-order',observer:w.author,area:w.source.area,at:s.tick,order:o.id,writer:p.id,item:source.id},content:draftContent(w)};dateNewDocument(s,lib.works[id]);paper.kind='textCopy';paper.base='booklet';paper.name=lib.works[id].title;paper.value=0;paper.textCopy={version:1,content:id,revision:w.revision+1,owner:o.client,writer:p.id,written:s.tick,sourceCopy:source.id,condition:'draft',damage:null};dateNewDocument(s,paper.textCopy);}
 else if(paper.textCopy?.condition!=='draft'||paper.textCopy.content!==o.draft)return false;
 const before=vital(s,p).energy;registerLiteracy(s,p,textActor(s,p.id),'copied-text',w.id);vital(s,p).energy-=2;textMemory(p).lastActionTick=s.tick;o.lastWork=s.tick;o.progress++;o.history.push({at:s.tick,worker:p.id,energy:2,before,after:vital(s,p).energy,progress:o.progress});
 if(o.progress===3){o.finished=s.tick;paper.textCopy.written=s.tick;dateNewDocument(s,paper.textCopy);if(vital(s,p).energy<30+4){o.status='error';paper.name='Перепись с пропусками · '+w.title;paper.textCopy.condition='damaged';paper.textCopy.damage={kind:'scribal-error',actor:p.id,tick:s.tick,area:o.area,order:o.id};paper.history.push({tick:s.tick,text:'При сверке обнаружены пропуски уставшего писца. Ошибочная новая редакция непригодна; оригинал не изменён.'});}
 else{o.status='completed';paper.name=w.title;paper.value=2;Object.assign(paper.textCopy,{content:w.id,revision:w.revision,condition:'intact',damage:null});o.payment.wage={at:s.tick,before:marketWallet(s,p.id),after:marketWallet(s,p.id)+4};setActorMoney(s,p,o.payment.wage.after);o.payment.paid=4;paper.history.push({tick:s.tick,text:'Перепись сверена с прежним оригиналом. Писцу единожды выплачено ◈4 из денег заказчика.'});}}
 return true;
}
export function collectCopyOrder(s,p,id,{cancel=false}={}){
 const o=copyOrder(s,id),desk=o&&copyDesk(s,o);if(!textsOn(s)||!o||o.client!==p.id||o.collected!==null||!ready(s,p)||!at(s,p,o)||!desk||o.status==='working'&&!cancel&&s.people[o.master].alive||!fitsPack(s,p.id,{items:[...heldTexts(s,p.id),...desk.items]}))return false;
 if(o.status==='working'){o.status='cancelled';o.finished=s.tick;}
 const items=desk.items.splice(0);for(const i of items){const h=s.hero?.lineage===p.id?s.hero:s.actorStates[p.id];(h?h.bag:(p.looseItems ||= [])).push(i);actorItemLocation(s,i,p.id);i.history.push({tick:s.tick,text:'Клиент забрал ту же физическую бумагу из рукописного заказа.'});}desk.taken=true;
 const refund=4-o.payment.paid-o.payment.refunded;if(refund){setActorMoney(s,p,marketWallet(s,p.id)+refund);o.payment.refunded+=refund;}o.collected=s.tick;return true;
}
export function copyMasterTurn(s,p){if(!textsOn(s))return false;for(const q of Object.values(s.people))for(const o of copyOrders(q))if(o.master===p.id&&o.status==='working'&&workCopyOrder(s,p,o.id,{inTurn:true}))return true;return false;}
export function copyOrderTask(s,p){
 if(!ready(s,p))return null;const b=body(s,p),worker=Object.values(s.people).flatMap(copyOrders).find(o=>o.master===p.id&&o.status==='working'&&s.people[o.client].alive&&copySheets(s,o).some(i=>i.id===o.source&&i.textCopy?.condition==='intact')&&copySheets(s,o).some(i=>i.id===o.paper&&(o.progress?i.textCopy?.condition==='draft':i.kind==='writingPaper'))&&canReadText(s,p,s.literature.works[o.content].language)&&canWriteText(s,p,s.literature.works[o.content].language));if(worker)return {kind:'textOrderWork',target:worker.area,x:worker.x,order:worker.id,remaining:1};const orders=copyOrders(p),pending=orders.find(o=>o.collected===null);
 if(pending){const d=copyDesk(s,pending);const cancel=!s.people[pending.master].alive||s.tick-Math.max(pending.asked,pending.lastWork)>96;return (pending.status!=='working'||cancel)&&d&&fitsPack(s,p.id,{items:[...heldTexts(s,p.id),...d.items]})?{kind:'textOrderCollect',target:pending.area,x:pending.x,order:pending.id,cancel,remaining:1}:null;}
 // A reserve is useful only for a valued, understood unique text. No standing
 // self-copy wage and no repeat order for the same content, even after sale.
 if(orders.length>=16||marketWallet(s,p.id)<8)return null;
 const interested=textActor(s,p.id)?s.hero.personality.curiosity>=.7:p.agenda.job==='scholar'&&p.agenda.curiosity>=.7;if(!interested)return null;
 const source=heldTexts(s,p.id).find(i=>sourceReady(s,p,i)&&['collection','family','useful'].includes(textValue(s,p,i).kind)&&(textWork(s,i).author===p.id||p.textCraft?.readings.some(r=>r.content===i.textCopy.content))),paper=heldTexts(s,p.id).find(i=>i.kind==='writingPaper'&&lawful(p,i));if(!source||!paper||orders.some(o=>o.content===source.textCopy.content))return null;
 const master=Object.values(s.people).find(q=>suitable(s,p,q,textWork(s,source))&&body(s,q).area===b.area&&physicalDistance(s.areas[b.area],b.x,body(s,q).x)<=12);return master?{kind:'textOrderRequest',target:b.area,x:body(s,master).x,person:master.id,source:source.id,item:paper.id,remaining:1}:null;
}
