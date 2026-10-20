import {recordSurgicalPractice} from './foreign-body-state.js';
import {fracturesOn,fracturePending} from './fracture-state.js';
import {fractureCare} from './fracture-care.js';
import {cleanInfection,infectionNeedsCare,infectionRiskAllowed,infectionSeverity} from './wound-infection-state.js';
import {rememberCampDressing} from './camp-topic-memory.js';
import {supportedPatient} from './patient-state.js';
import {physicalDistance} from '../geometry.js';
import {knownArea} from '../actor-atlas.js';
import {enabled} from '../rules.js';
import {consumeCarriedSupplies} from './stores.js';
import {npcAction,npcController} from './npc-control.js';
import {serviceStaff,actualService,knownServiceAllows,rememberService} from './service-access.js';
import {careArrival} from './poison-forecast.js';
import {isTown} from './common.js';
import {coverBlocks} from './position-state.js';
import {woundActor,woundActivity} from './wound-state.js';
import {woundCareOn,careIssue,goodDressing,seriousWound,careState} from './wound-care-state.js';

const busy=(s,p)=>p.actionControl?.tick===s.tick&&p.actionControl.phases.some(phase=>!['upkeep','social'].includes(phase))||p.woundCare?.lastActionTick===s.tick;
const material=(p,h)=>p.roadSupplies?.medicine>=1?'medicine':h?.inventory.herbs>0?'herbs':null;
function decision(s,p,method,reason,ctx){const t=careState(p);if(t.decision?.method===method&&t.decision.wound===careIssue(s,p)?.id)return;t.decision={tick:s.tick,method,wound:careIssue(s,p)?.id??null,reason};if(s.hero.lineage===p.id)ctx?.log?.(s,reason,'plan');}
export function dressWound(s,p,w,by,method,kind,ctx){
 if(!woundCareOn(s)||!p.alive||!by.alive||!p.localWounds?.active.includes(w)||goodDressing(w)&&!infectionNeedsCare(s,p,w)||p.woundCare?.lastActionTick===s.tick||by.woundCare?.lastActionTick===s.tick)return false;
 const h=woundActor(s,by),target=woundActor(s,p),area=target?.area||p.area,byArea=h?.area||by.area;if(by.id!==p.id&&(byArea!==area||physicalDistance(s.areas[area],target?.x??p.x,h?.x??by.x)>12))return false;
 const before=kind==='medicine'?by.roadSupplies?.medicine||0:h?.inventory.herbs||0;if(infectionNeedsCare(s,p,w)&&(h?.energy??by.needs?.energy??0)<2)return false;
 if(kind==='medicine'){if(!consumeCarriedSupplies(by,null,'medicine',1))return false;}
 else if(kind==='herbs'&&h?.inventory.herbs>0)h.inventory.herbs--;else return false;
 return applyDressing(s,p,w,by,method,kind,ctx,{holder:by.id,area:null,before,after:before-1});
}
function applyDressing(s,p,w,by,method,kind,ctx,supply){
 cleanInfection(s,p,w,by,method,kind,supply);
 const quality=kind==='herbs'?12:20;w.dressing={version:1,applied:s.tick,by:by.id,method,material:kind,units:1,quality,remaining:quality,age:0};
 w.bleed=0;const t=careState(p);t.lastActionTick=s.tick;t.treatments++;careState(by).lastActionTick=s.tick;
 const h=woundActor(s,by);if(h){h.energy=Math.max(0,h.energy-2);h.lastAction='heal';}else if(by.needs)by.needs.energy=Math.max(0,by.needs.energy-2);
 rememberCampDressing(s,p,w,by);recordSurgicalPractice(s,by,p,w);woundActivity(s,p,'body',by.id!==p.id);ctx?.log?.(s,`${by.name}: ${kind==='herbs'?'травяной компресс':'лекарственная повязка'} — ${w.label}. Израсходована одна единица материала; закрытие и функция ещё требуют времени.`,'heal');return true;
}
function safe(s,p,h=null){const area=s.areas[h?.area||p.area],x=h?.x??p.x;return !area?.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(area,e.x,x)<=15&&(!h||!coverBlocks(s,e,h)));}
function clinic(s,p,w,ctx,payer=null){
 const target=woundActor(s,p),h=payer||target,a=s.areas[target?.area||p.area],x=target?.x??p.x;if(!isTown(a)||physicalDistance(a,x,68)>2)return false;
 const provider=serviceStaff(s,a,'clinic').find(q=>q.id!==p.id&&physicalDistance(a,q.x,x)<=12&&!busy(s,q));
 if(!provider||!actualService(s,a,'clinic').available||!(a.civic?.medicine>=1)||!h||h.gold<2||!npcAction(s,provider,'personal','wound-treatment'))return false;
 const before=a.civic.medicine;a.civic.medicine--;h.gold-=2;provider.agenda.wealth+=2;if(w)return applyDressing(s,p,w,provider,'clinic','clinic',ctx,{holder:provider.id,area:a.id,before,after:a.civic.medicine});p.health=Math.min(p.maxHealth||100,p.health+25);provider.needs.energy=Math.max(0,provider.needs.energy-2);careState(provider).lastActionTick=s.tick;p.partyInjury.lastActionTick=s.tick;return true;
}
export function woundCareTurn(s,ctx){
 const h=s.hero,p=s.people[h.lineage],w=careIssue(s,p);if(fractureCare(s,p,ctx))return true;if(w?.kind==='bruise'&&fracturesOn(s)&&fracturePending(w))return false;if(!woundCareOn(s)||!h.alive||h.transit)return false;
 if(!w){if(h.goal?.woundCare){h.goal=null;decision(s,p,'recovered','Рана закрылась, функция позволяет вернуться к обычным делам.',ctx);}return false;}
 if(p.woundCare?.lastActionTick===s.tick)return true;
 if(!safe(s,p,h))return false;
 if(infectionRiskAllowed(s,p,w,h)){decision(s,p,'risk','Он замечает ухудшение раны, но принимает риск ради срочного принятого дела.',ctx);return false;}
 if(!goodDressing(w)||infectionNeedsCare(s,p,w)){
  const kind=material(p,h);if(kind&&dressWound(s,p,w,p,'self',kind,ctx)){ctx.cancelWeapon?.(s,'Уход за раной прерывает размах.');return true;}
  const helper=h.companions.map(c=>s.people[c.person]).find(q=>q?.alive&&q.area===h.area&&physicalDistance(s.areas[h.area],q.x,h.x)<=12&&!busy(s,q)&&q.roadSupplies?.medicine>=1&&(q.agenda?.generosity??q.agenda?.sociability??.5)>=.4);
  if(helper&&npcAction(s,helper,'party','wound-treatment')&&dressWound(s,p,w,helper,'companion','medicine',ctx)){h.lastAction='heal';ctx.cancelWeapon?.(s,'Помощь вместо размаха.');return true;}
  if(clinic(s,p,w,ctx)){h.lastAction='heal';ctx.cancelWeapon?.(s,'Уход лекаря прерывает размах.');return true;}
 }
 if(!seriousWound(s,p)||h.hunger>75)return false;
 const a=s.areas[h.area],state=careState(p);
 if(h.goal?.woundCare&&h.goal.area!==h.area){if(s.tick-h.goal.started<=64&&ctx.knownRoute(s,h.area,h.goal.area).length)return false;state.failedClinic={area:h.goal.area,until:s.tick+80};h.goal=null;}
 if((!goodDressing(w)||infectionNeedsCare(s,p,w))&&h.gold>=2&&!(state.failedClinic?.area===a.id&&state.failedClinic.until>s.tick)){
  if(isTown(a)&&physicalDistance(a,h.x,68)<=2){rememberService(s,a,'clinic');state.failedClinic={area:a.id,until:s.tick+80};}
  const target=Object.values(s.areas).filter(a=>knownArea(s,a)&&isTown(a)&&knownServiceAllows(s,a,'clinic')&&!(state.failedClinic?.area===a.id&&state.failedClinic.until>s.tick)).map(a=>careArrival(s,a.id,68,ctx)).filter(r=>r&&r.ticks<=32&&h.hp>Math.ceil(r.ticks/8)*((w.severity===3?2:1)+(infectionSeverity(s,p,w)===3?1:0))).sort((a,b)=>a.ticks-b.ticks)[0];
  if(target&&(!h.goal?.woundCare||h.goal.area!==target.area)){ctx.goal(s,'rest',target.area,68,'Получить уход за раной','Тяжёлая рана требует известной доступной помощи.',{woundCare:true});decision(s,p,'clinic','Тяжёлая рана меняет маршрут: ищет известного лекаря с настоящими средствами.',ctx);return false;}
 }
 if(!h.goal?.woundCare){ctx.goal(s,'rest',h.area,h.x,'Дать ране восстановиться','Бережёт повреждённую часть; без перевязки сохраняется риск кровопотери.',{woundCare:true});decision(s,p,'rest','Рана мешает работе и походу. Он выбирает безопасный отдых, сохраняя прежние обязательства.',ctx);}return false;
}
export function woundNPCTurn(s,p,ctx){
 if(!woundActor(s,p)&&fractureCare(s,p,ctx))return true;const w=careIssue(s,p);if(!w||woundActor(s,p)||!safe(s,p)||p.needs.hunger>85)return false;if(p.woundCare?.lastActionTick===s.tick)return true;
 if((!goodDressing(w)||infectionNeedsCare(s,p,w))&&material(p,null)&&dressWound(s,p,w,p,'self','medicine',s.hero.area===p.area?ctx:null))return true;
 if(seriousWound(s,p)){woundActivity(s,p,'body',true);p.needs.energy=Math.min(100,p.needs.energy+6);careState(p).lastActionTick=s.tick;decision(s,p,'rest','Повреждение требует отдыха.',null);return true;}return false;
}

export function clinicPatientCare(s,p,ctx){if(supportedPatient(s)!==p||s.hero.transit||p.partyInjury.lastActionTick===s.tick||p.woundCare?.lastActionTick===s.tick)return false;const issue=careIssue(s,p),w=issue&&(!goodDressing(issue)||infectionNeedsCare(s,p,issue))?issue:null;if(!w&&p.health>=(p.maxHealth||100)*.75)return false;return clinic(s,p,w,ctx,s.hero);}

export function finishSurgicalDressing(s,p,w,by,c,ctx){if(p.surgeryCase!==c||c.stage!==2||c.doctor!==by.id||!c.material||c.material.used||!p.alive||!by.alive||!p.localWounds.active.includes(w))return false;const r=c.material;c.material.used=s.tick;return applyDressing(s,p,w,by,r.kind==='clinic'?'clinic':'companion',r.kind,ctx,{holder:by.id,area:r.area,before:r.before,after:r.after});}
