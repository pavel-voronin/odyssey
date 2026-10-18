import {enabled} from '../rules.js';
import {visualRandom} from '../appearance.js';
import {climateWeather} from './climate.js';
import {isTown} from './common.js';
import {areaEnvironment} from '../area-environment.js';
import {workshopSheltered} from './workshop-place.js';
export const WEATHER_PERIOD=480;
export const WEATHERS={
  clear:{name:'Ясно',icon:'☀',speed:1,energy:1,growth:2,harvest:1,text:'Обычная видимость и расход сил.'},
  cloud:{name:'Облачно',icon:'☁',speed:1,energy:1,growth:2,harvest:1,text:'Тучи удерживают прохладу; дорога обычная.'},
  rain:{name:'Дождь',icon:'☂',speed:.94,energy:1.12,growth:3,harvest:1.1,text:'Мокрая дорога требует больше сил; растения быстрее восстанавливаются.'},
  fog:{name:'Туман',icon:'≋',speed:.83,energy:1,growth:2,harvest:1,text:'Плохая видимость замедляет движение.'},
  snow:{name:'Снег',icon:'❄',speed:.8,energy:1.2,growth:1,harvest:.75,text:'Заносы замедляют путь, урожай ниже; усталому нужен тёплый ночлег.'},
  storm:{name:'Гроза',icon:'ϟ',speed:.76,energy:1.3,growth:3,harvest:.85,text:'Порывы ветра и ливень затрудняют дорогу; герой может переждать непогоду.'},
  heat:{name:'Зной',icon:'◉',speed:.95,energy:1.25,growth:0,harvest:.65,text:'Жара быстрее истощает силы, растения не отрастают до смены погоды.'},
  shelter:{name:'Под укрытием',icon:'⌂',speed:1,energy:1,growth:2,harvest:1,text:'Погода поверхности не достигает этой области.'}
};
export function weatherAt(s,a,tick=s.tick){
  a=areaEnvironment(s,a);
  if(a.interior?.kind==='workshop'&&!workshopSheltered(s,a)&&s.areas[a.interior.parent])return weatherAt(s,s.areas[a.interior.parent],tick);
  if(a.interior)return {id:'shelter',period:Math.floor(tick/WEATHER_PERIOD),...WEATHERS.shelter};
  if(['cave','dungeon','undercity','dream','clockwork'].includes(a.type)||a.realm==='underground')return {id:'shelter',period:Math.floor(tick/WEATHER_PERIOD),...WEATHERS.shelter};
  const period=Math.floor(tick/WEATHER_PERIOD),climate=climateWeather(s,a,tick);
  const rnd=visualRandom(s.seed,`weather:${a.continent}:${a.era}:${period}`)();
  let id=enabled(s,'weather')?climate.choices[Math.floor(rnd*climate.choices.length)]:'clear';
  if(!enabled(s,'climate')){if(a.type==='desert'&&id==='rain')id='heat';if(a.type==='mountain'&&(id==='rain'||id==='heat'))id='snow';}
  const w=WEATHERS[id],seasonText=climate.harvest<1?' В этом сезоне урожай скуднее.':climate.harvest>1?' Благоприятный сезон для урожая.':'';
  return {id,period,...w,climate:climate.climate,season:climate.season,growth:Math.round(w.growth*climate.growth),harvest:w.harvest*climate.harvest,text:w.text+seasonText};
}
export function initializeWeather(s,h){
  if(h.weatherTaste)return;
  const rnd=visualRandom(s.seed,'weather-taste:'+h.lineage),choices=Object.keys(WEATHERS).filter(k=>k!=='shelter');
  const likes=choices[Math.floor(rnd()*choices.length)],others=choices.filter(k=>k!==likes);
  h.weatherTaste={likes,dislikes:others[Math.floor(rnd()*others.length)],sensitivity:.3+rnd()*.7,lastMood:-1,shelteredPeriod:-1};
}
export function weatherTick(s,ctx){
  if(!enabled(s,'weather'))return;
  const h=s.hero,w=weatherAt(s,s.areas[h.area]),taste=h.weatherTaste;
  if(s.tick%24===0&&taste.lastMood!==s.tick&&enabled(s,'psychology')){
    taste.lastMood=s.tick;h.mind.stress=Math.max(0,Math.min(100,h.mind.stress+(w.id===taste.likes?-1:w.id===taste.dislikes?1:0)*taste.sensitivity));
  }
  const key=`${s.areas[h.area].continent}/${s.areas[h.area].realm}/${w.period}/${w.id}/${w.climate||''}/${w.season||''}`;
  if(taste.observed!==key){taste.observed=key;taste.observedAt=s.tick;ctx.log(s,`${w.icon} ${w.name}. ${w.text}${w.id===taste.likes?' Герою нравится такая погода.':w.id===taste.dislikes?' Герой не любит такую погоду.':''}`,'weather');}
}
export function weatherShelter(s,ctx){
  if(!enabled(s,'weather'))return false;
  const h=s.hero,a=s.areas[h.area],w=weatherAt(s,a),taste=h.weatherTaste;
  if(!isTown(a)||taste.shelteredPeriod===w.period||!['storm','snow','heat'].includes(w.id)&&w.id!==taste.dislikes)return false;
  if(w.id===taste.likes&&h.energy>65)return false;
  taste.shelteredPeriod=w.period;
  ctx.goal(s,'weatherWait',a.id,h.x,'Переждать непогоду',`${w.name}: ${w.text} Он выбирает несколько спокойных занятий под крышей.`,{remaining:6});return true;
}
export function weatherWait(s,ctx){
  const h=s.hero,g=h.goal;h.energy=Math.min(100,h.energy+3);h.lastAction='rest';g.remaining--;
  if(g.remaining<=0){h.goal=null;ctx.log(s,'Под крышей пережданы самые неприятные минуты. Герой снова оценивает дорогу.','rest');}
}
export function weatherPreference(s,a){
  if(!enabled(s,'weather'))return 0;const w=weatherAt(s,a),h=s.hero;
  return (1-w.speed)*8+(w.id===h.weatherTaste?.likes?-2:w.id===h.weatherTaste?.dislikes?3:0);
}
