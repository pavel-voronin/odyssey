import {eraFixture,eraCause,removeActualRoad,eraSave} from './world-changes-scenarios.mjs';
import {connectAreas} from '../engine.js';import {finishWorldChange,assessWorldChange,ERA_PAUSE} from '../modules/world-changes.js';
export function namedChange(f,{open=false,id='road/one',hint='Эпоха магии',area=f.gate.id,actors=[]}={}){
 const q=eraCause(f,id);q.name=hint;q.source.area=area;q.actors=[...actors];const original=f.s.changes.find(e=>e.id===id);original.area=area;
 if(open)connectAreas(f.s,f.gate.id,f.to.id);else removeActualRoad(f);
 finishWorldChange(f.s,q.id,{newState:open?'Опорные центры действительно соединились':'Опорные центры действительно разделились'});f.s.tick++;assessWorldChange(f.s,q.id);if(q.status!=='recorded')throw Error('Expected actual road era: '+q.status);return f.s.chronology.periodHistory.entries.at(-1);
}
export function namingSequence({reverse=false}={}){const f=eraFixture();if(reverse)removeActualRoad(f);const first=namedChange(f,{id:'road/first',open:reverse}),entries=[first];for(let i=1;i<3;i++){f.s.tick=entries.at(-1).startTick+ERA_PAUSE;entries.push(namedChange(f,{id:'road/'+i,open:reverse?i%2===0:i%2===1}));}return {...f,entries};}
export {eraFixture,eraSave};
