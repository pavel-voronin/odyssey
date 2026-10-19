import {createWorld,createArea,connectAreas,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {beginWorldChange} from '../modules/world-changes.js';
export function eraFixture({bypass=false}={}){
 const flags=['world-eras','historical-calendar','identity','people'],s=createWorld(13,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),from=s.areas.a1,gate=s.areas.a2,to=s.areas[createArea(s,'village','Дальний центр',1)],key=[gate.id,to.id].sort().join('|');connectAreas(s,gate.id,to.id);if(bypass)connectAreas(s,from.id,to.id);return {s,h:s.hero,from,gate,to,key};
}
export function eraCause(f,id='rift/one',domain='geography',keys=[f.key]){const event={id,tick:f.s.tick,area:f.gate.id,text:'Опорная связь изменилась.',knownBy:[],witnesses:[]};f.s.changes.push(event);return beginWorldChange(f.s,{event,domain,oldLimit:'Опорные центры связаны прежним путём',name:'После разрыва пути',shortName:'Разрыв пути',actors:[],effects:keys.map(id=>({root:'edges',id,path:[]}))});}
// Isolated geography-owner transaction. It changes the real route graph; the
// registrar is deliberately not given a callback that could repeat this effect.
export function removeActualRoad(f,key=f.key){const e=f.s.edges[key];if(!e)throw Error('Road already removed');for(const [a,b]of [[e.a,e.b],[e.b,e.a]])f.s.areas[a].links=f.s.areas[a].links.filter(id=>id!==b);delete f.s.edges[key];f.s.graphRevision=(f.s.graphRevision||0)+1;return e;}
export function eraSave(f){syncActiveActor(f.s);return serialize(f.s);}
