import {DAY_TICKS} from '../calendar.js';
import {ruinsOn,structureRecord,damageStructure} from './building-condition.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
export const NEGLECT_DAYS=12;
function district(s,id){for(let n=0;n<4&&s.areas[id]?.interior;n++){const r=s.areas[id].interior;id=r.exterior||r.parent;}return id;}
function maintainedAreas(s){
 const occupied=new Set();
 for(const p of Object.values(s.people))if(p.alive&&p.health>0&&!selfDrivenActor(s,p.id)){
  const id=district(s,p.area),home=s.areas[id];if(p.status==='resident'||p.status==='wandering'&&home?.objects.some(o=>['workshop','tavern'].includes(o.kind)&&o.owner===p.id))occupied.add(id);
 }
 for(const h of detailedActors(s))if(selfDrivenActor(s,h)&&h.alive&&!h.transit&&!h.life.ended&&h.life.residence?.since!==undefined&&district(s,h.area)===district(s,h.life.home))occupied.add(district(s,h.area));
 return occupied;
}
export const maintainedDistrict=(s,a)=>maintainedAreas(s).has(a.id);
export function buildingRuinsTick(s,ctx={}){
 if(!ruinsOn(s)||s.tick%DAY_TICKS!==0)return;
 const occupied=maintainedAreas(s);
 for(const a of Object.values(s.areas)){
  if(a.interior||!a.facades?.profiles.length)continue;const present=occupied.has(a.id);
  for(const p of a.facades.profiles){
   const previous=p.structure;if(previous?.checked===s.tick)continue;
   if(present){if(previous){previous.emptyDays=0;previous.checked=s.tick;}continue;}
   const r=structureRecord(s,p);r.emptyDays=previous&&s.tick-previous.checked===DAY_TICKS?Math.min(NEGLECT_DAYS*2,r.emptyDays+1):1;r.checked=s.tick;
   if(!previous){const old=a.objects.find(o=>o.building===p.id&&o.state==='burned'&&['workshop','tavern'].includes(o.kind));if(old){r.roof=1;r.walls=2;r.history.push({tick:s.tick,kind:'observed-damage',roof:1,walls:2,source:old.id});}}
   if(r.emptyDays===NEGLECT_DAYS&&r.roof===3){r.roof=2;r.history.push({tick:s.tick,kind:'neglect',roof:2,walls:r.walls});if(r.history.length>16)r.history.shift();}
   if(r.emptyDays===NEGLECT_DAYS*2&&damageStructure(s,a,p,'neglect')){
    if(s.hero?.area===a.id&&!s.hero.transit)ctx.log?.(s,'Давно оставленное здание потеряло кровлю. Прежние стены, проходы и оставленная поклажа остаются на месте.','world');
   }
  }
 }
}
