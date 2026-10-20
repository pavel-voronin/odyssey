import {biologicalNeed} from './biology.js';
import {estimatePlan} from './plan-estimate.js';
export {estimatePlan} from './plan-estimate.js';
import {methodRevision} from './goal-readiness.js';
import {actionKey,stateKey} from './action-selection.js';
import {dependency} from './action-admission.js';
import {roadPriceKey} from './metric-route-state.js';
import {carriedFood} from './stores.js';
import {foodPlan} from './supply.js';
import {clothingEffectKey} from './clothing-state.js';
import {knownArea} from '../actor-atlas.js';
import {mealWarmth} from './hearth-food.js';
import {partyPrepared} from './party-needs.js';
import {enabled} from '../rules.js';
import {isTown} from './common.js';
import {weatherAt} from './weather.js';
import {planFieldCamp} from './fieldcamp.js';
import {serviceReachable} from './supply.js';
import {armorWalkExtra} from './armor.js';
export function initializePreparation(h){h.planning ||= {checked:null,last:null,preparations:0};}
export function preparePlan(s,ctx){
  if(!enabled(s,'preparation'))return false;
  const h=s.hero,g=h.goal;if(biologicalNeed(s,h).critical&&g?.needRoot==='nutrition')return false;
  if(!g||h.combat||h.transit||['localRecovery','rest','campPitch','eat','forage','provision','weatherWait','leisure','settle','caravanWait','routeWait'].includes(g.kind))return false;
  if(['tavernLeave','campLeave','campContinue','brothCook','brothEat','brothLearn'].includes(g.kind))return false;
  // A validated, visible local conversation is not a new expedition. Combat
  // assistance still uses hunt and its ordinary preparation/resource budget.
  if(g.kind==='assist'&&g.area===h.area)return false;
  const w=weatherAt(s,s.areas[h.area]),key=stateKey([actionKey(g),h.area,w.id,armorWalkExtra(s),mealWarmth(s)?.until||0,clothingEffectKey(s),h.atlas.roadCosts&&roadPriceKey(h.atlas.roadCosts),carriedFood(s.people[h.lineage],h.inventory),Math.floor(h.hp/h.maxHp*4),h.energy>=24,h.energy>=40,h.magic.mana]);
  const changed=h.planning.checked!==key;h.planning.checked=key;
  const estimate=estimatePlan(s,g,ctx);if(!estimate)return false;
  if(changed||!h.planning.last)h.planning.last={tick:s.tick,kind:g.kind,target:g.area,...estimate,prepared:false};
  if(estimate.rations>carriedFood(s.people[h.lineage],h.inventory)&&!g.urgent&&h.personality.courage<.75&&enabled(s,'supply')){const target=g.area;if(foodPlan(s,ctx,{reserve:true})){h.goal.preparation={mana:estimate.mana,parent:actionKey(g)};dependency(s,g,h.goal,ctx.methodRevision||methodRevision,estimate);h.reason=`Для намеченного пути в ${s.areas[target].name} не хватает дорожных пайков. ${h.reason}`;return true;}h.goal=null;return true;}
  if(partyPrepared(s,estimate)&&h.energy>=estimate.energy&&h.hp>=estimate.health&&h.magic.mana>=estimate.mana)return false;
  const why=`${!partyPrepared(s,estimate)?'Попутчикам тоже нужен отдых перед дорогой. ':''}На ближайший участок нужно около ${estimate.energyCost} сил, с запасом — ${estimate.energy}. Сейчас ${Math.round(h.energy)}.${h.hp<estimate.health?' Раны тоже требуют отдыха.':''}${h.magic.mana<estimate.mana?' Для намеченного боя не хватает маны.':''}`;
  let planned=planFieldCamp(s,ctx);
  if(!planned){
    const refuge=ctx.closest(s,a=>knownArea(s,a)&&!a.temporaryCamp&&(isTown(a)||a.type==='camp'||a.dungeon?.cleared)&&serviceReachable(s,a,68,ctx));
    if(!refuge){ctx.goal(s,'localRecovery',h.area,h.x,'Перевести дух на месте',why);planned=true;}
    else {
    ctx.goal(s,'rest',refuge.id,68,'Подготовиться к следующему делу',why);planned=true;}
  }
  h.goal.preparation={mana:estimate.mana,parent:actionKey(g)};h.reason=why;dependency(s,g,h.goal,ctx.methodRevision||methodRevision,estimate);
  return true;
}
