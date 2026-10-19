import {DWELLING_TASKS} from '../npc-labels.js';
import {partyRoomConsent} from './lodging-consent.js';
import {dwellingOn,dwellingActor,dwellingEnergy,dwellingReady,dwellingHere,plotAllows,dwellingChoice,HOUSE_PLANS} from './dwelling-state.js';
import {finishDwelling} from './dwelling-place.js';
import {constructionWork} from './construction-work.js';
import {physicalDistance} from '../geometry.js';
import {localContact,relatedPeople} from './npc-contacts.js';
import {npcController} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {productionSources,rawSite,extractRaw} from './goods.js';
import {structurallySound} from './building-condition.js';
import {residenceAdmission} from './residence-access.js';
import {itemUnits,packContents,fitsPack,packView,containersOn} from './container-state.js';
import {itemLocation,actorItemLocation} from './item-originals.js';
const taskKinds=['homeBuildSupply','homeBuildWait','homeBuildWork','homeBuildHire','homeBuildPay'];
const siteOf=(s,p)=>{const b=dwellingActor(s,p),a=s.areas[b?.area||p.area];return a?.residence?s.areas[a.interior.parent]:a;};
const contextPerson=(s,id)=>s.people[id];
const near=(s,p,q,a,range=12)=>{const b=localContact(s,q?.id,a.id);return b&&dwellingHere(s,p,a,b.x,range);};
const clear=(a,x)=>!a.objects.some(o=>['grave','tavern','workshop'].includes(o.kind)&&Math.abs(o.x-x)<10||o.kind==='door'&&Math.abs(o.x-x)<8||o.kind==='enemy'&&o.alive&&!o.resolved&&Math.abs(o.x-x)<28);
const plotX=a=>[72,88,58].find(x=>clear(a,x));
function allocate(s,a,p,x){if(a.dwellingPlot||!a.foundedSettlement?.founders.includes(p.id)||!dwellingHere(s,p,a,x)||!clear(a,x))return null;return a.dwellingPlot={version:1,id:a.id+'/dwelling-plot/1',area:a.id,x,owner:p.id,created:s.tick,rights:[],basis:{kind:'founder-share',source:a.foundation.id,person:p.id,tick:s.tick},permission:null,offer:null,serial:0,project:null,history:[],house:null};}
function legal(s,a,p,plot){return dwellingOn(s)&&dwellingReady(s,p)&&plotAllows(plot,p.id)&&(!plot.project||plot.project.owner===p.id);}
function candidateOwner(s,a){return a.foundedSettlement?.founders.map(id=>s.people[id]).find(p=>dwellingReady(s,p)&&npcController(s,p)==='personal'&&localContact(s,p.id,a.id));}
function claim(s,r,p){const c=Object.values(r.payment.claims).find(c=>c.beneficiary===p.id&&c.amount>c.paid);return c||null;}
function proposal(s,p){
 if(!dwellingOn(s)||!dwellingReady(s,p))return null;const a=siteOf(s,p);if(!a?.foundedSettlement)return null;const plot=a.dwellingPlot,r=plot?.project,h=dwellingActor(s,p),bodyArea=h?.area||p.area;
 if(bodyArea!==a.id){const room=s.areas[bodyArea];if(!residenceAdmission(s,room,p.id))return {stage:'leave',a,x:plot.x};const chest=room.objects.find(o=>o.id===room.residence.chest),held=packContents(s,p.id),spare=held.items.find(i=>!Object.values(held.h?.equipment||{}).includes(i)&&chest.items.reduce((n,x)=>n+itemUnits(x),0)+itemUnits(i)<=chest.capacity);if(held.items.length>3&&spare)return {stage:'store',a:room,x:56,item:spare.id};
 if(dwellingEnergy(s,p).energy<85)return {stage:'rest',a:room,x:68};return {stage:'leave',a,x:plot.x};}
 if(plot&&r){if(r.status==='done'&&claim(s,r,p))return {stage:'pay',a,x:plot.x,project:r.id};
  if(r.status!=='done'){
   if(r.offer?.person===p.id&&r.offer.until>s.tick&&r.worker!==p.id)return {stage:'acceptWork',a,x:localContact(s,r.owner,a.id)?.x??plot.x,person:r.owner,project:r.id};
   if(r.worker===p.id&&r.workerUntil>s.tick&&r.materials)return {stage:'work',a,x:plot.x,project:r.id};
   if(r.owner!==p.id)return null;
   if(!r.materials){const owned=p.goodsRawCargo?.owner===p.id?p.goodsRawCargo.quantity:0,need=r.raw,raw=productionSources(s,a).materials;
    if(owned>=need)return {stage:'supply',a,x:plot.x,project:r.id};
    if(raw.stock>=need&&marketWallet(s,p.id)>=need*3+r.payment.reserved+8)return {stage:'supply',a,x:42,project:r.id};
    if(r.mode==='self'&&rawSite(s,a)?.remaining>=Math.min(2,need-owned))return {stage:'gather',a,x:a.forage.x,project:r.id,remaining:3};return null;
   }
   if(r.mode==='self')return {stage:'work',a,x:plot.x,project:r.id};
   if(r.offer?.until>s.tick)return null;
   if(!r.worker||!s.people[r.worker]?.alive||r.workerUntil<=s.tick){const worker=Object.values(s.people).find(q=>q.id!==p.id&&dwellingReady(s,q)&&q.agenda.job==='artisan'&&npcController(s,q)==='personal'&&localContact(s,q.id,a.id));if(worker)return {stage:'offerWork',a,x:localContact(s,worker.id,a.id).x,person:worker.id,project:r.id};if(s.tick-r.materials.tick>=96)return {stage:'work',a,x:plot.x,project:r.id};}return null;
  }
 }
 if((p.dwellingAfter||0)>s.tick)return null;
 const invite=p.dwellingInvitation;if(invite?.until>s.tick&&invite.area===a.id)return {stage:'acceptGuest',a,x:localContact(s,invite.owner,a.id)?.x??plot?.x??72,person:invite.owner};
 if(plot?.house){if(plot.house.owner!==p.id){const room=s.areas[plot.house.room];return residenceAdmission(s,room,p.id)&&dwellingEnergy(s,p).energy<60?{stage:'enter',a:room,x:68}:null;}
  if(p.privateHome?.room!==plot.house.room)return {stage:'inspect',a,x:plot.x};const room=s.areas[plot.house.room],desired=p.housePreference==='family'?'family':plot.house.plan;
  if(desired!==plot.house.plan&&HOUSE_PLANS[desired]&&(!r||r.status==='done'&&r.payment.paid===r.payment.reserved))return {stage:'start',a,x:plot.x,plan:desired,mode:p.agenda.duty<.55&&marketWallet(s,p.id)>=14?'hire':'self',rebuild:true};
  if(dwellingEnergy(s,p).energy<60){const party=h&&partyRoomConsent(s,h);if(party&&party.length<=room.residence.capacity&&party.some(id=>!room.residence.occupants.includes(id)))return {stage:'inviteParty',a,x:plot.x};return {stage:'enter',a:room,x:68};}
  if(room.residence.occupants.length<room.residence.capacity){const guest=Object.values(s.people).find(q=>q.id!==p.id&&dwellingReady(s,q)&&npcController(s,q)==='personal'&&relatedPeople(p,q)&&near(s,p,q,a)&&!room.residence.occupants.includes(q.id)&&!q.dwellingInvitation);if(guest)return {stage:'inviteGuest',a,x:localContact(s,guest.id,a.id).x,person:guest.id};}
  return null;
 }
 const request=a.dwellingRequest;if(p.privatePlotRequest?.until>s.tick&&request?.person===p.id&&!plot?.offer){if(!dwellingHere(s,p,a,request.x))return {stage:'meetPlot',a,x:request.x};return null;}
 if(request?.host===p.id&&request.until>s.tick){const guest=s.people[request.person];if(dwellingReady(s,guest)&&localContact(s,guest.id,a.id))return {stage:'grant',a,x:plot?.x??request.x,person:guest.id};}
 const choice=dwellingChoice(s,p,a);if(!choice)return null;
 if(!plot){if(a.foundedSettlement.founders.includes(p.id)){const x=plotX(a);return x===undefined?null:{stage:'allocate',a,x,plan:choice.plan.id,mode:choice.mode};}
  const owner=candidateOwner(s,a);if(owner)return {stage:'askPlot',a,x:localContact(s,owner.id,a.id).x,person:owner.id,plan:choice.plan.id,mode:choice.mode};return null;}
 if(plotAllows(plot,p.id))return {stage:'start',a,x:plot.x,plan:choice.plan.id,mode:choice.mode};
 if(plot.offer?.person===p.id&&plot.offer.until>s.tick)return {stage:'acceptPlot',a,x:plot.x,person:plot.owner};
 if(plot.owner===p.id&&request?.person&&request.until>s.tick)return {stage:'grant',a,x:plot.x,person:request.person};
 if(!plot.project&&!plot.house&&!plot.permission&&s.people[plot.owner]?.alive)return {stage:'askPlot',a,x:localContact(s,plot.owner,a.id)?.x??plot.x,person:plot.owner};
 return null;
}
function putTask(p,q){p.agenda.task={kind:q.stage==='pay'?'homeBuildPay':q.stage.includes('Plot')||q.stage.includes('Work')||['grant','allocate'].includes(q.stage)?'homeBuildHire':q.stage==='supply'?'homeBuildSupply':'homeBuildWork',target:q.a.id,x:q.x,remaining:q.remaining||1,knownNavigation:true,dwelling:q.a.residence?q.a.interior.parent:q.a.id,houseStage:q.stage,...(q.person?{person:q.person}:{}),...(q.plan?{plan:q.plan}:{}),...(q.mode?{mode:q.mode}:{}),...(q.project?{project:q.project}:{}),...(q.item?{item:q.item}:{}),...(q.rebuild?{rebuild:true}:{})};if(p.area!==q.a.id)p.status='wandering';return p.agenda.task;}
export function dwellingNPCTask(s,p){const q=proposal(s,p);return q?putTask(p,q):null;}
export function dwellingPlan(s,ctx){const h=s.hero;if(h.goal||h.quests.some(q=>q.status==='active')||h.stories.active||h.career.path!=='peaceful'&&h.personality.curiosity<.7)return false;const p=s.people[h.lineage],q=proposal(s,p);if(!q)return false;
 const t=putTask({...p,agenda:{}},q),title=DWELLING_TASKS[q.stage];
 const {kind,target,...extra}=t;ctx.goal(s,kind==='homeBuildSupply'?'homeBuildWork':kind,target,t.x,title,'Один реальный участок, право, материалы и выполненные этапы сохраняются; жильё не завершает жизнь.',{...extra,property:q.project||q.a.dwellingPlot?.id||q.a.foundedSettlement?.id});return true;}
function paidClaim(s,a,plot,r,p){const c=claim(s,r,p);if(!c||!dwellingHere(s,p,a,plot.x))return false;const n=c.amount-c.paid;setActorMoney(s,p,marketWallet(s,p.id)+n);c.paid+=n;c.claimed=s.tick;r.payment.paid+=n;return true;}
function start(s,a,plot,p,t){if(!legal(s,a,p,plot)||!dwellingHere(s,p,a,plot.x)||plot.project&&plot.project.status!=='done')return false;
 const plan=HOUSE_PLANS[t.plan];if(!plan)return false;let raw=plan.raw,required=plan.work;
 if(plot.house){const room=s.areas[plot.house.room],chest=room.objects.find(o=>o.id===room.residence.chest);if(plot.house.owner!==p.id||plot.house.plan===t.plan||room.residence.occupants.filter(id=>s.people[id]?.alive).length>plan.capacity||chest.items.reduce((n,i)=>n+itemUnits(i),0)>Math.max(plan.chest,room.home?.state==='ready'?12:0)||!structurallySound(a.facades.profiles.find(b=>b.id===plot.house.building)))return false;raw=Math.max(0,plan.raw-HOUSE_PLANS[plot.house.plan].raw);required=3;}
 const reserve=t.mode==='hire'?required*2:0,owned=p.goodsRawCargo?.owner===p.id?p.goodsRawCargo.quantity:0,cost=owned>=raw?0:productionSources(s,a).materials.stock>=raw?raw*3:0;if(marketWallet(s,p.id)<cost+reserve+8)return false;
 if(plot.project){if(plot.project.payment.paid!==plot.project.payment.reserved)return false;plot.history.push({id:plot.project.id,plan:plot.project.plan,completed:plot.project.completed,raw:plot.project.raw,paid:plot.project.payment.paid});if(plot.history.length>8)plot.history.shift();}
 const id=plot.id+'/project/'+(++plot.serial);plot.project={version:1,id,owner:p.id,originalOwner:p.id,rights:[],permission:plot.owner===p.id?'owner':plot.permission.id,plan:t.plan,mode:t.mode,raw,required,status:'planned',planned:s.tick,materials:null,steps:[],lastWorkTick:-1,worker:t.mode==='self'?p.id:null,workerUntil:t.mode==='self'?Number.MAX_SAFE_INTEGER:0,offer:null,hires:[],payment:{reserved:reserve,funded:false,paid:0,claims:{}},rebuild:Boolean(plot.house),previousPlan:plot.house?.plan??null};
 if(plot.house)s.areas[plot.house.room].residence.works={project:id,section:'addition',targetCapacity:plan.capacity};p.housePreference ||= dwellingChoice(s,p,a)?.desired||t.plan;p.dwellingIntent={area:a.id,plot:plot.id,project:id};return true;}
function supply(s,a,plot,r,p){if(r.owner!==p.id||r.materials||!plotAllows(plot,p.id))return false;const cargo=p.goodsRawCargo,carried=cargo?.owner===p.id&&cargo.quantity>=r.raw,raw=productionSources(s,a).materials,cost=carried?0:r.raw*3;
 if(!dwellingHere(s,p,a,carried?plot.x:42)||!carried&&raw.stock<r.raw||marketWallet(s,p.id)<cost+r.payment.reserved+8)return false;
 const before=carried?cargo.quantity:raw.stock;if(carried)cargo.quantity-=r.raw;else{raw.stock-=r.raw;raw.used+=r.raw;a.civic.treasury+=cost;}const wallet=marketWallet(s,p.id);setActorMoney(s,p,wallet-cost-r.payment.reserved);r.payment.funding={owner:p.id,tick:s.tick,before:wallet,after:wallet-cost-r.payment.reserved,materials:cost,escrow:r.payment.reserved};r.materials={kind:carried?'carried':'civic',source:carried?cargo.source:raw.id,owner:p.id,units:r.raw,before,after:before-r.raw,paid:cost,tick:s.tick};r.payment.funded=true;r.status='foundation';return true;}
function execute(s,p,t,ctx){
 if(!dwellingOn(s)||!dwellingReady(s,p))return false;const a=s.areas[t.dwelling],plot=a?.dwellingPlot,r=plot?.project;if(!a?.foundedSettlement)return false;const stage=t.houseStage;
 if(stage==='meetPlot'){p.dwellingAfter=s.tick+8;return dwellingHere(s,p,a,t.x);}
 if(stage==='allocate')return Boolean(allocate(s,a,p,t.x));
 if(stage==='askPlot'){const host=s.people[t.person],x=plot?.x??plotX(a);if(!host||x===undefined||!(plot?plot.owner===host.id:a.foundedSettlement.founders.includes(host.id))||!near(s,p,host,a))return false;a.dwellingRequest={person:p.id,host:host.id,x,asked:s.tick,until:s.tick+96};p.privatePlotRequest={area:a.id,host:host.id,until:s.tick+96};return true;}
 if(stage==='grant'){const req=a.dwellingRequest,guest=s.people[t.person];if(req?.host!==p.id||req.person!==guest?.id||req.until<s.tick||!dwellingHere(s,p,a,t.x)||!near(s,p,guest,a)||marketWallet(s,guest.id)<4)return false;const target=plot||allocate(s,a,p,t.x);if(!target||target.owner!==p.id||target.project)return false;target.offer={id:target.id+'/offer/'+s.tick,person:guest.id,by:p.id,tick:s.tick,until:s.tick+96,price:4};return true;}
 if(stage==='acceptPlot'){const offer=plot?.offer,owner=s.people[plot?.owner];if(!offer||offer.person!==p.id||offer.until<s.tick||!near(s,p,owner,a)||marketWallet(s,p.id)<4||plot.project)return false;setActorMoney(s,p,marketWallet(s,p.id)-4);setActorMoney(s,owner,marketWallet(s,owner.id)+4);plot.permission={version:1,id:offer.id+'/permission',person:p.id,owner:plot.owner,agreed:s.tick,paid:4};plot.offer=null;delete a.dwellingRequest;delete p.privatePlotRequest;return true;}
 if(stage==='start')return start(s,a,plot,p,t);
 if(!plot)return false;
 if(stage==='enter'){const room=s.areas[dwellingActor(s,p)?.area||p.area];return residenceAdmission(s,room,p.id);}
 if(stage==='leave')return dwellingHere(s,p,a,plot.x);
 if(stage==='inspect'){if(!plot.house||plot.house.owner!==p.id||!dwellingHere(s,p,a,plot.x)||!structurallySound(a.facades.profiles.find(b=>b.id===plot.house.building)))return false;p.privateHome={area:a.id,plot:plot.id,room:plot.house.room,title:plot.house.title};p.home=plot.house.room;return true;}
 if(stage==='inviteParty'){const h=dwellingActor(s,p),room=s.areas[plot.house?.room],party=h&&partyRoomConsent(s,h);if(!h||plot.house?.owner!==p.id||!dwellingHere(s,p,a,plot.x)||!party||party.length>room.residence.capacity)return false;room.residence.occupants=[...new Set([...room.residence.occupants,...party])];if(room.residence.occupants.length>room.residence.capacity){room.residence.occupants=room.residence.occupants.filter(id=>!party.includes(id)||id===p.id);return false;}room.residence.consents ||= [];room.residence.consents.push({tick:s.tick,owner:p.id,people:party,kind:'party-consent'});return true;}
 if(stage==='inviteGuest'){const q=s.people[t.person],room=s.areas[plot.house?.room];if(plot.house?.owner!==p.id||!room||!dwellingReady(s,q)||!near(s,p,q,a)||room.residence.occupants.length>=room.residence.capacity)return false;q.dwellingInvitation={owner:p.id,area:a.id,room:room.id,offered:s.tick,until:s.tick+96};return true;}
 if(stage==='acceptGuest'){const invitation=p.dwellingInvitation,owner=s.people[invitation?.owner],room=s.areas[invitation?.room];if(!invitation||invitation.until<s.tick||!room||room.residence.owner!==owner?.id||!near(s,p,owner,a)||room.residence.occupants.length>=room.residence.capacity)return false;room.residence.occupants.push(p.id);room.residence.consents ||= [];room.residence.consents.push({tick:s.tick,owner:owner.id,people:[p.id],kind:'personal-consent'});p.privateResidence={area:a.id,room:room.id,owner:owner.id,agreed:s.tick};delete p.dwellingInvitation;return true;}
 if(stage==='store'){const room=s.areas[dwellingActor(s,p)?.area||p.area];return transferDwellingItem(s,p,room,t.item,false);}

 if(stage==='rest'){const room=s.areas[dwellingActor(s,p)?.area||p.area];if(!residenceAdmission(s,room,p.id)||!dwellingHere(s,p,room,68))return false;dwellingEnergy(s,p).energy=Math.min(100,dwellingEnergy(s,p).energy+8);return true;}
 if(!r||t.project&&r.id!==t.project)return false;
 if(stage==='pay')return paidClaim(s,a,plot,r,p);
 if(stage==='supply')return supply(s,a,plot,r,p);
 if(stage==='gather'){if(r.owner!==p.id||r.materials||!plotAllows(plot,p.id)||!dwellingHere(s,p,a,a.forage.x)||p.dwellingGatherTick===s.tick)return false;const source=rawSite(s,a);if(!source?.remaining)return false;p.dwellingGatherTick=s.tick;dwellingEnergy(s,p).energy-=2;t.remaining=(t.remaining||3)-1;if(t.remaining>0)return true;const old=p.goodsRawCargo?.quantity||0,wanted=Math.min(2,Math.max(0,r.raw-old),source.remaining);let allowed=wanted;if(containersOn(s))while(allowed>0&&packView(s,p.id).used+Math.ceil((old+allowed)/4)>24)allowed--;const n=extractRaw(s,a,allowed);if(n){p.goodsRawCargo={quantity:old+n,source:a.id,owner:p.id};}return Boolean(n);}
 if(stage==='offerWork'){const q=s.people[t.person];if(r.owner!==p.id||r.status==='done'||!r.materials||!dwellingReady(s,q)||!near(s,p,q,a)||q.agenda.job!=='artisan')return false;r.offer={person:q.id,by:p.id,tick:s.tick,until:s.tick+96};if(!s.people[r.worker]?.alive)r.worker=null;return true;}
 if(stage==='acceptWork'){const owner=s.people[r.owner];if(r.offer?.person!==p.id||r.offer.until<s.tick||!near(s,p,owner,a)||p.agenda.job!=='artisan'||r.status==='done')return false;r.worker=p.id;r.workerUntil=s.tick+96;r.hires.push({person:p.id,tick:s.tick,until:r.workerUntil});r.offer=null;return true;}
 if(stage==='work'){if(r.owner!==p.id&&!(r.worker===p.id&&r.workerUntil>s.tick)||!dwellingHere(s,p,a,plot.x)||!r.materials||!plotAllows(plot,r.owner))return false;if(r.owner===p.id&&r.mode==='self')r.worker=p.id;if(!constructionWork(r,p.id,s.tick,{required:r.required,foundation:2,frame:r.required===3?3:3}))return false;dwellingEnergy(s,p).energy-=3;
  r.steps.at(-1).rate=p.id===r.owner?0:2;
  if(p.id!==r.owner){const c=r.payment.claims[p.id] ||= {person:p.id,beneficiary:p.id,amount:0,paid:0,claimed:null};c.amount+=2;}if(r.status==='done')finishDwelling(s,a,plot,r);return true;}
 return false;
}
export function dwellingNPCAction(s,p,ctx={}){const t=p.agenda.task;if(!taskKinds.includes(t?.kind)||!t.dwelling)return false;const ok=execute(s,p,t,ctx);if(t.houseStage==='gather'&&ok&&t.remaining>0)return true;if(t.houseStage==='work'&&ok&&s.areas[t.dwelling].dwellingPlot.project.status!=='done')return true;if(ok&&['enter','leave'].includes(t.houseStage))p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+(ok?8:48);if(!ok)p.dwellingAfter=s.tick+48;return true;}
export function dwellingAction(s,ctx){const h=s.hero,g=h.goal;if(!g?.dwelling)return false;const p=s.people[h.lineage],ok=execute(s,p,g,ctx);if(ok){h.lastAction=['work','gather'].includes(g.houseStage)?'work':'talk';if(g.houseStage!=='gather'||g.remaining<=0)h.goal=null;}else{h.goal=null;p.dwellingAfter=s.tick+48;}return ok;}
export function dwellingRevision(s,g){if(!g.dwelling)return null;const h=s.hero,p=s.people[h.lineage],a=s.areas[h.area],plot=a?.dwellingPlot;return [dwellingOn(s),p.goodsRawCargo,p.privateHome,p.housePreference,plot&&physicalDistance(a,h.x,plot.x)<=24&&[plot.id,plot.owner,plot.permission,plot.offer,plot.project&&[plot.project.id,plot.project.status,plot.project.steps.length,plot.project.worker,plot.project.offer,plot.project.payment]],physicalDistance(a,h.x,42)<=18&&a.goods?.sources?.materials.stock];}

export function transferDwellingItem(s,p,room,id,take=false){
 if(!room?.residence||room.residence.owner!==p.id||!residenceAdmission(s,room,p.id)||!dwellingHere(s,p,room,56)||room.residence.lastStoreTick>=s.tick)return false;
 const chest=room.objects.find(o=>o.id===room.residence.chest),pack=packContents(s,p.id),items=pack.h?.bag||(p.looseItems ||= []),from=take?chest.items:items,to=take?items:chest.items,item=from.find(i=>i.id===id);if(!item||item.libraryLoan?.returned===null||item.libraryTheft?.returned===null||take&&!fitsPack(s,p.id,{items:[...items,item]})||!take&&chest.items.reduce((n,i)=>n+itemUnits(i),0)+itemUnits(item)>chest.capacity)return false;
 from.splice(from.indexOf(item),1);to.push(item);if(take){if(pack.h)actorItemLocation(s,item,p.id);else itemLocation(s,item,{kind:'person',id:p.id});}else itemLocation(s,item,{kind:'cache',area:room.id,object:chest.id});room.residence.lastStoreTick=s.tick;dwellingEnergy(s,p).energy--;return true;
}
