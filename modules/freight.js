import {metricTravelRate} from './metric-route.js';
import {carrierNewsContact} from './witness-news.js';
import {areaScale,areaOffset,campPassage,physicalDistance} from '../geometry.js';
import {npcFordGate} from './ford-actors.js';
import {disruptionChoice,rememberDisruption,shedFreightCargo,disruptionEnabled} from './freight-disruption.js';
import {recordDangerContact} from './danger-contact.js';
import {approachFreightKeeper} from './freight-custody.js';
import {finishMerchantFreight} from './merchant-settlement.js';
import {demandDeparture} from './demand-freight.js';
import {takeGoods,putGoods} from './goods.js';
import {enabled} from '../rules.js';
import {selfDrivenActor} from '../actor-projection.js';
import {roadStillPresent,forgetNPCRoad,rememberNPCHazard} from './npc-knowledge.js';
import {freightRequest,freightEvent,observeFreightActor,observeConvoy} from './freight-memory.js';
import {npcAction,markNPCDeparture} from './npc-control.js';
import {roadNeeds} from './road-needs.js';
export function freightHistory(s,c,outcome,proof){
  s.logistics.history.push({id:c.id,source:c.source,to:c.to,person:c.person,tick:s.tick,outcome,area:proof.area,eventId:proof.id,knownBy:[...proof.knownBy],wage:c.wagePaid||0,...(c.disruption?{disruption:structuredClone(c.disruption)}:{}),...(c.handoff?.load?{keeper:c.handoff.keeper,load:c.handoff.load,fee:c.custodyFee||0}:{}),...(c.trade?{trade:{cost:c.trade.cost,foodCost:c.trade.foodCost,revenue:c.tradeOutcome?.revenue||0,net:(c.tradeOutcome?.revenue||0)-c.trade.cost-c.trade.foodCost-(c.custodyFee||0)}}:{})});
  if(s.logistics.history.length>80)s.logistics.history.shift();
}
function removeFreight(s,c){s.logistics.convoys=s.logistics.convoys.filter(other=>other!==c);}
function cacheCargo(s,c,a,food,medicine,name='Брошенный груз каравана',tools=c.tools||0){
  if(food<=0&&medicine<=0&&!(tools>0))return;
  if(!a.objects.some(o=>o.id===c.id+'-cargo'))a.objects.push({id:c.id+'-cargo',kind:'supplyCache',name,x:Math.min(92,Math.max(8,s.people[c.person]?.x||55)),food,medicine,...(tools?{tools}:{}),taken:false});
}
function releaseDriver(s,c){
  const p=s.people[c.person],a=s.areas[p.area];if(!p.alive)return;
  p.status='resident';p.freightReleasedAt=s.tick;p.agenda.task=null;p.agenda.due=s.tick+8;
  a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);
  if(!a.objects.some(o=>o.kind==='resident'&&o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
}
function configureLeg(s,c,p,ticks=16){
  const next=c.path[c.index+1];c.segmentTicks=Math.ceil(ticks*areaScale(s.areas[p.area]));c.remaining=c.segmentTicks;c.startX=p.x;
  c.endX=next?(Number(next.slice(1))>Number(p.area.slice(1))?100:0):55;p.facing=Math.sign(c.endX-c.startX)||p.facing||1;
  const metric=next&&s.edges[[p.area,next].sort().join('|')]?.metric;if(metric)c.remaining=c.segmentTicks=Math.max(1,Math.ceil(physicalDistance(s.areas[p.area],p.x,c.endX)/metricTravelRate(s,p,metric,{carrier:true,cargoFood:c.food}).speed));
  const passage=next&&campPassage(s,p.area,next,p.id,{carrier:true});if(passage){c.endX=passage.x??p.x;c.remaining=c.segmentTicks=Math.max(1,Math.ceil(physicalDistance(s.areas[p.area],p.x,c.endX)/6));p.facing=Math.sign(c.endX-p.x)||p.facing||1;}
}
function finishFreight(s,c,ctx,outcome){
  if(!s.logistics.convoys.includes(c))return;
  const p=s.people[c.person],a=s.areas[p.area],food=c.food,medicine=c.medicine;
  if(c.trade&&['delivered','returned'].includes(outcome)){
    const r=finishMerchantFreight(s,c,outcome);c.tradeOutcome=r;releaseDriver(s,c);if(r.sold)s.logistics.deliveries++;
    const proof=freightEvent(s,c,a,`${p.name} продаёт своих инструментов ${r.sold} за ◈${r.revenue}. Денежный итог после покупки и провианта ◈${r.net}; непроданных ${r.remaining}, они остаются у него.`,ctx);freightHistory(s,c,outcome,proof);removeFreight(s,c);observeFreightActor(s,p);return;
  }
  if(['delivered','returned'].includes(outcome)&&a.civic){
    const acceptedFood=Math.min(food,Math.max(0,100-a.civic.food)),acceptedMedicine=Math.min(medicine,Math.max(0,100-a.civic.medicine));
    putGoods(s,a,'food',acceptedFood,{reason:'freight-'+outcome,actor:p.id});a.civic.medicine+=acceptedMedicine;
    cacheCargo(s,c,a,food-acceptedFood,medicine-acceptedMedicine,'Припасы, не поместившиеся в кладовой',0);
    if(c.tools)putGoods(s,a,'tools',c.tools,{reason:'freight-'+outcome,actor:p.id});
    if(a.civic.food>=40&&a.civic.crisis?.kind==='hunger')a.civic.crisis=null;
    if(outcome==='delivered'){s.logistics.deliveries++;c.wagePaid=Math.min(3,Math.max(0,a.civic.treasury||0));a.civic.treasury-=c.wagePaid;p.agenda.wealth+=c.wagePaid;p.agenda.work++;}
    releaseDriver(s,c);c.food=0;c.medicine=0;if(c.tools)c.tools=0;
    const text=outcome==='delivered'?`${p.name} привозит в ${a.name}: еда ${food}, инструменты ${c.demand?.kind==='tools'?c.demand.quantity:0}, медицина ${medicine}. Оплата из казны: ◈${c.wagePaid}.`:`${p.name} возвращает в ${a.name} оставшиеся припасы: еда ${food}, медицина ${medicine}. Путь оказался недоступен.`;
    const proof=freightEvent(s,c,a,text,ctx);freightHistory(s,c,outcome,proof);removeFreight(s,c);observeFreightActor(s,p);return;
  }
  cacheCargo(s,c,a,food,medicine);c.food=0;c.medicine=0;if(c.tools)c.tools=0;s.logistics.losses++;
  releaseDriver(s,c);const proof=freightEvent(s,c,a,p.alive?`${p.name} оставляет груз в месте «${a.name}»: дальше пройти не удалось. Припасы остаются здесь.`:`${p.name} погибает в месте «${a.name}». Его припасы остаются на дороге.`,ctx);
  freightHistory(s,c,'stranded',proof);removeFreight(s,c);
}
export function abandonFreight(s,c,ctx){finishFreight(s,c,ctx,'stranded');}
function freightFailure(s,c,cause,ctx){
 delete c.handoff;const d=disruptionChoice(s,c,cause);if(!d){returnFreight(s,c,ctx);return;}rememberDisruption(s,c,d);
 freightEvent(s,c,s.areas[s.people[c.person].area],d.reason,ctx);
 if(d.choice==='buyer'){c.to=d.to;c.targetName=d.name;c.path=d.path;c.index=0;c.returning=false;delete c.escort;configureLeg(s,c,s.people[c.person]);return;}
 if(d.choice==='custody'){c.handoff={version:1,keeper:d.keeper,status:'approach',started:s.tick,until:s.tick+48};return;}
 if(d.choice==='stranded'){finishFreight(s,c,ctx,'stranded');return;}returnFreight(s,c,ctx);
}
function returnFreight(s,c,ctx){
  if(c.returning){finishFreight(s,c,ctx,'stranded');return;}
  const p=s.people[c.person];c.returning=true;c.path=c.path.slice(0,c.index+1).reverse();c.index=0;delete c.escort;
  configureLeg(s,c,p);freightEvent(s,c,s.areas[p.area],`${p.name} разворачивает свой груз. Попробует вернуться по уже пройденной дороге.`,ctx);
}
function captureFreight(s,c,p,a,ctx,enemy){
  rememberNPCHazard(s,p);if(shedFreightCargo(s,c,enemy)){recordDangerContact(s,p,s.areas[p.area].objects.find(o=>o.id===c.escaped.enemy),20,'caravan');freightEvent(s,c,a,c.disruption.events.at(-1).reason,ctx);returnFreight(s,c,ctx);return;}p.status='captive';p.health=Math.max(1,p.health-20);
  if(!a.objects.some(o=>o.id===c.id+'-captive'))a.objects.push({id:c.id+'-captive',kind:'captive',person:p.id,name:p.name,x:p.x,resolved:false});
  cacheCargo(s,c,a,c.food,c.medicine);c.food=0;c.medicine=0;if(c.tools)c.tools=0;s.logistics.losses++;
  const proof=freightEvent(s,c,a,`${p.name} перехвачен в месте «${a.name}». Его груз остался на дороге.`,ctx);freightHistory(s,c,'captured',proof);removeFreight(s,c);
}
export function createFreight(s,source,destination,ctx,driverId=null){
  const request=freightRequest(s,source,destination,driverId);if(!request)return null;
  return departFreight(s,source,destination,request,ctx);
}
export function departFreight(s,source,destination,request,ctx,paid=null){
  const p=request.driver,medicine=request.kind?(request.kind==='medicine'?request.quantity:0):Math.min(4,Math.max(0,source.civic.medicine-30));
  const food=request.kind?(request.kind==='food'?request.quantity:0):12,tools=request.kind==='tools'?request.quantity:0;
  if(!paid&&request.kind!=='medicine'&&takeGoods(s,source,request.kind||'food',request.quantity||12,{flow:'exported',reason:'freight-departure',actor:p.id})!==(request.quantity||12))return null;source.civic.medicine-=medicine;
  const c={id:'convoy-'+s.logistics.nextConvoy++,person:p.id,source:source.id,to:destination.id,path:[...request.path],index:0,food,medicine,...(tools?{tools}:{}),version:1,movement:'physical',elapsed:0,lastTick:s.tick,
    sourceName:source.name,targetName:request.market.name,manifest:{author:request.author,seen:request.market.seen},sightings:{}};
  if(paid)c.trade=paid;else if(request.kind)demandDeparture(s,source,c,request);
  s.logistics.convoys.push(c);p.status='caravan';p.agenda.task=null;
  markNPCDeparture(s,p,'caravan');
  source.population=source.population.filter(id=>id!==p.id);source.objects=source.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);
  configureLeg(s,c,p,48);freightEvent(s,c,source,`${p.name} везёт припасы в ${c.targetName}: ${request.author===p.id?'помнит прежнюю нехватку':'получил сведения и маршрут от героя'}. Груз вычтен из кладовой.${c.demand?` Потребность по сведениям от тика ${c.demand.seen}: ${c.demand.kind==='food'?'еда':c.demand.kind==='medicine'?'медицина':'инструменты'} ${c.demand.knownStock}/${c.demand.target}; партия ${c.demand.quantity}, резерв отправителя ${c.demand.reserve}.`:''}`,ctx);observeFreightActor(s,p);carrierNewsContact(s,p,ctx);return c;
}
export function advanceFreight(s,c,ctx){
  if(!enabled(s,'npc-logistics')||!s.logistics.convoys.includes(c)||c.lastTick===s.tick)return;
  const p=s.people[c.person];if(!p)return;
  if(!p.alive){finishFreight(s,c,ctx,'stranded');return;}
  if(!npcAction(s,p,'caravan'))return;
  c.lastTick=s.tick;c.elapsed++;
  if(p.status!=='caravan'||p.area!==c.path[c.index]){if(enabled(s,'npc-control'))finishFreight(s,c,ctx,'stranded');return;}
  observeConvoy(s,c);
  if(!p.fordCrossing&&!p.liftTransit&&!p.roadTransit&&c.elapsed>720){finishFreight(s,c,ctx,'stranded');return;}
  if(!p.fordCrossing&&!p.liftTransit&&!p.roadTransit&&c.elapsed>480&&!c.returning){returnFreight(s,c,ctx);return;}
  if(roadNeeds(s,p,ctx,c)){if(!p.alive)finishFreight(s,c,ctx,'stranded');return;}
  if(c.handoff){const result=approachFreightKeeper(s,c);if(result==='accepted'){p.freightStored={id:c.id,keeper:c.handoff.keeper,area:p.area,owner:c.trade?p.id:'civic/'+c.source};releaseDriver(s,c);const proof=freightEvent(s,c,s.areas[p.area],`${p.name} оставляет тот же груз у ${s.people[c.handoff.keeper].name}. Хранение оплачено ◈${c.custodyFee||0}; доставка адресату не состоялась.`,ctx);freightHistory(s,c,'stored',proof);removeFreight(s,c);}else if(result==='failed')freightFailure(s,c,'keeper-declined',ctx);return;}
  if(p.fordCrossing||p.liftTransit||p.roadTransit){const r=npcFordGate(s,p,(p.fordCrossing||p.liftTransit||p.roadTransit).to,(p.fordCrossing||p.liftTransit||p.roadTransit).arrivalX,c,c.path.at(-1),{carrier:true,cargoFood:c.food});if(r.status==='arrived'){p.area=r.crossing.to;p.x=r.crossing.arrivalX;c.index++;observeFreightActor(s,p);observeConvoy(s,c);configureLeg(s,c,p);}else if(['aborted','unavailable'].includes(r.status))returnFreight(s,c,ctx);return;}
  const camp=c.path[c.index+1]&&campPassage(s,p.area,c.path[c.index+1],p.id,{carrier:true});if(camp&&!camp.allowed&&(!disruptionEnabled(s)||physicalDistance(s.areas[p.area],p.x,camp.x??p.x)<=1)){freightFailure(s,c,c.returning?'return-blocked':'blocked-gate',ctx);return;}
  if(camp&&c.endX!==camp.x){c.startX=p.x;c.endX=camp.x;c.remaining=c.segmentTicks=Math.max(1,Math.ceil(physicalDistance(s.areas[p.area],p.x,camp.x)/6));}
  const next=s.areas[c.path[c.index+1]];
  const escort=s.actorStates?.[c.escort];if(selfDrivenActor(s,escort)&&next&&(escort.transit||escort.area!==next.id||escort.combat||next.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved)))return;
  c.remaining--;const progress=Math.max(0,Math.min(1,1-c.remaining/c.segmentTicks)),oldX=p.x;p.x=c.startX+(c.endX-c.startX)*progress;
  const local=s.areas[p.area],enemy=local.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&!(c.escaped?.enemy===o.id&&c.escaped.area===p.area&&c.returning&&physicalDistance(local,p.x,o.x)>=physicalDistance(local,oldX,o.x))&&o.x>=Math.min(oldX,p.x)-areaOffset(s.areas[p.area],8)&&o.x<=Math.max(oldX,p.x)+areaOffset(s.areas[p.area],8));
  if(enemy){p.x=Math.abs(enemy.x-oldX)*areaScale(s.areas[p.area])<=8?oldX:enemy.x-Math.sign(p.x-oldX)*areaOffset(s.areas[p.area],8);captureFreight(s,c,p,local,ctx,enemy);return;}
  carrierNewsContact(s,p,ctx);
  if(c.remaining>0)return;
  if(!next){if(c.path[c.index+1]){freightFailure(s,c,c.returning?'return-blocked':'blocked-road',ctx);return;}if(!local.civic){freightFailure(s,c,'market-gone',ctx);return;}finishFreight(s,c,ctx,c.returning?'returned':'delivered');return;}
  if(camp&&!camp.allowed){freightFailure(s,c,c.returning?'return-blocked':'blocked-gate',ctx);return;}
  if(!roadStillPresent(s,p.area,next.id)){forgetNPCRoad(p,p.area,next.id);freightFailure(s,c,c.returning?'return-blocked':'blocked-road',ctx);return;}
  const ford=camp?{status:'clear'}:npcFordGate(s,p,next.id,c.endX===100?5:95,c,c.path.at(-1),{carrier:true,cargoFood:c.food});if(ford.status!=='clear'){if(ford.status==='bypass'){c.path=[...c.path.slice(0,c.index),...ford.path];configureLeg(s,c,p);}else if(['defer','unavailable','aborted'].includes(ford.status))returnFreight(s,c,ctx);return;}
  const direction=c.endX===100?1:-1;p.area=next.id;p.x=camp?.arrival??(direction>0?5:95);c.index++;
  observeFreightActor(s,p);observeConvoy(s,c);
  configureLeg(s,c,p);
}
