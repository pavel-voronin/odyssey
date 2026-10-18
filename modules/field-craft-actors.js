import {fieldCraftEnabled,fieldCraftNodes} from './field-craft-state.js';
import {fieldBody,safeFieldBody,fieldKnife,fieldTeacher,buyFieldTool,studyFieldCraft,serviceFieldKnife} from './field-craft.js';
import {collectionItems} from './collection-state.js';
import {quoteMarket,marketWallet} from './market.js';
import {physicalDistance} from '../geometry.js';
function selectedTeacher(s,p){const b=fieldBody(s,p);const ids=b.h?[...new Set([...b.h.memory.people,...Object.keys(b.h.relations)])]:Object.keys(p.agenda.bonds).filter(id=>p.agenda.bonds[id]>0);return ids.slice(0,32).find(id=>fieldTeacher(s,p,id))||null;}
function goalRecord(s,p,node,teacher,reason){p.fieldCraft ||= {version:1,lessons:[],services:[],total:0,lastActionTick:-1,kit:{version:1,packed:0,remaining:0,spent:0,loads:[]}};const f=p.fieldCraft;if(!f.goal||f.goal.node!==node||f.goal.status!=='active')f.goal={node,started:s.tick,deadline:s.tick+96,status:'active',teacher,reason};return f;}
export function fieldCraftTask(s,p,{study=true,urgent=false}={}){
 if(!fieldCraftEnabled(s)||!safeFieldBody(s,p)||p.fieldCraft?.after>s.tick)return null;const b=fieldBody(s,p),f=p.fieldCraft,items=collectionItems(s,p.id),knife=items.find(i=>fieldKnife(i)&&i.durability.current<=i.durability.max*.25);
 if(f?.service&&!items.some(i=>i.id===f.service.item&&fieldKnife(i)&&i.durability.current<=i.durability.max*.25)){f.interrupted ||= [];f.interrupted.push({...f.service,ended:s.tick,cause:items.some(i=>i.id===f.service.item)?'already-serviced':'lost-item'});if(f.interrupted.length>4)f.interrupted.shift();f.service=null;}
 if(f?.learned&&knife&&(!urgent||knife.durability.current===0)){
  if(!f.kit.remaining&&(p.marketCargo?.tools||0)<1)return localSupply(s,p,'fieldCraftService',knife.id);
  return {kind:'fieldCraftService',target:b.area,x:b.x,remaining:1,item:knife.id};
 }
 if(!study||urgent||b.energy<45||b.interest<.65&&!knife||!items.some(fieldKnife))return null;
 const node=fieldCraftNodes(s,p.id).find(n=>n.available&&(n.id==='field-maintenance'||n.id==='careful-maintenance'));if(!node)return null;
 const existing=f?.study,teacher=existing?.teacher||selectedTeacher(s,p),reason=knife?'Дорожный нож изношен, а две освоенные ветви позволяют разобраться в обслуживании.':'Хочет связать собственные ремонт и помощь в полезный дорожный способ.';
 const state=goalRecord(s,p,node.id,teacher,reason);if(s.tick>state.goal.deadline){state.goal.status='deferred';state.goal.reason='На учёбу сейчас не хватило времени; вложенное сохранено.';state.after=s.tick+48;return null;}
 if(!existing&&b.herbs<1){state.goal.status='deferred';state.goal.reason='Для учебной подготовки нет собственной порции материала.';state.after=s.tick+48;return null;}
 if(!state.kit.remaining&&(p.marketCargo?.tools||0)<1)return localSupply(s,p,'fieldCraftStudy',null,node.id,teacher);
 if(teacher&&!fieldTeacher(s,p,teacher)){state.goal.status='deferred';state.goal.reason='Знакомый наставник здесь недоступен; оплаченные уроки сохраняются.';state.after=s.tick+48;return null;}
 return {kind:'fieldCraftStudy',target:b.area,x:b.x,remaining:1,node:node.id,teacher};
}
function localSupply(s,p,next,item=null,node=null,teacher=null){const b=fieldBody(s,p),a=s.areas[b.area],q=quoteMarket(s,a,'tools','buy',1,{gold:marketWallet(s,p.id)});return a.civic&&q.quantity?{kind:'fieldCraftSupply',target:b.area,x:58,remaining:1,next,item,node,teacher}:null;}
export function heroFieldCraftPlan(s,ctx,options={}){const h=s.hero,p=s.people[h.lineage];if(h.goal)return false;const t=fieldCraftTask(s,p,options);if(!t)return false;ctx.goal(s,t.kind,t.target,t.x,t.kind==='fieldCraftSupply'?'Подготовить дорожный набор':t.kind==='fieldCraftStudy'?'Освоить походное обслуживание':'Обслужить собственный рабочий нож',t.kind==='fieldCraftStudy'?p.fieldCraft.goal.reason:'Нужны конечные собственные материалы и настоящие действия; верстак не требуется.',t);return true;}
export function fieldCraftAction(s,p,t,ctx){
 const b=fieldBody(s,p);if(t.target!==b.area||physicalDistance(s.areas[b.area],b.x,t.x)>1)return false;
 let success=false;if(t.kind==='fieldCraftSupply')success=buyFieldTool(s,p,ctx);else if(t.kind==='fieldCraftStudy')success=studyFieldCraft(s,p,t.node,ctx,{teacher:t.teacher});else success=serviceFieldKnife(s,p,collectionItems(s,p.id).find(i=>i.id===t.item),ctx);
 if(b.h)b.h.goal=null;else {p.agenda.task=null;p.agenda.due=success?s.tick:s.tick+48;}if(!success&&p.fieldCraft)p.fieldCraft.after=s.tick+24;return success;
}
