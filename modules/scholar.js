import {goodsEnabled} from './goods.js';
import {fitsPack} from './container-state.js';
import {scholarOn,scholarMemory,textWitnesses,witnessVerdict,latestOwnNotice,comparisonKey} from './scholar-state.js';
import {textActor,heldTexts,canReadText,canWriteText,textMemory} from './text-state.js';
import {speakingLanguage,registerLiteracy} from './literacy-state.js';
import {knowsPracticalMethod,recordPracticalScholar,recordScholarLesson} from './skill-branches.js';
import {physicalDistance} from '../geometry.js';
import {personLocation} from '../person-location.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {actorItemLocation} from './item-originals.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
const body=(s,p)=>textActor(s,p?.id)||(p?.alive?personLocation(s,p.id):null);
const vital=(s,p)=>textActor(s,p?.id)||p?.needs;
function ready(s,p){const h=textActor(s,p?.id);return scholarOn(s)&&p?.alive&&body(s,p)&&!h?.combat&&!h?.transit&&!p.roadTransit&&!p.needs.sleeping&&!p.ailment&&vital(s,p).energy>=30&&vital(s,p).hunger<60&&(h?h.hp>=h.maxHp*.75:p.health>=(p.maxHealth||100)*.75)&&(p.textCraft?.lastActionTick??-1)<s.tick&&(p.scholarStudy?.lastActionTick??-1)<s.tick;}
function spend(s,p){vital(s,p).energy--;scholarMemory(p).lastActionTick=s.tick;textMemory(p).lastActionTick=s.tick;}
const understands=(s,p,a,b)=>a&&b&&canReadText(s,p,a.language)&&canReadText(s,p,b.language);
export function compareWitnesses(s,p,first,second){
 const all=textWitnesses(s,p),a=all.find(w=>w.id===first),b=all.find(w=>w.id===second),key=comparisonKey(first,second);if(!ready(s,p)||!understands(s,p,a,b)||(p.scholarStudy?.comparisons.length||0)>=24||p.scholarStudy?.comparisons.some(c=>c.key===key))return null;
 const m=scholarMemory(p),c={id:p.id+'/witness-comparison/'+(m.comparisons.length+1),actor:p.id,key,sources:[first,second],authors:[a.author,b.author],area:a.area,values:[a.available,b.available],dates:[a.observed,b.observed],tick:s.tick,verdict:witnessVerdict(a,b),inspection:null,confidence:knowsPracticalMethod(s,p.id,'scholar')?'assessed-reports':'tentative-reports'};m.comparisons.push(c);spend(s,p);return c;
}
export function inspectWitnessFact(s,p,id){
 const c=p.scholarStudy?.comparisons.find(c=>c.id===id),b=body(s,p),a=b&&s.areas[b.area];const previous=c?.inspection&&p.scholarStudy.inspections.find(o=>o.id===c.inspection);if(!ready(s,p)||!c||c.verdict==='insufficient'||(p.scholarStudy?.inspections.length||0)>=24||!a?.civic||a.interior||c.area!==a.id||physicalDistance(a,b.x,42)>3||previous&&previous.available===(a.civic.treasury>=12))return null;
 const m=scholarMemory(p),o={id:p.id+'/witness-inspection/'+(m.inspections.length+1),actor:p.id,comparison:c.id,previous:previous?.id??null,area:a.id,x:42,tick:s.tick,available:a.civic.treasury>=12,result:c.verdict==='contradiction'?'dated-conflict':(a.civic.treasury>=12)===c.values[0]?'confirmed-here':'outdated-reports',energy:1};m.inspections.push(o);c.inspection=o.id;spend(s,p);recordPracticalScholar(s,p,o);return o;
}
export function writeExperienceRevision(s,p,paperID,inspectionID){
 const m=p.scholarStudy,o=m?.inspections.find(o=>o.id===inspectionID),c=o&&m.comparisons.find(c=>c.id===o.comparison),parent=o&&latestOwnNotice(s,p,o.area),paper=heldTexts(s,p.id).find(i=>i.id===paperID&&i.kind==='writingPaper'),b=body(s,p);
 const language=parent?.language||p.culture||'river';
 if(!ready(s,p)||!knowsPracticalMethod(s,p.id,'scholar')||!o||!c||parent&&(parent.content.available===o.available||o.tick<=parent.content.observed)||!paper||!canWriteText(s,p,language)||!canReadText(s,p,language)||b.area!==o.area||physicalDistance(s.areas[b.area],b.x,42)>3||Object.values(s.literature.works).some(w=>w.source?.inspection===o.id))return null;
 const lib=s.literature,id='text-work/'+p.id+'/'+(++lib.serial),work={version:1,id,author:p.id,editor:p.id,revision:(parent?.revision||0)+1,parent:parent?.id??null,written:s.tick,language,title:'Проверенная записка о работе · '+s.areas[o.area].name,source:{kind:'checked-market-observation',observer:p.id,area:o.area,x:42,at:o.tick,inspection:o.id,comparison:c.id},content:{kind:'employment-note',area:o.area,name:s.areas[o.area].name,available:o.available,observed:o.tick,text:'После сопоставления датированных свидетельств автор лично осмотрел место найма: '+(o.available?'средства для труда были':'средств для труда не хватало')+'. Это сведения на дату осмотра, а не нынешняя истина далёкого места.'}};lib.works[id]=work;
 paper.kind='textCopy';paper.base='booklet';paper.name=work.title;paper.value=2;paper.textCopy={version:1,content:id,revision:work.revision,owner:p.id,writer:p.id,written:s.tick,sourceCopy:null,condition:'intact',damage:null};paper.history.push({tick:s.tick,text:'Новая авторская редакция основана на собственном осмотре после разных датированных свидетельств. Прежние книги не изменены.'});actorItemLocation(s,paper,p.id);textMemory(p).work=id;registerLiteracy(s,p,textActor(s,p.id),'written-text',id);spend(s,p);return paper;
}
export function scholarLesson(s,p,t,id){
 const c=p.scholarStudy?.comparisons.find(c=>c.id===id),a=body(s,p),b=body(s,t),lang=textWitnesses(s,p).find(w=>w.id===c?.sources[0])?.language;
 if(!ready(s,p)||!ready(s,t)||textActor(s,t?.id)||p.id===t.id||!c||c.verdict==='insufficient'||knowsPracticalMethod(s,p.id,'scholar')||!knowsPracticalMethod(s,t.id,'scholar')||p.scholarStudy?.lesson||!canReadText(s,p,lang)||!canWriteText(s,t,lang)||!speakingLanguage(s,p,lang,textActor(s,p.id))||!speakingLanguage(s,t,lang,textActor(s,t.id))||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>3||marketWallet(s,p.id)<1||!textActor(s,t.id)&&(t.agenda.task||npcController(s,t)!=='personal'||!canStartNPCActivity(s,t)))return false;
 if(!textActor(s,t.id)&&!npcAction(s,t,'personal'))return false;
 const e={id:p.id+'/witness-lesson',actor:p.id,teacher:t.id,comparison:c.id,tick:s.tick,area:a.area,language:lang,paid:1,before:marketWallet(s,p.id),after:marketWallet(s,p.id)-1,teacherBefore:marketWallet(s,t.id),teacherAfter:marketWallet(s,t.id)+1};scholarMemory(p).lesson=e;setActorMoney(s,p,e.after);setActorMoney(s,t,e.teacherAfter);spend(s,p);spend(s,t);recordScholarLesson(s,p,t,e);return true;
}
export function scholarTask(s,p){
 if(!ready(s,p))return null;const h=textActor(s,p.id),b=body(s,p),interested=h?h.profession==='scholar'||h.personality.curiosity>=.7:p.agenda.job==='scholar';if(!interested)return null;
 const m=p.scholarStudy,notes=textWitnesses(s,p),pending=(m?.inspections.length||0)<24&&m?.comparisons.find(c=>c.verdict!=='insufficient'&&c.area===b.area&&(!c.inspection||physicalDistance(s.areas[b.area],b.x,42)<=3&&s.areas[b.area].civic&&(s.areas[b.area].civic.treasury>=12)!==m.inspections.find(o=>o.id===c.inspection)?.available));if(pending)return {kind:'scholarInspect',target:b.area,x:42,comparison:pending.id,remaining:1};
 if(knowsPracticalMethod(s,p.id,'scholar'))for(const o of [...(m?.inspections||[])].reverse()){const parent=latestOwnNotice(s,p,o.area);if(o.area!==b.area||parent&&(parent.content.available===o.available||o.tick<=parent.content.observed)||Object.values(s.literature.works).some(w=>w.source?.inspection===o.id)||!canWriteText(s,p,parent?.language||p.culture||'river'))continue;const paper=heldTexts(s,p.id).find(i=>i.kind==='writingPaper');if(paper)return {kind:'scholarWrite',target:b.area,x:42,item:paper.id,inspection:o.id,remaining:1};if(goodsEnabled(s)&&marketWallet(s,p.id)>=5&&physicalDistance(s.areas[b.area],b.x,42)<=3&&(s.areas[s.areas[b.area].city]||s.areas[b.area]).goods?.sources?.materials.stock>0&&fitsPack(s,p.id,{items:[...heldTexts(s,p.id),{slot:'document'}]}))return {kind:'textPaper',target:b.area,x:42,remaining:1};}
 if(!knowsPracticalMethod(s,p.id,'scholar')){const c=m?.comparisons.find(c=>c.verdict!=='insufficient');if(c&&marketWallet(s,p.id)>=1){const lang=notes.find(w=>w.id===c.sources[0])?.language,t=Object.values(s.people).find(q=>q.id!==p.id&&ready(s,q)&&knowsPracticalMethod(s,q.id,'scholar')&&canWriteText(s,q,lang)&&!q.agenda.task&&body(s,q).area===b.area&&physicalDistance(s.areas[b.area],b.x,body(s,q).x)<=3&&npcController(s,q)==='personal'&&canStartNPCActivity(s,q));if(t)return {kind:'scholarLesson',target:b.area,x:body(s,t).x,person:t.id,comparison:c.id,remaining:1};}}
 if((m?.comparisons.length||0)>=24)return null;for(const area of new Set(notes.map(n=>n.area))){const local=notes.filter(n=>n.area===area).sort((a,b)=>b.observed-a.observed||b.received-a.received),a=local[0],c=local.find(n=>n.author!==a.author)||local[1];if(!c||!understands(s,p,a,c)||m?.comparisons.some(r=>r.key===comparisonKey(a.id,c.id)))continue;return {kind:'scholarCompare',target:b.area,x:b.x,first:a.id,second:c.id,remaining:1};}return null;
}
export function scholarAction(s,p,g){if(g.kind==='scholarCompare')return compareWitnesses(s,p,g.first,g.second);if(g.kind==='scholarInspect')return inspectWitnessFact(s,p,g.comparison);if(g.kind==='scholarWrite')return writeExperienceRevision(s,p,g.item,g.inspection);if(g.kind==='scholarLesson')return scholarLesson(s,p,s.people[g.person],g.comparison);return false;}
