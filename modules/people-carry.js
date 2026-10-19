import {groupHorse} from './horse-state.js';
import {rootWorld} from '../world-ref.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {personLocation} from '../person-location.js';
import {npcAction,invalidateNPCControl} from './npc-control.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {partyBodySpent} from './party-combat-policy.js';
import {carriedFood,consumeCarriedSupplies} from './stores.js';
import {weatherAt} from './weather.js';
import {metricRate} from './metric-route-state.js';
import {startMetricTravel,advanceMetricTravel,metricTravelRate} from './metric-route.js';
import {pauseHeroRoad} from './road-stops.js';
import {woundActivity} from './wound-state.js';
import {bodyRemains,recordPersonRemains} from './remains.js';
import {peopleCarryOn,carryActor,bodyCarryCapable,peopleCarryLoad,carryEvent} from './people-carry-state.js';
const personal=p=>p.personalJourney?.status==='active'?p.personalJourney:null;
const basis=p=>{const g=personal(p);return g?JSON.stringify([g.kind,g.target,g.due,g.since,g.phase]):null;};
const fresh=(s,p)=>{if(partyBodySpent(s,p)||p.partyNeeds?.tick===s.tick&&p.partyNeeds.activity)return false;return p.actionControl?.tick!==s.tick||p.actionControl.phases.every(x=>['upkeep','social','goal'].includes(x));};
function note(s,p,result,reason,ctx){const h=s.hero;h.carryMemory ||= {version:1,after:0,events:[]};const q=h.carryMemory;q.after=result==='helped'?s.tick+1:s.tick+48;q.events.push({tick:s.tick,person:p.id,result,reason});if(q.events.length>8)q.events.shift();ctx?.log?.(s,p.name+': '+reason,'relationship');}
export function peopleCarryOffer(s,id,ctx){const h=s.hero,p=s.people[id],passenger=s.people[h.lineage],c=h.companions.find(c=>c.person===id),g=personal(p||{});if(!peopleCarryOn(s)||!h.alive||h.transit||h.combat||h.carriedBy||h.injuredPassenger||passenger?.bodyCarry?.stage==='carrying'||groupHorse(s,h)||!c||!p?.alive||p.status!=='withHero'||selfDrivenActor(rootWorld(s),id)||c.hp<=0||c.loyalty<65||h.companions.filter(c=>c.hp>0).length!==1||p.bodyCarry?.stage==='carrying'||h.lineage===id||carryActor(s,id)?.carriedBy||!h.goal)return {allowed:false,reason:'Сейчас нет подходящего общего участка.'};
 const at=personLocation(rootWorld(s),id),trust=h.relations[id]?.trust||0,directed=p.partyRelations?.[h.lineage]?.feeling??p.agenda?.bonds?.[h.lineage]??0;
 if(!at||at.transit||at.area!==h.area||physicalDistance(s.areas[h.area],at.x,h.x)>6||trust<16||directed<=0)return {allowed:false,reason:'Недостаточно собственного согласия и близости.'};
 if(!bodyCarryCapable(s,p,passenger)||p.needs.sleeping||p.needs.energy<55||p.needs.hunger>=60)return {allowed:false,reason:'Тело, нагрузка или нужды не позволяют нести человека.'};
 const path=h.goal.area===h.area?[h.area]:(ctx.knownRoute||ctx.route)(s,h.area,h.goal.area),next=path[1],own=g&&npcKnownRoute(p,h.area,g.target,knownNPCHazards(s,p)),a=s.areas[h.area];if(!path.length)return {allowed:false,reason:'Общая дорога к цели пока неизвестна.'};let end;
 if(next){const edge=s.edges[[h.area,next].sort().join('|')];if(edge?.mode!=='road'||!edge.metric||edge.metric.terrain==='mountain'||g&&(!own?.[1]||own[1]!==next))return {allowed:false,reason:'Наши дороги расходятся или переход не подходит для переноски.'};end={area:next,x:Number(next.slice(1))>Number(h.area.slice(1))?5:95,exitX:Number(next.slice(1))>Number(h.area.slice(1))?100:0,distance:edge.metric.distance};}
 else{if(a.interior||a.dungeon||!Number.isFinite(h.goal.x))return {allowed:false,reason:'В этом месте нет подходящего свободного подхода.'};const direction=Math.sign(h.goal.x-h.x),ownExit=own?.[1]&&(Number(own[1].slice(1))>Number(h.area.slice(1))?1:-1);if(g&&(g.target===h.area||!ownExit||direction!==ownExit))return {allowed:false,reason:'Помощь уведёт от моего личного дела.'};end={area:h.area,x:h.goal.x,exitX:h.goal.x,distance:0};}
 const estimate=Math.ceil((physicalDistance(a,h.x,end.exitX)+end.distance)/3)+3;if(g&&g.due-s.tick<=estimate+8)return {allowed:false,reason:'Мой срок уже близко. Даже знакомому сейчас откажу.'};
 const food=carriedFood(p,p.actorLink?.inventory);if(food<1&&carriedFood(passenger,h.inventory)<1)return {allowed:false,reason:'На общую дорогу нет настоящих припасов.'};
 return {allowed:true,p,c,at,end,promise:basis(p),needFood:food<1};
}
export function agreePeopleCarry(s,id,ctx){const h=s.hero,offer=peopleCarryOffer(s,id,ctx),p=s.people[id];if(!p||!fresh(s,p)||!npcAction(s,p,'party','carry-agreement'))return false;if(!offer.allowed){h.lastAction='talk';note(s,p,'refused',offer.reason,ctx);return true;}
 if(offer.needFood){if(!consumeCarriedSupplies(s.people[h.lineage],null,'food',1))return false;p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food++;h.lastAction='companion';note(s,p,'helped','Спасибо за настоящую порцию. Проверим общую дорогу перед посадкой.',ctx);return true;}
 const old=p.bodyCarry?.history||[];p.bodyCarry={version:1,stage:'carrying',passenger:h.lineage,started:s.tick,lastTick:s.tick,lastMove:-1,promise:offer.promise,end:offer.end,journey:null,history:old};p.area=offer.at.area;p.x=offer.at.x;h.distance+=physicalDistance(s.areas[h.area],h.x,p.x);h.x=p.x;h.carriedBy=p.id;p.needs.energy-=2;h.energy=Math.max(0,h.energy-1);h.lastAction='companion';carryEvent(s,p,'agreed',{to:offer.end.area});note(s,p,'agreed','Подвезу только на нашем общем участке. Моё дело и срок остаются прежними.',ctx);invalidateNPCControl(s);return true;
}
export function endPeopleCarry(s,ctx,reason='stopped'){const h=s.hero,p=s.people[h.carriedBy],q=p?.bodyCarry;if(!q||q.passenger!==h.lineage){delete h.carriedBy;return false;}const t=q.journey;if(t){h.transit=t;if(t.metric.travelled>0&&t.metric.travelled<t.metric.distance){if(pauseHeroRoad(s,ctx,{reason:'rest',source:p.id})){q.stopSite=h.area;q.stoppedJourney=structuredClone(h.roadStop.journey);}else return false;}else{h.area=t.metric.travelled>=t.metric.distance?t.to:t.from;h.x=t.metric.travelled>=t.metric.distance?t.arrivalX:t.metric.departureX;h.transit=null;}}
 p.area=h.area;p.x=h.x;q.journey=null;q.stage='stopped';q.lastTick=s.tick;delete h.carriedBy;carryEvent(s,p,'put-down',{reason,area:h.area,x:h.x});h.lastAction='companion';h.carryStopTick=s.tick;h.energy=Math.max(0,h.energy-1);if(p.alive)p.needs.energy=Math.max(0,p.needs.energy-1);if(!p.alive){const existing=bodyRemains(s,p);if(existing?.position?.kind==='transit')existing.position={kind:'area',area:h.area,x:h.x};else recordPersonRemains(s,p,{area:h.area,x:h.x,transit:null});}
 note(s,p,'stopped',reason==='arrived'?'Общий участок пройден. Дальше каждый сохраняет собственный план.':'Здесь придётся остановиться и спешиться: '+reason+'.',ctx);invalidateNPCControl(s);return true;
}
function mirrorTransit(h,p){const t=p.bodyCarry.journey;h.area=p.area;h.x=p.x;h.transit={from:t.from,to:t.to,mode:'road',remaining:t.remaining,total:t.total,arrivalX:t.arrivalX,eventDone:true,crew:false,carry:{version:1,person:p.id,started:p.bodyCarry.started}};}
export function peopleCarryTurn(s,ctx){const h=s.hero,p=s.people[h.carriedBy],q=p?.bodyCarry;if(h.carriedBy){if(!q||q.stage!=='carrying')return endPeopleCarry(s,ctx,'нет носителя');if(q.lastTick===s.tick){h.lastAction='companion';return true;}q.lastTick=s.tick;
  if(!peopleCarryOn(s)||!p.alive||!bodyCarryCapable(s,p,s.people[h.lineage])||p.needs.energy<20||p.needs.hunger>=75||p.needs.sleeping||!h.companions.some(c=>c.person===p.id))return endPeopleCarry(s,ctx,!p.alive?'носитель погиб':'здоровье, усталость или согласие изменились');
  const danger=s.areas[p.area]?.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&!e.hidden&&physicalDistance(s.areas[p.area],e.x,p.x)<=12);if(!q.journey&&(danger||basis(p)!==q.promise||h.combat||personal(p)&&personal(p).due-s.tick<=2))return endPeopleCarry(s,ctx,danger?'путь опасен':'личный план изменился');
  if(!fresh(s,p)||!npcAction(s,p,'party','carry-walk')){h.lastAction='travel';return true;}
  if(carriedFood(p,p.actorLink?.inventory)>0&&p.needs.hunger>=55){consumeCarriedSupplies(p,null,'food',1);p.needs.hunger=Math.max(0,p.needs.hunger-48);h.lastAction='travel';carryEvent(s,p,'meal');return true;}
  if(q.journey){const before=q.journey.metric.travelled,arrived=advanceMetricTravel(s,p,q.journey);h.distance+=Math.abs(q.journey.metric.travelled-before);if(q.journey.metric.travelled!==before){q.lastMove=s.tick;p.needs.hunger=Math.min(100,p.needs.hunger+.12);woundActivity(s,p,'leg');}if(arrived){p.area=q.journey.to;p.x=q.journey.arrivalX;q.journey=null;h.area=p.area;h.x=p.x;h.transit=null;ctx.enter(s,p.area);return endPeopleCarry(s,ctx,'arrived');}mirrorTransit(h,p);h.lastAction='travel';return true;}
  const a=s.areas[p.area],target=q.end.area===p.area?q.end.x:q.end.exitX;if(physicalDistance(a,p.x,target)>1){const rate=metricRate({speed:6,terrain:a.type==='forest'?'trail':'road'},weatherAt(s,a),peopleCarryLoad(s,p,s.people[h.lineage])),move=areaStep(a,p.x,target,rate.speed);p.x+=move;p.facing=Math.sign(move)||p.facing||1;h.facing=p.facing;p.needs.energy=Math.max(0,p.needs.energy-rate.energy-1);p.needs.hunger=Math.min(100,p.needs.hunger+.12);h.distance+=physicalDistance(a,p.x-move,p.x);h.x=p.x;h.area=p.area;q.lastMove=s.tick;woundActivity(s,p,'leg');h.lastAction='travel';return true;}
  if(q.end.area===p.area)return endPeopleCarry(s,ctx,'arrived');q.journey=startMetricTravel(s,p,q.end.area,q.end.x);if(!q.journey)return endPeopleCarry(s,ctx,'переход закрыт');mirrorTransit(h,p);h.lastAction='travel';return true;
 }
 if(!peopleCarryOn(s)||h.transit||h.combat||!h.goal||h.carryMemory?.after>s.tick||h.energy>=45&&h.hp>=h.maxHp*.7)return false;const candidate=h.companions.find(c=>c.person&&s.people[c.person]?.alive);return candidate?agreePeopleCarry(s,candidate.person,ctx):false;
}
