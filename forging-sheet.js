import {KNIFE_RECIPE} from './modules/forging.js';
export function forgingHTML(s,escape){
 const q=s.people[s.hero.lineage]?.forging;if(!q)return '';
 const o=q.orders[q.active],last=Object.values(q.orders).filter(o=>o.status==='completed').at(-1),part=o?.materials.find(m=>m.kind==='wolf-fang');
 return `<section><p class="detail-label">ИЗГОТОВЛЕНИЕ</p><p>${q.recipes[KNIFE_RECIPE.id]?'Известен рецепт: рабочий нож.':q.study?'Рецепт рабочего ножа: '+escape(q.study.progress)+' / 3 занятия.':'Рецепт пока не изучен.'}</p>${o?`<p>Рабочий нож · ${escape(o.progress)} / ${escape(o.required)} действий</p><p class="empty">${part?'Клык зверя '+escape(part.provenance.animalName)+' и рукоять':'Заготовка и рукоять'} принадлежат заказу. Мастерская: ${escape(s.areas[o.area]?.name||o.area)}. Перерыв сохраняет материалы и работу.</p>`:last?'<p class="empty">Последнее собственное изделие: рабочий нож.</p>':''}</section>`;
}
