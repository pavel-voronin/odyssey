import {enabled} from '../rules.js';
import {hasHabit} from './common.js';
import {DAY_TICKS} from '../calendar.js';
export const PROPERTY_ABSENCE=40*DAY_TICKS;
export function forgetPropertyAddress(s,id,ctx){
  const h=s.hero,k=h.property?.known[id];if(!enabled(s,'property')||!enabled(s,'property-memory')||!k||h.area===k.area||h.goal?.area===k.area)return false;
  const o=s.areas[k.area]?.objects.find(o=>o.id===id&&o.kind==='workshop');if(o?.owner!==h.lineage)return false;
  h.property.lost ||= {};h.property.lost[id]={name:k.name,since:s.tick};delete h.property.known[id];
  h.property.memory ||= {losses:0,lastCheck:null};h.property.memory.losses++;
  ctx.log(s,`Записи о старой мастерской затерялись. ${h.name} помнит, что она его, но больше не может указать адрес.`,'memory');return true;
}
export function propertyMemoryTick(s,ctx){
  if(!enabled(s,'property')||!enabled(s,'property-memory')||!enabled(s,'psychology')||s.tick%DAY_TICKS!==0||s.hero.mind.stress<80)return;
  const h=s.hero,p=h.property;p.memory ||= {losses:0,lastCheck:null};
  if(p.memory.losses||p.memory.lastCheck===s.tick)return;p.memory.lastCheck=s.tick;
  for(const [id,k]of Object.entries(p.known)){
    if(h.area===k.area||h.goal?.area===k.area||s.tick-(k.seen??s.tick)<PROPERTY_ABSENCE)continue;
    const o=s.areas[k.area]?.objects.find(o=>o.id===id&&o.kind==='workshop');if(o?.owner!==h.lineage)continue;
    if(ctx.random()<(hasHabit(h,'diary')? .01:.03)){forgetPropertyAddress(s,id,ctx);return;}
  }
}
