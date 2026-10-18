import {merchantEnabled} from './merchant-policy.js';
import {areaScale,areaStep} from '../geometry.js';
import {npcMoneyCachePlan,takeBuriedMoney} from './money-caches.js';
import {observeRouteMap,npcRouteMapPlan,npcRouteMapAction} from './route-maps.js';
import {npcMapCopyPlan,mapCopyAction} from './map-copies.js';
import {observeBestiaryTraces} from './bestiary.js';
import {fordDetour,fordBlocked,fordKey} from './fords.js';
import {npcFordGate} from './ford-actors.js';
import {brothTeacherTurn} from './broth-teaching.js';
import {localFoodEnabled,localFoodChoice,localFoodWork,deliverLocalFood,takeForage,LOCAL_FOODS} from './local-food.js';
import {rememberPracticalRole,canBargain} from './skill-branches.js';
import {npcCraftStudyPlan,npcCraftStudyAction} from './craft-practice.js';
import {npcForgePlan,npcForgeAction} from './forging.js';
import {npcRefitPlan,npcRefitWait} from './knife-refit.js';
import {npcItemRepairPlan,npcItemRepairWait} from './item-repair.js';
import {npcBiomaterialPlan,npcBiomaterialAction} from './biomaterials.js';
import {npcDeedsTick,npcDeedAllows,bindNPCDeedTask,npcFamilyTarget,npcFamilyAction} from './npc-deeds.js';
import {materialOfferTurn,npcMaterialDeliveryPlan,workMaterialDelivery} from './material-delivery.js';
import {materialDeliverySpent,pendingMaterialContract} from './material-delivery-state.js';
import {observeMarket,shareMarketKnowledge} from './market-knowledge.js';
import {marketEnabled,quoteMarket,tradeGoods} from './market.js';
import {goodsEnabled,goodsWorkReceipt,completeGoodsWork,putGoods,takeGoods,productionSources,rawSite,extractRaw,deliverRaw} from './goods.js';
import {NPC_JOBS} from '../npc-labels.js';
import {npcCachePlan,npcTakeCache,releaseLooseItems} from './item-originals.js';
export {NPC_JOBS,NPC_TASKS} from '../npc-labels.js';
import {selfDrivenActor} from '../actor-projection.js';
import {initializeNPCKnowledge,observeNPCPlace,npcKnownRoute,knownEmployer,forgetNPCRoad,roadStillPresent,knownNPCHazards,rememberNPCHazard} from './npc-knowledge.js';
import {initializeNPCContacts,observeNPCContacts,knownRelatives,localContact,missContact} from './npc-contacts.js';
import {observeFreightActor} from './freight-memory.js';
import {npcRepairPlan,npcRepairFinish,npcRepairAction,damagedWorkplace} from './workshop-state.js';
import {npcDisputeAction} from './workshop-dispute.js';
import {commissionTarget,quoteRepair} from './resident-orders.js';
import {planAidRequest,aidVisitTarget,finishAidRequest} from './personal-aid.js';
import {interiorPassage,npcTavernPlan,npcTavernAction,npcInteriorStay} from './interiors.js';
import {npcWorkshopTarget} from './workshop-interiors.js';
import {workshopSite} from './workshop-place.js';
import {npcLodgingPlan,npcLodgingTarget,npcBookRoom,npcRoomRest} from './lodging.js';
import {migrationArrived} from './migrations.js';
import {personalVisitPlan,finishPersonalVisit} from './companion-goals.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown} from './common.js';
import {initializeNeeds,personNeeds} from './needs.js';
import {weatherAt} from './weather.js';
import {npcController,npcAction} from './npc-control.js';
import {npcToolPlan,npcToolMend,npcToolBlocked,recordToolUse} from './workshop-tools.js';
import {toolTeacherTurn} from './tool-teaching.js';
import {observeMentors,mentorEnabled} from './mentor-memory.js';
import {mentorTarget,mentorLessonAction,endDeadMentorJourney} from './mentor-journey.js';
import {caseRecordStudyPlan,caseRecordStudyAction,announceCaseWitness} from './verdict-witness.js';
import {rescueEscapePlan,rescueEscapeRoute,finishRescueEscape,rescueGuardPass} from './rescue-escape.js';
const jobs=Object.keys(NPC_JOBS).filter(id=>id!=='student');
export function initializePersonAgenda(s,p){
  if(p.alive){initializeNeeds(p);initializeNPCKnowledge(s,p);initializeNPCContacts(s,p);}
  if(p.agenda||!p.alive)return;
  const rng=()=>moduleRandom(s,'people');
  p.agenda={job:p.role==='ребёнок'?'student':p.role==='страж'?'guard':jobs[Math.floor(rng()*jobs.length)],duty:rng(),curiosity:rng(),sociability:rng(),due:(s.tick||0)+16+Math.floor(rng()*64),task:null,home:p.area||null,wealth:0,work:0,tools:0,visits:0,knowledge:[],bonds:{}};p.x ??=42;
}
export function peopleArea(s,a){if(a.civic){a.civic.treasury ??=60;a.civic.tools ??=3;}}
function objectAt(s,p){
  const a=s.areas[p.area];let o=a.objects.find(o=>o.kind==='resident'&&o.person===p.id);
  if(!o){o={id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x};a.objects.push(o);}o.x=p.x;
}
function locate(s,p,id,x){
  const old=s.areas[p.area];if(old?.population)old.population=old.population.filter(person=>person!==p.id);
  p.area=id;p.x=x;const a=s.areas[id];a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);objectAt(s,p);observeNPCPlace(s,p);observeNPCContacts(s,p);observeFreightActor(s,p,p.area,true);
}
function tell(s,p,text,ctx){
  p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();
  if(p.area===s.hero.area)ctx.log(s,text,'npc');
}
function safePath(s,path,p=null){const blocked=new Set(p?fordBlocked(s,p):[]);return path.length>0&&!path.slice(1).some((id,i)=>blocked.has(fordKey(path[i],id)))&&path.every(id=>!s.areas[id].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved));}
function begin(p,kind,target,x,remaining=3,extra={}){p.agenda.task={kind,target,x,remaining,...(kind==='work'?{workMode:null}:{}),...extra};}
function plan(s,p,ctx){
  const a=s.areas[p.area],m=p.agenda;
  m.home ||= p.area;
  if(p.migration&&s.migrations?.[p.migration]?.status==='active')return;
  if(rescueEscapePlan(s,p))return;
  if(p.role==='ребёнок'){begin(p,'learn',p.area,42,2);return;}
  if(p.health<(p.maxHealth||100)*.85||p.ailment){
    if(a.civic?.medicine>=2){begin(p,'recover',p.area,68);return;}
  }
  if(planAidRequest(s,p,ctx))return;
  const moneyCache=npcMoneyCachePlan(s,p);if(moneyCache){m.task=moneyCache;return;}
  const routeMap=npcRouteMapPlan(s,p);if(routeMap){m.task=routeMap;return;}
  const mapCopy=npcMapCopyPlan(s,p);if(mapCopy){m.task=mapCopy;return;}
  if(npcDeedAllows(s,p,'learning')&&personalVisitPlan(s,p,ctx))return;
  if(npcLodgingPlan(s,p))return;
  if(npcTavernPlan(s,p))return;
  if(goodsEnabled(s)&&a.civic&&a.goods?.harvestRequest?.until>=s.tick&&a.civic.food<(a.goods.harvestRequest.target??100)&&(m.job==='farmer'||m.duty>.4)&&productionSources(s,a).field.stock>0){begin(p,'farm',p.area,42);return;}
  if(a.civic?.food<40&&(m.duty>.35||a.civic.food<20)){
    const target=a.links.map(id=>s.areas[id]).find(other=>other.forage?.stock>0&&(!localFoodEnabled(s)||!other.forage.localFood||localFoodChoice(s,p,null,other))&&safePath(s,[a.id,other.id],p));
    if(target){const food=localFoodChoice(s,p,null,target);begin(p,'gather',target.id,target.forage.x,food?.remaining||3,{home:p.area,...(food?{foodSource:food.id}:{})});p.status='wandering';return;}
    begin(p,goodsEnabled(s)&&productionSources(s,a).field.stock===0?'waitHarvest':'farm',p.area,42,goodsEnabled(s)&&productionSources(s,a).field.stock===0?1:3);return;
  }
  const maintenance=npcDeedAllows(s,p,'commission')&&npcItemRepairPlan(s,p);if(maintenance){m.task=maintenance;return;}
  const remainsWork=npcBiomaterialPlan(s,p);if(remainsWork){m.task=remainsWork;return;}
  const appointment=npcDeedAllows(s,p,'commission')&&npcRefitPlan(s,p);if(appointment){m.task=appointment;return;}
  const salvage=npcCachePlan(s,p);if(salvage){m.task=salvage;return;}
  if(caseRecordStudyPlan(s,p))return;
  if(m.visits<3&&m.sociability>.7&&s.tick>(m.lastVisit||0)+768){
    const memory=enabled(s,'npc-contacts')?knownRelatives(s,p,ctx)[0]:null;
    const relative=enabled(s,'npc-contacts')?null:Object.values(s.people).find(other=>other.id!==p.id&&other.alive&&other.area&&other.area!==p.area&&isTown(s.areas[other.area])&&(other.parents.includes(p.id)||p.parents.includes(other.id)||p.parents.some(id=>other.parents.includes(id)))&&ctx.route(s,p.area,other.area).length<=3&&safePath(s,ctx.route(s,p.area,other.area),p));
    if(memory||relative){const contact=memory?.contact;begin(p,'visit',contact?.area||relative.area,contact?.x??42,2,{person:contact?.person||relative.id,home:p.area,...(memory?{contactMemory:true,knownNavigation:enabled(s,'npc-knowledge'),addressSeen:contact.seen,addressName:contact.place}:{})});p.status='wandering';return;}
  }
  if(!a.civic){begin(p,'return',m.home,42,1,{knownNavigation:Boolean(p.navigation?.commute)});p.status='wandering';return;}
  if(damagedWorkplace(s,p)){if(!npcRepairPlan(s,p,ctx))m.due=s.tick+48;return;}
  if(npcToolPlan(s,p))return;
  const practice=npcCraftStudyPlan(s,p);if(practice){m.task=practice;return;}
  const manufacture=npcDeedAllows(s,p,'manufacture')&&npcForgePlan(s,p);if(manufacture){m.task=manufacture;return;}
  if(!m.tools&&(marketEnabled(s)?quoteMarket(s,a,'tools','buy',1,{gold:m.wealth,trade:canBargain(s,p.id)}).quantity>0:m.wealth>=18&&a.civic.tools>0)){begin(p,'tool',p.area,58,2);return;}
  if(goodsEnabled(s)&&m.job==='artisan'&&productionSources(s,a).materials.stock<2&&pendingMaterialContract(s,p.id)?.client!==p.id){
    const source=a.links.map(id=>s.areas[id]).find(other=>['forest','mountain','cave','ruins','island'].includes(other.type)&&safePath(s,[a.id,other.id],p)&&(!enabled(s,'npc-knowledge')||p.navigation?.places.some(k=>k.area===other.id))&&rawSite(s,other)?.remaining>=2);
    if(source){begin(p,'rawGather',source.id,42,3,{home:p.area});p.status='wandering';return;}
    begin(p,'learn',p.area,42,2);return;
  }
  if(['artisan','merchant'].includes(m.job)&&a.civic.treasury===0){
    const known=enabled(s,'npc-knowledge'),memory=known?knownEmployer(s,p):null;
    const employer=known?(memory?s.areas[memory.area]:null):Object.values(s.areas).find(other=>other.id!==a.id&&other.discovered&&other.civic?.treasury>=12&&ctx.route(s,a.id,other.id).length<=4&&safePath(s,ctx.route(s,a.id,other.id),p));
    if(employer){begin(p,'relocate',employer.id,42,1,known?{knownNavigation:true,workSeen:memory.seen}:{});if(known)p.navigation.commute={from:p.area,to:employer.id,started:s.tick};p.status='wandering';return;}
    begin(p,m.duty>.5?'farm':'learn',p.area,42);return;
  }
  if(goodsEnabled(s)&&m.job==='farmer'&&productionSources(s,a).field.stock===0){begin(p,'waitHarvest',p.area,42,1);return;}
  if(m.job==='merchant'&&merchantEnabled(s)){begin(p,'marketWait',p.area,42,1);return;}
  begin(p,m.job==='farmer'?'farm':m.job==='healer'?'medicine':m.job==='guard'?'patrol':m.job==='scholar'||m.curiosity>.75&&m.work%3===1?'learn':'work',p.area,m.job==='guard'?80:42);
}
function moveTask(s,p,ctx){
  const migration=s.migrations?.[p.migration],fordCargo=migration?.status==='active'&&migration.carrier===p.id?{carrier:true,cargoFood:migration.cargo.food}:{};
  if(p.fordCrossing||p.liftTransit){const r=npcFordGate(s,p,(p.fordCrossing||p.liftTransit).to,(p.fordCrossing||p.liftTransit).arrivalX,p.agenda.task,p.agenda.task?.target,fordCargo);if(r.status==='arrived')locate(s,p,r.crossing.to,r.crossing.arrivalX);return false;}
  npcWorkshopTarget(s,p);if(!p.agenda.task)return false;
  const t=p.agenda.task;
  mentorTarget(s,p,t);
  if(!npcLodgingTarget(s,p,t))return false;
  if(!npcFamilyTarget(s,p,t))return false;
  if(t.kind==='repairCommission'&&!commissionTarget(s,p,t))return false;
  if(t.kind==='askAid'&&!aidVisitTarget(s,p,t))return false;
  if(enabled(s,'npc-contacts')&&t.kind==='visit'&&p.area===t.target){const body=localContact(s,t.person,p.area);if(body)t.x=body.x;}
  const escape=rescueEscapeRoute(s,p,t),known=enabled(s,'npc-knowledge')&&t.knownNavigation;
  const original=escape||(known?npcKnownRoute(p,p.area,t.target,knownNPCHazards(s,p)):ctx.route(s,p.area,t.target)),path=fordDetour(s,p,t,t.target,original);if(!path.length){p.agenda.task=null;if(known||escape)p.agenda.due=s.tick+96;if(escape)p.rescueFlight.blocked={tick:s.tick,kind:'exit'};p.status=t.migration||escape?'wandering':'resident';return false;}
  let x=t.x,next=null;
  if(path.length>1){next=path[1];x=Number(next.slice(1))>Number(p.area.slice(1))?100:0;}
  const passage=next&&interiorPassage(s,p.area,next,p.id);if(passage){x=passage.x;if(!passage.allowed){p.agenda.task=null;p.agenda.due=s.tick+48;return false;}}
  if(known&&next&&!roadStillPresent(s,p.area,next)){
    forgetNPCRoad(p,p.area,next);p.agenda.task=null;p.agenda.due=s.tick+96;p.status='resident';return false;
  }
  const margin=escape?9/areaScale(s.areas[p.area]):9;
  const obstacle=(known||escape)&&s.areas[p.area].objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&o.x>=Math.min(p.x,x)-margin&&o.x<=Math.max(p.x,x)+margin&&(!escape||!rescueGuardPass(s,o,p.id,x)));
  const danger=known||escape?Boolean(obstacle):!safePath(s,path);
  if(danger){
    if(known)rememberNPCHazard(s,p);
    if(escape){p.rescueFlight.blocked={tick:s.tick,kind:'enemy',enemy:obstacle.id,area:p.area};p.agenda.task=null;p.agenda.due=s.tick+24;return false;}
    tell(s,p,`${p.name} отказывается идти через живую угрозу и меняет план.`,ctx);p.agenda.task=null;p.agenda.due=s.tick+96;p.status=t.migration?'wandering':'resident';return false;
  }
  if(escape)p.rescueFlight.blocked=null;
  if(Math.abs(p.x-x)*areaScale(s.areas[p.area])>1){p.x+=areaStep(s.areas[p.area],p.x,x,6);objectAt(s,p);return false;}
  if(next){const arrival=passage?.arrival??(x===100?5:95),r=passage?{status:'clear'}:npcFordGate(s,p,next,arrival,t,t.target,fordCargo);if(r.status==='clear')locate(s,p,next,arrival);else if(r.status==='arrived')locate(s,p,r.crossing.to,r.crossing.arrivalX);else if(r.status==='bypass')t.fordDetour={target:t.target,path:r.path};else if(['defer','unavailable','aborted'].includes(r.status)){p.agenda.task=null;p.agenda.due=s.tick+8;p.status=t.migration?'wandering':'resident';}return false;}
  return true;
}
function finish(s,p,ctx){
  const m=p.agenda,t=m.task,site=t.workshop&&workshopSite(s,p.area,t.workshop.id),a=site?.inside?site.area:s.areas[p.area],maximum=p.maxHealth||100;
  if(t.kind==='moneyCache'){const amount=takeBuriedMoney(s,p,t.cache,8);if(amount)tell(s,p,`${p.name} забирает из известного тайника ◈${amount}.`,ctx);m.task=null;m.due=s.tick+48;return;}
  if(t.kind==='routeMap'){npcRouteMapAction(s,p,t,ctx);m.task=null;m.due=s.tick+48;return;}
  if(t.kind==='mapCopy'){mapCopyAction(s,p,t,ctx);m.task=null;m.due=s.tick+48;return;}
  if(t.kind==='rescueEscape'){finishRescueEscape(s,p);return;}
  if(t.kind==='itemSalvage'){const count=npcTakeCache(s,p,t);if(count)tell(s,p,`${p.name} подбирает оставленную поклажу: ${count} вещей. С ними ещё можно добраться до рынка.`,ctx);m.task=null;m.due=s.tick+48;return;}
  if(t.kind==='toolMend'){npcToolMend(s,p,ctx);m.task=null;m.due=s.tick+48;return;}
  if(t.kind==='repairCommission'){quoteRepair(s,p,t,ctx);return;}
  if(t.kind==='askAid'){finishAidRequest(s,p,t,ctx);return;}
  if(t.kind==='roomBook'){npcBookRoom(s,p,ctx);return;}
  if(t.kind==='roomSleep'){npcRoomRest(s,p);return;}
  if(['tavernVisit','tavernLeave'].includes(t.kind)){npcTavernAction(s,p);return;}
  let paid=false;
  if(t.kind==='work'&&damagedWorkplace(s,p)){m.task=null;m.due=s.tick;return;}
  if(t.kind==='work'&&npcToolBlocked(s,p)){m.task=null;m.due=s.tick;return;}
  if(t.kind==='propertyRepair'){npcRepairFinish(s,p,t,ctx);m.task=null;m.due=s.tick+48;return;}
  if(t.kind==='gather'){
    const food=takeForage(a,3);m.cargo=(m.cargo||0)+food*4;begin(p,'return',t.home,42,1);return;
  }
  if(t.kind==='rawGather'&&goodsEnabled(s)){
    const quantity=extractRaw(s,a,2);if(quantity)p.goodsRawCargo={quantity:(p.goodsRawCargo?.quantity||0)+quantity,source:a.id,owner:p.id};begin(p,'return',t.home,42,1);return;
  }
  if(t.kind==='return'){
    if(p.navigation?.commute?.from===p.area)p.navigation.commute=null;
    if(a.civic&&m.cargo){putGoods(s,a,'food',m.cargo,{reason:'forage-return',actor:p.id});tell(s,p,`${p.name} приносит собранную еду домой: +${m.cargo} к кладовой.`,ctx);m.cargo=0;}
    const delivery=deliverLocalFood(s,p,a);if(delivery){putGoods(s,a,'food',delivery.portions,{reason:'local-product-return',actor:p.id});tell(s,p,`${p.name} приносит местные продукты в кладовую: ${delivery.portions} порций.`,ctx);}
    if(goodsEnabled(s)&&p.goodsRawCargo?.quantity)deliverRaw(s,a,p,p.goodsRawCargo.quantity);
    p.status='resident';
  }else if(t.kind==='visit'){
    const other=s.people[t.person];
    const body=enabled(s,'npc-contacts')?localContact(s,t.person,p.area):null;
    const met=enabled(s,'npc-contacts')?Boolean(body&&Math.abs(body.x-p.x)*areaScale(s.areas[p.area])<12):Boolean(other?.alive&&other.area===p.area);
    if(met){shareMarketKnowledge(s,p.id,other.id);shareMarketKnowledge(s,other.id,p.id);m.visits++;m.lastVisit=s.tick;m.bonds[other.id]=(m.bonds[other.id]||0)+5;other.agenda.bonds[p.id]=(other.agenda.bonds[p.id]||0)+5;observeNPCContacts(s,p);observeNPCContacts(s,other);tell(s,p,`${p.name} навестил ${other.name}. Родственники обменялись вестями, связь стала теплее.`,ctx);}
    else if(enabled(s,'npc-contacts')){m.lastVisit=s.tick;missContact(s,p,t.person);tell(s,p,`${p.name} не застал родных по прежнему адресу. Где они теперь, он пока не знает.`,ctx);}
    if(t.personal)finishPersonalVisit(s,p,met);
    begin(p,'return',t.home,42,1,{...(t.knownNavigation?{knownNavigation:true}:{})});return;
  }else if(t.kind==='recover'){
    if(a.civic?.medicine>=2){a.civic.medicine-=2;p.health=Math.min(maximum,p.health+25);if(p.health>=maximum*.85){p.ailment=null;if(a.civic.crisis?.person===p.id)a.civic.crisis=null;}tell(s,p,`${p.name} сам приходит за помощью и расходует лекарства поселения.`,ctx);}
  }else if(t.kind==='tool'){
    if(marketEnabled(s)){const deal=tradeGoods(s,a,p.id,'tools','buy',1);if(deal.quantity){p.marketCargo.tools--;m.tools=1;tell(s,p,`${p.name} покупает инструмент за ◈${deal.total} на собственный заработок.`,ctx);}}
    else if(a.civic.tools>0&&m.wealth>=18){m.wealth-=18;a.civic.treasury+=18;takeGoods(s,a,'tools',1,{flow:'exported',reason:'personal-tool',actor:p.id});m.tools=1;tell(s,p,`${p.name} покупает инструменты на собственный заработок. Работа станет результативнее.`,ctx);}
  }else if(t.kind==='waitHarvest'){p.needs.energy=Math.min(100,p.needs.energy+8);m.task=null;m.due=s.tick+Math.max(8,Math.min(48,96-s.tick%96));return;}
  else if(t.kind==='resettle'){migrationArrived(s,p);tell(s,p,`${p.name} добирается до ${a.name}. Теперь здесь его новый дом.`,ctx);}
  else if(t.kind==='relocate'){p.status='resident';m.home=p.area;if(p.navigation)p.navigation.commute=null;
    tell(s,p,enabled(s,'npc-knowledge')&&t.knownNavigation&&!(a.civic?.treasury>=3)?`${p.name} приходит по старой записи о работе, но казна пуста. Придётся искать другое занятие.`:`${p.name} переезжает туда, где есть оплачиваемая работа.`,ctx);}
  else if(t.kind==='farm'&&a.civic){if(goodsEnabled(s)){const result=completeGoodsWork(s,a,t.goodsWork,{units:6+(m.tools?2:0)});paid=result.quantity>0;if(!paid)tell(s,p,`${p.name}: доступный урожай исчерпан. До восстановления угодий займусь другим делом.`,ctx);}else{a.civic.food=Math.min(100,a.civic.food+Math.round((6+(m.tools?2:0))*weatherAt(s,a).harvest));paid=true;}if(paid)m.work++;}
  else if(t.kind==='medicine'&&a.civic&&a.civic.food>0){takeGoods(s,a,'food',1,{reason:'medicine-material',actor:p.id});a.civic.medicine=Math.min(100,a.civic.medicine+4+(m.tools?1:0));m.work++;paid=true;}
  else if(t.kind==='patrol'&&a.civic){a.civic.safety=Math.min(100,a.civic.safety+2+(m.tools?1:0));m.work++;paid=true;}
  else if(t.kind==='learn'){
    if(m.work%5===0)tell(s,p,`${p.name} ${p.role==='ребёнок'?'учится читать дорожные знаки':'записывает историю своего места'}.`,ctx);m.work++;paid=p.role!=='ребёнок';
  }else if(t.kind==='work'&&a.civic){if(goodsEnabled(s)&&m.job==='artisan'){if(t.workMode==='service'){paid=p.goodsWork?.id!==t.goodsWork.id;if(paid)p.goodsWork={id:t.goodsWork.id,at:s.tick,kind:'service',quantity:0,reason:'service-started-with-production-off'};}else{const result=completeGoodsWork(s,a,t.goodsWork,{kind:'tools',units:1});paid=result.quantity>0;if(!paid)tell(s,p,`${p.name}: для выпуска инструмента нужны сырьё и доступная рабочая мастерская.`,ctx);}}else{paid=true;if(m.job==='artisan'&&(m.work+1)%3===0)a.civic.tools=Math.min(12,a.civic.tools+1);}if(paid)m.work++;}
  if(paid&&a.civic){const pay=Math.min(3,a.civic.treasury);a.civic.treasury-=pay;m.wealth+=pay;}
  if(paid&&t.kind==='work'&&m.job==='artisan'){const o=a.objects.find(o=>o.kind==='workshop'&&o.owner===p.id);if(o)recordToolUse(s,a,o,p.id,ctx);}
  m.task=null;m.due=s.tick+48+Math.floor(moduleRandom(s,'people')*48);
}
export function peopleTick(s,ctx){
  if(!enabled(s,'people')||s.tick%8!==0)return;
  for(const p of Object.values(s.people)){
    releaseLooseItems(s,p);
    endDeadMentorJourney(s,p);
    if(!p.alive||selfDrivenActor(s,p.id)||!p.area||!s.areas[p.area])continue;
    if(p.npcIntentions?.lastActionTick>=s.tick||p.companionAffairs?.lastActionTick>=s.tick||materialDeliverySpent(s,p.id))continue;
    const controller=npcController(s,p);
    if(enabled(s,'npc-control')&&!['personal','migration'].includes(controller)){if(controller==='none'&&p.agenda)p.agenda.task=null;continue;}
    if(!['resident','wandering'].includes(p.status)){p.agenda.task=null;continue;}
    if(enabled(s,'npc-logistics')&&p.freightReleasedAt===s.tick)continue;
    if(enabled(s,'npc-travel')&&p.journeyReleasedAt===s.tick)continue;
    if(!npcAction(s,p,controller))continue;
    rememberPracticalRole(s,p);
    observeNPCPlace(s,p);
    observeRouteMap(s,p);
    observeBestiaryTraces(s,p,ctx);
    observeMarket(s,p.id);
    observeNPCContacts(s,p);
    observeMentors(s,p);
    observeFreightActor(s,p,p.area,true);
    if(personNeeds(s,p,ctx))continue;
    if(npcInteriorStay(s,p))continue;
    if(brothTeacherTurn(s,p))continue;
    if(toolTeacherTurn(s,p))continue;
    if(materialOfferTurn(s,p,ctx))continue;
    const materialTrip=npcMaterialDeliveryPlan(s,p);
    if(!materialTrip)npcDeedsTick(s,p,ctx);
    if(p.caseReports?.length)announceCaseWitness(s,p);
    if(p.agenda.task?.kind==='caseRecordStudy'&&!enabled(s,'verdict-knowledge'))continue;
    if(p.agenda.task?.kind==='mentorLesson'&&(!mentorEnabled(s)||s.tick>p.personalJourney?.abandonAfter)){mentorLessonAction(s,p,ctx);continue;}
    if(p.agenda.task?.kind==='itemSalvage'&&!enabled(s,'item-originals'))p.agenda.task=null;
    if(['workshopTalk','workshopWait'].includes(p.agenda.task?.kind)&&!enabled(s,'workshop-dispute')){p.agenda.task=null;p.agenda.due=s.tick;}
    if(p.agenda.task?.kind==='askAid'&&!enabled(s,'personal-aid'))p.agenda.task=null;
    if(p.agenda.task?.kind==='refitBench'&&!npcRefitWait(s,p))continue;
    if(p.agenda.task?.kind==='itemRepairBench'&&!npcItemRepairWait(s,p))continue;
    if(p.agenda.task?.personal&&!enabled(s,'companion-goals'))continue;
    if(p.agenda.task?.kind==='propertyRepair'&&(!enabled(s,'property')||!enabled(s,'property-damage')))continue;
    if(p.agenda.task?.kind==='toolMend'&&(!enabled(s,'workshop-tools')||!enabled(s,'property')||p.agenda.task.methodSource==='npc-paid-lessons'&&!enabled(s,'mentor-journeys'))){p.agenda.toolMendPending=p.agenda.task;p.agenda.task=null;}
    if(p.agenda.task?.kind==='rawGather'&&!goodsEnabled(s))continue;
    if(p.agenda.task?.migration&&!enabled(s,'migrations'))continue;
    objectAt(s,p);
    if(p.status==='resident'&&p.agenda.task&&p.area!==p.agenda.task.target&&p.agenda.task.kind!=='return'&&p.agenda.task.kind!=='gather'&&p.agenda.task.kind!=='visit')p.agenda.task=null;
    if(!p.agenda.task){if(s.tick<p.agenda.due)continue;plan(s,p,ctx);}
    bindNPCDeedTask(s,p);
    if(!p.agenda.task||!moveTask(s,p,ctx))continue;
    if(['materialCollect','materialReturn'].includes(p.agenda.task.kind)){workMaterialDelivery(s,p,ctx);continue;}
    if(['workshopTalk','workshopWait'].includes(p.agenda.task.kind)){npcDisputeAction(s,p,p.agenda.task,ctx);continue;}
    if(p.agenda.task.kind==='caseRecordStudy'){caseRecordStudyAction(s,p);announceCaseWitness(s,p);continue;}
    if(p.agenda.task.kind==='mentorLesson'){mentorLessonAction(s,p,ctx);continue;}
    if(p.agenda.task.kind==='propertyRepair'&&npcRepairAction(s,p,p.agenda.task,ctx))continue;
    if(p.agenda.task.kind==='craftStudy'){const result=npcCraftStudyAction(s,p,p.agenda.task);if(result.learned)tell(s,p,`${p.name} осваивает подгонку рабочей детали после настоящих восстановлений и занятий у верстака.`,ctx);continue;}
    if(['forgeSupply','forgeWork'].includes(p.agenda.task.kind)){npcForgeAction(s,p,p.agenda.task,ctx);continue;}
    if(p.agenda.task.kind==='refitBench'){npcRefitWait(s,p);continue;}
    if(p.agenda.task.kind==='itemRepairBench'){npcItemRepairWait(s,p);continue;}
    if(p.agenda.task.kind==='bodyMaterial'){npcBiomaterialAction(s,p,p.agenda.task,ctx);continue;}
    if(['familySupply','familyAid'].includes(p.agenda.task.kind)){npcFamilyAction(s,p,p.agenda.task,ctx);continue;}
    if(p.agenda.task.kind==='gather'&&p.agenda.task.foodSource){
      if(!localFoodEnabled(s)){delete p.agenda.task.foodSource;delete p.agenda.task.foodWork;p.agenda.task.remaining=3;}
      else {const task=p.agenda.task,result=localFoodWork(s,p,s.areas[p.area],task,null,ctx);if(result.finished){if(result.receipt)tell(s,p,`${p.name}: ${LOCAL_FOODS[result.receipt.kind].name}, получено ${result.receipt.quantity}.`,ctx);begin(p,'return',task.home,42,1);}continue;}
    }
    if(p.agenda.task.kind==='work'&&p.agenda.job==='artisan'&&p.agenda.task.workMode===null)p.agenda.task.workMode=goodsEnabled(s)?'production':'service';
    if(goodsEnabled(s)&&(['farm','rawGather'].includes(p.agenda.task.kind)||p.agenda.task.kind==='work'&&p.agenda.job==='artisan')){goodsWorkReceipt(s,p,p.agenda.task);p.needs.energy=Math.max(0,p.needs.energy-2);}
    if(p.agenda.task.kind==='toolMend'&&p.needs)p.needs.energy=Math.max(0,p.needs.energy-2);
    if(p.agenda.task.kind==='patrol'&&enabled(s,'npc-watch-needs')&&enabled(s,'npc-needs'))p.needs.energy=Math.max(0,p.needs.energy-2);
    p.agenda.task.remaining--;if(p.agenda.task.remaining<=0)finish(s,p,ctx);
  }
}
