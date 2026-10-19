import {heroFerryBoard,ferryBodyTurn} from './ferry-actions.js';
import {eat} from './supply.js';
import {carriedFood} from './stores.js';
import {startMetricTravel,advanceMetricTravel} from './metric-route.js';
import {knownLawBurden} from './place-rules.js';
import {supportedPatient} from './patient-state.js';
import {initializeHistoricalCalendar} from './historical-calendar.js';
import {startInvitation,exoticInvitationPenalty} from './invitation-rhythm.js';
import {revealArea,hideNewArea} from '../actor-atlas.js';
import { BIOMES, CONTINENT_NAMES, LANDMARK_NAMES, ROUTE_NAMES } from '../content.js';
import { enabled,moduleRandom } from '../rules.js';
import { enchantmentStrength } from './enchantments.js';
import { profile,hasHabit,isTown } from './common.js';
import { addCondition } from './body.js';
import {dangerAvoidance} from './danger.js';
import {registerSpatialEdge} from './spatial.js';
import {newFord} from './fords.js';
import {grateClosed} from './mechanism-policy.js';
import {liftBlocked,admitLift} from './lift-policy.js';
import {physicalDistance} from '../geometry.js';

export const edgeKey=(a,b)=>[a,b].sort().join('|');
const pick=(s,list)=>list[Math.floor(moduleRandom(s,'geography')*list.length)];
export function initializeGeography(s){
  s.continents={c0:{id:'c0',name:CONTINENT_NAMES[0]}};s.nextContinent=1;
  s.edges={};s.chronology={year:743,paradox:0,visits:0,echoes:[]};initializeHistoricalCalendar(s);
}
export function annotateRegion(s,a,metadata={}){
  a.continent=metadata.continent||'c0';a.realm=metadata.realm||BIOMES[a.type]?.realm||'surface';a.era=metadata.era??0;
  if(metadata.timelineRoot)a.timelineRoot=metadata.timelineRoot;
  if(metadata.geography)a.geography={...metadata.geography};
}
export function addRoute(s,a,b,options={}){
  s.edges ||= {};const existing=s.edges[edgeKey(a,b)];s.edges[edgeKey(a,b)]={a,b,mode:'road',duration:0,cost:0,...existing,...options};
  const o=s.edges[edgeKey(a,b)];if(o.mode!=='road')delete o.metric;
  if(!existing)newFord(s,o);
  if(o.mode!=='road'){
    for(const [id,to]of [[a,b],[b,a]]){
      const source=s.areas[id];const markerId=`gate-${id}-${to}`;
      if(!source.objects.some(obj=>obj.id===markerId))source.objects.push({id:markerId,kind:'gate',mode:o.mode,name:ROUTE_NAMES[o.mode],to,x:Number(to.slice(1))>Number(id.slice(1))?96:4});
    }
  }
  registerSpatialEdge(s,edgeKey(a,b));
}
function newContinent(s){
  const id='c'+s.nextContinent++;s.continents[id]={id,name:CONTINENT_NAMES[(s.nextContinent-1)%CONTINENT_NAMES.length]};return id;
}
function makeRegion(s,parent,type,ctx,extra={}){
  const depth=parent.depth+1;
  const name=pick(s,LANDMARK_NAMES[type]);
  const id=ctx.addArea(s,type,name,depth,{continent:parent.continent,era:parent.era,...extra});
  revealArea(s,id);return id;
}
function timelineFork(s,a,ctx){
  const shift=moduleRandom(s,'geography')<.55?-25:25;
  const root=a.timelineRoot||a.id,targetEra=a.era+shift;
  const existing=Object.values(s.areas).find(area=>area.timelineRoot===root&&area.era===targetEra);
  if(existing)return existing.id;
  const id=ctx.addArea(s,a.type,`${a.name.split(' · ')[0]} · ${s.chronology.year+targetEra} год`,a.depth+1,{continent:a.continent,realm:a.realm,era:targetEra,timelineRoot:root});
  const echo=s.areas[id];revealArea(s,echo);
  for(const enemy of echo.objects.filter(o=>o.kind==='enemy'))enemy.timelineOrigin=a.objects.find(o=>o.kind==='enemy'&&o.species===enemy.species)?.id||a.objects.find(o=>o.kind==='enemy')?.id||null;
  for(const obj of echo.objects.filter(o=>['relic','loot','herb'].includes(o.kind)))obj.timelineOrigin=a.objects.find(original=>original.kind===obj.kind)?.id||null;
  a.timelineRoot=root;
  return id;
}
export function expandRoutes(s,ctx){
  const a=s.areas[s.hero.area];if(a.expanded)return;
  a.expanded=true;
  if(!enabled(s,'travel')){
    const type=pick(s,['road','forest','village','camp','ruins']);const id=makeRegion(s,a,type,ctx);ctx.connect(s,a.id,id);return;
  }
  let branches;
  if(a.type==='port')branches=['sea','road',moduleRandom(s,'geography')<.5?'village':'island'];
  else if(a.type==='sea')branches=['island','port'];
  else if(['cave','dungeon'].includes(a.type))branches=['dungeon','undercity',moduleRandom(s,'geography')<.5?'cave':'ruins'];
  else if(a.realm==='dream')branches=['dream','clockwork','camp'];
  else if(a.type==='clockwork')branches=['clockwork','citadel','ruins'];
  else branches=[pick(s,['road','forest','camp','village']),pick(s,['ruins','cave','port','desert','mountain']),pick(s,['forest','village','camp','citadel'])];
  // Ensure genuine alternatives without requiring every route to be dangerous.
  branches=[...new Set(branches)];
  if(branches.length<2)branches.push(branches[0]==='road'?'camp':'road');
  const destinations=[];
  for(const type of branches){
    let continent=a.continent;
    let mode='road',duration=0,cost=0;
    if(type==='sea'||a.type==='sea'||type==='island'&&a.type==='port'){mode='sea';duration=6+Math.floor(moduleRandom(s,'geography')*5);cost=3;if(type==='port'||type==='island')continent=newContinent(s);}
    else if(BIOMES[type].realm==='underground'&&a.realm!=='underground'){mode='stairs';duration=3;}
    const id=makeRegion(s,a,type,ctx,{continent});ctx.connect(s,a.id,id,{mode,duration,cost});destinations.push(id);
    if(isTown(s.areas[id])&&moduleRandom(s,'geography')<.7){
      const nearby=makeRegion(s,s.areas[id],s.areas[id].realm==='underground'?'cave':'forest',ctx);ctx.connect(s,id,nearby);hideNewArea(s,nearby);
    }
  }
  if(enabled(s,'portals')&&(a.type==='ruins'||a.type==='clockwork'||a.type==='dungeon')&&moduleRandom(s,'geography')<.5){
    const type=pick(s,['dream','clockwork','island','undercity']);const id=makeRegion(s,a,type,ctx,{continent:type==='island'?newContinent(s):a.continent});
    ctx.connect(s,a.id,id,{mode:'portal',duration:3,cost:0});destinations.push(id);
  }
  if(enabled(s,'time')&&a.depth>=2&&['ruins','clockwork','citadel'].includes(a.type)&&moduleRandom(s,'geography')<.5){
    const id=timelineFork(s,a,ctx);ctx.connect(s,a.id,id,{mode:'time',duration:4,cost:0});destinations.push(id);
  }
  ctx.log(s,`Развилка: ${destinations.map(id=>s.areas[id].name).join(' / ')}.`,'discover');
}
export function beginTransit(s,next,arrivalX,ctx){
  const h=s.hero,edge=s.edges?.[edgeKey(h.area,next)];
  if(h.transit)return true;
  if(supportedPatient(s,h)&&(edge?.lift||['sea','portal','time'].includes(edge?.mode))){h.goal=null;ctx.log?.(s,'Этот переход не принимает человека на руках. Нужна отдельная безопасная перевозка.','plan');return true;}
  if(grateClosed(s,h.area,next)){h.goal=null;ctx.log?.(s,'Решётка закрыла проход. Нужен местный рычаг или обход.','plan');return true;}
  if(liftBlocked(s,h.area,next)){h.goal=null;return true;}
  const lift=enabled(s,'mechanisms')&&edge?.lift,mode=lift?'lift':edge?.mode;
  if(mode==='road'){const t=startMetricTravel(s,h,next,arrivalX);if(!t){if(edge?.metric){h.goal=null;h.lastAction='wait';return true;}return false;}h.transit={...t,savedIntent:h.intent,savedReason:h.reason};h.lastAction='travel';h.action='ДОРОГА';ctx.log(s,`Он выходит на дорожный участок: ${t.metric.distance} единиц пути. Дальний конец ещё предстоит пройти.`,'travel');return true;}
  if(edge&&s.geographyFrame&&!lift&&!enabled(s,'travel')){h.goal=null;h.lastAction='wait';return true;}
  if(!edge||!enabled(s,'travel')&&!lift)return false;
  if(lift&&physicalDistance(s.areas[h.area],h.x,Number(next.slice(1))>Number(h.area.slice(1))?100:0)>1)return true;
  if(edge.mode==='portal'&&!enabled(s,'portals')||edge.mode==='time'&&!enabled(s,'time')){if(s.geographyFrame){h.goal=null;h.lastAction='wait';return true;}return false;}
  if(edge.ferry&&(s.rules.ferry===false||!enabled(s,'travel'))){h.goal=null;h.lastAction='wait';return true;}
  if(!lift&&edge.mode==='sea'&&heroFerryBoard(s,next,ctx))return true;
  const cost=lift||profile(h).skill==='sea'&&edge.mode==='sea'?0:edge.cost;
  if(['portal','time'].includes(edge.mode))startInvitation(s,edge.mode,edgeKey(h.area,next));
  let crew=false;
  if(h.gold>=cost)h.gold-=cost;
  else{crew=true;h.energy=Math.max(0,h.energy-5);}
  const ride=lift?admitLift(s,h.area,next,h.lineage,arrivalX):null;if(lift&&!ride)return true;
  h.transit={from:h.area,to:next,mode,remaining:ride?2:edge.duration,total:ride?2:edge.duration,arrivalX,crew,eventDone:false,savedIntent:h.intent,savedReason:h.reason,...(ride?{liftRide:ride}:{})};
  h.lastAction='travel';h.action=ROUTE_NAMES[mode].toUpperCase();h.intent=`${ROUTE_NAMES[mode]}: ${s.areas[next].name}`;
  h.reason=crew?'Денег на билет не хватает. Герой отрабатывает дорогу в команде.':edge.mode==='time'?'Место то же. Год другой. Следы прошлого способны изменить настоящее.':'Этот маршрут соединяет разные части мира.';
  ctx.log(s,lift?'Герой входит в кабину. Привод расходует один заряд и начинает поездку.':edge.mode==='sea'?`Герой поднимается на корабль. ${crew?'Плата — помощь команде.':'Паруса расправлены.'}`:edge.mode==='time'?'Герой входит в разлом эпох. Тиканье мира не останавливается.':edge.mode==='portal'?'Портал раскрывает чужой горизонт. Герой проходит внутрь.':'Герой спускается под землю. Дневной свет остаётся позади.','travel');
  return true;
}
export function transitTick(s,ctx){
  const h=s.hero,t=h.transit;if(!t)return false;
  if(t.ferry)return ferryBodyTurn(s,ctx);
  if(t.liftRide&&t.liftRide.lastTick===s.tick)return true;
  if(t.metric&&t.metric.lastTick!==s.tick&&enabled(s,'supply')&&h.hunger>75&&carriedFood(s.people[h.lineage],h.inventory)>0){const g=h.goal;eat(s,ctx);h.goal=g;t.metric.lastTick=s.tick;return true;}
  h.lastAction='travel';if(t.metric){advanceMetricTravel(s,h,t);}else{t.remaining--;if(t.liftRide){t.liftRide.remaining=t.remaining;t.liftRide.lastTick=s.tick;}h.energy=Math.max(0,h.energy-.2);}
  if(t.mode==='sea'&&!t.eventDone&&t.remaining<=Math.floor(t.total/2)){
    t.eventDone=true;const chance=moduleRandom(s,'voyages');
    if(chance<.2&&enabled(s,'travel')){
      const damage=profile(h).skill==='sea'?1:3+Math.floor(moduleRandom(s,'voyages')*5);
      const hpBefore=h.hp;h.hp-=damage;t.remaining+=2;h.travel.storms++;if(enabled(s,'geography-frame')&&enabled(s,'psychology'))h.routePreferences={...h.routePreferences,water:{version:1,source:'storm',at:s.tick,person:h.lineage,edge:edgeKey(t.from,t.to),aversion:1}};
      ctx.log(s,`Шторм. Герой удерживает снасти: −${damage} HP. Корабль теряет два мига.`,'storm');
      if(h.hp<=0){ctx.die(s,{name:'Морской шторм'},{kind:'storm',damage,hpBefore});h.transit=null;return true;}
    }else if(chance<.38){const gold=3+Math.floor(moduleRandom(s,'voyages')*5);h.gold+=gold;ctx.log(s,`Команда вытаскивает плавающий сундук. Доля героя: ◈${gold}.`,'treasure');}
    else if(chance<.55){h.memory.facts.push({tick:s.tick,text:'Капитан рассказал о затонувшем городе под следующим островом.'});ctx.log(s,'Капитан рассказывает о городе под водой. Герой запоминает направление.','talk');}
  }
  if(t.mode==='time'&&!t.eventDone){
    t.eventDone=true;s.chronology.visits++;s.chronology.paradox+=1;
    if(moduleRandom(s,'epochs')<.2&&enabled(s,'body'))addCondition(s,'insomnia',ctx,70);
  }
  if(t.remaining<=0){
    if(t.crew)h.gold+=2;
    if(t.mode==='sea')h.travel.voyages++;
    if(t.mode==='portal')h.travel.portals++;
    if(t.mode==='time')h.travel.epochs++;
    h.x=t.arrivalX;h.transit=null;ctx.enter(s,t.to);h.intent=t.savedIntent;h.reason=t.savedReason;
    ctx.log(s,`${s.areas[t.to].name}: переход завершён. ${s.continents[s.areas[t.to].continent].name}.`,'arrival');
  }
  return true;
}
export function applyTimeConsequence(s,enemy,ctx){
  if(!enabled(s,'time'))return;
  const a=s.areas[s.hero.area];if(a.era>=0||!enemy.timelineOrigin)return;
  const present=Object.values(s.areas).find(region=>region.id===a.timelineRoot);
  const echo=present?.objects.find(o=>o.id===enemy.timelineOrigin);
  if(echo?.alive){echo.alive=false;echo.hp=0;echo.temporalCause={area:a.id,tick:s.tick};s.chronology.echoes.push({tick:s.tick,text:`${enemy.baseName} исчезает из настоящего: его победили в прошлом.`});ctx.log(s,'Победа в прошлом стирает одну угрозу из настоящего. Память героя сохраняет оба исхода.','time');}
}
export function temporalCollection(s,obj,ctx){
  const a=s.areas[s.hero.area];if(!enabled(s,'time')||a.era>=0||!obj.timelineOrigin)return;
  const present=s.areas[a.timelineRoot],original=present?.objects.find(o=>o.id===obj.timelineOrigin);if(!original)return;
  if(original.taken){
    s.chronology.paradox+=2;const text='Находка уже существовала в настоящем. Теперь у неё два прошлого.';
    s.chronology.echoes.push({tick:s.tick,text});ctx.log(s,text,'time');
    if(s.chronology.paradox>=8)addCondition(s,'curse',ctx,90);
  }else{
    if(original.kind==='herb')original.count=Math.max(0,original.count-1);else original.taken=true;
    const text=`${original.name} исчезает из настоящего: его забрали в прошлом.`;
    s.chronology.echoes.push({tick:s.tick,text});ctx.log(s,text,'time');
  }
  if(s.chronology.echoes.length>80)s.chronology.echoes.splice(0,s.chronology.echoes.length-80);
}
export function temporalAid(s,source,ctx){
  const a=s.areas[source];if(!enabled(s,'time')||a.era>=0||!a.timelineRoot)return;
  const present=s.areas[a.timelineRoot];if(!present)return;
  present.prosperity=Math.min(100,(present.prosperity||50)+10);
  const text=`Помощь месту «${a.name}» в прошлом улучшает его настоящее.`;s.chronology.echoes.push({tick:s.tick,text});ctx.log(s,text,'time');
}
export function routePreference(s,a){
  const h=s.hero;let penalty=(BIOMES[a.type]?.risk||0)*(1-h.personality.courage)*1.5+dangerAvoidance(s,a);
  if(profile(h).skill==='sea'&&['sea','port','island'].includes(a.type))penalty-=3;
  if(profile(h).skill==='relic'&&['ruins','dungeon','clockwork'].includes(a.type))penalty-=2;
  if(enabled(s,'lineage')&&h.race==='dwarf'&&a.realm==='underground')penalty-=2;
  if(enabled(s,'lineage')&&h.race==='fae'&&a.realm==='dream')penalty-=2;
  if(hasHabit(h,'homebody'))penalty+=(a.continent!==s.areas[h.area].continent?4:0);
  if(enabled(s,'psychology')&&h.mind.type==='claustrophobic'&&a.realm==='underground')penalty+=5;
  if(!h.memory.places.includes(a.id))penalty-=enchantmentStrength(h,'explore');
  return penalty+exoticInvitationPenalty(s,a)+(knownLawBurden(s,a.id)?8:0);
}
