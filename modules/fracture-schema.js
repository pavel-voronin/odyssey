import {bodyParts} from './anatomy-state.js';
export function validateFractures(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,int=(n,a,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 for(const p of Object.values(s.people))for(const w of p.localWounds?.active||[]){const f=w.fracture;if(!f)continue;const path=p.id+'.fracture';
  if(f.version!==1||f.part!==w.part||!bodyParts(p).some(([id,,role])=>id===f.part&&['arm','leg'].includes(role))||['automaton','myconid'].includes(p.race)||!tick(f.created)||!tick(f.lastTick)||f.created>f.lastTick||!int(f.union,0,100)||!int(f.progress,0)||!int(f.loaded,0)||!int(f.rested,0)||f.union>f.progress||f.unitedAt!==undefined&&(!tick(f.unitedAt)||f.union!==100)||f.union===100&&f.unitedAt===undefined)fail(path);
  for(const c of [f.cause,f.lastImpact])if(!c||!tick(c.tick)||!s.areas[c.area]?.objects.some(e=>e.id===c.enemy&&e.kind==='enemy')||![c.before,c.after,c.maximum].every(Number.isFinite)||c.maximum<=0||c.before>c.maximum||c.after<=0||c.before-c.after<Math.max(8,c.maximum*.2)||c.id!==JSON.stringify([p.id,c.tick,c.enemy,c.controller]))fail(path+'.cause');
  if(f.cause.tick!==f.created||f.lastImpact.tick<f.created||f.lastImpact.tick>f.lastTick)fail(path+'.order');
  if(f.ended!==null&&(!tick(f.ended?.tick)||f.ended.kind!=='part-lost'||f.ended.loss!==w.loss))fail(path+'.ended');
  const q=f.splint;if(q!==null){const wood=q?.wood,b=q?.binding;if(q?.version!==1||!tick(q.at)||!s.people[q.by]||![1,2].includes(q.quality)||!int(q.remaining,0,12)||!wood||!s.areas[wood.area]||typeof wood.source!=='string'||!int(wood.before,1)||wood.after!==wood.before-1||wood.units!==1||wood.paid!==3||!b||b.holder!==q.by||!int(b.before,1)||b.after!==b.before-1||b.units!==1)fail(path+'.splint');}
 }
}
