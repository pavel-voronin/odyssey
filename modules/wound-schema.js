import {bodyParts} from './anatomy-state.js';
export function validateWounds(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 const clock=s.woundClock;if(clock!==undefined&&(clock?.version!==1||!Array.isArray(clock.active)||new Set(clock.active).size!==clock.active.length||clock.active.some(id=>!s.people[id]?.localWounds?.active.length)))fail('woundClock');
 for(const p of Object.values(s.people)){
  const t=p.localWounds;if(t===undefined)continue;
  if(t?.version!==1||!integer(t.serial,1,Number.MAX_SAFE_INTEGER)||!Array.isArray(t.active)||t.active.length>12||!tick(t.hitTick)||!tick(t.lastTick)||!Array.isArray(t.hits)||t.hits.length>8||new Set(t.hits).size!==t.hits.length||t.hits.some(id=>typeof id!=='string')||!integer(t.healed,0,Number.MAX_SAFE_INTEGER)||!Object.hasOwn(t,'activity'))fail(p.id+'.localWounds');
  if(t.activity!==null&&(!tick(t.activity?.tick)||!['head','body','arm','leg'].includes(t.activity.role)||typeof t.activity.rest!=='boolean'))fail(p.id+'.woundActivity');
  if(p.alive&&t.active.length&&!clock?.active.includes(p.id))fail(p.id+'.woundClock');
  const sites=new Set(),ids=new Set(),parts=bodyParts(p);
  for(const w of t.active){
   const part=parts.find(([id])=>id===w.part),key=w.kind+'/'+w.part;
   if(!part||part[1]!==w.label||part[2]!==w.role||!['cut','bruise'].includes(w.kind)||p.race==='automaton'&&w.kind==='cut'||!integer(w.id,1,t.serial)||ids.has(w.id)||sites.has(key)||!integer(w.severity,1,3)||!integer(w.closure,0,100)||!integer(w.function,0,100)||w.function>50&&w.closure!==100||w.kind==='bruise'&&w.closure!==100||!integer(w.bleed,0,8)||(w.closure===100?w.bleed!==0:w.bleed===0&&!w.dressing)||!tick(w.lastHit)||!Number.isFinite(w.effectBefore)||w.effectBefore<0||w.effectBefore>1)fail(p.id+'.wound');
   if((w.loss!==undefined||p.anatomy?.missing?.includes(w.part))&&!p.limbLosses?.events.some(e=>e.id===w.loss&&e.part===w.part))fail(p.id+'.woundStump');
   ids.add(w.id);sites.add(key);
   for(const c of [w.firstCause,w.lastCause])if(!c||!tick(c.tick)||!s.areas[c.area]?.objects.some(e=>e.id===c.enemy&&e.kind==='enemy')||!['before','after','maximum'].every(k=>Number.isFinite(c[k]))||c.maximum<=0||c.before>c.maximum||c.after<0||c.after>=c.before||typeof c.controller!=='string'||c.id!==JSON.stringify([p.id,c.tick,c.enemy,c.controller]))fail(p.id+'.woundCause');
   if(w.firstCause.tick>w.lastCause.tick||w.lastCause.tick!==w.lastHit)fail(p.id+'.woundOrder');
  }
 }
}
