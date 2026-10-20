import {meatBagHTML,meatMealHTML} from './meat-sheet.js';
import {localFoodEnabled,foodSourceState,foodCapability,LOCAL_FOODS} from './modules/local-food.js';
export function localFoodBagHTML(s,escape){
 const meat=meatBagHTML(s,escape),p=s.people[s.hero.lineage],q=p?.localFood;if(!q)return meat;
 return `<section><p class="detail-label">МЕСТНЫЕ ПРОДУКТЫ</p>${Object.entries(LOCAL_FOODS).map(([id,d])=>`<div class="fact"><span>${escape(d.name)}</span><b>${escape(q.stock[id]||0)}</b></div>`).join('')}<p class="empty">Продукты ещё не открыты. Одна связка грибов — 2 порции, одна рыба — 4; остаток еды сохраняется.</p>${Object.values(q.tools).map(t=>`<p class="empty">${escape(t.name)} · ${escape(t.state==='working'?'в наличии':'недоступно')}</p>`).join('')}</section>`+meat;
}
export function localFoodSourceHTML(s,escape){
 const meal=meatMealHTML(s,escape);if(!localFoodEnabled(s))return meal;const a=s.areas[s.hero.area],source=foodSourceState(s,a);if(!source)return meal;const capability=foodCapability(s,s.people[s.hero.lineage],source.kind,s.hero);
 return `<section><p class="detail-label">МЕСТНЫЙ ИСТОЧНИК</p><div class="fact"><span>${escape(source.name)}</span><b>${escape(source.stock)} / ${escape(source.max)}</b></div><p class="empty">${escape(source.condition)} ${escape(capability.allowed?'Способ известен, средство с собой.':capability.reason)}</p></section>`+meal;
}
