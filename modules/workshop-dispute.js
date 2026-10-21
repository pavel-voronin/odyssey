import {careerRank} from './progression-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {localContact} from './npc-contacts.js';
import {npcController} from './npc-control.js';
import {reservedWorkshop} from './workshop-contract-state.js';
import {craftRespect} from './craft-respect.js';
import {profile,clamp} from './common.js';

const on=s=>['workshop-dispute','people','npc-control','property','property-damage','relationships'].every(id=>enabled(s,id));
const ended=new Set(['finished','expired','cancelled']);
const own=(s,id)=>s.people[id];
const site=(s,r,id)=>s.areas[r.area]?.objects.find(o=>o.id===r.properties[id]);
function uncommitted(s,o){return !o.repair&&!reservedWorkshop(s,o)&&!Object.values(s.workOrders||{}).some(c=>c.property===o.id&&['visiting','quoted','active'].includes(c.status));}
function viable(s,p){return Boolean(p?.alive&&p.role!=='ребёнок'&&p.status==='resident'&&!selfDrivenActor(s,p.id)&&npcController(s,p)==='personal'&&p.health>=(p.maxHealth||100)*.6&&!p.needs?.sleeping&&(p.needs?.energy??0)>=25&&(p.needs?.hunger??100)<65);}
function memory(p){return p.workshopTalk ||= {seen:[],frustration:0};}
function hear(s,r,text,ctx){
 for(const h of detailedActors(s))if(h.alive&&!h.transit&&h.area===r.area&&physicalDistance(s.areas[r.area],h.x,r.x)<=18){
  h.workshopTalk ||= {known:{}};h.workshopTalk.known[r.id]={id:r.id,area:r.area,seen:s.tick};
  const keys=Object.keys(h.workshopTalk.known).sort((a,b)=>h.workshopTalk.known[a].seen-h.workshopTalk.known[b].seen);for(const id of keys.slice(0,Math.max(0,keys.length-16)))delete h.workshopTalk.known[id];
  ctx.log?.(actorView(s,h),text,'work',r.area,{relay:false});
 }
 for(const id of r.people){const p=own(s,id);if(!p?.alive||p.area!==r.area||physicalDistance(s.areas[r.area],p.x,r.x)>18)continue;const m=p.agenda;(m.knowledge ||= []).push({tick:s.tick,text});if(m.knowledge.length>8)m.knowledge.shift();}
}
function trace(s,r,kind,details={}){r.history.push({tick:s.tick,kind,...details});if(r.history.length>16)r.history.shift();}
function release(s,r){for(const id of r.people){const p=own(s,id);if(p?.workshopTalk?.active===r.id)delete p.workshopTalk.active;}}
function close(s,r,status,reason,ctx){if(ended.has(r.status))return;r.status=status;r.ended=s.tick;r.reason=reason;release(s,r);trace(s,r,status,{reason});hear(s,r,reason,ctx);}
function start(s,p,o,ctx){
 const a=s.areas[p.area];if(!a?.civic||!(a.civic.tools>=1&&a.civic.tools<2)||!viable(s,p)||p.agenda.wealth<18||p.agenda.sociability<.3||!uncommitted(s,o)||physicalDistance(a,p.x,42)>18)return null;
 const options=a.objects.filter(b=>b.kind==='workshop'&&b.state==='burned'&&b.owner!==p.id&&uncommitted(s,b)).map(b=>({o:b,p:own(s,b.owner)})).filter(x=>viable(s,x.p)&&x.p.area===a.id&&!x.p.agenda.task&&x.p.agenda.wealth>=18&&!x.p.workshopTalk?.active&&physicalDistance(a,p.x,x.p.x)<=18&&physicalDistance(a,x.p.x,42)<=18).sort((a,b)=>a.p.id<b.p.id?-1:1);
 const q=options.find(x=>{const key=[o.id+'/'+o.damagedAt,x.o.id+'/'+x.o.damagedAt].sort().join('|');return !p.workshopTalk?.seen?.includes(key)&&!x.p.workshopTalk?.seen?.includes(key);});if(!q)return null;
 const signature=[o.id+'/'+o.damagedAt,q.o.id+'/'+q.o.damagedAt].sort().join('|');
 s.workshopDisputes ||= {};s.nextWorkshopDispute ??=0;
 const r={id:'workshop-talk-'+s.nextWorkshopDispute++,area:a.id,x:42,people:[p.id,q.p.id],properties:{[p.id]:o.id,[q.p.id]:q.o.id},damage:{[p.id]:o.damagedAt,[q.p.id]:q.o.damagedAt},signature,status:'meeting',created:s.tick,expires:s.tick+192,quotes:{},votes:{},completed:{},history:[],version:0,stockSeen:a.civic.tools};
 s.workshopDisputes[r.id]=r;for(const person of [p,q.p]){const m=memory(person);m.active=r.id;m.seen.push(signature);if(m.seen.length>16)m.seen.shift();}
 trace(s,r,'invited');hear(s,r,`${p.name}: «Обе мастерские повреждены, а инструмент остался один. Давай договоримся об очереди».`,ctx);return r;
}
function record(s,p){return s.workshopDisputes?.[p.workshopTalk?.active];}
function task(p,r,kind='workshopTalk'){p.agenda.task={kind,target:r.area,x:r.x,remaining:1,dispute:r.id};}
export function npcDisputePlan(s,p,o,ctx){
 if(!on(s))return false;let r=record(s,p);
 if(r&&!ended.has(r.status)){
  if(['meeting','offered'].includes(r.status)){task(p,r);return true;}
  if(['agreed','partial'].includes(r.status)&&p.id!==r.first&&!r.completed[p.id]){
   const first=site(s,r,r.first),quote=r.quotes[p.id];
   if(s.tick<quote.deadline&&!(s.areas[r.area].civic.tools>=1&&(first?.repair?.materials||r.completed[r.first]))){task(p,r,'workshopWait');return true;}
  }
  return false;
 }
 r=start(s,p,o,ctx);if(!r)return false;task(p,r);return true;
}
function together(s,r){return r.people.every(id=>{const p=own(s,id),body=localContact(s,id,r.area);return viable(s,p)&&body&&physicalDistance(s.areas[r.area],body.x,r.x)<=9;});}
function makeQuote(s,p,r){
 const helpers=detailedActors(s).filter(h=>selfDrivenActor(s,h)&&h.area===r.area&&!h.transit&&!h.combat&&physicalDistance(s.areas[r.area],h.x,r.x)<=18&&careerRank(h)>=2&&['craft','time'].includes(profile(h).skill)&&craftRespect(s,p.id,h.lineage)>=6).map(h=>h.lineage);
 return {at:s.tick,price:18,deadline:s.tick+(p.agenda.duty>=.75||p.agenda.wealth<24?56:160),canHire:p.agenda.wealth>=30&&p.agenda.duty<=.75,helpers};
}
function acceptQueue(s,p,r){
 const q=r.quotes[p.id];if(p.agenda.wealth<q.price)return {yes:false,reason:'не хватает собственных денег на объявленную цену'};
 if(p.id===r.first)return {yes:true,reason:'согласен первым купить материал за свои деньги'};
 if(q.deadline-s.tick<48||p.agenda.duty>=.8)return {yes:false,reason:'собственная мастерская нужна слишком скоро'};
 if((p.agenda.bonds?.[r.first]||0)<-20)return {yes:false,reason:'не доверяет обещанной очереди'};
 return {yes:true,reason:'может ждать пополнения до своего срока'};
}
export function npcDisputeAction(s,p,t,ctx){
 const r=s.workshopDisputes?.[t.dispute];
 if(!on(s)||!r||ended.has(r.status)||p.area!==r.area||!r.people.includes(p.id)){p.agenda.task=null;p.agenda.due=s.tick+8;return true;}
 if(t.kind==='workshopWait'){
  p.agenda.task=null;p.agenda.due=s.tick+8;return true;
 }
 if(!together(s,r))return true;
 if(r.status==='meeting'){
  if(!r.quotes[p.id]){r.quotes[p.id]=makeQuote(s,p,r);p.needs.energy=Math.max(0,p.needs.energy-1);trace(s,r,'quoted',{person:p.id});hear(s,r,`${p.name}: «Свой материал оплачу за ◈18. ${r.quotes[p.id].deadline-s.tick<80?'Долго ждать не могу.':'Могу немного подождать очередь.'}»`,ctx);}
  if(r.people.every(id=>r.quotes[id])){r.first=[...r.people].sort((a,b)=>r.quotes[a].deadline-r.quotes[b].deadline||(a<b?-1:1))[0];r.status='offered';r.voteAt=s.tick+8;trace(s,r,'proposed',{first:r.first});}
  return true;
 }
 if(r.status==='offered'){
  if(s.tick<r.voteAt||r.votes[p.id])return true;
  const vote=acceptQueue(s,p,r);r.votes[p.id]={...vote,at:s.tick,version:r.version};p.needs.energy=Math.max(0,p.needs.energy-1);trace(s,r,'answered',{person:p.id,...vote});hear(s,r,`${p.name}: ${vote.reason}.`,ctx);
  if(!vote.yes){r.status='refused';r.refused=p.id;r.resolvedAt=s.tick;release(s,r);hear(s,r,'Об очереди не договорились. Каждый будет искать материал сам.',ctx);}
  else if(r.people.every(id=>r.votes[id]?.yes)){r.status='agreed';r.agreed=s.tick;hear(s,r,`${own(s,r.first).name} первым попробует купить оставшийся инструмент. Второй согласился ждать пополнения.`,ctx);}
 }
 if(!['meeting','offered'].includes(r.status)){p.agenda.task=null;p.agenda.due=s.tick+8;}return true;
}
export function workshopDisputesTick(s,ctx){
 if(!on(s))return;
 for(const r of Object.values(s.workshopDisputes||{})){
  if(ended.has(r.status))continue;
  if(r.people.some(id=>!own(s,id)?.alive||!site(s,r,id)||site(s,r,id).owner!==id||site(s,r,id).damagedAt!==r.damage[id])){close(s,r,'cancelled','Условия прежнего ремонта изменились. Разговор об очереди закончен.',ctx);continue;}
  if(s.tick>r.expires){close(s,r,'expired','Срок ожидания вышел. Владельцы возвращаются к своим делам.',ctx);}
 }
 const completed=Object.values(s.workshopDisputes||{}).filter(r=>ended.has(r.status));for(const r of completed.slice(0,Math.max(0,completed.length-32)))delete s.workshopDisputes[r.id];
}
export function recordDisputeRepair(s,a,o,proof,ctx){
 const event=o.history?.at(-1);
 if(o.state!=='intact'||!a.objects.includes(o)||event?.kind!=='repair'||event.tick!==s.tick||event.actor!==proof.actor||event.damageAt!==proof.damageAt)return;
 for(const r of Object.values(s.workshopDisputes||{})){
  if(ended.has(r.status)||r.area!==a.id||r.completed[o.owner]||r.properties[o.owner]!==o.id||r.damage[o.owner]!==proof.damageAt)continue;
  r.completed[o.owner]={tick:s.tick,actor:proof.actor,payer:proof.payer};trace(s,r,'actual-repair',{owner:o.owner,actor:proof.actor});
  const other=r.people.find(id=>id!==o.owner),loser=own(s,other),hero=r.hero&&s.actorStates[r.hero];
  if(!r.completed[other]&&loser?.alive){const m=memory(loser);m.frustration=Math.min(12,m.frustration+2);m.lastLoss={case:r.id,tick:s.tick,cause:'scarce-material',first:o.owner};if(hero)(loser.agenda.bonds ||= {})[hero.lineage]=clamp((loser.agenda.bonds[hero.lineage]||0)-1,-100,100);}
  if(hero&&proof.actor!==hero.lineage){const p=own(s,o.owner);(p.agenda.bonds ||= {})[hero.lineage]=clamp((p.agenda.bonds[hero.lineage]||0)+1,-100,100);}
  r.status=r.people.every(id=>r.completed[id])?'finished':'partial';if(r.status==='finished'){r.ended=s.tick;release(s,r);}
  hear(s,r,r.status==='partial'?`${own(s,o.owner).name} снова может работать. Мастерская ${own(s,other)?.name||'соседа'} пока повреждена.`:'Обе мастерские восстановлены. Владельцы могут вернуться к работе.',ctx);
 }
}
export function workshopDisputePlan(s,ctx){
 if(!on(s))return false;const h=s.hero;if(h.goal||h.combat||h.transit)return false;
 for(const known of Object.values(h.workshopTalk?.known||{})){
  if(known.area!==h.area||known.handled)continue;const r=s.workshopDisputes?.[known.id];if(!r||r.status!=='offered'||r.hero||!together(s,r)||physicalDistance(s.areas[r.area],h.x,r.x)>18)continue;
  const skill=profile(h).skill,social=r.people.some(id=>(h.relations[id]?.trust||0)>=15);
  if(h.personality.generosity<.35&&h.gold>24||!['parley','craft','time'].includes(skill)&&!social){known.handled=true;known.choice='abstained';continue;}
  ctx.goal(s,'workshopTalk',r.area,r.x,'Обсудить очередь ремонта','Две понятные нужды встретились с одним инструментом. Каждый владелец всё ещё может отказаться.',{dispute:r.id});return true;
 }
 return false;
}
export function workshopDisputeAction(s,ctx){
 const h=s.hero,r=s.workshopDisputes?.[h.goal?.dispute];h.goal=null;
 if(!on(s)||!r||r.area!==h.area||r.status!=='offered'||r.hero||Object.keys(r.votes).length||!together(s,r)||physicalDistance(s.areas[r.area],h.x,r.x)>9)return false;
 const score=id=>(h.relations[id]?.trust||0)*.6+(r.quotes[id].deadline-s.tick<80?15:0)+(r.quotes[id].canHire&&r.quotes[id].helpers.includes(h.lineage)?6:0);
 r.first=[...r.people].sort((a,b)=>score(b)-score(a)||(a<b?-1:1))[0];r.hero=h.lineage;r.version++;r.voteAt=s.tick+8;h.lastAction='talk';
 const q=r.quotes[r.first],help=q.canHire&&q.helpers.includes(h.lineage);r.heroChoice=help?'help-first':'mediate';h.workshopTalk.known[r.id].handled=true;
 trace(s,r,'mediated',{actor:h.lineage,first:r.first,choice:r.heroChoice});hear(s,r,`${h.name} предлагает начать с мастерской ${own(s,r.first).name}.${help?' Он готов взяться за ремонт за плату.':''} Владельцам ещё предстоит согласиться.`,ctx);return true;
}
