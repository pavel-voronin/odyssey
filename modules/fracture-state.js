import {enabled} from '../rules.js';
import {presentParts} from './anatomy-state.js';
export const fracturesOn=s=>enabled(s,'local-wounds')&&enabled(s,'fractures');
export const boneSite=(p,w)=>!['automaton','myconid'].includes(p?.race)&&presentParts(p).some(([id,,role])=>id===w.part&&['arm','leg'].includes(role));
export const fracturePending=w=>Boolean(w.fracture&&!w.fracture.ended&&w.fracture.union<100);
export const impactSource=e=>['blunt','impact'].includes(e.damageType)||!e.damageType&&['guard','automaton'].includes(e.species)&&(!e.positionAttack||e.positionAttack.last?.kind==='melee');
export function recordFracture(s,p,w,cause,enemy){
 if(!fracturesOn(s)||!boneSite(p,w)||w.loss||cause.before-cause.after<Math.max(8,cause.maximum*.2)||!impactSource(enemy)||cause.after<=0)return;
 // An actual significant impact, after the sole HP debit. No anatomical loss.
 if(fracturePending(w)){w.fracture.union=Math.max(0,w.fracture.union-20);w.fracture.lastImpact={...cause};w.fracture.lastTick=s.tick;if(w.fracture.splint)w.fracture.splint.remaining=0;return;}
 w.fracture={version:1,part:w.part,created:s.tick,lastTick:s.tick,cause:{...cause},lastImpact:{...cause},union:0,progress:0,loaded:0,rested:0,splint:null,ended:null};
}
export function fracturePhase(s,p,w,{load,rest,fed}){
 const f=w.fracture;if(!fracturesOn(s)||!f||f.lastTick===s.tick||!p.alive)return;f.lastTick=s.tick;
 if(!boneSite(p,w)||w.loss){f.ended={tick:s.tick,kind:'part-lost',loss:w.loss};return;}
 if(!fracturePending(w))return;
 const splint=f.splint,held=splint?.remaining>0;if(load){f.loaded++;if(held)splint.remaining--;}
 if(rest)f.rested++;
 // Bone union has its own clock. Load without support halts it; neither skin
 // closure nor an HP potion can change these units. Quality affects protection.
 const gain=!fed?0:rest?(held?3:2):load?(held&&splint.quality===2?1:0):1;
 f.progress+=gain;f.union=Math.min(100,f.union+gain);
 if(f.union===100)f.unitedAt=s.tick;
}
export function fractureImpairment(s,w){if(!fracturesOn(s)||!fracturePending(w))return 0;return (w.fracture.splint?.remaining>0?.65:.9)*(1-w.fracture.union/100);}
export function fractureText(w){const f=w.fracture;return !f?'':f.ended?' · перелом: часть утрачена':` · перелом, срастание ${f.union}%${f.splint?' · '+(f.splint.remaining>0?('шина '+(f.splint.quality===2?'подогнанная':'грубая')+' '+f.splint.remaining+'/12'):'шина изношена'):': нужна опора'}`;}
