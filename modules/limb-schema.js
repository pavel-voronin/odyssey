import {bodyParts} from './anatomy-state.js';
export function validateLimbLosses(s,fail){
 for(const p of Object.values(s.people)){
  const t=p.limbLosses;if(t===undefined)continue;
  if(t?.version!==1||!Array.isArray(t.events)||!t.events.length||t.events.length>4||new Set(t.events.map(e=>e.part)).size!==t.events.length)fail(p.id+'.limbLosses');
  for(const e of t.events){const part=bodyParts(p).find(([id])=>id===e.part),c=e.cause;if(!part||!['arm','leg'].includes(part[2])||e.label!==part[1]||e.role!==part[2]||e.race!==p.race||e.impact!=='cut'&&!(['automaton','revenant'].includes(p.race)&&e.impact==='bruise')||!p.anatomy?.missing?.includes(e.part)||!Number.isSafeInteger(e.tick)||e.tick<0||e.tick>s.tick||!Number.isSafeInteger(e.wound)||e.wound<1||!p.localWounds||e.wound>p.localWounds.serial||!c||typeof c.controller!=='string'||c.tick!==e.tick||e.id!==c.id+'/loss/'+e.part||c.id!==JSON.stringify([p.id,c.tick,c.enemy,c.controller])||!s.areas[c.area]?.objects.some(o=>o.id===c.enemy&&o.kind==='enemy')||![c.before,c.after,c.maximum].every(Number.isFinite)||c.maximum<=0||c.before>c.maximum||c.after<=0||c.before-c.after<c.maximum*.32)fail(p.id+'.limbLoss');}
 }
}
