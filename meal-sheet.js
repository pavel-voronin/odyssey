import {cookingEnabled,knowsBroth,actualHearth,kitchenBatch,BROTH_WORK,mealWarmth} from './modules/hearth-food.js';
import {elapsedLabel} from './calendar.js';
export function mealBagHTML(s,escape){
 if(!cookingEnabled(s))return'';const p=s.people[s.hero.lineage],q=p?.foodCooking;
 if(!q&&!p?.localFood)return'';
 return `<section><p class="detail-label">РЕЦЕПТЫ</p><p>${knowsBroth(s,p)?'Походная похлёбка':'Изученных рецептов пока нет.'}</p>${q?.study.length&&!knowsBroth(s,p)?`<p class="empty">Занятия у знатока: ${escape(q.study.length)} / 3.</p>`:''}${knowsBroth(s,p)?'<p class="empty">Одна связка грибов или рыба, одна трава и настоящий костёр. Похлёбка останется у очага; её можно съесть тёплой или вернуться за остывшей.</p>':''}${mealWarmth(s)?`<p class="empty">Тепло еды · ещё ${escape(elapsedLabel(mealWarmth(s).until-s.tick))}</p>`:''}</section>`;
}
export function hearthMealHTML(s,escape){
 if(!cookingEnabled(s))return'';const a=s.areas[s.hero.area],fire=actualHearth(s,a);if(!fire)return'';
 const b=kitchenBatch(s,a.id);let description='Костёр свободен. Для готовки нужны изученный рецепт, добыча и трава.';
 if(b){const name=s.people[b.owner]?.name||'Путник';description=b.status==='preparing'?`${name} готовит. Работы осталось: ${Math.max(0,BROTH_WORK-b.work)}.`:b.status==='ready'?`${name}: похлёбка, ${b.remaining} порц. ${s.tick<b.warmUntil?'Ещё тёплая.':'Уже остыла.'} До порчи ${elapsedLabel(Math.max(0,b.expires-s.tick))}`:b.status==='eaten'?'Котелок опустел.':'Прежняя похлёбка пропала. Очаг снова свободен.';}
 return `<section><p class="detail-label">У ОЧАГА</p><p>${escape(description)}</p></section>`;
}
