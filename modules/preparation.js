import {roadPriceKey} from './metric-route-state.js';
import {spellInvoice} from './spell-invoice.js';
import {knownRoadEstimate} from './known-route-price.js';
import {carriedFood} from './stores.js';
import {foodPlan} from './supply.js';
import {clothingEffectKey} from './clothing-state.js';
import {knownArea} from '../actor-atlas.js';
import {foodWalkingTicks,mealWarmth} from './hearth-food.js';
import {physicalDistance} from '../geometry.js';
import {interiorPassage} from './interiors.js';
import {partyPrepared} from './party-needs.js';
import {enabled} from '../rules.js';
import {hasCondition,isTown} from './common.js';
import {SPELLS} from '../content.js';
import {weatherAt} from './weather.js';
import {planFieldCamp} from './fieldcamp.js';
import {serviceReachable} from './supply.js';
import {walkingEnergy,armorWalkExtra} from './armor.js';
export function initializePreparation(h){h.planning ||= {checked:null,last:null,preparations:0};}
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
  if(g.kind==='hunt')cost+=12;
  const knownSpells=enabled(s,'magic')?SPELLS.filter(sp=>h.magic.spells.includes(sp.id)):[];
  const mana=g.kind==='hunt'&&knownSpells.length?Math.min(h.magic.maxMana,Math.min(...knownSpells.map(sp=>enabled(s,'place-rules')?spellInvoice(s,h,sp,{area:g.area,known:true}).totalManaCost:sp.mana))*2):0;
  return {ticks,energyCost:Math.ceil(cost),energy:Math.min(85,Math.ceil(cost)+24),health:Math.ceil(h.maxHp*(g.kind==='hunt'?.82:.55)),mana,...(priced?{rations:Math.max(0,Math.ceil((h.hunger+ticks*.16-65)/65))}:{})};
}
export function preparePlan(s,ctx){
  if(!enabled(s,'preparation'))return false;
  const h=s.hero,g=h.goal;if(!g||h.combat||h.transit||['rest','campPitch','eat','forage','provision','weatherWait','leisure','settle','caravanWait','routeWait'].includes(g.kind))return false;
  if(['tavernLeave','campLeave','campContinue','brothCook','brothEat','brothLearn'].includes(g.kind))return false;
  // A validated, visible local conversation is not a new expedition. Combat
  // assistance still uses hunt and its ordinary preparation/resource budget.
  if(g.kind==='assist'&&g.area===h.area)return false;
  const w=weatherAt(s,s.areas[h.area]),key=`${g.kind}/${g.area}/${g.started}/${h.area}/${w.id}/${w.period}${armorWalkExtra(s)?'/heavy:'+h.equipment.armor.id:''}${mealWarmth(s)?'/warm:'+mealWarmth(s).until:''}${clothingEffectKey(s)}${h.atlas.roadCosts?'/road:'+roadPriceKey(h.atlas.roadCosts)+'/food:'+carriedFood(s.people[h.lineage],h.inventory):''}`;
  if(h.planning.checked===key)return false;h.planning.checked=key;
  const estimate=estimatePlan(s,g,ctx);if(!estimate)return false;
  h.planning.last={tick:s.tick,kind:g.kind,target:g.area,...estimate,prepared:false};
  if(estimate.rations>carriedFood(s.people[h.lineage],h.inventory)&&!g.urgent&&h.personality.courage<.75&&enabled(s,'supply')){const target=g.area;if(foodPlan(s,ctx,{reserve:true})){h.planning.last.prepared=true;h.planning.preparations++;h.reason=`Для намеченного пути в ${s.areas[target].name} не хватает дорожных пайков. ${h.reason}`;ctx.log(s,`${h.name} откладывает дальнее дело ради настоящих припасов.`,'plan');return true;}h.goal=null;return true;}
  if(partyPrepared(s,estimate)&&h.energy>=estimate.energy&&h.hp>=estimate.health&&h.magic.mana>=estimate.mana)return false;
  const why=`${!partyPrepared(s,estimate)?'Попутчикам тоже нужен отдых перед дорогой. ':''}На ближайший участок нужно около ${estimate.energyCost} сил, с запасом — ${estimate.energy}. Сейчас ${Math.round(h.energy)}.${h.hp<estimate.health?' Раны тоже требуют отдыха.':''}${h.magic.mana<estimate.mana?' Для намеченного боя не хватает маны.':''}`;
  let planned=planFieldCamp(s,ctx);
  if(!planned){
    const refuge=ctx.closest(s,a=>knownArea(s,a)&&!a.temporaryCamp&&(isTown(a)||a.type==='camp'||a.dungeon?.cleared)&&serviceReachable(s,a,68,ctx));
    if(!refuge)return false;
    ctx.goal(s,'rest',refuge.id,68,'Подготовиться к следующему делу',why);planned=true;
  }
  h.goal.preparation={mana:estimate.mana};h.reason=why;h.planning.last.prepared=true;h.planning.preparations++;
  ctx.log(s,`${h.name} оценивает предстоящий путь и готовится заранее. ${why}`,'plan');return true;
}
