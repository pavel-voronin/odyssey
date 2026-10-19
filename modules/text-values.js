import {enabled} from '../rules.js';
import {textActor,textWork,textsOn,heldTexts} from './text-state.js';
import {marketWallet} from './market.js';
import {carriedFood} from './stores.js';
import {hasHabit} from './common.js';
export const textValuesOn=s=>enabled(s,'text-values')&&enabled(s,'literacy')&&textsOn(s);
export function textNeed(s,p){const h=textActor(s,p.id);return marketWallet(s,p.id)<3&&(h?.hunger??p.needs.hunger)>=75&&carriedFood(p,h?.inventory)===0;}
function family(s,p,id){return id!==p.id&&Boolean((p.parents||[]).includes(id)||(s.people[id]?.parents||[]).includes(p.id)||(p.parents||[]).some(parent=>(s.people[parent]?.parents||[]).includes(id)));}
export function textValue(s,p,item){
 if(item?.libraryTheft?.returned===null)return {sell:false,reason:'Это невыданный экземпляр чужого фонда; право на него не перешло к держателю.',kind:'unissued'};if(item?.libraryLoan?.returned===null)return {sell:false,reason:'Книга выдана в долг: право на экземпляр осталось у владельца фонда.',kind:'loan'};const w=textWork(s,item);if(!w)return {sell:false,reason:'Чистая бумага остаётся материалом для письма.'};
 const h=textActor(s,p.id),read=w.author===p.id||p.textCraft?.readings.some(e=>e.content===w.id)||p.literacy?.reports.some(r=>r.content===w.id&&!r.partial),curiosity=h?.personality.curiosity??p.agenda.curiosity;
 const kin=family(s,p,w.author)||family(s,p,item.textCopy.writer),collected=h&&hasHabit(h,'collector')||p.collection?.master===w.author||!h&&p.agenda.job==='scholar'&&curiosity>=.85;
 const goal=h?.goal||p.agenda.task,info=w.content,needed=read&&(info.kind==='mechanism-sequence'&&(goal?.key===info.key||p.mechanisms?.known.some(n=>n.key===info.key&&n.state==='closed'))||info.kind==='employment-note'&&goal?.kind==='work'&&(goal.area||goal.target)===info.area);
 if(textNeed(s,p))return {sell:true,reason:kin?'Голод и отсутствие еды заставляют предложить даже семейную запись.':'Нет еды и денег на ближайшую порцию: запись можно продать ради еды.',kind:'need'};
 if(kin)return {sell:false,reason:'Это запись близкого родственника; она хранит семейную память.',kind:'family'};
 if(needed)return {sell:false,reason:'Известное содержание связано с нынешним делом или закрытым проходом.',kind:'useful'};
 if(collected)return {sell:false,reason:'Он собирает такие записи и сохраняет собственный экземпляр.',kind:'collection'};
 const duplicate=heldTexts(s,p.id).filter(i=>i.textCopy?.content===w.id).length>1;
 if(!read&&curiosity>=.6&&!duplicate)return {sell:false,reason:'Содержание ещё не изучено; любопытство важнее быстрой продажи.',kind:'unread'};
 return {sell:true,reason:duplicate?'Запасной экземпляр можно предложить читателю.':read?'Знакомая запись сейчас не нужна; её можно передать читателю.':'Он не хочет тратить время на незнакомую запись и готов её продать.',kind:duplicate?'spare':read?'unneeded':'uninterested'};
}
export function textBuyerPrice(s,buyer,item){
 const w=textWork(s,item);if(!w||!buyer?.alive||!['merchant','scholar'].includes(buyer.agenda?.job)||heldTexts(s,buyer.id).some(i=>i.textCopy?.content===w.id))return null;
 // A modest offer for a physical copy. Rarity never creates a purse or an
 // unbounded quote; damage reduces interest to the material alone.
 return item.textCopy.condition==='damaged'?1:buyer.agenda.job==='scholar'&&buyer.agenda.curiosity>=.6?4:2;
}
