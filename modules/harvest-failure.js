import {worldDate,DAY_TICKS,YEAR_TICKS} from '../calendar.js';
import {harvestFailureOn,harvestZone} from './harvest-failure-state.js';
import {areaObservation} from './background-towns.js';
const hash=(seed,key)=>{let n=seed>>>0;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
// Structural exposure and the physical season, never hero fortune or today's pantry.
export function harvestCandidates(s){
 const zones=new Map();
 for(const a of Object.values(s.areas)){
  if(!a.civic||a.interior||a.temporaryCamp||a.realm==='underground'||!(a.goods?.sources?.field.capacity>0))continue;
  const places=[a.id,...(a.districts||[])];if(!places.some(id=>(s.areas[id]?.population||[]).some(id=>{const p=s.people[id];return p?.alive&&p.agenda&&p.role!=='ребёнок'&&places.includes(p.area)&&['resident','wandering'].includes(p.status);})))continue;
  const d=worldDate(s,s.tick,a),risk=d.climate==='arid'&&d.season==='summer'?3:d.climate==='tropical'&&d.season==='dry'?2:d.climate==='temperate'&&d.season==='summer'?1:0;
  if(!risk)continue;const zone=harvestZone(s,a),soil=1+hash(s.seed,'dry-soil/'+zone)%3,exposure=risk+soil;
  if(exposure<4)continue;
  const until=(Math.floor(s.tick/DAY_TICKS)+d.seasonDays-d.seasonDay+1)*DAY_TICKS;if(until-s.tick<DAY_TICKS*2)continue;
  let c=zones.get(zone);if(!c){c={zone,climate:d.climate,season:d.season,year:d.yearIndex,exposure,until,areas:[]};zones.set(zone,c);}c.areas.push(a.id);
 }
 return [...zones.values()].map(c=>({...c,areas:c.areas.sort()})).sort((a,b)=>b.exposure-a.exposure||a.zone.localeCompare(b.zone));
}
export function harvestFailureTick(s,ctx={}){
 if(!harvestFailureOn(s))return;
 const t=s.harvestFailures ||= {version:1,created:s.tick,nextAt:s.tick+DAY_TICKS,after:s.tick,serial:0,events:[]};
 for(const e of t.events){
  if(e.ended||s.tick<e.until)continue;
  // Record only this actual present ending. No stock/body/title restoration.
  const notices=e.areas.map(id=>areaObservation(s,s.areas[id],'harvest-end')),witnesses=[...new Set(notices.flatMap(n=>n.witnesses))],knownBy=[...new Set(notices.flatMap(n=>n.knownBy))],a=s.areas[e.areas[0]],id=e.id+'/end',text='В области '+a.name+' закончился сезонный неурожай. Снова возможен обычный урожай; для пополнения кладовых нужны рабочие руки и доставка.';
  e.ended={version:1,at:s.tick,notice:id};s.changes.push({id,tick:s.tick,kind:'harvest-recovery',area:a.id,cause:e.id,text,witnesses,knownBy});if(knownBy.includes(s.hero.lineage))ctx.log?.(s,text,'supply');
 }
 if(s.tick<t.nextAt)return;t.nextAt=s.tick+DAY_TICKS;
 if(s.tick<t.after||t.events.some(e=>s.tick<e.until))return;
 const c=harvestCandidates(s)[0];if(!c)return;
 // One regional episode, then a world-wide forty-day pause. No catch-up/backfill.
 const e={id:'harvest-failure/'+s.seed+'/'+(++t.serial),at:s.tick,until:Math.min(c.until,s.tick+4*DAY_TICKS),zone:c.zone,areas:c.areas,climate:c.climate,season:c.season,year:c.year,exposure:c.exposure,factor:.5};t.events.push(e);if(t.events.length>8)t.events.shift();t.after=e.until+YEAR_TICKS/2;
 const notices=c.areas.map(id=>areaObservation(s,s.areas[id],'harvest-failure')),witnesses=[...new Set(notices.flatMap(n=>n.witnesses))],knownBy=[...new Set(notices.flatMap(n=>n.knownBy))],a=s.areas[c.areas[0]],text='В области '+a.name+' начался сезонный неурожай. Поля дают половину обычного урожая ещё '+Math.ceil((e.until-s.tick)/DAY_TICKS)+' д.; собранные запасы сохраняются.';
 s.changes.push({id:e.id,tick:s.tick,kind:'harvest-failure',area:a.id,text,witnesses,knownBy});if(knownBy.includes(s.hero.lineage))ctx.log?.(s,text,'supply');
}
