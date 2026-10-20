import {itemUnits} from './container-state.js';
import {physicalDistance} from '../geometry.js';
import {routeLoad,metricKey} from './metric-route-state.js';
import {weatherAt} from './weather.js';
export function airEvent(s,m,event){m.history.push({at:s.tick,...event});if(m.history.length>16)m.history.shift();}
export const airships=s=>Object.values(s.airships?.byId||{});
export const airshipOn=s=>s.rules.airships!==false&&s.rules.mechanisms!==false&&s.rules.travel!==false;
export const airPilot=(s,b)=>Boolean(s.people[b.lineage||b.id]?.flightTraining);
export function flightLoad(s,b){const h=b.lineage?b:s.actorStates[b.id],items=h?.bag||b.looseItems||[],worn=Object.values(h?.equipment||{}).filter(Boolean);return 8+routeLoad(s,b)+items.reduce((n,i)=>n+itemUnits(i),0)-items.length+worn.reduce((n,i)=>n+itemUnits(i),0)+(b.companions||b.pets||[]).filter(c=>c.hp>0).length*8;}
export function flightCost(s,b,distance){return distance*(1+flightLoad(s,b)/16)/6;}
export function flightRefusal(s,b,m,to,{weather=weatherAt}={}){const id=b.lineage||b.id,e=s.edges[metricKey(b.area,to)],h=b.lineage?b:s.actorStates[id],p=s.people[id],known=h?h.atlas?.roads.includes(metricKey(b.area,to)):p.navigation?.roads.some(r=>metricKey(r.from,r.to)===metricKey(b.area,to));
 if(!airshipOn(s)||!m||m.hp<=0||m.flight)return 'Аппарат сейчас недоступен.';
 if(m.owner!==id)return 'Аппарат принадлежит другому человеку.';
 if(!airPilot(s,b))return 'Нет освоенного умения пилота.';
 if(!e?.metric||m.edge!==metricKey(b.area,to)||!known||![b.area,to].every(a=>m.pads[a]&&s.areas[a]?.realm==='surface'&&!s.areas[a].interior&&!s.areas[a].dungeon))return 'Нет известного разрешённого воздушного коридора и площадок.';
 if(m.body.kind!=='area'||m.body.area!==b.area||physicalDistance(s.areas[b.area],b.x,m.body.x)>3)return 'Аппарат остался на другой площадке.';
 if(flightLoad(s,b)>m.capacity||b.bodyCarry||b.remainsCarry||b.companions?.length||b.pets?.length||Object.values(s.horses?.byId||{}).some(q=>q.leader===id)||Object.values(s.wagons?.byId||{}).some(q=>q.driver===id))return 'Одно место и грузовая вместимость не принимают эту группу.';
 if([b.area,to].some(a=>weather(s,s.areas[a]).id==='storm'))return 'Гроза запрещает взлёт.';
 if(m.charge+1e-8<flightCost(s,b,e.metric.distance))return 'Заряда на весь путь не хватает.';
 return null;
}
export function availableFlight(s,b,to){return airships(s).find(m=>!flightRefusal(s,b,m,to))||null;}
