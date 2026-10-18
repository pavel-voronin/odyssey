import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {stableAffairChoice} from './affair-choice.js';
import {relatedPeople,localContact} from './npc-contacts.js';
import {npcKnownRoute} from './npc-knowledge.js';
import {npcController} from './npc-control.js';
import {npcForgePlan,forgingEnabled} from './forging.js';
import {mentorEnabled} from './mentor-memory.js';
import {mentorJourneyPlan,pauseMentorJourney} from './mentor-journey.js';
import {npcItemRepairPlan} from './item-repair.js';
import {npcRefitPlan} from './knife-refit.js';
import {fieldMedicineCost} from './skill-branches.js';
import {consumeCarriedSupplies} from './stores.js';
import {workshopSite} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {postponedCompanionAffair,companionAffairsEnabled} from './companion-affair-state.js';

export const NPC_DEED_POLICY={sight:24,contact:9,medicinePrice:4,ordinaryDose:2,energy:3,history:12};
const on=s=>enabled(s,'npc-intentions');
const pending=c=>c&&['known','active'].includes(c.status);
const eligible=(s,p)=>p?.alive&&p.agenda&&p.role!=='ребёнок'&&!selfDrivenActor(s,p.id)&&(p.agenda.job==='artisan'||p.npcIntentions||p.familyNeeds||companionAffairsEnabled(s)&&p.status==='withHero'&&p.personalJourney?.kind==='seekMentor'&&p.personalJourney.status==='active');
const personal=(s,p)=>eligible(s,p)&&npcController(s,p)==='personal';
const ownReady=p=>p.health>=(p.maxHealth||100)*.8&&!p.ailment&&!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<55;
const ensure=p=>p.npcIntentions ||= {version:1,current:null,paused:{},history:[],lastActionTick:-1,lastDecisionTick:-1};
const familyState=p=>p.familyNeeds ||= {version:1,serial:0,cases:{},history:[]};
const order=p=>p.forging?.orders[p.forging.active];
const learning=p=>p.personalJourney?.status==='active'?p.personalJourney:null;
const familyCase=(p,id)=>Object.values(p.familyNeeds?.cases||{}).find(c=>c.id===id);
const familyTask=t=>['familySupply','familyAid'].includes(t?.kind);
function note(s,p,text,ctx){p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();if(s.hero.lineage===p.id||!s.hero.transit&&s.hero.area===p.area&&physicalDistance(s.areas[p.area],s.hero.x,p.x)<=40)ctx.log(s,text,'plan');}
function remember(s,p,kind,from,to,reason){const n=ensure(p);n.history.push({tick:s.tick,kind,from:from||null,to:to||null,reason});if(n.history.length>NPC_DEED_POLICY.history)n.history.shift();}
function closeFamily(s,p,c,status,reason){c.status=status;c.ended=s.tick;c.reason=reason;}
function familyEpisode(s,p,relative,body){
 const q=familyState(p),old=q.cases[relative.id];if(old){q.history.push({id:old.id,person:old.person,status:old.status,ended:old.ended||s.tick,supplied:old.receipt?.medicine||0});if(q.history.length>8)q.history.shift();}
 const c={id:p.id+'/family/'+(++q.serial),person:relative.id,name:relative.name,area:body.area,x:body.x,health:relative.health,maximum:relative.maxHealth||100,ailment:relative.ailment||null,status:'known',since:s.tick,seen:s.tick,source:{kind:'sight',observer:p.id,tick:s.tick},revision:0,decision:null,purchases:[]};q.cases[relative.id]=c;return c;
}
// Real nearby contacts, not a scan of distant relatives' private health.
export function observeNPCFamilyNeeds(s,p){
 if(!on(s)||!eligible(s,p)||!enabled(s,'npc-contacts')||!enabled(s,'lineage')||!s.areas[p.area])return;
 const at=localContact(s,p.id,p.area)||p;
 for(const contact of p.navigation?.contacts||[]){
  if(!contact.relative||contact.area!==at.area)continue;const b=localContact(s,contact.person,at.area),r=b?.person;
  if(!r||!relatedPeople(p,r)||physicalDistance(s.areas[at.area],at.x,b.x)>NPC_DEED_POLICY.sight)continue;
  const old=p.familyNeeds?.cases[r.id],wounded=r.health<(r.maxHealth||100)*.75||Boolean(r.ailment);
  if(!wounded){if(pending(old))closeFamily(s,p,old,'unneeded','При встрече видно: срочная помощь уже не нужна.');continue;}
  if(old&&!pending(old)&&!(s.tick-(old.ended||old.seen)>=240&&(r.health<(r.maxHealth||100)*.35||r.health<old.health-5||r.ailment!==old.ailment)))continue;
  if(!old&&Object.values(p.familyNeeds?.cases||{}).filter(pending).length>=4)continue;
  const c=pending(old)?old:familyEpisode(s,p,r,b),band=n=>n<.35?2:n<.55?1:0;
  if(c.area!==b.area||band(c.health/c.maximum)!==band(r.health/(r.maxHealth||100))||c.ailment!==(r.ailment||null))c.revision++;
  Object.assign(c,{area:b.area,x:b.x,health:r.health,maximum:r.maxHealth||100,ailment:r.ailment||null,seen:s.tick});
 }
}
function knownRisk(s,p,path){
 if(!path.length)return 'Известного пути к родственнику сейчас нет.';
 if(path.some(id=>p.navigation?.places.find(k=>k.area===id)?.hazardUntil>s.tick))return 'Он помнит опасность на этой дороге и не обещает пройти её без помощи.';
 const a=s.areas[p.area];if(a?.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(a,p.x,e.x)<=NPC_DEED_POLICY.sight))return 'Рядом живая угроза. Он не станет вести семейную помощь через этот риск.';
 return null;
}
function medicineSource(s,p){
 const here=s.areas[p.area];if(here?.civic)return {area:here.id,stock:here.civic.medicine};
 const parent=here?.interior&&s.areas[here.interior.parent];
 // The familiar exterior has an address, not remotely readable stock.
 return parent?.civic&&npcKnownRoute(p,p.area,parent.id).length?{area:parent.id,stock:null}:null;
}
export function assessNPCFamily(s,p,c){
 const path=npcKnownRoute(p,p.area,c.area),stock=p.roadSupplies?.medicine||0,missing=Math.max(0,NPC_DEED_POLICY.ordinaryDose-stock),source=medicineSource(s,p);
 const reason=postponedCompanionAffair(s,p,c.id)||(!ownReady(p)?'Сначала нужно справиться со своими ранами, голодом или усталостью.':knownRisk(s,p,path)||(!enabled(s,'supply')?'Лечебные припасы сейчас недоступны.':missing&&(!source||source.stock!==null&&source.stock<missing||p.agenda.wealth<missing*NPC_DEED_POLICY.medicinePrice)?'Своей лечебной дозы нет, а местное лекарство пока недоступно по запасу или цене.':null));
 return {available:!reason,path,missing,source,reason:reason||'Известная семейная нужда важнее несрочной работы.',signature:JSON.stringify([c.revision,c.area,Math.floor(stock),Math.floor(p.agenda.wealth/4),ownReady(p),path,p.navigation?.places.filter(k=>k.hazardUntil>s.tick).map(k=>[k.area,k.hazardUntil]),source,reason])};
}
function taskDomain(p,t){
 if(!t)return null;if(familyTask(t))return 'family';if(['forgeSupply','forgeWork'].includes(t.kind))return 'manufacture';if(t.kind==='mentorLesson')return 'learning';if(t.personal&&t.kind==='visit')return 'journey';if(['refitBench','itemRepairBench'].includes(t.kind))return 'commission';if(['work','farm','learn','craftStudy','toolMend'].includes(t.kind))return 'occupation';return null;
}
// Only ephemeral references and weights. Domain orders, lessons, medication and
// family knowledge remain in their existing authoritative locations.
export function knownNPCDeeds(s,p){
 const list=[],q=order(p),g=learning(p),need=(p.maxHealth||100)*.75;
 if(q?.status==='working'){
  const site=workshopSite(s,p.area,q.workshop),bench=site?.room&&site.inside?site.room.interior.station:site?.object.x,visible=site?.area.id===q.area&&(!site.room||site.inside)&&physicalDistance(s.areas[p.area],p.x,bench)<=12;
  const knownAccess=site?.area.id===q.area&&(site.inside||p.area===site.area.id&&physicalDistance(s.areas[p.area],p.x,site.object.x)<=NPC_DEED_POLICY.sight),inaccessible=knownAccess&&(site.object.owner!==p.id||site.object.state!=='intact'||site.object.closed);
  const blocked=enabled(s,'workshop-tools')&&(p.mentorMemory?.need?.property===q.workshop||visible&&!workToolReady(s,site.object));
  list.push({domain:'manufacture',id:'manufacture/'+q.id,title:'Закончить собственный нож',importance:58,urgency:0,available:forgingEnabled(s)&&p.health>=need&&p.needs.energy>=35&&!blocked&&!inaccessible,reason:inaccessible?'При встрече видно: мастерская закрыта, повреждена или право доступа изменилось. Материал и работа сохранены.':blocked?'Известный зажим сломан. Материал сохранён; нужен доступный способ продолжить.':'Материал уже оплачен, и настоящие рабочие шаги сохранены.'});
 }
 if(g?.kind==='seekMentor'){
  const left=g.due-s.tick,urgency=left<=24?72:left<180?(180-left)*.25:0,id='learning/'+g.since+'/'+g.teacher,delay=postponedCompanionAffair(s,p,id);
  list.push({domain:'learning',id,title:'Продолжить оплаченное обучение',importance:36+g.lessons.length*10+(p.mentorMemory?.need?.property===g.property?16:0),urgency,available:!delay&&mentorEnabled(s)&&s.tick<=g.abandonAfter&&p.agenda.wealth>=3+(3-g.lessons.length)*g.fee&&npcKnownRoute(p,p.area,g.target).length>0,reason:delay||(g.lessons.length?'Оплаченные занятия остаются его знанием.':'У него есть известный наставник и собственная причина учиться.')});
 }else if(g?.kind==='visitKin')list.push({domain:'journey',id:'journey/'+g.since+'/'+g.person,title:'Продолжить семейный путь',importance:52,urgency:s.tick>=g.due?60:0,available:enabled(s,'companion-goals')&&npcKnownRoute(p,p.area,g.target).length>0,reason:'Прежняя договорённость о семейной встрече остаётся.'});
 for(const [key,record]of [['repair',p.itemRepairCommission],['refit',p.refitCommission]]){
  const client=record&&s.people[record.client],o=key==='repair'?client?.itemRepair?.orders[record.order]:client?.knifeRefit?.orders[record.order];
  if(o&&['material','working'].includes(o.status))list.push({domain:'commission',id:key+'/'+o.id,title:'Сохранить встречу с заказчиком',importance:62,urgency:o.deadline&&o.deadline-s.tick<180?40:0,available:key==='repair'?enabled(s,'item-wear'):enabled(s,'knife-refit'),reason:'Клиент уже оплатил работу; его материал и заказ сохраняются.'});
 }
 for(const c of Object.values(p.familyNeeds?.cases||{}))if(pending(c)){const assessment=assessNPCFamily(s,p,c),ratio=c.health/c.maximum;list.push({domain:'family',id:c.id,title:'Передать лекарство: '+c.name,importance:60+Math.max(-10,Math.min(10,(p.agenda.bonds[c.person]||0)*.2)),urgency:ratio<.35?96:ratio<.55?60:20,available:assessment.available,reason:assessment.reason,assessment});}
 list.push({domain:'occupation',id:'occupation/'+p.agenda.job+'/'+p.agenda.home,title:'Заниматься своей работой',importance:28+p.agenda.duty*16+(p.agenda.wealth<8?10:0),urgency:0,available:true,reason:'Повседневный заработок и мастерская тоже требуют времени.'});
 return list.map(d=>({...d,value:d.importance+d.urgency}));
}
function park(s,p,old,list){
 const t=p.agenda.task,domain=taskDomain(p,t);if(!t||domain==='family'||!domain)return;
 const ref=old?.domain===domain&&list.find(d=>d.id===old.id)||list.find(d=>d.domain===domain);if(!ref)return;
 const n=ensure(p);n.paused[ref.id]={domain,id:ref.id,task:t,parked:s.tick};p.agenda.task=null;
 if(domain==='learning')pauseMentorJourney(s,p);
}
function restoreTask(s,p,selected,list,ctx){
 const n=ensure(p);for(const [id,saved]of Object.entries(n.paused))if(!list.some(d=>d.id===id)){delete n.paused[id];remember(s,p,'outdated',id,null,'Прежнее дело больше не актуально; его доменные записи сохранены.');}
 const saved=n.paused[selected.id];if(!saved)return false;delete n.paused[selected.id];p.agenda.task=saved.task;p.agenda.due=s.tick;if(saved.task.target!==p.area)p.status='wandering';remember(s,p,'resumed',null,selected.id,'Прежнее дело ещё актуально. Можно продолжить сохранённые шаги.');note(s,p,`${p.name} возвращается к делу: ${selected.title}. Сделанные шаги и вложенное сохранены.`,ctx);return true;
}
function familyExecutor(s,p,c){const a=assessNPCFamily(s,p,c);return {kind:a.missing?'familySupply':'familyAid',target:a.missing?a.source.area:c.area,x:a.missing?68:c.x,remaining:1,family:c.id,deedId:c.id,knownNavigation:true};}
export function npcDeedAllows(s,p,domain){const n=p.npcIntentions;return !on(s)||!n?.current||n.current.domain===domain||domain==='learning'&&n.current.domain==='journey';}
export function bindNPCDeedTask(s,p){const n=p.npcIntentions,t=p.agenda.task;if(on(s)&&n?.current&&taskDomain(p,t)===n.current.domain)t.deedId=n.current.id;}
export function npcDeedsTick(s,p,ctx){
 if(!personal(s,p))return;
 const n=p.npcIntentions;
 if(!on(s)){if(familyTask(p.agenda.task)){p.agenda.task=null;if(n?.current?.domain==='family')n.current=null;const saved=n&&Object.values(n.paused)[0];if(saved){const list=knownNPCDeeds(s,p),ref=list.find(d=>d.id===saved.id&&d.available);if(ref)restoreTask(s,p,ref,list,ctx);}}return;}
 observeNPCFamilyNeeds(s,p);
 if(!n&&!Object.values(p.familyNeeds?.cases||{}).some(pending)&&!order(p)&&!learning(p))return;
 const state=ensure(p);if(state.lastDecisionTick>=s.tick||state.lastActionTick>=s.tick)return;state.lastDecisionTick=s.tick;
 if(p.agenda.task&&!taskDomain(p,p.agenda.task))return;
 const list=knownNPCDeeds(s,p);
 for(const d of list)if(d.domain==='family'&&!d.available){const c=familyCase(p,d.id);if(c.decision?.signature!==d.assessment.signature){c.decision={tick:s.tick,signature:d.assessment.signature,outcome:'deferred',reason:d.reason};remember(s,p,'refused',state.current?.id,d.id,d.reason);note(s,p,`${p.name} помнит о ${c.name}, но откладывает помощь: ${d.reason}`,ctx);}}
 const options=list.filter(d=>d.available).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id)),selected=stableAffairChoice(options,{current:state.current?.id,since:state.current?.since,tick:s.tick,locked:Boolean(p.agenda.task)});if(!selected)return;
 const changed=state.current?.id!==selected.id;
 if(changed){const old=state.current;if(p.agenda.task&&taskDomain(p,p.agenda.task)!==selected.domain){if(familyTask(p.agenda.task)){const c=familyCase(p,p.agenda.task.family);if(pending(c))c.status='known';p.agenda.task=null;}else park(s,p,old,list);}state.current={domain:selected.domain,id:selected.id,title:selected.title,since:s.tick,reason:selected.reason};remember(s,p,'selected',old?.id,selected.id,selected.reason);}
 if(selected.domain==='family'){
  if(familyTask(p.agenda.task)&&p.agenda.task.family!==selected.id){const previous=familyCase(p,p.agenda.task.family);if(pending(previous))previous.status='known';p.agenda.task=null;}
  const c=familyCase(p,selected.id);c.status='active';if(!familyTask(p.agenda.task)){if(p.agenda.task)park(s,p,state.current,list);p.agenda.task=familyExecutor(s,p,c);p.agenda.due=s.tick;if(p.agenda.task.target!==p.area)p.status='wandering';if(changed)note(s,p,`${p.name} откладывает несрочные дела ради ${c.name}. ${selected.reason}`,ctx);}
 }else if(!p.agenda.task){
  if(!restoreTask(s,p,selected,list,ctx)){
   if(selected.domain==='manufacture')p.agenda.task=npcForgePlan(s,p);
   else if(selected.domain==='learning'||selected.domain==='journey')mentorJourneyPlan(s,p,ctx);
   else if(selected.domain==='commission')p.agenda.task=npcItemRepairPlan(s,p)||npcRefitPlan(s,p);
  }
 }
 bindNPCDeedTask(s,p);
}
export function npcFamilyTarget(s,p,t){
 if(!familyTask(t))return true;const c=familyCase(p,t.family);if(!on(s)||!pending(c)){p.agenda.task=null;return false;}
 if(t.kind==='familyAid'){const b=localContact(s,c.person,p.area),distance=b&&physicalDistance(s.areas[p.area],p.x,b.x);if(b&&distance<=NPC_DEED_POLICY.sight){c.area=b.area;c.x=b.x;t.target=b.area;t.x=distance<=NPC_DEED_POLICY.contact?p.x:b.x;}}
 return true;
}
export function npcFamilyAction(s,p,t,ctx){
 const c=familyCase(p,t?.family),n=p.npcIntentions,a=s.areas[p.area];if(!on(s)||!personal(s,p)||!pending(c)||!ownReady(p)||!enabled(s,'supply')||!n||n.lastActionTick>=s.tick)return false;
 if(t.kind==='familySupply'){
  const quantity=Math.max(0,NPC_DEED_POLICY.ordinaryDose-(p.roadSupplies?.medicine||0)),cost=quantity*NPC_DEED_POLICY.medicinePrice;
  if(!a?.civic||p.area!==t.target||physicalDistance(a,p.x,68)>2||!quantity||a.civic.medicine<quantity||p.agenda.wealth<cost){p.agenda.task=null;p.agenda.due=s.tick+8;return false;}
  n.lastActionTick=s.tick;a.civic.medicine-=quantity;a.civic.treasury+=cost;setActorMoney(s,p,p.agenda.wealth-cost);p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.medicine=(p.roadSupplies.medicine||0)+quantity;p.needs.energy=Math.max(0,p.needs.energy-1);c.purchases.push({tick:s.tick,area:a.id,quantity,price:cost});if(c.purchases.length>4)c.purchases.shift();p.agenda.task={kind:'familyAid',target:c.area,x:c.x,remaining:1,family:c.id,deedId:c.id,knownNavigation:true};if(c.area!==p.area)p.status='wandering';note(s,p,`${p.name} покупает лекарство для семейной помощи за ◈${cost} из своих денег. Запас лечебницы уменьшился.`,ctx);return true;
 }
 if(t.kind!=='familyAid'||p.area!==t.target||physicalDistance(a,p.x,t.x)>2)return false;
 const b=localContact(s,c.person,p.area);if(!b||physicalDistance(a,p.x,b.x)>NPC_DEED_POLICY.contact){closeFamily(s,p,c,'missing','По известному адресу родственника не оказалось. Дальнейшая судьба пока неизвестна.');p.agenda.task=null;return false;}
 const patient=b.person,max=patient.maxHealth||100;
 if(patient.health>=max*.75&&!patient.ailment){closeFamily(s,p,c,'unneeded','При встрече помощь уже не нужна. Припасы остаются у владельца.');p.agenda.task=null;return false;}
 const amount=Math.max(0,fieldMedicineCost(s,patient.id)-(patient.roadSupplies?.medicine||0));
 if(!amount){closeFamily(s,p,c,'unneeded','У родственника уже есть своя лечебная доза. Дополнительные припасы не расходуются.');p.agenda.task=null;return false;}
 if(!consumeCarriedSupplies(p,null,'medicine',amount)){p.agenda.task=null;p.agenda.due=s.tick+8;return false;}
 n.lastActionTick=s.tick;p.needs.energy=Math.max(0,p.needs.energy-NPC_DEED_POLICY.energy);patient.roadSupplies ||= {food:0,medicine:0};patient.roadSupplies.medicine=(patient.roadSupplies.medicine||0)+amount;c.receipt={tick:s.tick,from:p.id,to:patient.id,medicine:amount};closeFamily(s,p,c,'supplied','Лекарство передано. Родственник сможет использовать его своим действием.');p.agenda.bonds[patient.id]=(p.agenda.bonds[patient.id]||0)+2;patient.agenda.bonds[p.id]=(patient.agenda.bonds[p.id]||0)+2;p.agenda.task=null;p.agenda.due=s.tick+8;
 note(s,p,`${p.name} передаёт ${patient.name} свою лечебную дозу. Это настоящие припасы; дальнейшее лечение займёт действие родственника. Прежние дела остаются в силе.`,ctx);return true;
}
