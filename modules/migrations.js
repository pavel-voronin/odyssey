import {structurallySound} from './building-condition.js';
import {migrationKnowledgeOn,localSettlement,migrationBody} from './migration-memory.js';
import {knownMigrationDestination,migrationKnownPath,migrationBelief,migrationHasFood,shareFamilyRoute,migrationTravelFood} from './migration-choice.js';
import {localContact} from './npc-contacts.js';
import {detailedActors} from '../actor-projection.js';
import {fieldMedicineCost} from './skill-branches.js';
import {goodsTaker,goodsPutter} from './goods.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {selfDrivenActor} from '../actor-projection.js';
import {isTown} from './common.js';
import {reserveCargo,depositCargo} from './stores.js';
import {npcController,canStartNPCActivity,markNPCDeparture} from './npc-control.js';

export function migrationArea(a){if(isTown(a)&&a.civic)a.exodus ||= {pressure:null,nextAttempt:0,departures:[]};}
export function initializeMigrations(s){s.migrations ||= {};s.nextMigration ??=0;}
const quakeHome=p=>{const h=p.structure?.history||[];return !structurallySound(p)&&h.findLastIndex(e=>e.kind==='earthquake')>h.findLastIndex(e=>e.kind==='repair');};
const present=(s,a)=>(a.population||[]).map(id=>s.people[id]).filter(p=>p?.alive&&p.area===a.id&&p.status==='resident');
function kin(a,b){return a.parents.includes(b.id)||b.parents.includes(a.id)||a.parents.some(id=>b.parents.includes(id));}
function safe(s,path){return path.length>0&&path.length<=9&&path.every(id=>!s.areas[id].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved));}
function family(s,a,leader){
  const people=present(s,a).filter(p=>!p.migration&&!selfDrivenActor(s,p.id));
  const children=people.filter(p=>p.role==='ребёнок'&&p.parents.includes(leader.id));
  const adults=people.filter(p=>p.id!==leader.id&&p.role!=='ребёнок'&&children.some(c=>c.parents.includes(p.id))).slice(0,1);
  if(!children.length&&!adults.length){const sibling=people.find(p=>p.id!==leader.id&&p.role!=='ребёнок'&&kin(leader,p)&&p.agenda?.duty<.7);if(sibling)adults.push(sibling);}
  return [leader,...adults,...children];
}
function destination(s,source,members,from,ctx,exclude=null){
  if(migrationKnowledgeOn(s)){const choice=knownMigrationDestination(s,source,members,from,exclude);return choice?{id:choice.a.id,name:choice.name,migrationChoice:choice}:null;}
  return Object.values(s.areas).filter(a=>a.id!==exclude&&isTown(a)&&a.id!==source.id&&(!source.city||a.city!==source.city)&&a.era===source.era&&a.civic?.food>=45&&a.civic.safety>=30&&present(s,a).length&&members.every(p=>safe(s,ctx.route(s,p.area||from,a.id)))).map(a=>{
    const relatives=present(s,a).filter(p=>members.some(m=>kin(m,p))).length;
    const jobs=members.some(p=>['artisan','merchant'].includes(p.agenda?.job))&&a.civic.treasury>=12?15:0;
    return{a,value:Math.min(3,relatives)*35+a.civic.food*.3+jobs-ctx.route(s,from,a.id).length*12};
  }).sort((a,b)=>b.value-a.value||a.a.id.localeCompare(b.a.id))[0]?.a;
}
function announce(s,g,text,ctx){
  g.history.push({tick:s.tick,text});if(g.history.length>16)g.history.shift();
  if(migrationKnowledgeOn(s)||g.knowledge||g.contactMemory){if(learnMigrationContact(s,g,s.hero))ctx.log(s,text,'migration');}
  else if(s.hero.area===g.source||s.hero.area===g.target||g.members.some(id=>s.people[id]?.area===s.hero.area))ctx.log(s,text,'migration');
}
function setTask(s,p,g){
  if(enabled(s,'npc-control')&&!['personal','migration'].includes(npcController(s,p)))return false;
  p.migration=g.id;p.status='wandering';p.agenda.task={kind:'resettle',target:g.target,x:42,remaining:1,migration:g.id,...(g.knowledge?{knownNavigation:true}:{})};p.agenda.due=s.tick;
  return true;
}
function depart(s,a,members,target,ctx){
  if(enabled(s,'npc-control')&&!members.every(p=>npcController(s,p)==='personal'&&canStartNPCActivity(s,p)))return false;
  if(target.migrationChoice&&!migrationHasFood(s,a,members,target.migrationChoice.path)){a.exodus.knowledgeWait={tick:s.tick,leader:members[0].id,reason:'need-food'};return false;}
  const id='migration-'+s.nextMigration++,cargo=reserveCargo(a,{food:members.length*2,medicine:members.some(p=>p.ailment)?2:0},{food:4,medicine:2},goodsTaker(s,{reason:'migration-departure'})),{food,medicine}=cargo;
  const g={id,status:'active',source:a.id,target:target.id,initialTarget:target.id,members:members.map(p=>p.id),carrier:members[0].id,cargo,arrivals:{},started:s.tick,lastRethink:s.tick,reason:a.exodus.pressure.reason,history:[]};
  if(target.migrationChoice){g.knowledge=planKnowledge(s,members,target);g.initialTargetName=target.name;shareFamilyRoute(s,members,target.migrationChoice.path);delete a.exodus.knowledgeWait;}
  s.migrations[id]=g;a.exodus.departures.push(id);if(a.exodus.departures.length>24)a.exodus.departures.shift();a.exodus.nextAttempt=s.tick+240;
  for(const p of members){setTask(s,p,g);markNPCDeparture(s,p,'migration');p.agenda.knowledge.push({tick:s.tick,text:`${p.name} покидает ${a.name}: ${g.reason}. Семья направилась в ${target.name}.`});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();}
  announce(s,g,`${members.slice(0,2).map(p=>p.name).join(', ')}${members.length>2?' и ещё '+(members.length-2)+' родных':''} уходят из ${a.name}: ${g.reason}. Взято ${food} еды и ${medicine} лекарств; впереди ${target.name}.`,ctx);
  return true;
}
function cancel(s,g,ctx){
  g.status=Object.keys(g.arrivals).length?'separated':'abandoned';g.ended=s.tick;
  for(const id of g.members){const p=s.people[id];if(p?.migration===g.id){delete p.migration;p.lastMigration=s.tick;if(p.agenda.task?.migration===g.id)p.agenda.task=null;if(p.status==='wandering')p.status='resident';}}
  stashCargo(s,g);
  announce(s,g,'Семейное переселение не удалось закончить. Оставшиеся в пути ищут новую опору там, где оказались.',ctx);
}
export function migrationArrived(s,p){
  const g=s.migrations[p.migration];if(!g||g.status!=='active')return false;
  if(migrationKnowledgeOn(s)){const place=localSettlement(s,p);if(!place||place.food<2||place.safety<20||!place.habitable){p.agenda.task=null;p.agenda.due=s.tick+48;if(g.knowledge)g.knowledge.waiting={tick:s.tick,reason:'actual-place-unsuitable'};return false;}}
  g.arrivals[p.id]={area:p.area,tick:s.tick};delete p.migration;p.lastMigration=s.tick;p.home=p.area;p.agenda.home=p.area;p.status='resident';return true;
}
export function migrationMeal(s,p,{skipPersonal=false}={}){
  if(!enabled(s,'migrations'))return false;
  if(!skipPersonal&&p.roadSupplies?.food>0){p.roadSupplies.food--;p.needs.hunger=Math.max(0,p.needs.hunger-48);p.needs.meals++;return true;}
  const g=s.migrations?.[p.migration];
  const carrier=s.people[g?.carrier];
  if(g?.status!=='active'||g.cargoLost||!carrier?.alive||carrier.area!==p.area||Math.abs(carrier.x-p.x)*areaScale(s.areas[p.area])>40||g.cargo.food<1)return false;
  g.cargo.food--;p.needs.hunger=Math.max(0,p.needs.hunger-48);p.needs.meals++;return true;
}
export function migrationAid(s,p,{skipPersonal=false}={}){
  if(!enabled(s,'migrations'))return false;
  const maximum=p.maxHealth||100;
  if(!skipPersonal&&p.roadSupplies?.medicine>=fieldMedicineCost(s,p.id)&&p.health<maximum*.75){p.roadSupplies.medicine-=fieldMedicineCost(s,p.id);p.health=Math.min(maximum,p.health+25);if(p.health>=maximum*.85)p.ailment=null;return true;}
  const g=s.migrations?.[p.migration];
  const carrier=s.people[g?.carrier];
  if(g?.status!=='active'||g.cargoLost||!carrier?.alive||carrier.area!==p.area||Math.abs(carrier.x-p.x)*areaScale(s.areas[p.area])>40||g.cargo.medicine<fieldMedicineCost(s,p.id)||p.health>=maximum*.75)return false;
  g.cargo.medicine-=fieldMedicineCost(s,p.id);p.health=Math.min(maximum,p.health+25);if(p.health>=maximum*.85)p.ailment=null;return true;
}
function unload(s,g){
  const carrier=s.people[g.carrier],a=s.areas[g.target];if(g.cargoLost||!carrier?.alive||carrier.area!==a.id||!a.civic)return;
  depositCargo(a,g.cargo,goodsPutter(s,{reason:'migration-arrival',actor:carrier.id}));
}
function stashCargo(s,g){
  const p=s.people[g.carrier];if(g.cargoLost||!p?.alive)return;
  p.roadSupplies ||= {food:0,medicine:0};
  for(const key of ['food','medicine']){p.roadSupplies[key]+=g.cargo[key];g.cargo[key]=0;}
}
export function migrationsTick(s,ctx){
  if(!enabled(s,'migrations')||!enabled(s,'people')||s.tick%16!==0)return;
  for(const g of Object.values(s.migrations)){
    if(g.status==='settled'){unload(s,g);continue;}if(g.status!=='active')continue;if(g.knowledge&&!migrationKnowledgeOn(s))continue;
    const carrier=s.people[g.carrier];
    if(!carrier?.alive&&!g.cargoLost){g.cargoLost={area:carrier?.area||g.source,tick:s.tick};const a=s.areas[g.cargoLost.area];a.objects.push({id:'lost-'+g.id,kind:'lostSupplies',migration:g.id,name:'Потерянная поклажа переселенцев',x:carrier?.x||42});}
    const pending=g.members.map(id=>s.people[id]).filter(p=>p?.alive&&!g.arrivals[p.id]);
    if(!pending.length){g.status=Object.keys(g.arrivals).length?'settled':'lost';g.ended=s.tick;unload(s,g);stashCargo(s,g);announce(s,g,`${s.areas[g.source].name}: семейный путь окончен. ${Object.keys(g.arrivals).length} человек добрались до нового места.`,ctx);continue;}
    if(s.tick-g.started>2400){cancel(s,g,ctx);continue;}
    const newReport=migrationKnowledgeOn(s)&&pending.some(p=>{const n=migrationBelief(p,g.target);return n&&(n.received>g.lastRethink||n.received===g.lastRethink&&g.knowledge?.decided===g.lastRethink&&(n.serial||0)>(g.knowledge.evidence?.serial||0));});
    if(!Object.keys(g.arrivals).length&&(s.tick-g.lastRethink>=192||newReport||g.knowledge?.waiting?.reason==='actual-place-unsuitable'||g.knowledge?.waiting?.reason==='family-separated')&&!pending.every(p=>migrationKnowledgeOn(s)?personalPathReady(s,p,g.target):safe(s,ctx.route(s,p.area||g.source,g.target)))){
      g.lastRethink=s.tick;
      if(g.knowledge&&!pending.every(p=>p.area===pending[0].area&&Math.abs(p.x-pending[0].x)*areaScale(s.areas[p.area])<=12)){g.knowledge.waiting={tick:s.tick,reason:'family-separated'};const lead=pending[0];if(lead.agenda.task?.migration===g.id){lead.agenda.task=null;lead.agenda.due=s.tick+16;}}else{
      const target=destination(s,s.areas[g.source],pending,carrier?.area||g.source,ctx,g.target);
      if(target&&(!target.migrationChoice||migrationTravelFood(s,g,pending,target.migrationChoice.path))){g.initialTargetName ||= s.areas[g.initialTarget||g.target].name;g.target=target.id;if(target.migrationChoice){g.knowledge=planKnowledge(s,pending,target);shareFamilyRoute(s,pending,target.migrationChoice.path);}for(const p of pending)if(['resident','wandering'].includes(p.status))setTask(s,p,g);announce(s,g,`По новым личным сведениям семья меняет направление: ${target.name}.`,ctx);}
      else if(migrationKnowledgeOn(s)){if(g.knowledge)g.knowledge.waiting={tick:s.tick,reason:target?'need-food':'no-known-refuge'};for(const p of pending)if(p.agenda.task?.migration===g.id){p.agenda.task=null;p.agenda.due=s.tick+48;}}
      }
    }
    for(const p of pending)if(p.migration===g.id&&['resident','wandering'].includes(p.status)&&!p.agenda.task&&s.tick>=p.agenda.due&&(migrationKnowledgeOn(s)?personalPathReady(s,p,g.target):safe(s,ctx.route(s,p.area,g.target))))setTask(s,p,g);
  }
  for(const a of Object.values(s.areas)){
    const e=a.exodus;if(!e||a.civic===undefined)continue;
    const c=a.civic;let reason=null;
    if(c.earthquake&&a.facades?.profiles.some(quakeHome))reason='дом повреждён землетрясением';
    else if(c.food<22)reason='долгая нехватка еды';
    else if(c.crisis?.kind==='raid'&&c.safety<30&&s.areas[c.crisis.area]?.objects.some(o=>o.id===c.crisis.enemy&&o.alive&&!o.resolved))reason='дорогу и дома больше некому защитить';
    else if(c.crisis?.kind==='epidemic'&&c.medicine<2)reason='болезнь и отсутствие лекарств';
    if(reason){if(e.pressure?.reason!==reason)e.pressure={since:s.tick,reason};}
    else if(e.pressure?.reason==='дом повреждён землетрясением'&&!a.facades?.profiles.some(p=>!structurallySound(p)))e.pressure=null;
    else if(e.pressure?.reason==='долгая нехватка еды'&&c.food>=35||e.pressure?.reason==='дорогу и дома больше некому защитить'&&(c.crisis?.kind!=='raid'||c.safety>=45)||e.pressure?.reason==='болезнь и отсутствие лекарств'&&(c.crisis?.kind!=='epidemic'||c.medicine>=6))e.pressure=null;
    if(!e.pressure||s.tick-e.pressure.since<96||s.tick<e.nextAttempt)continue;
    e.nextAttempt=s.tick+96;
    const leaders=present(s,a).filter(p=>e.pressure.reason!=='дом повреждён землетрясением'||p.agenda.duty<.7&&a.facades.profiles.some(b=>(b.owner===p.id||a.objects.some(o=>o.building===b.id&&o.owner===p.id))&&quakeHome(b))).filter(p=>p.role!=='ребёнок'&&!selfDrivenActor(s,p.id)&&!p.migration&&(p.lastMigration===undefined||s.tick-p.lastMigration>2400)&&(p.agenda.duty<.9||c.food<8)).sort((p,q)=>Number(p.agenda.duty)-Number(q.agenda.duty));
    for(const p of leaders){const members=family(s,a,p),target=destination(s,a,members,a.id,ctx);if(target&&depart(s,a,members,target,ctx))break;if(!target&&migrationKnowledgeOn(s))a.exodus.knowledgeWait={tick:s.tick,leader:p.id,reason:'no-known-address'};}
  }
}

function planKnowledge(s,members,target){const choice=target.migrationChoice;return {version:1,leader:members[0].id,decided:s.tick,path:[...choice.path],evidence:choice.note?structuredClone(choice.note):null};}
function personalPathReady(s,p,to){const path=migrationKnownPath(s,p,p.area,to),note=migrationBelief(p,to);return path.length>0&&path.length<=9&&!(note&&s.tick-note.observed<=480&&(note.food<22||note.safety!==null&&note.safety<30||note.habitable===false));}
function learnMigrationContact(s,g,h){
 const observer=s.people[h?.lineage],body=observer&&migrationBody(s,observer);if(!h?.alive||!observer?.alive||!body||body.transit||h.combat||observer.needs.sleeping)return false;
 const member=g.members.find(id=>{const b=localContact(s,id,body.area);return b&&Math.abs(body.x-b.x)*areaScale(s.areas[body.area])<=12;});if(!member)return false;
 const contacts=(g.contactMemory ||= {version:1,contacts:{}}).contacts;
 if(!contacts[h.lineage])contacts[h.lineage]={person:member,area:body.area,tick:s.tick};return true;
}
export function migrationContactTick(s){if(!migrationKnowledgeOn(s))return;for(const g of Object.values(s.migrations))for(const h of detailedActors(s))if(!g.contactMemory?.contacts[h.lineage])learnMigrationContact(s,g,h);}
