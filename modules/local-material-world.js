import {rootWorld} from '../world-ref.js';
import {physicalDistance} from '../geometry.js';
import {materialsOn,materialEvent,removeWoodBlocker,materialBody} from './local-material-state.js';
import {weatherAt} from './weather.js';
import {scorchStructure} from './building-condition.js';
export function materialWorldTick(input,ctx={}){
 const s=rootWorld(input);if(!materialsOn(s)||s.tick%4)return;
 for(const e of Object.values(s.edges)){const g=e.mechanism,m=g?.material,a=m&&s.areas[g.lever.area];if(!m||m.lastPhase===s.tick)continue;m.lastPhase=s.tick;
  const weather=weatherAt(s,a),rain=['rain','storm'].includes(weather.id);if(rain&&m.fuel.remaining){if(!m.wet)materialEvent(g,{at:s.tick,actor:null,action:'rain-wet',weather:weather.id,remaining:m.fuel.remaining,wet:1});m.wet=1;if(m.fire?.status==='burning'){m.fire.status='out';materialEvent(g,{at:s.tick,actor:m.fire.actor,action:'rain-out',remaining:m.fuel.remaining,wet:m.wet});}}
  else if(m.wet&&s.tick%16===0){m.wet=0;materialEvent(g,{at:s.tick,actor:null,action:'air-dry',remaining:m.fuel.remaining,wet:0});}
  const fire=m.fire;if(fire?.status!=='burning'||fire.started>=s.tick||fire.lastPhase===s.tick||!m.fuel.remaining)continue;fire.lastPhase=s.tick;m.fuel.remaining--;m.fuel.burned++;
  // One adjacent existing roof can be scorched per phase; no new flame source.
  const adjacent=a.objects.map(o=>({o,p:o.building&&a.facades?.profiles.find(p=>p.id===o.building)})).filter(({o,p})=>p&&!fire.affected.includes(p.id)&&physicalDistance(a,o.x,g.lever.x)<=9&&(p.structure?.roof??3)>0).sort((a,b)=>a.o.id.localeCompare(b.o.id))[0],building=adjacent?.p;
  if(building&&scorchStructure(s,a,building,g.id)){fire.affected.push(building.id);materialEvent(g,{at:s.tick,actor:fire.actor,action:'scorch',building:building.id,remaining:m.fuel.remaining,wet:m.wet});}
  materialEvent(g,{at:s.tick,actor:fire.actor,action:'burn',remaining:m.fuel.remaining,wet:m.wet});if(!m.fuel.remaining){fire.status='spent';removeWoodBlocker(s,g,fire.actor);}
  for(const p of Object.values(s.people)){const b=p.alive&&materialBody(s,p);if(!b||b.area!==a.id||physicalDistance(a,b.x,g.lever.x)>30)continue;const n=p.mechanisms?.known.find(n=>n.key===[g.from,g.to].sort().join('|'));if(n){n.state=g.state;n.at=s.tick;}if(p.id===s.hero.lineage)ctx.log?.(s,m.fuel.remaining?'В очаге сгорает часть древесины. Огонь не переходит в новый бесконечный источник.':'Деревянная заслонка догорает. Прежняя преграда больше не закрывает путь.','story');}
 }
}
