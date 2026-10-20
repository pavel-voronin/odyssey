import {fracturePhase,fracturePending} from './fracture-state.js';
import {boneBody} from './anatomy-state.js';
import {woundCareOn,goodDressing} from './wound-care-state.js';
import {enabled} from '../rules.js';
import {woundActor} from './wound-state.js';
import {infectionPhase,infectionPending} from './wound-infection-state.js';
export function woundsTick(s,{bleed,changed}={}){
 if(!enabled(s,'local-wounds')||!s.woundClock)return;
 s.woundClock.active=s.woundClock.active.filter(id=>{
  const p=s.people[id],t=p?.localWounds;if(!p?.alive||!t?.active.length)return false;if(t.lastTick===s.tick)return true;t.lastTick=s.tick;
  if(boneBody(p))return true; // Retained injuries remain physical limits, without blood or organic healing.
  const h=woundActor(s,p),a=s.areas[h?.area||p.area],x=h?.x??p.x,activity=t.activity;
  const current=activity&&s.tick-activity.tick<=(h?1:8),loaded=current&&!activity.rest,rest=current&&activity.rest&&!a?.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&Math.abs(o.x-x)*a.length/100<=15),fed=(h?.hunger??p.needs?.hunger??100)<65;
  let blood=0,drain=0;const sources=[];
  for(const w of t.active){
   const care=woundCareOn(s),d=care&&w.dressing,load=loaded&&activity.role===w.role;
   if(d&&d.remaining>0){d.age++;const before=d.remaining;d.remaining=Math.max(0,d.remaining-(load?1:0)-(d.age%8===0?1:0));if(before>4&&d.remaining<=4)changed?.(p,w,'worn');}
   let dressed=care&&goodDressing(w);
   if(care&&w.kind==='cut'&&w.closure===100&&w.function<60&&w.severity>=2&&load){w.strain=(w.strain||0)+1;if(w.strain>=12){w.strain=0;w.closure=65;w.function=Math.max(0,w.function-10);w.bleed=8;w.reopened={tick:s.tick,role:w.role};dressed=false;if(w.dressing)w.dressing.remaining=0;changed?.(p,w,'reopened');}}
   else if(care&&rest&&w.strain)w.strain=Math.max(0,w.strain-1);
   fracturePhase(s,p,w,{load,rest,fed});
   const infection=infectionPhase(s,p,w,{load,rest,fed,dressed,changed});drain+=infection.drain;if(infection.harm){blood+=infection.harm;sources.push({kind:'infection',wound:w.id,part:w.part,cause:w.lastCause.id,amount:infection.harm});}
   if(w.kind==='cut'&&w.closure<100){if(dressed)w.bleed=0;else {if(w.bleed<=0)w.bleed=8;if(--w.bleed<=0){const amount=w.severity===3?2:1;blood+=amount;sources.push({kind:'bleeding',wound:w.id,part:w.part,cause:w.lastCause.id,amount});w.bleed=8;}}w.closure=Math.min(100,w.closure+Math.max(0,Math.max(1,(fed?3:2)+(rest?2:0)+(dressed?2:0)-(loaded&&activity.role===w.role?2:0)-(w.severity-1))-infection.penalty));if(w.closure===100)w.bleed=0;}
   else w.function=Math.min(100,w.function+Math.max(0,Math.max(1,(fed?2:1)+(rest?2:0)+(dressed?1:0)-(loaded&&activity.role===w.role?1:0)-(w.severity-1))-infection.penalty));
  }
  if(drain){const body=h||p.needs;body.energy=Math.max(0,body.energy-drain);}
  if(blood&&bleed){const before=h?.hp??p.health;bleed(p,h,blood,{sources});const after=h?.hp??p.health;if(after<before)t.lastHarm={tick:s.tick,before,after,amount:before-after,attempted:blood,sources};}
  const healed=t.active.filter(w=>w.closure===100&&w.function===100&&!infectionPending(w)&&!fracturePending(w));t.healed+=healed.length;t.active=t.active.filter(w=>!healed.includes(w));return p.alive&&t.active.length>0;
 });
}
