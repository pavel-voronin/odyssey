import {cookingEnabled,culinary,knowsBroth,actualHearth,safeCooking,brothIngredient,kitchenBatch,startBroth,brothWork,eatBroth,edibleBroth,finishKitchen,batchWorkMatches,mealWarmth,BROTH_RECIPE,MEAL_WARMTH} from './hearth-food.js';
import {availableBrothTeacher,reserveBrothTeacher,brothTeacherTurn} from './broth-teaching.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcAction} from './npc-control.js';
import {setActorMoney} from '../actor-projection.js';
import {maySpend} from './finances.js';
import {safeCampActivity,campActivityAvailable,reserveCampActivity} from './camp-session.js';
import {humanParty,partyMealSize,feedParty} from './party-needs.js';
const cold=(s,h)=>h.ruleFlags?.body!==false&&h.conditions.some(c=>c.id==='frost'&&(c.until??Infinity)>s.tick);
const wants=(s,h)=>h.hunger>=40||cold(s,h)&&!mealWarmth(s,h);
const wantsBowl=(s,h,b)=>h.hunger>=40||b.warmUntil>s.tick&&cold(s,h)&&!mealWarmth(s,h);
function release(s,p){const id=p?.foodCooking?.teacher,t=s.people[id];if(t?.brothTeaching?.pupil===p.id)delete t.brothTeaching;if(p?.foodCooking)delete p.foodCooking.teacher;}
function pauseLesson(s,ctx,why){const p=s.people[s.hero.lineage];release(s,p);p.foodCooking.learnAfter=s.tick+96;s.hero.goal=null;ctx.log(s,why,'skill');return false;}
export function cookingTick(s,ctx){
 const h=s.hero,p=s.people[h.lineage],q=p?.foodCooking;if(!q)return;
 if(q.teacher&&(!cookingEnabled(s)||h.goal?.kind!=='brothLearn'||h.combat||h.transit||!h.alive)){release(s,p);if(h.goal?.kind==='brothLearn')h.goal=null;}
 if(!cookingEnabled(s)){if(['brothCook','brothEat'].includes(h.goal?.kind))h.goal=null;return;}
 if(q.pending){const b=kitchenBatch(s,q.pending.area);if(!batchWorkMatches(s,h,b)||!safeCooking(s,h)){const a=s.areas[q.pending.area];finishKitchen(s,a,'ruined');if(h.goal?.kind==='brothCook')h.goal=null;ctx.log(s,'Готовку пришлось прервать. Травы и добыча испорчены.','food');}}
}
export function cookingPlan(s,ctx,{lesson=true}={}){
 const h=s.hero,p=s.people[h.lineage];if(!cookingEnabled(s)||!h.alive||h.combat||h.transit)return false;
 const ready=edibleBroth(s,h);if(ready&&wantsBowl(s,h,ready)){const fire=actualHearth(s,h.area);ctx.goal(s,'brothEat',h.area,fire.x,'Поесть у очага','Приготовленная похлёбка осталась здесь; пока она тёплая, можно согреться.');return true;}
 if(!safeCooking(s,h)||h.hunger>=65||h.energy<43)return false;
 const input=brothIngredient(s,h);if(!input)return false;
 if(knowsBroth(s,p)){
  const fire=actualHearth(s,h.area),b=kitchenBatch(s,h.area);
  if(fire&&wants(s,h)&&(!b||!['preparing','ready'].includes(b.status))){ctx.goal(s,'brothCook',h.area,fire.x,'Сварить походную похлёбку','Есть знакомый рецепт, добыча и трава. Тёплая еда поможет перенести холод.',{remaining:3});return true;}return false;
 }
 if(!lesson||h.personality.curiosity<.6||(p.foodCooking?.learnAfter||0)>s.tick||!maySpend(s,'learning',3-(p.foodCooking?.study.length||0),ctx))return false;
 const candidates=[...new Set(s.areas[h.area].population||[])].map(id=>s.people[id]);
 const teacher=candidates.find(t=>t&&t.id!==p.id&&t.area===h.area&&availableBrothTeacher(s,t)&&(!t.brothTeaching||t.brothTeaching.until<s.tick||t.brothTeaching.pupil===p.id)&&localContact(s,t.id,h.area)&&physicalDistance(s.areas[h.area],h.x,localContact(s,t.id,h.area).x)<=24);
 if(!teacher)return false;const q=culinary(p);q.teacher=teacher.id;
 ctx.goal(s,'brothLearn',h.area,localContact(s,teacher.id,h.area).x,'Узнать рецепт у '+teacher.name,'Три занятия у знающего человека, по монете за каждое. Добычу можно будет готовить с травами у огня.',{teacher:teacher.id});return true;
}
export function brothLesson(s,ctx){
 const h=s.hero;if(!cookingEnabled(s)){if(h.goal?.kind==='brothLearn')h.goal=null;return false;}
 const p=s.people[h.lineage],t=s.people[h.goal?.teacher],q=culinary(p),pos=t&&localContact(s,t.id,h.area);
 if(q.lastAction>=s.tick)return true;
 if(knowsBroth(s,p)){release(s,p);if(h.goal?.kind==='brothLearn')h.goal=null;return false;}
 if(!cookingEnabled(s)||!safeCooking(s,h)||!t||!pos||!availableBrothTeacher(s,t)||physicalDistance(s.areas[h.area],h.x,pos.x)>9||!maySpend(s,'learning',1,ctx))return pauseLesson(s,ctx,'Урок отложен: наставник или ученик сейчас не готов. Пройденные занятия сохранены.');
 if(!t.brothTeaching&&!reserveBrothTeacher(s,t,h)||t.brothTeaching?.pupil!==p.id)return pauseLesson(s,ctx,'Наставник занят другим учеником. Герой вернётся к рецепту позже.');
 if(t.brothTeaching.turn!==s.tick&&(!npcAction(s,t,'personal')||!brothTeacherTurn(s,t))){h.lastAction='wait';return true;}
 if(q.study.at(-1)?.tick===s.tick||q.lastAction>=s.tick)return true;
 setActorMoney(s,p,h.gold-1);setActorMoney(s,t,(t.agenda?.wealth||0)+1);if(t.needs)t.needs.energy=Math.max(0,t.needs.energy-2);h.energy=Math.max(0,h.energy-1);h.lastAction='talk';q.lastAction=s.tick;q.study.push({tick:s.tick,teacher:t.id,paid:1});t.brothTeaching.until=s.tick+24;
 if(q.study.length>=3){q.recipes[BROTH_RECIPE]={learnedAt:s.tick,source:'lessons',lessons:q.study.slice(-3)};release(s,p);h.goal=null;ctx.log(s,'Рецепт запомнился: добыча, немного трав и спокойное время у огня. Можно сварить походную похлёбку.','skill');}return true;
}
export function brothEatAction(s,ctx,{camp=false}={}){
 const h=s.hero,r=eatBroth(s,h,Math.min(4,partyMealSize(s)+1));if(!r){if(!camp)h.goal=null;return false;}
 feedParty(s,Math.max(0,r.portions-2));if(r.warm)for(const c of humanParty(s).slice(0,Math.max(0,r.portions-2))){const p=s.people[c.person];if(p.area===h.area)culinary(p).warmth={since:s.tick,until:s.tick+MEAL_WARMTH,source:r.batch};}
 if(!camp)h.goal=null;ctx.log(s,r.warm?'Тёплая похлёбка согревает. Герой ест у огня.':'Похлёбка остыла, но всё ещё годится в пищу. Остаток остаётся у очага.','food');return true;
}
export function brothCookAction(s,ctx,{camp=false}={}){
 const h=s.hero,p=s.people[h.lineage];if(!cookingEnabled(s)){if(!camp)h.goal=null;return false;}
 if(!p.foodCooking?.pending){const batch=startBroth(s,h,{mode:camp?'camp':'goal'});if(!batch){if(!camp)h.goal=null;return false;}ctx.log(s,'В котелок отправляются добыча и трава. Теперь нужно дождаться похлёбки у огня.','food');}
 const result=brothWork(s,h);if(result.finished){if(!camp)h.goal=null;if(result.batch)ctx.log(s,'Похлёбка готова. Котелок остаётся у очага; еда постепенно остынет.','food');}return true;
}
export function cookingCamp(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!cookingEnabled(s)||!safeCampActivity(s))return false;
 if(p.foodCooking?.pending?.mode==='camp')return brothCookAction(s,ctx,{camp:true});
 const ready=edibleBroth(s,h);if(ready&&wantsBowl(s,h,ready))return brothEatAction(s,ctx,{camp:true});
 if(!campActivityAvailable(h)||!knowsBroth(s,p)||!brothIngredient(s,h)||!wants(s,h)||!safeCooking(s,h)||h.energy<43)return false;
 const b=kitchenBatch(s,h.area);if(b&&['preparing','ready'].includes(b.status))return false;
 reserveCampActivity(h,'cooking');return brothCookAction(s,ctx,{camp:true});
}
