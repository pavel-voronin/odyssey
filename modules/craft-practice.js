import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {profile} from './common.js';
import {physicalDistance} from '../geometry.js';
import {skillBranchesEnabled,stampPracticalCraft} from './skill-branches.js';
import {workToolReady} from './workshop-tool-state.js';
import {workshopSite,workshopPosition,ownedWorkshopSite} from './workshop-place.js';
const on=s=>enabled(s,'craft-practice')&&enabled(s,'property')&&enabled(s,'property-damage');
const method='fit-working-part';
export function craftPractice(s,id=s.hero.lineage){return s.people[id]?.skillPractice?.craft||null;}
function ensure(s,id){const p=s.people[id];if(!p)return null;return(p.skillPractice ||= {}).craft ||= {operations:[],total:0};}
export function finishCraftStudy(s,id=s.hero.lineage,{teacher,teacherName,lesson}={}){
 const state=craftPractice(s,id);if(!on(s)||!s.people[id]?.alive||!state||state.method||!state.study||state.study.remaining>0)return false;
 state.method={id:method,learnedAt:s.tick,source:[...state.study.source],...(teacher?{teacher,teacherName,lesson}:{})};state.study=null;return true;
}
export function recordCraftRepair(s,a,o,proof){
 if(!on(s)||o.state!=='intact'||!a.objects.includes(o))return;const event=o.history.at(-1),p=s.people[proof.actor];
 if(!p?.alive||event?.kind!=='repair'||event.tick!==s.tick||event.actor!==proof.actor||event.damageAt!==proof.damageAt)return;
 const id=`${o.id}/damage/${proof.damageAt}`,state=ensure(s,p.id);if(state.lastTick>=s.tick||state.operations.some(e=>e.id===id))return;
 state.operations.push({id,area:a.id,property:o.id,damageAt:proof.damageAt,tick:s.tick});state.total++;state.lastTick=s.tick;if(state.operations.length>16)state.operations.shift();
 stampPracticalCraft(s,p.id,event,id);
}
export function craftStudyPlan(s,ctx){
 if(!on(s))return false;const h=s.hero,state=craftPractice(s);if(h.goal||h.combat||h.transit||!state||state.method||state.total<3||state.after>s.tick||!skillBranchesEnabled(s)&&!['craft','time'].includes(profile(h).skill)||h.hp<h.maxHp*.75||h.energy<45||enabled(s,'body')&&h.hunger>=60)return false;
 if(h.career.path!=='peaceful'&&h.personality.curiosity<.65)return false;
 const room=Object.entries(h.property.known).find(([,k])=>{const path=(ctx.knownRoute||ctx.route)(s,h.area,k.area);return k.state==='intact'&&knownArea(s,k.area)&&path.length>0&&path.length<=3&&(k.owner===h.lineage||h.gold>=2);});if(!room)return false;
 ctx.goal(s,'craftStudy',room[1].area,42,'Освоить подгонку детали','Три завершённых восстановления дали материал для собственного приёма. Нужны верстак и время, а не ещё одно звание.',{property:room[0]});return true;
}
export function craftStudyAction(s,ctx){
 const h=s.hero,g=h.goal,state=craftPractice(s),a=s.areas[h.area],site=workshopSite(s,a,g?.property),o=site?.object;
 const unavailable=skillBranchesEnabled(s)&&o?.state==='intact'&&!workToolReady(s,o);
 if(unavailable&&on(s)&&g?.kind==='craftStudy'){h.lastAction='talk';h.speech='Сначала нужно починить зажим.';ctx.log(s,'Зажим не держит деталь. Занятие отложено; уже освоенные шаги сохранены.','skill');}
 if(!on(s)||g?.kind!=='craftStudy'||!h.alive||h.transit||!state||state.total<3||state.method||!o||o.state!=='intact'||unavailable||h.energy<20){if(state&&on(s))state.after=s.tick+120;h.goal=null;return false;}
 const pos=workshopPosition(s,site.area,o);if(h.area!==pos.area||physicalDistance(a,h.x,pos.x)>9)return false;
 const access=ctx.craftBench?.(s);if(access!=='ready'){if(!access)h.goal=null;return false;}
 state.study ||= {remaining:3,source:state.operations.slice(-3).map(e=>e.id),started:s.tick};state.study.remaining--;h.energy=Math.max(0,h.energy-2);h.lastAction='work';h.speech='Подогнать, проверить, снова подогнать…';
 if(state.study.remaining<=0){finishCraftStudy(s);h.goal=null;ctx.log(s,'Три настоящих восстановления и работа у верстака сложились в приём: подгонка рабочей детали. При следующем восстановлении оплаченный инструмент можно приспособить за два рабочих действия вместо трёх.','skill');}return true;
}
export function fitWorkingPart(s,a,o,actor=s.hero.lineage){
 if(!on(s)||craftPractice(s,actor)?.method?.id!==method||!o.repair?.materials||o.repair.remaining<=0||o.repair.part?.state==='fitted')return false;
 // The original repair owner has already paid18 and consumed its real tool once.
 // This part is that paid material inside this room, never another inventory item.
 const r=o.repair;r.part={id:`${o.id}/part/${o.damagedAt}`,state:'fitted',actor,payer:r.payer,damageAt:o.damagedAt,tick:s.tick};r.remaining=Math.max(1,r.remaining-1);
 o.lastFittedPart={...r.part};return true;
}
export function npcCraftStudyPlan(s,p){
 if(!on(s)||!skillBranchesEnabled(s)||!p.alive||p.needs?.sleeping||p.health<(p.maxHealth||100)*.75||(p.needs?.energy??100)<45||(p.needs?.hunger??0)>=60)return null;
 const state=craftPractice(s,p.id);if(!state||state.method||state.total<3||!(p.agenda.job==='artisan'||p.agenda.curiosity>=.65))return null;
 const a=s.areas[p.area],o=ownedWorkshopSite(s,a,p.id)?.object;
 return o&&o.owner===p.id&&o.state==='intact'&&workToolReady(s,o)?{kind:'craftStudy',target:a.id,x:o.x,remaining:state.study?.remaining||3,property:o.id}:null;
}
export function npcCraftStudyAction(s,p,t){
 const state=craftPractice(s,p.id),a=s.areas[p.area],site=workshopSite(s,a,t.property),o=site?.object;
 if(!on(s)||!skillBranchesEnabled(s)||!p.alive||!state||state.total<3||state.method||!o||o.owner!==p.id||o.state!=='intact'||!workToolReady(s,o)||p.needs.energy<20){p.agenda.task=null;p.agenda.due=s.tick+48;return {consumed:false};}
 const pos=workshopPosition(s,site.area,o);if(p.area!==pos.area||physicalDistance(a,p.x,pos.x)>9)return {consumed:false};
 state.study ||= {remaining:3,source:state.operations.slice(-3).map(e=>e.id),started:s.tick};state.study.remaining--;t.remaining=state.study.remaining;p.needs.energy=Math.max(0,p.needs.energy-2);
 if(state.study.remaining<=0){finishCraftStudy(s,p.id);p.agenda.task=null;p.agenda.due=s.tick+48;return {consumed:true,learned:true};}
 return {consumed:true};
}
