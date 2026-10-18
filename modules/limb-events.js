import {bodyParts} from './anatomy-state.js';
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
export function recordLimbLoss(s,p,w,cause){
 if(s.rules?.['limb-loss']===false||!p?.alive||s.people[p.id]!==p||!p.localWounds?.active.includes(w)||w.lastCause!==cause||cause.tick!==s.tick||cause.after<=0||cause.before-cause.after<cause.maximum*.32||w.severity!==3||!['arm','leg'].includes(w.role)||w.kind!=='cut'&&!['automaton','revenant'].includes(p.race)||p.anatomy?.missing?.includes(w.part)||p.limbLosses?.events.some(e=>e.part===w.part)||hash(s.seed+'/loss/'+cause.id)%53!==0)return null;
 const actor=s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id],hp=actor?.alive&&!actor.life?.ended&&actor.actorMode!=='npc'?actor.hp:p.health;if(hp!==cause.after||!s.areas[cause.area]?.objects.some(e=>e.id===cause.enemy&&e.kind==='enemy'&&e.alive))return null;
 const part=bodyParts(p).find(([id])=>id===w.part);if(!part)return null;
 const event={id:cause.id+'/loss/'+w.part,tick:s.tick,part:w.part,label:part[1],role:part[2],race:p.race,impact:w.kind,wound:w.id,cause:{...cause}};
 (p.limbLosses ||= {version:1,events:[]}).events.push(event);p.anatomy ||= {};p.anatomy.missing ||= [];p.anatomy.missing.push(w.part);
 for(const wound of p.localWounds.active)if(wound.part===w.part)wound.loss=event.id;
 return event;
}
