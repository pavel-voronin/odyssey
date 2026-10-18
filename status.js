import {smokingEffect} from './modules/smoking.js';
import {mealWarmth} from './modules/hearth-food.js';
import {CONDITIONS,SPELLS} from './content.js';
import {enabled} from './rules.js';
import {weatherAt,WEATHER_PERIOD} from './modules/weather.js';
const icons={poison:'☠',fever:'♨',frost:'❄',insomnia:'☾',curse:'◈',blessing:'✦',inspiration:'↑'};
export function activeEffects(s){
  if(!enabled(s,'effects'))return [];
  const result=[];
  if(enabled(s,'body'))for(const c of s.hero.conditions){
    const type=CONDITIONS[c.id];if(!type||c.until!==undefined&&c.until<=s.tick)continue;
    result.push({id:'condition:'+c.id,icon:icons[c.id]||'!',name:type.name,text:type.text,positive:['blessing','inspiration'].includes(c.id),phase:c.since===s.tick?'fresh':'settled',until:c.until??null});
  }
  const smoke=smokingEffect(s);if(smoke)result.push(smoke);
  const meal=mealWarmth(s);if(meal)result.push({id:'meal:warmth',icon:'♨',name:'Тёплая еда',text:'Обморожение меньше сковывает шаг. Действие тепла скоро закончится.',positive:true,phase:meal.since===s.tick?'fresh':'settled',until:meal.until});
  const w=weatherAt(s,s.areas[s.hero.area]);
  if(enabled(s,'weather')&&(w.speed<1||w.energy>1))result.push({id:'weather:'+w.id,icon:w.icon,name:w.name,text:w.text,positive:false,phase:s.hero.weatherTaste.observedAt===s.tick?'fresh':'settled',until:(w.period+1)*WEATHER_PERIOD});
  return result;
}
export function resourceViews(s){
  const m=s.hero.magic;
  if(!enabled(s,'magic')||!m||m.maxMana<=0||!m.spells.some(id=>SPELLS.some(sp=>sp.id===id)))return [];
  return [{id:'mana',name:'Мана',value:m.mana,max:m.maxMana}];
}
