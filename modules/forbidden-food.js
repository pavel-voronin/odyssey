import {forbiddenOn,forbiddenMemory,fleshPermission,fleshNear,fleshChoice} from './forbidden-state.js';
import {meatBody,meatCanAct,meatSpend,meatKnife,meatSafe} from './meat-state.js';
import {decayRemains,substanceEvent} from './remains-cycle-state.js';
import {wearOwnedItem} from './item-condition.js';
import {consumedFood,nutritionView} from './nutrition-state.js';
import {carriedFood} from './stores.js';
import {localFoodChoice} from './local-food.js';
import {publishFleshFact} from './forbidden-news.js';
import {moduleRandom} from '../rules.js';
export function eatForbiddenFlesh(s,p,b,ctx={},opts={}){
 if(!forbiddenOn(s)||!fleshPermission(s,p)||!meatCanAct(s,p,{...opts,need:true})||p.forbiddenFood?.lastAt===s.tick||!meatKnife(s,p)||!meatSafe(s,p)||!fleshNear(s,p,b))return false;
 decayRemains(s,b);if(!fleshNear(s,p,b))return false;const q=forbiddenMemory(p),old=b.fleshUse?.work;if(old&&old.actor!==p.id&&s.people[old.actor]?.alive&&s.tick-old.at<=8)return false;
 const book=b.fleshUse ||= {version:1,serial:0,attempts:0,work:null,meals:[]},w=book.work=old?.actor===p.id?old:{actor:p.id,started:s.tick,at:-1,steps:0,tool:meatKnife(s,p).id,id:b.id+'/flesh/'+(++book.attempts)};
 if(w.at===s.tick)return false;w.at=s.tick;w.steps++;q.lastAt=s.tick;q.work={body:b.id,id:w.id,steps:w.steps,at:s.tick};meatSpend(s,p,2);wearOwnedItem(s,meatKnife(s,p),p.id,'gather',b.id,ctx);
 const complete=w.steps===3;let meal=null;if(complete){const before=b.substance.flesh.remaining;if(!substanceEvent(s,b,'flesh','extracted',1,{kind:'person',id:p.id}))return false;const roll=moduleRandom(s,'forbidden-food'),poison=roll<.2,body=meatBody(s,p);meal={id:w.id,body:b.id,actor:p.id,at:s.tick,area:body.area,x:body.x,before,after:before-1,units:1,portions:2,outcome:poison?'poison':'food'};book.serial++;book.meals.push(meal);q.meals.push(meal);if(q.meals.length>8)q.meals.shift();q.work=null;book.work=null;consumedFood(s,body,{portions:2,source:meal.id});if(poison){if(body.lineage){body.hp-=8;ctx.domesticPoison?.(s);}else {p.health-=8;p.ailment='poison';}}}
 publishFleshFact(s,p,b,{id:w.id+'/'+w.steps,batch:w.id,stage:complete?'eat':'cut',step:w.steps,meal});
 if(s.hero.lineage===p.id){s.hero.goal=null;s.hero.intent=complete?'Съесть действительную плоть':'Отделить пригодную долю';ctx.log?.(s,complete?(meal.outcome==='poison'?'Пища насытила, но вызвала отравление.':'Съедена одна конечная доля плоти умершего человека.'):'Разделка плоти умершего: '+w.steps+'/3.','food');}return true;
}
export function forbiddenFoodTurn(s,p,ctx={},opts={}){const h=meatBody(s,p),n=h?.lineage?h:p?.needs;if(!forbiddenOn(s)||!p?.alive||!n||!nutritionView(s,h).deficient||carriedFood(p,h.lineage?h.inventory:null)>0||localFoodChoice(s,p,h.lineage?h:null,s.areas[h.area])||s.areas[h.area]?.civic?.food>0||ctx.domesticCanFeed?.(s,p))return false;const b=fleshChoice(s,p);return b?eatForbiddenFlesh(s,p,b,ctx,opts):false;}
