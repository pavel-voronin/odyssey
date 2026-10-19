import {spellInvoice} from './spell-invoice.js';
import {knownRoadEstimate} from './known-route-price.js';
import {foodWalkingTicks} from './hearth-food.js';
import {physicalDistance} from '../geometry.js';
import {interiorPassage} from './interiors.js';
import {enabled} from '../rules.js';
import {SPELLS} from '../content.js';
import {weatherAt} from './weather.js';
import {walkingEnergy} from './armor.js';
export function estimatePlan(s,g,ctx){
  const h=s.hero,path=(ctx.knownRoute||ctx.route)(s,h.area,g.area);if(!path.length)return null;
  let x=h.x,ticks=0,cost=0;
  // Plan the next three scenes; an unknown continent cannot be forecast as one uninterrupted march.
  const priced=path.slice(1).some((id,i)=>knownRoadEstimate(s,path[i],id));
  for(let i=0;i<(priced?path.length:Math.min(path.length,3));i++){
    const a=s.areas[path[i]],w=weatherAt(s,a),next=path[i+1];
    const passage=next&&interiorPassage(s,a.id,next),to=passage?passage.x:next?(Number(next.slice(1))>Number(a.id.slice(1))?100:0):g.x;
    const movement=foodWalkingTicks(s,Math.max(0,physicalDistance(a,x,to)-1),w.speed,s.tick+ticks);ticks+=movement;cost+=movement*walkingEnergy(s,w);
    const gap=next&&knownRoadEstimate(s,a.id,next);if(gap){ticks+=gap.ticks;cost+=gap.energyCost;}
    if(next)x=passage?.arrival??(to===100?5:95);
  }
  if(['work','factionDuty'].includes(g.kind))cost+=(g.remaining||4)*2;
  if(g.kind==='craftStudy')cost+=(s.people[h.lineage]?.skillPractice?.craft?.study?.remaining??3)*2;
  if(g.kind==='forgeWork'){const q=s.people[h.lineage]?.forging,o=q?.orders[q.active];cost+=Math.max(0,(o?.required??6)-(o?.progress??0))*2;}
  if(g.kind==='refitWork'){const q=s.people[h.lineage]?.knifeRefit,o=q?.orders[q.active];cost+=Math.max(0,(o?.required??4)-(o?.progress??0))*2;}
  if(g.kind==='itemRepairWork'){const q=s.people[h.lineage]?.itemRepair,o=q?.orders[q.active];cost+=Math.max(0,(o?.required??4)-(o?.progress??0))*2;}
  if(g.kind==='liftWork'&&g.operation==='repair'&&s.edges[g.key]?.lift?.drive?.current)cost+=Math.max(0,3-(s.edges[g.key].lift.drive.work?.steps.length||0))*3;
  if(g.kind.startsWith('drive'))cost+=2;
  if(g.kind==='hunt')cost+=12;
  const knownSpells=enabled(s,'magic')?SPELLS.filter(sp=>h.magic.spells.includes(sp.id)):[];
  const mana=g.kind==='hunt'&&knownSpells.length?Math.min(h.magic.maxMana,Math.min(...knownSpells.map(sp=>enabled(s,'place-rules')?spellInvoice(s,h,sp,{area:g.area,known:true}).totalManaCost:sp.mana))*2):0;
  return {ticks,energyCost:Math.ceil(cost),energy:Math.min(85,Math.ceil(cost)+24),health:Math.ceil(h.maxHp*(g.kind==='hunt'?.82:.55)),mana,...(priced?{rations:Math.max(0,Math.ceil((h.hunger+ticks*.16-65)/65))}:{})};
}
