import {airships,airEvent,flightCost} from './airship-state.js';
import {weatherAt} from './weather.js';
import {recordCrossingTrace} from './edge-traces.js';
export function boardFlight(s,b,m,t){t.air={craft:m.id,pilot:b.lineage||b.id,load:flightCost(s,b,6)-1,started:s.tick};m.flight={person:t.air.pilot,started:s.tick,from:t.from,to:t.to};t.total=t.remaining=Math.ceil(t.metric.distance/12);return t;}
export function advanceFlight(s,b,t,{weather=weatherAt}={}){const m=s.airships.byId[t.air.craft],q=t.metric;if(q.lastTick===s.tick)return false;q.lastTick=s.tick;
 const storm=[t.from,t.to].some(id=>weather(s,s.areas[id]).id==='storm'),cost=(d)=>d*(1+t.air.load)/6;
 if(!m||m.hp<=0||storm||m.charge+1e-8<cost(Math.min(12,q.distance-q.travelled))){if(m){m.hp=Math.max(0,m.hp-10);m.flight=null;m.body={kind:'area',...m.pads[t.from]};airEvent(s,m,{kind:'forced-landing',person:t.air.pilot});}t.air.aborted=true;t.remaining=0;t.arrivalX=q.departureX;if(b.lineage)b.hp-=4;else b.health=Math.max(0,b.health-4);return true;}
 const moved=Math.min(12,q.distance-q.travelled),used=cost(moved);m.charge=Math.max(0,m.charge-used);m.spent+=used;q.travelled+=moved;t.remaining=Math.ceil((q.distance-q.travelled)/12);if(b.lineage){b.distance+=moved;b.energy=Math.max(0,b.energy-.5);}else b.needs.energy=Math.max(0,b.needs.energy-.5);
 if(!t.remaining){m.body={kind:'area',area:t.to,x:t.arrivalX};m.flight=null;recordCrossingTrace(s,{kind:'person',id:t.air.pilot},t.from,t.to);airEvent(s,m,{kind:'arrived',person:t.air.pilot});}return t.remaining===0;
}
export function settleAirships(s){for(const m of airships(s)){const f=m.flight;if(!f||s.people[f.person]?.alive)continue;const h=s.hero?.lineage===f.person?s.hero:s.actorStates[f.person],p=s.people[f.person],t=h?.transit||p?.roadTransit;m.hp=0;m.flight=null;m.body=t?.metric?{kind:'edge',journey:structuredClone(t)}:{kind:'area',...m.pads[f.from]};airEvent(s,m,{kind:'pilot-dead',person:f.person});}}

