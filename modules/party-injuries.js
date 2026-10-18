import {limbCanCarry} from './limb-state.js';
import {actorView} from '../actor-view.js';
import {physicalDistance} from '../geometry.js';
import {knownArea} from '../actor-atlas.js';
import {selfDrivenActor,detailedActors} from '../actor-projection.js';
import {npcAction,invalidateNPCControl} from './npc-control.js';
import {packView} from './container-state.js';
import {stat,isTown} from './common.js';
import {personNeeds} from './needs.js';
import {woundActor,woundImpairment,woundActivity} from './wound-state.js';
import {woundNPCTurn,clinicPatientCare} from './wound-care.js';
import {careArrival} from './poison-forecast.js';
import {knownServiceAllows,serviceStaff} from './service-access.js';
import {careIssue,goodDressing} from './wound-care-state.js';
import {injuredPartyOn,supportedPatient,patientJourney} from './patient-state.js';
const leader=(s,d)=>s.hero.lineage===d.leader?s.hero:s.actorStates[d.leader];
const severe=(s,p)=>p.health<(p.maxHealth||100)*.35||woundImpairment(s,p,'leg')>=.65||woundImpairment(s,p,'head')>=.65;
const ready=(s,p)=>p.health>=(p.maxHealth||100)*.4&&woundImpairment(s,p,'leg')<.55&&woundImpairment(s,p,'head')<.65;
function removeBody(s,p){for(const a of Object.values(s.areas)){a.objects=a.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);if(a.population)a.population=a.population.filter(id=>id!==p.id);}}
function body(s,p){removeBody(s,p);const a=s.areas[p.area];if(!a)return;a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);a.objects.push({id:'injury-wait/'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});}
function note(s,h,p,stage){if(!h)return;const notes=h.patientNotes ||= {};notes[p.id]={person:p.id,name:p.name,area:p.area??p.partyInjury.station.area,x:p.x??p.partyInjury.station.x,seen:s.tick,stage};for(const id of Object.keys(notes).sort((a,b)=>notes[a].seen-notes[b].seen).slice(0,-8))delete notes[id];}
function canSupport(s,h,p,c){return !supportedPatient(s,h)&&h.alive&&!h.transit&&h.energy>=40&&h.hp>=h.maxHp*.6&&limbCanCarry(s.people[h.lineage])&&stat(h,'might')>=6&&woundImpairment(s,s.people[h.lineage],'arm')<.5&&h.personality.generosity>=.45&&(h.relations[p.id]?.trust??0)>=0&&c.loyalty>=50&&packView(s,h.lineage).free>=8+packView(s,p.id).used;}
function park(s,p,h,reason,leave=false){const d=p.partyInjury;if(h?.injuredPassenger===p.id)h.injuredPassenger=null;d.stage=leave?'left':'waiting';d.reason=reason;d.carrier=null;d.station={area:p.area,x:p.x};p.status=leave?'resident':'injury-wait';body(s,p);if(h?.alive&&h.area===p.area&&!h.transit&&physicalDistance(s.areas[p.area],h.x,p.x)<=30)note(s,h,p,d.stage);invalidateNPCControl(s);}
export function beginPatientCare(s,c,ctx){
 const h=s.hero,p=s.people[c?.person];if(!injuredPartyOn(s)||!h.alive||h.transit||!p?.alive||!h.companions.includes(c)||!severe(s,p)||selfDrivenActor(s,p.id)||!npcAction(s,p,'party','injury'))return false;
 const carry=canSupport(s,h,p,c);h.companions=h.companions.filter(v=>v!==c);p.area=h.area;p.x=h.x;const d=p.partyInjury={version:1,leader:h.lineage,started:s.tick,tick:s.tick,lastActionTick:s.tick,stage:carry?'supported':'waiting',carrier:carry?h.lineage:null,station:{area:p.area,x:p.x},member:{...c,hp:Math.max(1,Math.ceil(c.maxHp*p.health/(p.maxHealth||100)))},reason:carry?'Согласился принять физическую поддержку.':'Пока не может идти; ожидает на действительном месте.',refusal:null};
 p.status=carry?'injury-supported':'injury-wait';if(p.agenda)p.agenda.task=null;(s.partyPatients ||= {version:1,active:[]}).active.push(p.id);
 if(carry){h.injuredPassenger=p.id;removeBody(s,p);}else body(s,p);note(s,h,p,d.stage);h.energy=Math.max(0,h.energy-2);h.lastAction='companion';invalidateNPCControl(s);
 ctx.log?.(s,carry?`${h.name} поддерживает ${p.name}. Скорость, силы и место для груза ограничены; перенос не лечит.`:`${p.name} остаётся ждать здесь. Тот же живой человек больше не следует за отрядом автоматически.`,'companion');return true;
}
export function syncPatient(s){
 const h=s.hero,p=supportedPatient(s,h);if(!p)return;p.area=h.area;p.x=h.x;p.partyInjury.station={area:h.area,x:h.x};
 if(!h.alive){if(h.transit){const t=h.transit;p.partyInjury.passage={from:t.from,to:t.to,mode:t.mode,remaining:t.remaining,total:t.total,arrivalX:t.arrivalX,admitted:s.tick,lastTick:s.tick};p.partyInjury.stage='waiting';p.partyInjury.carrier=null;p.status='injury-wait';p.area=null;p.x=null;h.injuredPassenger=null;}else park(s,p,h,'Носильщик погиб; человек остаётся здесь.',true);}
}
export function patientPlan(s,ctx){
 const h=s.hero;if(!injuredPartyOn(s)||h.transit)return false;
 const c=h.companions.find(c=>c.person&&s.people[c.person]?.alive&&severe(s,s.people[c.person]));if(c&&beginPatientCare(s,c,ctx)){
  const e=h.combat&&s.areas[h.area].objects.find(e=>e.id===h.combat&&e.alive);if(e)ctx.enemyResponse?.(s,e);return true;
 }
 const waiting=(s.partyPatients?.active||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.partyInjury?.stage==='waiting'&&p.partyInjury.leader===h.lineage&&!p.partyInjury.passage&&p.area===h.area&&physicalDistance(s.areas[h.area],p.x,h.x)<=9&&!ready(s,p)&&!(p.partyInjury.refusal?.area===h.area&&s.tick-p.partyInjury.refusal.tick<80)&&canSupport(s,h,p,p.partyInjury.member));
 if(waiting){if(npcAction(s,waiting,'injury','support')){waiting.partyInjury.stage='supported';waiting.partyInjury.carrier=h.lineage;waiting.partyInjury.lastActionTick=s.tick;waiting.status='injury-supported';h.injuredPassenger=waiting.id;waiting.area=h.area;waiting.x=h.x;removeBody(s,waiting);note(s,h,waiting,'supported');h.energy=Math.max(0,h.energy-2);invalidateNPCControl(s);}h.lastAction='companion';return true;}
 const p=supportedPatient(s,h);if(!p)return false;
 if(h.combat)return false;
 if(h.goal?.patient===p.id)return false;
 const target=Object.values(s.areas).filter(a=>knownArea(s,a)&&isTown(a)&&knownServiceAllows(s,a,'clinic')&&!(p.partyInjury.refusal?.area===a.id&&s.tick-p.partyInjury.refusal.tick<80)).map(a=>careArrival(s,a.id,68,ctx)).filter(r=>r&&r.ticks<=32&&r.path.every((id,i)=>{if(!i)return true;const e=s.edges[[r.path[i-1],id].sort().join('|')];return !e?.lift&&!['sea','portal','time'].includes(e?.mode);})).sort((a,b)=>a.ticks-b.ticks)[0];
 if(target){ctx.goal(s,'patientClinic',target.area,68,'Помочь раненому спутнику','Идёт своим телом с тем же человеком к известному лекарю.',{patient:p.id});return false;}
 park(s,p,h,'Известного доступного короткого пути к лекарю нет.');h.goal=null;return false;
}
export function patientClinicAction(s,ctx){
 const h=s.hero,p=s.people[h.goal?.patient];if(!p||supportedPatient(s,h)!==p){h.goal=null;return;}
 const issue=careIssue(s,p);if(p.health>=(p.maxHealth||100)*.4&&issue&&goodDressing(issue)){park(s,p,h,'После действительного ухода даёт ране восстановиться на месте.');h.lastAction='companion';h.goal=null;return;}
 if(clinicPatientCare(s,p,ctx)){h.lastAction='heal';p.partyInjury.member.hp=Math.max(1,Math.ceil(p.partyInjury.member.maxHp*p.health/(p.maxHealth||100)));return;}
 const providers=serviceStaff(s,s.areas[h.area],'clinic').filter(q=>q.id!==p.id&&physicalDistance(s.areas[h.area],q.x,h.x)<=12);
 const occupied=p.partyInjury.lastActionTick===s.tick||p.woundCare?.lastActionTick===s.tick||providers.some(q=>q.woundCare?.lastActionTick===s.tick||q.actionControl?.tick===s.tick);
 if(occupied&&s.areas[h.area].civic?.medicine>=1&&h.gold>=2&&s.tick-h.goal.started<64){h.lastAction='idle';return;}
 p.partyInjury.refusal={area:h.area,tick:s.tick};park(s,p,h,'Лекарь или реальные средства недоступны; остаётся здесь без выдуманного лечения.');h.lastAction='companion';h.goal=null;ctx.log?.(s,`${p.name} остаётся на своей координате у лечебницы: услугу сейчас получить нельзя.`,'companion');
}
function join(s,p,h){const d=p.partyInjury,c=d.member;c.hp=Math.max(1,Math.ceil(c.maxHp*p.health/(p.maxHealth||100)));h.companions.push(c);p.status='withHero';d.stage='joined';d.carrier=null;d.lastActionTick=s.tick;if(h.injuredPassenger===p.id)h.injuredPassenger=null;removeBody(s,p);note(s,h,p,'joined');invalidateNPCControl(s);}
export function patientsTick(s,ctx){
 if(!s.partyPatients)return;
 s.partyPatients.active=s.partyPatients.active.filter(id=>{
  const p=s.people[id],d=p?.partyInjury;if(!d||!['waiting','supported'].includes(d.stage))return false;const h=leader(s,d);d.tick=s.tick;
  if(!p.alive){const carried=d.stage==='supported';if(h?.injuredPassenger===id)h.injuredPassenger=null;d.stage='dead';d.carrier=null;d.member.hp=0;if(h?.alive&&(carried||!h.transit&&h.area===p.area&&physicalDistance(s.areas[p.area],h.x,p.x)<=30)){note(s,h,p,'dead');ctx.log?.(actorView(s,h),carried?`${p.name} умирает в совместной дороге.`:`${p.name} погиб на действительном месте ожидания.`,'loss');}return false;}
  d.member.hp=Math.max(1,Math.ceil(d.member.maxHp*p.health/(p.maxHealth||100)));
  if(d.passage){const t=d.passage;if(s.tick>t.lastTick){t.lastTick=s.tick;t.remaining--;}if(t.remaining>0)return true;p.area=t.to;p.x=t.arrivalX;delete d.passage;park(s,p,h,'Начатый пеший проход закончен на настоящей стороне.',!h?.alive||!injuredPartyOn(s));}
  if(d.stage==='supported'){
   if(h){p.area=h.area;p.x=h.x;d.station={area:p.area,x:p.x};}
   if(h?.transit)return true;
   if(!injuredPartyOn(s)||!h?.alive||h.life.ended||h.energy<15||packView(s,h.lineage).excess)park(s,p,h,'Поддержку больше нельзя продолжать.',!injuredPartyOn(s)||!h?.alive);
  }
  if(d.stage==='left')return false;
  if(d.stage==='waiting'&&(!h?.alive||h.life.ended||s.tick-d.started>=96&&ready(s,p))){park(s,p,h,'Договорённое ожидание закончилось на действительном месте.',true);return false;}
  if(injuredPartyOn(s)&&h?.alive&&!h.transit&&p.area===h.area&&physicalDistance(s.areas[p.area],p.x,h.x)<=9&&ready(s,p)&&h.companions.length+(supportedPatient(s,h)&&h.injuredPassenger!==p.id?1:0)<3&&d.member.loyalty>=50&&(h.relations[id]?.trust??0)>=0&&npcAction(s,p,'injury','join')){join(s,p,h);ctx.log?.(actorView(s,h),`${p.name} снова идёт рядом: тот же человек восстановился достаточно для пути.`,'companion');return false;}
  if(!injuredPartyOn(s)){park(s,p,h,'Совместное ожидание прекращено.',true);return false;}
  if(s.tick%8===0&&npcAction(s,p,'injury','care')){
   const treated=woundNPCTurn(s,p,null);const need=personNeeds(s,p,ctx,{onlyUpkeep:treated,migration:false,social:false,localFood:!h?.transit,grave:!h?.transit,onDeath(){const route=patientJourney(s,p);if(route){p.deathJourney=route;p.area=null;p.x=null;}}});d.lastActionTick=s.tick;
   if(p.alive&&!need&&!treated&&d.stage==='waiting'){p.health=Math.min(p.maxHealth||100,p.health+2);p.needs.energy=Math.min(100,p.needs.energy+6);woundActivity(s,p,'body',true);}
   d.member.hp=p.alive?Math.max(1,Math.ceil(d.member.maxHp*p.health/(p.maxHealth||100))):0;
  }
  if(!p.alive){d.stage='dead';d.carrier=null;if(h?.injuredPassenger===id)h.injuredPassenger=null;return false;}
  return true;
 });
}
