import {enabled} from '../rules.js';import {physicalDistance} from '../geometry.js';import {navigationToolsOn,ownedRope,ropeKnots,attachedRope} from './navigation-tool-state.js';
export const navigationMemoryOn=s=>enabled(s,'navigation-memory')&&navigationToolsOn(s);
const copy=v=>JSON.parse(JSON.stringify(v)),closed=r=>['passed','closed'].includes(r.status),state=h=>h.navigationMemory ||= {version:1,blockers:[]};
export function navigationCapability(s,r){const rope=ownedRope(s)||r.knownRope;return [rope?.id||'',rope?.rope?.length||rope?.length||0,ropeKnots(s)?1:0,r.knownAnchor?1:0].join('/');}
export function canUseKnownDescent(s,r){const rope=ownedRope(s)||r.knownRope;return navigationMemoryOn(s)&&r.knownAnchor&&ropeKnots(s)&&(rope?.rope?.length||rope?.length||0)>=r.span;}
export function navigationAvailable(s,r){return canUseKnownDescent(s,r)&&!closed(r)&&r.after<=s.tick&&navigationCapability(s,r)!==r.lastFailed;}
export function rememberNavigationBlocker(s,o,action,target,ctx){
 if(!navigationMemoryOn(s))return null;const h=s.hero,q=state(h),id='navigation/'+h.lineage+'/'+o.id;let r=q.blockers.find(r=>r.id===id);const direction=Math.sign(target-h.x)||1,entry=direction>0?o.x:o.descent.bottom;
 if(!r){r={id,object:o.id,area:h.area,found:s.tick,seen:s.tick,status:'waiting',blocking:true,method:'rope-descent',needed:['rope','rope-knot','anchor'],entry,bottom:o.descent.bottom,upper:o.x,span:physicalDistance(s.areas[h.area],o.x,o.descent.bottom),direction,knownAnchor:o.descent.anchor.intact,knownBypass:o.descent.bypass,knownRope:null,action:copy(action),after:0,lastFailed:'',attempts:0,reason:'У знакомого спуска нет доступного безопасного способа.'};q.blockers.push(r);if(q.blockers.length>12)q.blockers.splice(q.blockers.findIndex(r=>closed(r))<0?0:q.blockers.findIndex(r=>closed(r)),1);}
 r.seen=s.tick;r.knownAnchor=o.descent.anchor.intact;r.knownBypass=o.descent.bypass;r.action=copy(action);r.direction=direction;r.entry=entry;r.status='waiting';r.blocking=true;r.reason=ownedRope(s)?ropeKnots(s)?'Опора или длина верёвки не подходят.':'Верёвка есть, но опорный узел ещё не освоен.':'Нужны своя верёвка и известный опорный узел.';const before=r.lastFailed;r.lastFailed=navigationCapability(s,r);if(!before||before!==r.lastFailed)ctx?.log?.(s,'Герой запоминает конкретный спуск: '+r.reason+' Без нового способа повторять подход незачем.','knowledge');return r;
}
function end(s,r,reason,status='closed',ctx){r.status=status;r.reason=reason;r.closedAt=s.tick;if(s.hero.goal?.navReturn===r.id){s.hero.goal=null;ctx?.log?.(s,reason,'plan');}}
function ownPurposeEnded(s,r){const q=r.action.quest&&s.hero.quests.find(q=>q.id===r.action.quest);return r.action.quest&&q?.status!=='active';}
export function observeNavigationBlockers(s,ctx){
 if(!navigationMemoryOn(s)||!s.hero.alive||s.hero.transit)return;const h=s.hero;
 for(const r of h.navigationMemory?.blockers||[]){if(closed(r)&&!r.blocking)continue;if(!closed(r)&&ownPurposeEnded(s,r))end(s,r,'Прежнее обещание больше не требует возвращения к спуску.','closed',ctx);if(r.area!==h.area||physicalDistance(s.areas[h.area],h.x,r.entry)>30)continue;
  const o=s.areas[h.area].objects.find(o=>o.id===r.object&&o.kind==='descent');if(!o){r.blocking=false;end(s,r,'При посещении видно: прежнего препятствия здесь больше нет.','closed',ctx);continue;}
  const fixed=attachedRope(o);r.knownRope=fixed&&(fixed.rope.attached.progress===2||fixed.rope.attached.owner===h.lineage)?{id:fixed.id,length:fixed.rope.length,owner:fixed.rope.attached.owner,progress:fixed.rope.attached.progress,seen:s.tick}:null;
  const target=r.action.area===h.area&&r.action.object&&physicalDistance(s.areas[h.area],h.x,r.action.x)<=30?s.areas[h.area].objects.find(v=>v.id===r.action.object):undefined;
  if(!closed(r)&&r.action.area===h.area&&r.action.object&&physicalDistance(s.areas[h.area],h.x,r.action.x)<=30&&(!target||target.taken||target.kind==='herb'&&target.count<=0||target.kind==='enemy'&&(!target.alive||target.resolved))){end(s,r,'Цель у знакомого спуска уже забрана или перестала существовать.','closed',ctx);continue;}
  r.seen=s.tick;if(r.knownAnchor!==o.descent.anchor.intact||r.knownBypass!==o.descent.bypass){r.knownAnchor=o.descent.anchor.intact;r.knownBypass=o.descent.bypass;r.after=0;r.reason=r.knownAnchor?'При новом посещении опора снова пригодна.':'При посещении видно: прежняя опора разрушена.';if(!r.knownAnchor){if(!closed(r))r.status='waiting';r.lastFailed=navigationCapability(s,r);if(h.goal?.navReturn===r.id)h.goal=null;}}
  if(r.direction>0&&h.x>=r.bottom||r.direction<0&&h.x<=r.upper){r.blocking=false;end(s,r,'Он уже добрался на другую сторону. Возврат ради самого спуска не нужен.','passed',ctx);}
 }
 if(h.goal?.kind==='routeWait'&&h.goal.navBlocked){const r=h.navigationMemory?.blockers.find(r=>r.id===h.goal.navBlocked);if(!r||!r.blocking||canUseKnownDescent(s,r))h.goal=null;}
}
export function navigationReturnChoices(s,ctx){
 if(!navigationMemoryOn(s))return [];const h=s.hero;return (h.navigationMemory?.blockers||[]).filter(r=>navigationAvailable(s,r)&&!ownPurposeEnded(s,r)&&(ctx.knownRoute||ctx.route)(s,h.area,r.area).length>0).slice(0,4).map(r=>({line:'navigation',id:r.id,area:r.area,score:18+h.personality.curiosity*65+(h.career.path==='adventure'?8:0),reason:'Для запомненного спуска появился настоящий способ: своя верёвка и освоенный узел.'}));
}
export function startNavigationReturn(s,choice,ctx){const h=s.hero,r=h.navigationMemory?.blockers.find(r=>r.id===choice.id);if(!r||!navigationAvailable(s,r))return false;r.status='returning';r.attempts++;r.started=s.tick;ctx.goal(s,'navReturn',r.area,r.entry,'Вернуться к знакомому спуску',choice.reason,{navReturn:r.id,object:r.object});return true;}
export function pauseNavigationReturn(s,id){const r=s.hero.navigationMemory?.blockers.find(r=>r.id===id);if(r?.status==='returning'){r.status='waiting';r.after=s.tick+4;r.reason='Срочное обещание важнее; возможность возврата сохранена.';}}
export function navigationReturnTarget(s,ctx){
 const h=s.hero,g=h.goal;if(g?.kind!=='navReturn')return true;const r=h.navigationMemory?.blockers.find(r=>r.id===g.navReturn);if(!r||!navigationMemoryOn(s)){h.goal=null;return false;}
 if(!navigationAvailable(s,r)){r.status='waiting';r.lastFailed=navigationCapability(s,r);h.goal=null;return false;}observeNavigationBlockers(s,ctx);return Boolean(h.goal);
}
export function finishNavigationReturn(s,ctx){
 const h=s.hero,g=h.goal,r=h.navigationMemory?.blockers.find(r=>r.id===g?.navReturn);if(g?.kind!=='navReturn'||!r||!navigationReturnTarget(s,ctx)||h.area!==r.area||physicalDistance(s.areas[h.area],h.x,r.entry)>1)return false;
 h.goal=copy(r.action);h.goal.navigationReturn=r.id;h.goal.repertoire={line:'navigation',id:r.id,since:r.started};h.intent='Продолжить прежний путь через знакомый спуск';h.reason='Есть тот же предмет, собственное умение и проверенное место. Прежняя цель ещё актуальна.';return true;
}
export function navigationPassageUsed(s,o,action){const r=s.hero.navigationMemory?.blockers.find(r=>r.id===action?.navigationReturn&&r.object===o.id);if(r&&!closed(r)){r.status='passed';r.blocking=false;r.closedAt=s.tick;r.reason='Запомненный спуск пройден настоящим действием.';}}
export function navigationHoldKnownBlocker(s,ctx){
 const h=s.hero,g=h.goal;if(!navigationMemoryOn(s)||!g||g.navReturn||g.navigationReturn||g.intention||g.kind.startsWith('rope')||g.kind==='routeWait')return false;
 const path=g.area===h.area?[h.area]:(ctx.knownRoute||ctx.route)(s,h.area,g.area),next=path[1],target=next?(Number(next.slice(1))>Number(h.area.slice(1))?100:0):g.x;
 const r=h.navigationMemory?.blockers.find(r=>r.blocking&&r.area===h.area&&!canUseKnownDescent(s,r)&&!r.knownBypass&&(target>h.x?h.x<r.bottom&&target>r.upper:h.x>r.upper&&target<r.bottom));if(!r)return false;
 ctx.goal(s,'routeWait',h.area,h.x,'Подождать нового способа','Прежний спуск уже проверен. Без изменения причины новый подход не поможет.',{until:s.tick+48,navBlocked:r.id});return true;
}
