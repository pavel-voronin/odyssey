import {enabled} from '../rules.js';
import {woundActor} from './wound-state.js';
export function woundsTick(s,{bleed}={}){
 if(!enabled(s,'local-wounds')||!s.woundClock)return;
 s.woundClock.active=s.woundClock.active.filter(id=>{
  const p=s.people[id],t=p?.localWounds;if(!p?.alive||!t?.active.length)return false;if(t.lastTick===s.tick)return true;t.lastTick=s.tick;
  const h=woundActor(s,p),a=s.areas[h?.area||p.area],x=h?.x??p.x,activity=t.activity;
  const current=activity&&s.tick-activity.tick<=(h?1:8),loaded=current&&!activity.rest,rest=current&&activity.rest&&!a?.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&Math.abs(o.x-x)*a.length/100<=15),fed=(h?.hunger??p.needs?.hunger??100)<65;
  let blood=0;
  for(const w of t.active){
   if(w.kind==='cut'&&w.closure<100){if(--w.bleed<=0){blood+=w.severity===3?2:1;w.bleed=8;}w.closure=Math.min(100,w.closure+Math.max(1,(fed?3:2)+(rest?2:0)-(loaded&&activity.role===w.role?2:0)-(w.severity-1)));if(w.closure===100)w.bleed=0;}
   else w.function=Math.min(100,w.function+Math.max(1,(fed?2:1)+(rest?2:0)-(loaded&&activity.role===w.role?1:0)-(w.severity-1)));
  }
  if(blood)bleed?.(p,h,blood);
  const healed=t.active.filter(w=>w.closure===100&&w.function===100);t.healed+=healed.length;t.active=t.active.filter(w=>!healed.includes(w));return p.alive&&t.active.length>0;
 });
}
