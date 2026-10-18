import {npcController} from './npc-control.js';
import {textValuesOn,textValue,textBuyerPrice,textNeed} from './text-values.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {marketWallet} from './market.js';
import {textActor,heldTexts,textWork,canReadText} from './text-state.js';
import {literacyCaps,readingScript,writingScript} from './literacy-state.js';
import {literacyEnabled,canTeachText,studyTextLesson,askTextReader,sellTextWithoutReading} from './literacy.js';
const at=(s,p)=>textActor(s,p.id)||localContact(s,p.id,p.area);
function select(s,p,{urgentOnly=false}={}){
 const h=textActor(s,p.id),b=at(s,p),valued=textValuesOn(s),desperate=valued&&textNeed(s,p);if(urgentOnly&&!desperate)return null;if(!literacyEnabled(s)||!b||!p.alive||p.needs.sleeping||(h?h.energy:p.needs.energy)<(desperate?12:35)||(h?h.hunger:p.needs.hunger)>=60&&!desperate||h&&(h.combat||h.transit||!desperate&&(h.quests.some(q=>q.status==='active')||h.stories.active)))return null;
 const candidates=heldTexts(s,p.id).filter(i=>textWork(s,i)&&(valued||i.textCopy.condition==='intact')),item=candidates.find(i=>!p.textCraft?.readings.some(r=>r.content===i.textCopy.content))||candidates[0];if(!item)return null;
 const work=textWork(s,item),read=p.textCraft?.readings.some(r=>r.content===work.id),caps=literacyCaps(s,p,h),curiosity=h?h.personality.curiosity:p.agenda.curiosity,money=marketWallet(s,p.id);
 const locals=Object.values(s.people).filter(t=>{const target=t.id!==p.id&&localContact(s,t.id,b.area);return target&&physicalDistance(s.areas[b.area],b.x,target.x)<=12;});
 if(valued){
  for(const offered of candidates){const decision=textValue(s,p,offered);if(!decision.sell)continue;const buyer=locals.find(t=>{const price=textBuyerPrice(s,t,offered);return price!==null&&npcController(s,t)==='personal'&&!t.needs.sleeping&&t.needs.energy>=30&&t.needs.hunger<60&&t.health>=(t.maxHealth||100)*.75&&marketWallet(s,t.id)>=price&&!t.agenda.task&&!t.literacyTeaching;});if(buyer)return {kind:'literacySell',target:b.area,x:at(s,buyer).x,item:offered.id,buyer:buyer.id,remaining:1,valueReason:decision.reason};}
 }else if(!read&&(money<3||curiosity<.5)){
  const buyer=locals.find(t=>['merchant','scholar'].includes(t.agenda.job)&&marketWallet(s,t.id)>=2&&!heldTexts(s,t.id).some(i=>i.textCopy?.content===work.id)&&!t.agenda.task&&!t.literacyTeaching);
  if(buyer)return {kind:'literacySell',target:b.area,x:at(s,buyer).x,item:item.id,buyer:buyer.id,remaining:1};
 }
 let branch=!readingScript(s,p,work.language,h)?'reading':!caps.spoken.includes(work.language)?'language':null;
 if(!read&&!branch)return null; // The ordinary text controller performs the real read first.
 if(read&&!writingScript(s,p,work.language,h)&&curiosity>=.75&&(h?h.career.path==='peaceful':p.agenda.job==='scholar'||p.agenda.curiosity>=.75))branch='writing';
 if(branch&&curiosity>=.75&&money>=6){const teacher=locals.find(t=>canTeachText(s,p,t,work,branch));if(teacher)return {kind:'literacyStudy',target:b.area,x:at(s,teacher).x,item:item.id,teacher:teacher.id,branch,remaining:3};}
 if(!read&&branch&&money>=4){const teacher=locals.find(t=>canTeachText(s,p,t,work,'aloud')&&!p.literacy?.reports.some(r=>r.content===work.id&&r.helper===t.id));if(teacher)return {kind:'textAloud',target:b.area,x:at(s,teacher).x,item:item.id,teacher:teacher.id,remaining:1};}
 if(read&&readingScript(s,p,work.language,h)&&writingScript(s,p,work.language,h)&&!p.textCraft.copied.includes(work.id)&&curiosity>=.75){
  const paper=heldTexts(s,p.id).find(i=>i.kind==='writingPaper');if(paper)return {kind:'textCopy',target:b.area,x:b.x,item:paper.id,source:item.id,remaining:1};
  if(s.areas[b.area].civic&&money>=5)return {kind:'textPaper',target:b.area,x:42,remaining:1};
 }
 return null;
}
export function literacyPlan(s,ctx,options={}){
 const h=s.hero,p=s.people[h.lineage];if(h.goal)return false;const t=select(s,p,options);if(!t)return false;
 if(['literacyStudy','textAloud'].includes(t.kind)&&ctx.maySpend&&!ctx.maySpend(s,'learning',1,ctx))return false;
 const title=({literacyStudy:'Оплатить урок по своей записи',textAloud:'Попросить доступного читателя',literacySell:'Предложить настоящий экземпляр читателю',textPaper:'Купить бумагу для собственного письма',textCopy:'Переписать знакомый текст'})[t.kind];
 const {kind,target,x,...extra}=t;ctx.goal(s,kind,target,x,title,t.valueReason||'Чтение, письмо и понимание языка — разные умения. Запись остаётся настоящим предметом; занятия и помощь требуют встречи и времени.',extra);return true;
}
export function literacyAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],g=h.goal;if(!g||g.valueReason&&!textValuesOn(s))return false;
 if(g.kind==='literacySell'){const buyer=s.people[g.buyer],ok=sellTextWithoutReading(s,p,buyer,g.item);if(!ok&&buyer?.textPurchase?.seller===p.id&&buyer.textPurchase.item===g.item&&buyer.textPurchase.until>=s.tick){h.lastAction='wait';return false;}h.goal=null;if(ok)ctx.log(s,'Экземпляр купил настоящий местный читатель из собственного кошелька. Содержание и знание продавца сохранены.','trade');return ok;}
 const result=g.kind==='textAloud'?askTextReader(s,p,s.people[g.teacher],g.item,ctx):studyTextLesson(s,p,s.people[g.teacher],g.item,g.branch,ctx);
 if(result.status==='waiting'){h.lastAction='wait';return false;}
 if(result.status==='progress'){g.remaining=result.remaining;h.lastAction='think';return true;}
 h.goal=null;
 if(result.status==='learned')ctx.log(s,'Три оплаченных занятия дали отдельное умение: '+({reading:'читать это письмо',writing:'писать этим письмом',language:'понимать этот язык'})[result.branch]+'. Профессия не изменилась.','skill');
 if(result.status==='reported')ctx.log(s,result.report.partial?'Читатель пересказал лишь часть записи: место и дату. Это не полное знание содержания.':'Читатель передал датированные сведения. Они сохранены как пересказ с его именем, не как собственное чтение.','story');
 if(result.status==='unavailable')ctx.log(s,'Помощник, книга или оплата сейчас недоступны. Пройденные уроки и уже узнанное сохраняются.','thought');
 return ['learned','reported'].includes(result.status);
}
export const literacyNPCTask=(s,p)=>select(s,p);
export function literacyNPCAction(s,p){
 const t=p.agenda.task;if(!['literacyStudy','textAloud','literacySell'].includes(t?.kind))return false;if(!literacyEnabled(s)||t.valueReason&&!textValuesOn(s))return true;
 const result=t.kind==='literacySell'?{status:sellTextWithoutReading(s,p,s.people[t.buyer],t.item)?'sold':'unavailable'}:t.kind==='textAloud'?askTextReader(s,p,s.people[t.teacher],t.item):studyTextLesson(s,p,s.people[t.teacher],t.item,t.branch);
 if(result.status==='progress')t.remaining=result.remaining;
 if(t.kind==='literacySell'&&result.status==='unavailable'&&s.people[t.buyer]?.textPurchase?.seller===p.id&&s.people[t.buyer].textPurchase.item===t.item&&s.people[t.buyer].textPurchase.until>=s.tick)result.status='waiting';
 if(!['waiting','progress'].includes(result.status)){p.agenda.task=null;p.agenda.due=s.tick+8;}return true;
}
