import {rememberCastleAddress} from './castle-state.js';
import {borrowedReading,stolenReading} from './library-state.js';
import {literacyOn,registerLiteracy,readingScript,writingScript} from './literacy-state.js';
import {sequenceNote,learnSequence,SEQUENCE_NAMES} from './sequence-memory.js';
import {physicalDistance} from '../geometry.js';
import {enabled} from '../rules.js';
import {localContact} from './npc-contacts.js';
import {npcAction,npcController} from './npc-control.js';
import {productionSources,goodsEnabled} from './goods.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {fitsPack} from './container-state.js';
import {actorItemLocation} from './item-originals.js';
import {weatherAt} from './weather.js';
import {initializeNPCKnowledge} from './npc-knowledge.js';
import {textsOn,textActor,heldTexts,canReadText,canWriteText,textWork,textMemory} from './text-state.js';
const position=(s,p)=>textActor(s,p.id)||localContact(s,p.id,p.area);
const energy=(s,p)=>textActor(s,p.id)?.energy??p.needs.energy;
function ready(s,p){const h=textActor(s,p?.id),b=p&&position(s,p);return textsOn(s)&&p?.alive&&b&&!h?.transit&&!h?.combat&&!p.needs.sleeping&&energy(s,p)>=30&&(p.textCraft?.lastActionTick??-1)<s.tick&&(h?h.hp>=h.maxHp*.75&&h.hunger<60:p.health>=(p.maxHealth||100)*.75&&p.needs.hunger<60)?b:null;}
function spend(s,p,cost){const h=textActor(s,p.id);if(h){h.energy-=cost;h.lastAction='work';}else p.needs.energy-=cost;textMemory(p).lastActionTick=s.tick;}
function bag(s,p){const h=s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id];return h?h.bag:(p.looseItems ||= []);}
export function buyTextPaper(s,p,ctx=null){
 const b=ready(s,p),a=b&&s.areas[b.area];if(!a?.civic||a.interior||!goodsEnabled(s)||marketWallet(s,p.id)<5||physicalDistance(a,b.x,42)>3||heldTexts(s,p.id).filter(i=>i.kind==='writingPaper').length>=2)return null;
 const paper={id:`text-sheet/${p.id}/${(p.textCraft?.serial||0)+1}`,kind:'writingPaper',base:'paper',name:'Чистый лист для записи',slot:'document',stat:'writing',power:0,rarity:1,modifier:'plain',value:0,found:s.tick,foundArea:a.id,creator:p.id,history:[],physical:{version:1,holder:{kind:'person',id:p.id},movedAt:s.tick}};
 if(!fitsPack(s,p.id,{items:[...heldTexts(s,p.id),paper]}))return null;
 if(textActor(s,p.id)&&ctx?.maySpend&&!ctx.maySpend(s,'learning',2,ctx))return null;
 const raw=productionSources(s,a)?.materials;if(!raw||raw.stock<1)return null;
 const before=raw.stock;raw.stock--;raw.used++;setActorMoney(s,p,marketWallet(s,p.id)-2);a.civic.treasury+=2;
 textMemory(p).serial++;paper.writingMaterial={version:1,id:paper.id,source:raw.id,sourceArea:raw.place,area:a.id,buyer:p.id,created:s.tick,paid:2,stockBefore:before,stockAfter:raw.stock};paper.history.push({tick:s.tick,text:'Бумага приобретена из настоящего местного сырья за ◈2.'});bag(s,p).push(paper);actorItemLocation(s,paper,p.id);spend(s,p,1);return paper;
}
function inscribe(s,p,paper,work,sourceCopy=null){
 registerLiteracy(s,p,textActor(s,p.id),sourceCopy?'copied-text':'written-text',work.id);
 paper.kind='textCopy';paper.base='booklet';paper.name=work.title;paper.value=2;paper.textCopy={version:1,content:work.id,revision:work.revision,owner:p.id,writer:p.id,written:s.tick,sourceCopy,condition:'intact',damage:null};paper.history.push({tick:s.tick,text:sourceCopy?'Переписано с физического экземпляра; содержание и редакция прежние.':'Автор записал лично наблюдённые сведения.'});actorItemLocation(s,paper,p.id);spend(s,p,2);return paper;
}
export function writeWorkNotice(s,p,paperID){
 const b=ready(s,p),a=b&&s.areas[b.area],paper=heldTexts(s,p?.id).find(i=>i.id===paperID&&i.kind==='writingPaper');
 if(!b||!canWriteText(s,p)||!paper||p.textCraft?.work||!a.civic||a.interior||physicalDistance(a,b.x,42)>3)return null;
 const library=s.literature ||= {version:1,serial:0,works:{}},id=`text-work/${p.id}/${++library.serial}`,available=a.civic.treasury>=12;
 const work={version:1,id,author:p.id,editor:p.id,revision:1,parent:null,written:s.tick,language:p.culture||a.culture||'river',title:'Датированная записка о работе · '+a.name,source:{kind:'own-market-observation',observer:p.id,area:a.id,x:42,at:s.tick},content:{kind:'employment-note',area:a.id,name:a.name,available,observed:s.tick,text:`При осмотре места найма в «${a.name}» ${available?'были средства для оплаты труда':'не хватало средств на оплату труда'}. Это сведения на дату записи, а не обещание будущего заработка.`}};
 library.works[id]=work;textMemory(p).work=id;return inscribe(s,p,paper,work);
}
export function writeSequenceManual(s,p,paperID,node){
 const b=ready(s,p),a=b&&s.areas[b.area],paper=heldTexts(s,p?.id).find(i=>i.id===paperID&&i.kind==='writingPaper'),n=sequenceNote(p,node);
 if(!b||!paper||!canWriteText(s,p)||!a.civic||a.interior||physicalDistance(a,b.x,42)>3||!n?.hint?.complete||p.textCraft?.sequenceWorks?.[node])return null;
 const library=s.literature ||= {version:1,serial:0,works:{}},id=`text-work/${p.id}/${++library.serial}`,order=[...n.hint.order];
 const work={version:1,id,author:p.id,editor:p.id,revision:1,parent:null,written:s.tick,language:p.culture||a.culture||'river',title:'Памятка о порядке тяги · '+n.name,source:{kind:'personal-sequence-knowledge',observer:p.id,area:n.area,x:n.x,at:n.hint.learnedAt,basis:{...n.hint.source}},content:{kind:'mechanism-sequence',node:n.node,key:n.key,area:n.area,x:n.x,name:n.name,observed:n.hint.learnedAt,order,complete:true,text:`По узнанным автором сведениям для «${n.name}» нужен порядок: ${order.map(t=>SEQUENCE_NAMES[t]).join(' → ')}. Это запись известного ему способа, не обещание исправности устройства.`}};
 library.works[id]=work;const m=textMemory(p);m.work=id;m.sequenceWorks ||= {};m.sequenceWorks[node]=id;return inscribe(s,p,paper,work);
}
export function copyText(s,p,sourceID,paperID){
 const b=ready(s,p),items=heldTexts(s,p?.id),source=items.find(i=>i.id===sourceID),paper=items.find(i=>i.id===paperID&&i.kind==='writingPaper'),work=textWork(s,source);
 if(!b||!work||!paper||(!literacyOn(s)?!canWriteText(s,p):!readingScript(s,p,work.language,textActor(s,p.id))||!writingScript(s,p,work.language,textActor(s,p.id)))||source.textCopy.owner!==p.id||source.libraryLoan?.returned===null||source.libraryTheft?.returned===null||source.textCopy.condition!=='intact'||p.textCraft?.copied.includes(work.id))return null;
 textMemory(p).copied.push(work.id);const result=inscribe(s,p,paper,work,source.id);p.textCraft.offer={item:result.id,content:work.id,tick:s.tick};return result;
}
export function readText(s,p,id){
 const b=ready(s,p),item=heldTexts(s,p?.id).find(i=>i.id===id),work=textWork(s,item);
 if(!b||!work||!canReadText(s,p,work.language)||item.textCopy.owner!==p.id&&!borrowedReading(s,p,item)&&!stolenReading(s,p,item)||item.textCopy.condition!=='intact'||p.textCraft?.readings.some(e=>e.content===work.id))return false;
 const a=s.areas[b.area];spend(s,p,1);
 if(!a.interior&&!a.civic&&['rain','storm'].includes(weatherAt(s,a).id)){
  item.textCopy.condition='damaged';item.textCopy.damage={kind:'rain-while-open',actor:p.id,tick:s.tick,area:a.id};item.history.push({tick:s.tick,text:'Открытая запись промокла при чтении вне укрытия. Другие экземпляры не изменились.'});return false;
 }
 return rememberTextReading(s,p,item);
}
export function rememberTextInformation(s,p,work,info=work.content,source=work.author,reported=false){
 if(work.content.kind==='testament')return;
 if(work.content.kind==='fragment'){const c=work.content.clue;if(c?.kind==='mechanism-sequence'&&!reported)learnSequence(s,p,c,{kind:'surviving-pages',person:source,tick:s.tick,id:work.id});info={area:work.content.area,name:work.content.name,observed:work.content.observed};}
 if(work.content.kind==='mechanism-sequence'){
  if(!Array.isArray(info.order)||!info.order.length)return;
  learnSequence(s,p,info,{kind:reported?'heard-text-reader':'understood-text',person:source,tick:s.tick,id:(reported?'report/'+source+'/':'')+work.id});return;
 }
 const n=info;initializeNPCKnowledge(s,p);let place=p.navigation.places.find(k=>k.area===n.area);if(!place){place={area:n.area,name:n.name,seen:n.observed};p.navigation.places.push(place);}
 if(typeof n.available==='boolean'&&(place.workSeen??-1)<=n.observed)Object.assign(place,{payroll:n.available,workSeen:n.observed,text:work.id,source,...(reported?{reported:true}:{} )});
 const h=textActor(s,p.id);if(h&&typeof n.available==='boolean'){h.memory.services ||= {};const key=n.area+'/employment';if((h.memory.services[key]?.seen??-1)<=n.observed)h.memory.services[key]={version:1,area:n.area,kind:'employment',available:n.available,provider:null,reason:null,seen:n.observed,text:work.id,source,...(reported?{reported:true}:{} )};}
}
export function rememberTextReading(s,p,item){
 const work=textWork(s,item);if(!work||item.textCopy.condition!=='intact'||p.textCraft?.readings.some(e=>e.content===work.id))return false;
 const knowledge=registerLiteracy(s,p,textActor(s,p.id),'read-text',work.id);if(knowledge)knowledge.lastActionTick=s.tick;
 textMemory(p).readings.push({content:work.id,copy:item.id,at:s.tick,author:work.author,revision:work.revision});rememberTextInformation(s,p,work);
 const h=textActor(s,p.id);if(h)h.lastAction='think';return true;
}
export function giveText(s,from,to,id){
 const a=ready(s,from),b=ready(s,to),item=heldTexts(s,from?.id).find(i=>i.id===id),work=textWork(s,item);
 if(!a||!b||from.id===to.id||!work||item.textCopy.owner!==from.id||item.libraryLoan?.returned===null||item.libraryTheft?.returned===null||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>3||!fitsPack(s,to.id,{items:[...heldTexts(s,to.id),item]}))return false;
 const sourceActor=textActor(s,from.id),targetActor=textActor(s,to.id);
 if(!sourceActor&&(npcController(s,from)!=='personal'||heldTexts(s,from.id).filter(i=>i.textCopy?.content===work.id).length<2||from.agenda.duty<.5)||!targetActor&&(npcController(s,to)!=='personal'||!canReadText(s,to)&&to.agenda.curiosity<.65&&s.castles?.byId[to.castleKnown?.house]?.owner!==to.id))return false;
 if(!sourceActor&&!npcAction(s,from,'personal')||!targetActor&&!npcAction(s,to,'personal'))return false;
 const source=bag(s,from);source.splice(source.indexOf(item),1);bag(s,to).push(item);actorItemLocation(s,item,to.id);if(from.textCraft?.offer?.item===id)from.textCraft.offer=null;item.history.push({tick:s.tick,text:`Передано: ${from.name} → ${to.name}. Знание не передаётся вместе с бумагой.`});spend(s,from,1);spend(s,to,1);const house=s.castles?.byId[to.castleKnown?.house];if(house?.owner===to.id&&to.houseChildren?.[from.id]?.house===house.id){item.castleGift={house:house.id,from:from.id,to:to.id,at:s.tick};rememberCastleAddress(s,from,house,{source:'book-gift-message',by:to.id});from.castleKnown.transfer={house:house.id,item:item.id,from:from.id,to:to.id,at:s.tick};}return true;
}

export function recoverText(s,p,targetID,sourceID,paperID){
 const b=ready(s,p),items=heldTexts(s,p?.id),target=items.find(i=>i.id===targetID),paper=items.find(i=>i.id===paperID&&i.kind==='writingPaper'),c=target?.textCopy,w=textWork(s,target),source=sourceID&&items.find(i=>i.id===sourceID);
 if(!enabled(s,'paper-fire')||!b||!w||!paper||c.owner!==p.id||c.condition!=='damaged'||c.damage?.kind!=='paper-fire'||c.salvaged?.cause===c.damage.cause||!canReadText(s,p,w.language)||!canWriteText(s,p,w.language)||activeLoan(target))return null;
 const full=source&&source.id!==target.id&&source.textCopy?.condition==='intact'&&source.textCopy.content===c.content&&source.textCopy.owner===p.id&&!activeLoan(source);
 if(!full&&!c.fireResidue?.info)return null;
 let work=w;if(!full){const lib=s.literature,id='text-work/'+p.id+'/'+(++lib.serial),info=structuredClone(c.fireResidue.info);work={version:1,id,author:p.id,editor:p.id,revision:1,parent:w.id,written:s.tick,language:w.language,title:'Спасённые страницы · '+w.title,source:{kind:'surviving-pages',observer:p.id,area:info.area,at:s.tick,item:target.id,cause:c.damage.cause},content:info};lib.works[id]=work;}
 const result=inscribe(s,p,paper,work,full?source.id:target.id);c.salvaged={at:s.tick,by:p.id,cause:c.damage.cause,result:result.id,source:full?source.id:target.id,mode:full?'full':'fragment'};result.history.push({tick:s.tick,text:full?'Новый экземпляр восстановлен с уцелевшей физической копии.':'Спасённые страницы перенесены на настоящую новую бумагу. Полнота исходного знания утрачена.'});return result;
}
function activeLoan(item){return item.libraryLoan?.returned===null||item.libraryTheft?.returned===null;}
