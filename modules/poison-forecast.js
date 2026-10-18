import {enabled} from '../rules.js';
import {mealWarmth,foodWalkingTicks} from './hearth-food.js';
import {knownArea} from '../actor-atlas.js';
import {areaScale,physicalDistance} from '../geometry.js';
import {interiorPassage} from './interiors.js';
import {weatherAt} from './weather.js';
// bodyTick removes an expired condition before applying a divisible-tick pulse.
export function poisonPeriod(s){return enabled(s,'lineage')&&['dwarf','revenant'].includes(s.hero.race)?16:8;}
function poisons(s){return enabled(s,'body')?s.hero.conditions.filter(c=>c.id==='poison'):[];}
export function poisonDamageUntil(s,through){
 const period=poisonPeriod(s),from=Math.floor(s.tick/period);
 return poisons(s).reduce((n,c)=>{if(!Number.isFinite(c.until))return n;const last=Math.floor(Math.min(Math.floor(through),Math.ceil(c.until)-1)/period);return n+Math.max(0,last-from);},0);
}
export function medicalDamageUntil(s,through){
 const poison=poisonDamageUntil(s,through);if(!enabled(s,'body')||through<=s.tick)return poison;
 const rate=enabled(s,'lineage')&&s.hero.race==='automaton'?.06:.16;
 const after=s.tick+Math.max(1,Math.floor((90-s.hero.hunger)/rate)+1),first=Math.ceil(after/16)*16;
 return poison+(through>=first?Math.floor((through-first)/16)+1:0);
}
export function poisonForecast(s){
 const conditions=poisons(s),finite=conditions.filter(c=>Number.isFinite(c.until)),until=finite.reduce((n,c)=>Math.max(n,c.until),s.tick),period=poisonPeriod(s),damage=poisonDamageUntil(s,until),uncertain=finite.length!==conditions.length;
 let lethalAt=null;
 if(damage>=s.hero.hp&&damage>0){let low=s.tick+1,high=Math.ceil(until);while(low<high){const middle=Math.floor((low+high)/2);if(poisonDamageUntil(s,middle)>=s.hero.hp)high=middle;else low=middle+1;}lethalAt=low;}
 const next=(Math.floor(s.tick/period)+1)*period;
 return {period,until,remaining:Math.max(0,until-s.tick),damage,next:next<until?next:null,lethalAt,uncertain};
}
// Estimate every known scene. A three-scene preparation estimate is unsuitable
// for a medical deadline. Fresh remote stocks/enemies/host positions do not
// determine the estimate; remote admission is checked again only on arrival.
// Unmodelled transport is unavailable rather than silently treated as one step.
export function careArrival(s,target,x,ctx){
 const h=s.hero,path=(ctx.knownRoute||ctx.route)(s,h.area,target);if(!path.length||path.some(id=>!s.areas[id]||!knownArea(s,s.areas[id])))return null;
 let from=h.x,ticks=0;
 for(let i=0;i<path.length;i++){
  const a=s.areas[path[i]],next=path[i+1],passage=next&&interiorPassage(s,a.id,next,h.lineage),edge=next&&s.edges?.[[a.id,next].sort().join('|')];
  if(next&&!passage&&enabled(s,'travel')&&edge&&edge.mode!=='road')return null;
  if(passage&&!passage.allowed&&a.id===h.area)return null;
  const to=passage?passage.x:next?(Number(next.slice(1))>Number(a.id.slice(1))?100:0):x;
  // Remote weather is a conservative assumption, not hidden fresh observation.
  const weather=a.id===h.area?weatherAt(s,a):{speed:.6};
  const stride=(h.conditions.some(c=>c.id==='frost')?4:6)*weather.speed;
  if(!(stride>0))return null;
  const distance=Math.max(0,physicalDistance(a,from,to)-areaScale(a));
  ticks+=mealWarmth(s)?foodWalkingTicks(s,distance,weather.speed,s.tick+ticks):Math.ceil(distance/stride);
  if(next){ticks++;from=passage?.arrival??(to===100?5:95);}
 }
 return {ticks:ticks+1,area:target,x,path,remoteWeatherEstimated:path.length>1};
}
