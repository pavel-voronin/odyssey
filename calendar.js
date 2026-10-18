import {areaEnvironment} from './area-environment.js';
import {DAY_TICKS,LIGHT_TICKS,DAYS_PER_YEAR,YEAR_TICKS} from './calendar-units.js';
export {DAY_TICKS,LIGHT_TICKS,DAYS_PER_YEAR,YEAR_TICKS} from './calendar-units.js';
import {historicalDate} from './modules/historical-calendar.js';
export const CLIMATES={
  temperate:{name:'Умеренный',seasons:[['spring','Весна','Ве',20],['summer','Лето','Ле',20],['autumn','Осень','Ос',20],['winter','Зима','Зи',20]]},
  tropical:{name:'Тропический',seasons:[['wet','Дожди','Дж',40],['dry','Сушь','Су',40]]},
  arid:{name:'Засушливый',seasons:[['summer','Долгое лето','Ле',60],['cool','Прохлада','Пр',20]]},
  alpine:{name:'Высокогорный',seasons:[['thaw','Таяние','Та',10],['summer','Короткое лето','Ле',15],['autumn','Иней','Ин',10],['winter','Большой снег','Сн',45]]},
  underground:{name:'Подземный',seasons:[['deep','Глубинная тишь','Гл',80]]}
};
export function calendar(tick) {
  const hour = tick % DAY_TICKS;
  return {day:Math.floor(tick / DAY_TICKS)+1,night:hour>=LIGHT_TICKS,phase:hour<50?'Утро':hour<170?'День':hour<LIGHT_TICKS?'Вечер':'Ночь'};
}
export function climateId(s,a={}){
  a=areaEnvironment(s,a);
  if(Object.hasOwn(CLIMATES,a.climate))return a.climate;
  if(a.realm==='underground'||['cave','dungeon','undercity'].includes(a.type))return'underground';
  if(a.type==='desert')return'arid';if(a.type==='mountain')return'alpine';if(a.type==='island')return'tropical';
  if(!a.continent||a.continent==='c0')return'temperate';
  let hash=s.seed>>>0;for(const c of a.continent)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  return ['temperate','tropical','arid','alpine','temperate'][hash%5];
}
export function worldDate(s,tick=s.tick,area=s.areas?.[s.hero?.area]){
  area=areaEnvironment(s,area);
  const t=Math.max(0,Math.floor(Number.isFinite(tick)?tick:0)),yearIndex=Math.floor(t/YEAR_TICKS),dayOfYear=Math.floor(t/DAY_TICKS)%DAYS_PER_YEAR+1,climate=climateId(s,area),seasons=CLIMATES[climate].seasons;
  let day=dayOfYear,season=seasons[0];for(const candidate of seasons){season=candidate;if(day<=candidate[3])break;day-=candidate[3];}
  const base=Number.isFinite(s.chronology?.year)?Math.floor(s.chronology.year):743,era=Number.isFinite(area?.era)?Math.floor(area.era):0;
  const civil=historicalDate(s,t),physicalYear=base+yearIndex,sceneYear=physicalYear+era;
  return {...calendar(t),...civil,year:civil.civilYear,physicalYear,sceneYear,temporalOffset:era,yearIndex,dayOfYear,climate,season:season[0],seasonName:season[1],seasonShort:season[2],seasonDay:day,seasonDays:season[3]};
}
export function dateLabel(s,tick=s.tick,area){const d=worldDate(s,tick,area);return `${d.seasonName}, ${d.seasonDay} · ${d.periodKind==='historical'?d.year:d.sceneYear} г.`;}
export function dateStamp(s,tick=s.tick,area){const d=worldDate(s,tick,area);return `${d.seasonShort} ${d.seasonDay}`;}
export function elapsedLabel(ticks){
  const t=Math.max(0,Math.floor(ticks||0)),years=Math.floor(t/YEAR_TICKS),days=Math.floor(t/DAY_TICKS)%DAYS_PER_YEAR,hours=Math.floor(t%DAY_TICKS/10),minutes=t%10*6;
  if(years)return `${years} г.${days?' '+days+' д.':''}`;
  if(days)return `${days} д.${hours?' '+hours+' ч.':''}`;
  if(hours)return `${hours} ч.${minutes?' '+minutes+' мин.':''}`;
  return minutes?`${minutes} мин.`:'0 д.';
}
