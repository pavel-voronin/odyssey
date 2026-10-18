import {metricKey,metricRate,routeLoad} from './metric-route-state.js';
export function pricedNavigation(s){return Boolean(s.hero.atlas.roadCosts&&Object.keys(s.hero.atlas.roadCosts).length);}
export function knownRoadEstimate(s,from,to){
 const q=s.hero.atlas.roadCosts?.[metricKey(from,to)];if(!q)return null;
 const h=s.hero,weather=h.weatherTaste?.observed?.split('/')[3],conditions={rain:{speed:.94,energy:1.12},fog:{speed:.83,energy:1},snow:{speed:.8,energy:1.2},storm:{speed:.76,energy:1.3},heat:{speed:.95,energy:1.25}}[weather]||{speed:1,energy:1};
 const rate=q.distance?metricRate(q,conditions,routeLoad(s,h)):null,movement=rate?Math.ceil(q.distance/rate.speed):Math.max(0,q.duration||0),ticks=movement+1;
 return {...q,ticks,energyCost:rate?movement*rate.energy:q.mode==='sea'?movement*.2:movement*.7,foodCost:ticks*.16/65};
}
export function knownRoadWeight(s,from,to,target){
 const h=s.hero,q=knownRoadEstimate(s,from,to),a=s.areas[to],local=to===target?0:Math.ceil(Math.max(.5,Math.min(6,(a.length||100)/100))*95/6);
 if(q&&(['sea','stairs'].includes(q.mode)&&s.rules.travel===false||q.mode==='portal'&&s.rules.portals===false||q.mode==='time'&&s.rules.time===false))return Infinity;
 const urgent=h.goal?.urgent||['rescue','assist'].includes(h.goal?.kind),caution=urgent?.15:1-h.personality.courage,threat=s.rules['route-memory']!==false&&h.memory.rejected?.[to],knownThreat=threat?Math.max(0,threat.attack)*3+Math.max(0,threat.hp)/5:0;
 const water=q?.mode==='sea'&&h.routePreferences?.water?80*(urgent?.15:1):0,fare=q?.mode==='sea'?q.cost>h.gold?20:q.cost/2:0;
 return (q?.ticks??1)+local+(q?.energyCost??.7)*.25+(q?.foodCost??0)*5+knownThreat*caution+water+fare;
}
