import {physicalDistance} from '../geometry.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {carriedFood} from './stores.js';
import {packView} from './container-state.js';
import {structurallySound,structureRecord} from './building-condition.js';
import {residenceAdmission} from './residence-access.js';
import {ruinRecoveryOn,ruinRight,repairRaw,observeOwnRuins,ruinActor,ruinHere,ruinReady} from './ruin-return-state.js';
import {RUIN_TASKS as labels} from '../npc-labels.js';
const body=(s,p)=>ruinActor(s,p)||p;
const material=p=>p.goodsRawCargo?.owner===p.id?p.goodsRawCargo.quantity:0;
function refuse(s,p,n,reason){p.ruinRefusal={area:n.area,building:n.building,at:s.tick,reason};p.ruinAfter=s.tick+96;return null;}
function choice(s,p){
 if(!ruinRecoveryOn(s)||!ruinReady(s,p))return null;observeOwnRuins(s,p);if((p.ruinAfter||0)>s.tick)return null;const b=body(s,p),here=s.areas[b.area],intent=p.ruinIntent;
 const notes=Object.values(p.ruinMemory||{}).sort((a,b)=>Number(b.building===intent?.building)-Number(a.building===intent?.building)||Number(b.right==='owner')-Number(a.right==='owner')||b.seen-a.seen);
 for(const n of notes){const fresh=s.tick-n.seen<=480;
  if(b.area!==n.area&&b.area!==n.room){const comfortable=here?.civic?.food>=16&&here.facades?.profiles.some(structurallySound),need=2*(Math.max(0,2-n.roof)+Math.max(0,2-n.walls));if(comfortable&&!intent)return refuse(s,p,n,'settled');if(!n.safe||(!fresh||n.food<2)&&carriedFood(p,b.inventory)<2)return refuse(s,p,n,'unsafe-or-food');if(need&&(material(p)<need||p.agenda.tools<1))return refuse(s,p,n,'material');const path=npcKnownRoute(p,b.area,n.area,knownNPCHazards(s,p));if(path.length<2||path.length>9||carriedFood(p,b.inventory)<Math.max(1,Math.ceil((path.length-1)/3)))return refuse(s,p,n,'route-or-food');return {n,stage:'inspect',target:n.area,x:n.x};}
  const a=s.areas[n.area];if(n.right==='founder'&&p.home===a.dwellingPlot?.house?.room&&residenceAdmission(s,s.areas[p.home],p.id)&&structurallySound(a.facades?.profiles.find(b=>b.id===n.building)))continue;const profile=a.facades?.profiles.find(x=>x.id===n.building),right=ruinRight(s,p,a,n.building);if(!right||!profile)return refuse(s,p,n,'right');
  if(a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(a,e.x,n.x)<28))return refuse(s,p,n,'unsafe-or-food');
  const r=a.ruinWorks?.projects[n.building];if(r&&r.completed===null){const extra=Math.max(0,repairRaw(profile)-r.raw);if(extra&&material(p)<extra)return refuse(s,p,n,'material');return {n,stage:extra?'reinforce':'work',target:a.id,x:n.x};}
  if(!structurallySound(profile)){const need=repairRaw(profile);if(material(p)>=need&&p.agenda.tools>=1)return {n,stage:'supply',target:a.id,x:n.x};
   // Another already owned ruined object may supply finite parts to this repair.
   const other=notes.find(x=>x.area===a.id&&x.building!==n.building&&(x.roof<2||x.walls<2)&&(x.roof+x.walls)>0&&ruinRight(s,p,a,x.building)?.kind==='owner');if(other){p.ruinIntent={area:a.id,building:n.building,at:s.tick};return {n:other,stage:'salvage',target:a.id,x:other.x};}return refuse(s,p,n,'material');}
  if(p.home!==right.room&&right.room)return {n,stage:'enter',target:right.room,x:8};if(!right.room&&p.home!==a.id)return {n,stage:'settle',target:a.id,x:n.x};
 }
 return null;
}
export function ruinReturnNPCTask(s,p){const c=choice(s,p);if(!c)return null;if(body(s,p).area!==c.target)p.status='wandering';return p.agenda.task={kind:'homeBuildWork',target:c.target,x:c.x,remaining:1,ruin:{area:c.n.area,building:c.n.building,stage:c.stage},knownNavigation:true};}
function history(r,e){r.history.push(e);if(r.history.length>16)r.history.shift();}
export function ruinSalvage(s,p,a,building){
 if(!ruinRecoveryOn(s)||!ruinReady(s,p)||ruinRight(s,p,a,building)?.kind!=='owner')return false;const profile=a.facades?.profiles.find(x=>x.id===building),o=a.objects.find(o=>o.building===building&&['rest','door'].includes(o.kind));if(!profile||!o||structurallySound(profile)||!ruinHere(s,p,a,o.x)||a.ruinWorks?.projects[building]?.completed===null)return false;
 const house=a.dwellingPlot?.house,room=house?.building===building?s.areas[house.room]:null;if(room&&Object.values(s.people).some(q=>q.alive&&body(s,q).area===room.id))return false;
 const r=structureRecord(s,profile),part=r.roof>0?'roof':r.walls>0?'walls':null,before=material(p);if(before>0&&p.goodsRawCargo.source!==a.id||!part||r.lastRecoveryTick>=s.tick||packView(s,p.id).used+Math.ceil((before+2)/4)>24||p.goodsRawCargo&&p.goodsRawCargo.owner!==p.id)return false;
 r[part]--;r.lastRecoveryTick=s.tick;const seq=(r.salvageSerial||0)+1;r.salvageSerial=seq;p.goodsRawCargo={quantity:before+2,owner:p.id,source:a.id};(ruinActor(s,p)||p.needs).energy-=3;history(r,{tick:s.tick,kind:'dismantle',roof:r.roof,walls:r.walls,actor:p.id,part,roofBefore:r.roof+(part==='roof'?1:0),wallsBefore:r.walls+(part==='walls'?1:0),raw:2,before,after:before+2,serial:seq});observeOwnRuins(s,p);return true;
}
function settle(s,p,a,n,right){const b=body(s,p),old=p.home;p.home=right.room||a.id;p.agenda.home=p.home;p.status='resident';p.ruinAfter=s.tick+96;delete p.ruinIntent;p.returnHistory ||= [];p.returnHistory.push({at:s.tick,from:old,to:p.home,area:a.id,building:n.building,basis:right.title});if(p.returnHistory.length>4)p.returnHistory.shift();return true;}
function execute(s,p,t,ctx){
 if(!ruinRecoveryOn(s))return true;if(!ruinReady(s,p))return false;const g=t.ruin,a=s.areas[g.area],profile=a?.facades?.profiles.find(x=>x.id===g.building),right=a&&ruinRight(s,p,a,g.building),o=a?.objects.find(o=>o.building===g.building&&['rest','door'].includes(o.kind));if(!profile||!right||!o)return false;
 if(g.stage==='enter'){const room=s.areas[right.room];return body(s,p).area===room?.id&&residenceAdmission(s,room,p.id)&&settle(s,p,a,{building:g.building},right);}
 if(!ruinHere(s,p,a,o.x)||a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(a,e.x,o.x)<28))return false;
 if(g.stage==='inspect'){observeOwnRuins(s,p);p.ruinIntent={area:a.id,building:g.building,at:s.tick};return true;}
 if(g.stage==='salvage')return ruinSalvage(s,p,a,g.building);
 if(g.stage==='settle')return structurallySound(profile)&&settle(s,p,a,{building:g.building},right);
 let ledger=a.ruinWorks;const old=ledger?.projects[g.building];
 if(g.stage==='reinforce'){const extra=old?.completed===null?Math.max(0,repairRaw(profile)-old.raw):0,cargo=p.goodsRawCargo;if(!extra||material(p)<extra)return false;const before=cargo.quantity;cargo.quantity-=extra;(old.additions ||= []).push({at:s.tick,payer:p.id,before,after:cargo.quantity,source:cargo.source,raw:extra});old.raw+=extra;return true;}
 if(g.stage==='supply'){const raw=repairRaw(profile);if(structurallySound(profile)||old?.completed===null||material(p)<raw||p.agenda.tools<1)return false;const cargo=p.goodsRawCargo,before=cargo.quantity;ledger ||= (a.ruinWorks={version:1,serial:0,projects:{}});cargo.quantity-=raw;p.agenda.tools--;ledger.projects[g.building]={version:1,id:a.id+'/ruin-work/'+(++ledger.serial),building:g.building,payer:p.id,basis:right.title,started:s.tick,raw,materials:{before,after:cargo.quantity,source:cargo.source},tool:1,roof:profile.structure.roof,walls:profile.structure.walls,steps:[],completed:null,previous:old?[...(old.previous||[]),{id:old.id,raw:old.raw,payer:old.payer,started:old.started,completed:old.completed}].slice(-8):[]};return true;}
 const r=ledger?.projects[g.building];if(g.stage!=='work'||!r||repairRaw(profile)>r.raw||r.completed!==null||r.steps.at(-1)?.tick>=s.tick)return false;
 const condition=structureRecord(s,profile);if(condition.lastRecoveryTick>=s.tick)return false;(ruinActor(s,p)||p.needs).energy-=3;r.steps.push({tick:s.tick,actor:p.id,energy:3});condition.lastRecoveryTick=s.tick;
 if(r.steps.length===3){condition.roof=Math.max(2,condition.roof);condition.walls=Math.max(2,condition.walls);condition.emptyDays=0;condition.checked=s.tick;r.completed=s.tick;history(condition,{tick:s.tick,kind:'recovery',roof:condition.roof,walls:condition.walls,actor:p.id,payer:r.payer,project:r.id,raw:r.raw});observeOwnRuins(s,p);ctx.log?.(s,'У прежнего дома снова пригодны кровля и стены. Старое место, вещи и права сохранены.','property');}return true;
}
export function ruinReturnNPCAction(s,p,ctx={}){const t=p.agenda.task;if(!t?.ruin)return false;if(!ruinRecoveryOn(s))return true;const done=execute(s,p,t,ctx);p.agenda.task=null;p.agenda.due=s.tick+(done?0:48);if(!done)p.ruinRefusal={...t.ruin,at:s.tick,reason:'actual-condition'};return true;}
export function ruinReturnPlan(s,ctx){const h=s.hero,p=s.people[h.lineage];if(h.goal)return false;const c=choice(s,p);if(!c)return false;ctx.goal(s,'homeBuildWork',c.target,c.x,labels[c.stage],'Прежнее право сохраняется. Прибытие, материал и работа проверяются на месте.',{ruin:{area:c.n.area,building:c.n.building,stage:c.stage}});return true;}
export function ruinReturnAction(s,ctx){const h=s.hero;if(!h.goal?.ruin)return false;const ok=execute(s,s.people[h.lineage],h.goal,ctx);h.goal=null;if(!ok)s.people[h.lineage].ruinAfter=s.tick+48;return ok;}
export function ruinRevision(s,g){if(!g.ruin)return null;const p=s.people[s.hero.lineage],a=s.areas[g.ruin.area],local=s.hero.area===a?.id;return [s.rules['ruin-recovery'],p.goodsRawCargo,p.agenda.tools,p.ruinMemory,(p.ruinAfter||0)>s.tick,local&&a.ruinWorks,local&&a.facades?.profiles.map(p=>[p.id,p.structure?.roof,p.structure?.walls])];}
