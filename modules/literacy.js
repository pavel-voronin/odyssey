import {weatherAt} from './weather.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcAction,npcController} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {fitsPack} from './container-state.js';
import {npcLooseItems,actorItemLocation} from './item-originals.js';
import {textsOn,textActor,heldTexts,textWork,textMemory,canReadText} from './text-state.js';
import {rememberTextReading,rememberTextInformation} from './texts.js';
import {literacyOn,literacyCaps,registerLiteracy,readingScript,writingScript,speakingLanguage} from './literacy-state.js';
export const literacyEnabled=s=>literacyOn(s)&&textsOn(s);
const pos=(s,p)=>p&&(textActor(s,p.id)||localContact(s,p.id,p.area));
const energy=(s,p)=>textActor(s,p.id)?.energy??p.needs.energy;
const healthy=(s,p)=>{const h=textActor(s,p?.id);return p?.alive&&!p.needs.sleeping&&energy(s,p)>=30&&(h?!h.transit&&!h.combat&&h.hp>=h.maxHp*.75&&h.hunger<60:p.health>=(p.maxHealth||100)*.75&&p.needs.hunger<60);};
const spent=(s,p)=>(p.literacy?.lastActionTick??-1)>=s.tick||(p.textCraft?.lastActionTick??-1)>=s.tick;
const book=(s,p,id)=>heldTexts(s,p?.id).find(i=>i.id===id&&i.textCopy?.owner===p.id&&i.textCopy.condition==='intact');
function spend(s,p,n){const h=textActor(s,p.id);if(h){h.energy-=n;h.lastAction='think';}else p.needs.energy-=n;const l=registerLiteracy(s,p,h,'literacy-action');l.lastActionTick=s.tick;textMemory(p).lastActionTick=s.tick;}
function sharedLanguage(s,p,t){const a=literacyCaps(s,p,textActor(s,p.id)).spoken,b=literacyCaps(s,t,textActor(s,t.id)).spoken;return a.find(lang=>b.includes(lang))||null;}
export function canTeachText(s,p,t,work,branch){
 if(!literacyEnabled(s)||!healthy(s,p)||!healthy(s,t)||p.id===t.id||textActor(s,t.id)||npcController(s,t)!=='personal'||t.agenda.task||t.personalJourney?.status==='active'||!sharedLanguage(s,p,t)||!canReadText(s,t,work.language)||t.agenda.duty<.4)return false;
 const place=pos(s,p),area=place&&s.areas[place.area];if(area&&!area.interior&&!area.civic&&['rain','storm'].includes(weatherAt(s,area).id))return false;
 if(t.literacyTeaching&&t.literacyTeaching.pupil!==p.id&&t.literacyTeaching.until>=s.tick)return false;
 if(branch==='writing'&&!writingScript(s,t,work.language))return false;
 return ['reading','writing','language','aloud'].includes(branch);
}
function taskOf(s,p){return textActor(s,p.id)?.goal||p.agenda?.task;}
function request(s,p,t,item,branch){
 const work=textWork(s,item),a=pos(s,p),b=pos(s,t);
 if(!work||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>3||!canTeachText(s,p,t,work,branch)||spent(s,t))return null;
 let r=t.literacyTeaching;
 if(r&&r.until<s.tick){delete t.literacyTeaching;r=null;}
 if(r&&(r.pupil!==p.id||r.branch!==branch||r.language!==work.language))return null;
 r ||= t.literacyTeaching={version:1,pupil:p.id,branch,language:work.language,copy:item.id,content:work.id,area:a.area,requested:s.tick,until:s.tick+24,turn:-1,used:false};
 r.copy=item.id;r.content=work.id;
 if(r.turn!==s.tick){if(!npcAction(s,t,'personal'))return {waiting:true,reservation:r};r.turn=s.tick;r.used=false;}
 if(r.used)return null;return {reservation:r,work};
}
export function literacyTeacherTurn(s,t){
 const r=t.literacyTeaching;if(!r)return false;if(!literacyEnabled(s))return false;
 const p=s.people[r.pupil],g=p&&taskOf(s,p),item=p&&book(s,p,r.copy),work=textWork(s,item),a=pos(s,p),b=pos(s,t);
 if(!p||!g||!['literacyStudy','textAloud'].includes(g.kind)||g.teacher!==t.id||!item||!work||r.until<s.tick||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12||!canTeachText(s,p,t,work,r.branch)){delete t.literacyTeaching;return false;}
 if(r.turn!==s.tick){r.turn=s.tick;r.used=false;}return true;
}
export function studyTextLesson(s,p,t,id,branch,ctx=null){
 const item=book(s,p,id),work=textWork(s,item),h=textActor(s,p?.id);
 if(!literacyEnabled(s)||!healthy(s,p)||spent(s,p)||!item||!work||!['reading','writing','language'].includes(branch)||marketWallet(s,p.id)<1||h&&ctx?.maySpend&&!ctx.maySpend(s,'learning',1,ctx))return {status:'unavailable'};
 const caps=literacyCaps(s,p,h),target=branch==='language'?'spoken':branch;
 if(caps[target].includes(work.language)||branch==='writing'&&!readingScript(s,p,work.language,h))return {status:'unavailable'};
 const claim=request(s,p,t,item,branch);if(!claim)return {status:'unavailable'};if(claim.waiting)return {status:'waiting'};
 const l=registerLiteracy(s,p,h,'paid-enrolment',work.id),teacher=registerLiteracy(s,t,null,'actual-teaching',work.id),key=branch+'/'+work.language;
 let course=l.courses.find(c=>c.id===key);course ||= {id:key,branch,language:work.language,started:s.tick,steps:[],status:'learning'};
 if(!l.courses.includes(course))l.courses.push(course);if(course.status==='learned'||course.steps.at(-1)?.tick===s.tick)return {status:'unavailable'};
 setActorMoney(s,p,marketWallet(s,p.id)-1);setActorMoney(s,t,marketWallet(s,t.id)+1);spend(s,p,2);spend(s,t,2);
 course.steps.push({tick:s.tick,teacher:t.id,copy:item.id,content:work.id,paid:1,energy:2});claim.reservation.used=true;claim.reservation.until=s.tick+24;
 if(course.steps.length===3){if(!l[target].includes(work.language))l[target].push(work.language);course.status='learned';course.finished=s.tick;delete t.literacyTeaching;return {status:'learned',branch,language:work.language};}
 return {status:'progress',remaining:3-course.steps.length};
}
export function askTextReader(s,p,t,id,ctx=null){
 const item=book(s,p,id),work=textWork(s,item),h=textActor(s,p?.id);
 if(!literacyEnabled(s)||!healthy(s,p)||spent(s,p)||!item||!work||p.literacy?.reports.some(e=>e.content===work.id&&e.helper===t?.id)||marketWallet(s,p.id)<1||h&&ctx?.maySpend&&!ctx.maySpend(s,'learning',1,ctx))return {status:'unavailable'};
 const claim=request(s,p,t,item,'aloud');if(!claim)return {status:'unavailable'};if(claim.waiting)return {status:'waiting'};
 const l=registerLiteracy(s,p,h,'heard-reader',work.id);registerLiteracy(s,t,null,'actual-reader',work.id);
 const partial=t.agenda.duty<.6||energy(s,t)<45,n=work.content,known=n.kind==='mechanism-sequence'?{kind:n.kind,node:n.node,key:n.key,area:n.area,x:n.x,name:n.name,observed:n.observed,order:partial?n.order.slice(0,2):[...n.order],complete:!partial&&n.complete}:{area:n.area,name:n.name,observed:n.observed,...(partial?{}:{available:n.available})};
 setActorMoney(s,p,marketWallet(s,p.id)-1);setActorMoney(s,t,marketWallet(s,t.id)+1);spend(s,p,1);spend(s,t,2);
 const report={content:work.id,copy:item.id,helper:t.id,medium:sharedLanguage(s,p,t),at:s.tick,paid:1,partial,known};l.reports.push(report);
 // The helper really looked at the supplied copy. The listener retains a
 // separately attributed retelling, never a forged direct reading.
 rememberTextReading(s,t,item);rememberTextInformation(s,p,work,known,t.id,true);claim.reservation.used=true;delete t.literacyTeaching;
 return {status:'reported',report};
}
export function sellTextWithoutReading(s,p,buyer,id){
 const item=book(s,p,id),work=textWork(s,item),a=pos(s,p),b=pos(s,buyer);
 if(!literacyEnabled(s)||!healthy(s,p)||!healthy(s,buyer)||spent(s,p)||spent(s,buyer)||!item||!work||p.id===buyer.id||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>3||textActor(s,buyer.id)||npcController(s,buyer)!=='personal'||buyer.agenda.task||buyer.literacyTeaching||!['merchant','scholar'].includes(buyer.agenda.job)||marketWallet(s,buyer.id)<2||heldTexts(s,buyer.id).some(i=>i.textCopy?.content===work.id)||!fitsPack(s,buyer.id,{items:[...heldTexts(s,buyer.id),item]})||!npcAction(s,buyer,'personal'))return false;
 const items=heldTexts(s,p.id);items.splice(items.indexOf(item),1);npcLooseItems(s,buyer).push(item);actorItemLocation(s,item,buyer.id);setActorMoney(s,p,marketWallet(s,p.id)+2);setActorMoney(s,buyer,marketWallet(s,buyer.id)-2);spend(s,p,1);spend(s,buyer,1);
 item.history.push({tick:s.tick,text:`Передан реальному покупателю ${buyer.name} за ◈2; знание продавца не изменилось.`});return true;
}
