import {areaScale,campPassage,physicalDistance} from '../geometry.js';
import {campPersonalTalk} from './companion-goals.js';
import {enabled} from '../rules.js';
import {isTown} from './common.js';
import {reconcileCampSite,placeCampSite,campSiteAvailable,rememberCampSite,campApproach,observeCampSites,CAMP_FIRE,CAMP_ENTRY} from './camp-sites.js';
import {weatherAt} from './weather.js';
import {foodWalkingTicks} from './hearth-food.js';
import {walkingEnergy} from './armor.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {relevantSuspension} from './intentions.js';
export function campRestForecast(s,camp,parentX){
 if(!enabled(s,'camp-sites')&&!camp?.temporaryCamp.site)return {ticks:3,energy:0};
 const h=s.hero,a=s.areas[h.area],w=weatherAt(s,a),local=camp?weatherAt(s,camp):w,entry=camp?.temporaryCamp.site?.localEntry??CAMP_ENTRY;
 const road=foodWalkingTicks(s,Math.max(0,physicalDistance(a,h.x,parentX)-1),w.speed),inside=foodWalkingTicks(s,Math.max(0,physicalDistance(camp,entry,CAMP_FIRE)-1),local.speed,s.tick+road+2);
 return {ticks:road+2+inside+1,energy:road*walkingEnergy(s,w)+inside*walkingEnergy(s,local)};
}

// A camp is a persistent pocket of its parent scene, never a new frontier or a food source.
export function planFieldCamp(s,ctx){
  const h=s.hero,a=s.areas[h.area];
  if(!enabled(s,'fieldcamp')||a.interior||isTown(a)||a.type==='camp'||a.type==='sea'||h.transit||h.combat)return false;
  if(a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&Math.abs(o.x-h.x)*areaScale(s.areas[h.area])<28))return false;
  const camp=s.areas[a.fieldCamp],original=h.x,old=h.goal&&!['rest','campPitch','campContinue','campLeave'].includes(h.goal.kind)?{...h.goal}:null;
  if(camp&&!camp.temporaryCamp.site&&!campSiteAvailable(s,camp))return false;
  let x=original;
  if(camp&&(camp.temporaryCamp.site||enabled(s,'camp-sites'))){
    reconcileCampSite(s,camp);observeCampSites(s);
    if(camp.temporaryCamp.site){
      const approach=campApproach(s,camp);if(!approach)return false;
      x=approach.parentX;
    }else if(!campSiteAvailable(s,camp))return false;
  }
  const estimate=campRestForecast(s,camp,x);if((camp?.temporaryCamp.site||enabled(s,'camp-sites'))&&(h.energy<estimate.energy+2||h.hunger+.16*estimate.ticks>=90))return false;
  ctx.goal(s,'campPitch',a.id,x,camp?.temporaryCamp.site?'Вернуться к походному костру':'Разбить походный лагерь','Сначала нужно дойти до места стоянки. Костёр не переезжает вслед за путником.',{remaining:2,campArrivalTicks:estimate.ticks,continuation:{parent:a.id,x:original,...(old?{task:old,taskView:{intent:h.intent,reason:h.reason,action:h.action}}:{})}});
  return true;
}
export function pitchCamp(s,ctx){
  const h=s.hero,g=h.goal,parent=s.areas[h.area];
  if(!enabled(s,'fieldcamp')){h.goal=null;return;}
  if(parent.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(parent,h.x,o.x)<28)){h.goal=null;return;}
  h.lastAction='rest';if(--g.remaining>0)return;
  let camp=s.areas[parent.fieldCamp];
  if(!camp){
    const id='a'+s.nextArea++;
    camp={id,type:'camp',paletteVersion:2,name:`Лагерь: ${parent.name}`,depth:parent.depth,links:[],objects:[{id:id+'-rest',kind:'rest',name:'Походный костёр',x:68}],expanded:true,discovered:true,visited:true,visits:0,continent:parent.continent,realm:parent.realm,era:parent.era,danger:parent.danger,temporaryCamp:{parent:parent.id,mode:'personal',returns:{}},forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'Окрестности лагеря'}};
    camp.culture=parent.culture;s.areas[id]=camp;parent.fieldCamp=id;ctx.connect(s,parent.id,id);
    // These projections have no inhabitants, civics or supplies to initialize in a camp.
  }
  if(!camp.temporaryCamp.site&&!campSiteAvailable(s,camp)){h.goal=null;return;}
  if(enabled(s,'camp-sites')&&!camp.temporaryCamp.site&&!placeCampSite(s,camp,h.x)){h.goal=null;return;}
  h.campReturn=g.continuation||{parent:parent.id,x:h.x};
  if(camp.temporaryCamp.mode==='personal'){
   camp.temporaryCamp.returns={};
   for(const person of [h.lineage,...h.companions.filter(c=>c.hp>0&&c.person).map(c=>c.person)])camp.temporaryCamp.returns[person]={parentX:h.x,localEntry:68};
  }
  const site=camp.temporaryCamp.site;
  h.x=site?.localEntry??68;ctx.enter(s,camp.id);rememberCampSite(s,camp);
  ctx.goal(s,'rest',camp.id,68,'Отдохнуть в походном лагере','У костра можно восстановиться. Обратно ведёт тот же проход; затем он продолжит прежнюю дорогу.');
  if(g.preparation)h.goal.preparation=g.preparation;
  if(g.poisonCare)h.goal.poisonCare=true;
  h.counters.camps=(h.counters.camps||0)+1;
  ctx.log(s,`${h.name} устраивает ночлег у походного костра: ${parent.name}. До огня ещё несколько шагов.`,'rest');
  const companion=enabled(s,'companions')&&h.companions.find(c=>c.hp>0);
  campPersonalTalk(s,ctx);
  if(companion){if(!enabled(s,'camp-life'))companion.loyalty=Math.min(100,companion.loyalty+1);ctx.log(s,`${companion.name} помогает устроить ночлег. У огня находится время для разговора.`,'relationship');}
}
export function leaveCamp(s,ctx){
  const h=s.hero,a=s.areas[h.area];if(!a.temporaryCamp)return false;
  const parent=s.areas[a.temporaryCamp.parent];if(!parent)return false;
  if(!a.temporaryCamp.site&&!enabled(s,'camp-sites')){
    const entry=a.temporaryCamp.returns?.[h.lineage];if(a.temporaryCamp.mode!=='personal'||!entry)return false;
    for(const id of [h.lineage,...h.companions.filter(c=>c.person).map(c=>c.person)])delete a.temporaryCamp.returns[id];
    h.x=entry.parentX;ctx.enter(s,parent.id);h.campReturn=null;h.goal=null;h.lastAction='walk';ctx.log(s,'Путник вышел из лагеря. Стоянка, костёр и оставленные вещи остаются на месте.','rest');return true;
  }
  reconcileCampSite(s,a);const passage=campPassage(s,a.id,parent.id);if(!passage?.allowed)return false;
  // Leaving reveals only the real passage used by this body.
  revealArea(s,a);revealArea(s,parent);revealRoad(s,a.id,parent.id);
  ctx.goal(s,'campLeave',parent.id,passage.arrival,'Выйти из походного лагеря','Он идёт к общему проходу. Костёр и оставленные вещи остаются на месте.');return true;
}
export function campCrossed(s,from,to,ctx){
 const a=s.areas[from],h=s.hero;if(a?.temporaryCamp?.parent!==to)return;
 const back=h.campReturn;h.campReturn=null;
 if(a.temporaryCamp.mode==='personal')for(const id of [h.lineage,...h.companions.filter(c=>c.person).map(c=>c.person)])delete a.temporaryCamp.returns[id];
 if(h.goal?.kind!=='campLeave')return;
 if(back?.task&&resumeCampTask(s,back.task,ctx,back.taskView)){ctx.log(s,'Он выходит через общий проход и продолжает отложенное дело отсюда.','rest');return;}
 if(back?.parent===to&&Number.isFinite(back.x)&&physicalDistance(s.areas[to],h.x,back.x)>1)ctx.goal(s,'campContinue',to,back.x,'Продолжить прежнюю дорогу','Из лагеря он вышел на общую тропу. Теперь нужно действительно вернуться к месту остановки.',{resume:back.task||null,resumeView:back.taskView||null});
 else resumeCampTask(s,back?.task,ctx,back?.taskView);
 ctx.log(s,'Он выходит на прежнюю дорогу через тот же проход. Костёр остаётся для следующих путников.','rest');
}
function resumeCampTask(s,task,ctx,view){const h=s.hero;h.goal=null;if(!task)return false;const reason=relevantSuspension(s,{action:task},ctx);if(reason){ctx.log(s,reason,'plan');return false;}h.goal=task;h.intent=typeof view?.intent==='string'?view.intent:'Продолжить прежнее дело';h.reason=typeof view?.reason==='string'?view.reason:'После отдыха прежнее дело ещё актуально. Он продолжит его от общего выхода.';h.action=typeof view?.action==='string'?view.action:String(task.kind).toUpperCase();if(h.planning)h.planning.checked=null;return true;}
export function campContinue(s,ctx){const h=s.hero;resumeCampTask(s,h.goal?.resume,ctx,h.goal?.resumeView);h.lastAction='idle';}
