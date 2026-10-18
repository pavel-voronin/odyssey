import {enabled} from '../rules.js';
import {physicalDistance,areaOffset,campPassage} from '../geometry.js';
import {campActivityAvailable,reserveCampActivity,safeCampActivity} from './camp-session.js';
import {craftPractice,finishCraftStudy} from './craft-practice.js';
import {profile} from './common.js';
import {skillBranchesEnabled} from './skill-branches.js';
import {npcAction,npcController} from './npc-control.js';
import {localContact} from './npc-contacts.js';
import {partyAvailable} from './party-needs.js';

const method='fit-working-part',phase='camp-study';
const on=s=>['camp-lesson','craft-practice','property','property-damage','companions','fieldcamp','npc-control'].every(id=>enabled(s,id));
// The rest goal remains the executor. Its presentation resumes on the next
// real resting turn, including when learning was disabled or interrupted.
export function restoreCampRestView(s){
 const h=s.hero,r=h.campLesson;if(h.goal?.kind==='rest'&&h.action==='УРОК'&&r?.restView&&r.lastTick<s.tick)Object.assign(h,r.restView);
}
function ready(s,p){
 const h=s.hero;if(!p?.alive||p.role==='ребёнок')return false;
 if(p.id===h.lineage)return h.hp>=h.maxHp*.8&&h.energy>=40&&h.hunger<55;
 const c=h.companions.find(c=>c.person===p.id),body=localContact(s,p.id,h.area);
 return Boolean(c&&c.hp>=c.maxHp*.8&&c.loyalty>=35&&body&&physicalDistance(s.areas[h.area],h.x,body.x)<=9&&npcController(s,p)==='party'&&partyAvailable(s,c)&&!p.needs?.sleeping&&p.health>=(p.maxHealth||100)*.8&&(p.needs?.energy??0)>=40&&(p.needs?.hunger??100)<55);
}
function interested(s,p){
 const h=s.hero,state=craftPractice(s,p.id);if(!state||state.total<3||state.method)return false;
 if(p.id===h.lineage)return (skillBranchesEnabled(s)||['craft','time'].includes(profile(h).skill))&&(h.career.path==='peaceful'||h.personality.curiosity>=.65);
 return (skillBranchesEnabled(s)||p.agenda?.job==='artisan')&&(p.agenda?.curiosity??0)>=.55;
}
function agrees(s,p){
 const h=s.hero;if(p.id===h.lineage)return h.personality.generosity>=.55;
 const c=h.companions.find(c=>c.person===p.id);return Boolean(c&&c.ethics>=0&&(p.agenda?.sociability??0)>=.3&&(h.relations[p.id]?.trust??0)>=0);
}
function knife(p){const k=p?.localFood?.tools?.knife;return k?.id&&k.owner===p.id&&k.kind==='knife'&&k.state==='working'?k:null;}
function quiet(s){
 const h=s.hero,a=s.areas[h.area];if(!safeCampActivity(s))return false;
 const hostile=(area,x)=>area.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(area,o.x,x)<28);
 if(hostile(a,h.x))return false;
 const parent=s.areas[a.temporaryCamp.parent],passage=parent&&campPassage(s,a.id,parent.id);return !parent||!passage?.allowed||!hostile(parent,passage.arrival);
}
function phaseReady(s,p){
 const owner=p.id===s.hero.lineage?'actor':'party',r=p.actionControl;
 return npcController(s,p)===owner&&(r?.tick!==s.tick||r.owner===owner&&!r.phases.includes(phase)&&r.phases.length<4);
}
function pairReady(s,teacher,pupil){return ready(s,teacher)&&ready(s,pupil)&&agrees(s,teacher)&&craftPractice(s,teacher.id)?.method?.id===method&&interested(s,pupil)&&phaseReady(s,teacher)&&phaseReady(s,pupil);}
function resources(teacher,pupil){
 const owner=[pupil,teacher].find(p=>knife(p)),material=[pupil,teacher].find(p=>(p.agenda?.tools||0)>=1);
 return owner&&material?{tool:knife(owner),owner,material}:null;
}
function spendTurn(s,p){
 const h=s.hero,npc=p.id!==h.lineage;
 if(!npcAction(s,p,npc?'party':'actor',phase))throw Error('Camp lesson lost its synchronous action reservation');
 if(npc)p.needs.energy=Math.max(0,p.needs.energy-2);else h.energy=Math.max(0,h.energy-2);
}
function pause(s,r,reason,ctx){
 if(r.status!=='paused'||r.reason!==reason){r.status='paused';r.reason=reason;ctx.log(s,`Дорожный урок прерван: ${reason}. Сделанные шаги сохраняются.`,'skill');}
 return false;
}
function choosePair(s){
 const h=s.hero,hero=s.people[h.lineage],people=h.companions.map(c=>s.people[c.person]).filter(Boolean).sort((a,b)=>a.id.localeCompare(b.id));
 for(const p of people)for(const [teacher,pupil]of [[p,hero],[hero,p]])if(pairReady(s,teacher,pupil)&&resources(teacher,pupil))return {teacher,pupil};
 return null;
}
export function campLesson(s,ctx){
 if(!on(s))return false;const h=s.hero,a=s.areas[h.area];if(!a?.temporaryCamp||h.goal?.kind!=='rest')return false;
 let r=h.campLesson;
 if(r&&(r.number!==h.counters.camps||r.area!==a.id)){if(r.status!=='done')r.status='left';h.campLesson=null;r=null;}
 if(r?.lastTick>=s.tick||r?.status==='done')return false;
 if(!quiet(s))return r?pause(s,r,'сейчас нужны безопасность и отдых',ctx):false;
 if(!r){
  if(!campActivityAvailable(h))return false;
  const pair=choosePair(s);if(!pair)return false;const {teacher,pupil}=pair,stock=resources(teacher,pupil);
  // Both action claims are checked before a reservation, material or study is
  // changed. No intervening controller runs between the checks and commitments.
  if(!stock||!pairReady(s,teacher,pupil)||!reserveCampActivity(h,'camp-lesson'))return false;
  stock.material.agenda.tools--;
  const id=`${a.id}/practice/${h.lineage}/${h.counters.camps}`;
  const part={id,kind:'practicePart',name:'Учебная рабочая деталь',x:Math.max(0,Math.min(100,h.x+areaOffset(a,6))),owner:pupil.id,teacher:teacher.id,material:{person:stock.material.id,kind:'tools',quantity:1,tick:s.tick},state:'unfinished'};
  a.objects.push(part);
  r=h.campLesson={id,area:a.id,number:h.counters.camps,teacher:teacher.id,pupil:pupil.id,part:id,tool:stock.tool.id,toolOwner:stock.owner.id,started:s.tick,status:'active',actions:0,restView:{intent:h.intent,reason:h.reason,action:h.action}};
  const state=craftPractice(s,pupil.id);state.study ||= {remaining:3,source:state.operations.slice(-3).map(e=>e.id),started:s.tick};
  ctx.log(s,`${teacher.name} предлагает ${pupil.name} подогнать настоящую заготовку у костра. На неё расходуется один личный материал; нож уже есть у ${stock.owner.name}.`,'skill');
 }
 const teacher=s.people[r.teacher],pupil=s.people[r.pupil],part=a.objects.find(o=>o.id===r.part),tool=knife(s.people[r.toolOwner]);
 if(!part||part.owner!==r.pupil||part.state!=='unfinished'||physicalDistance(a,h.x,part.x)>9||!tool||tool.id!==r.tool)return pause(s,r,'деталь или прежний нож недоступны',ctx);
 if(!pairReady(s,teacher,pupil))return pause(s,r,'учитель или ученик не готовы продолжать вместе',ctx);
 const state=craftPractice(s,pupil.id);if(!state.study||state.study.remaining<=0)return pause(s,r,'прежняя учебная работа изменилась',ctx);
 spendTurn(s,teacher);spendTurn(s,pupil);tool.uses=(tool.uses||0)+1;r.status='active';r.reason=null;r.lastTick=s.tick;r.actions++;part.lastWork=s.tick;state.study.remaining--;
 h.lastAction='work';h.action='УРОК';h.intent='Подгонка детали у костра';h.reason=`${teacher.name} показывает приём ${pupil.name}. Это время совместной практики вместо отдыха.`;
 if(state.study.remaining<=0){
  if(!finishCraftStudy(s,pupil.id,{teacher:teacher.id,teacherName:teacher.name,lesson:r.id}))throw Error('Completed camp study lost its canonical practice');r.status='done';r.completed=s.tick;part.state='demonstration';part.finished=s.tick;
  ctx.log(s,`${pupil.name} осваивает подгонку рабочей детали у ${teacher.name}. При настоящем оплаченном восстановлении этот приём сбережёт одно рабочее действие.`,'skill');
 }
 return true;
}
