import {areaScale,areaOffset,campPassage,physicalDistance} from '../geometry.js';
import {recordPersonRemains} from './remains.js';
import {npcFordGate} from './ford-actors.js';
import {enabled} from '../rules.js';
import {areaObservation,heroPresent} from './background-towns.js';
import {observeNPCPlace,npcKnownRoute,knownNPCHazards,roadStillPresent,forgetNPCRoad,rememberNPCHazard} from './npc-knowledge.js';
import {observeNPCContacts} from './npc-contacts.js';
import {observeFreightActor} from './freight-memory.js';
import {canStartNPCActivity,npcAction,markNPCDeparture} from './npc-control.js';
import {reserveRoadSupplies,roadNeeds} from './road-needs.js';
import {recordDangerContact} from './danger-contact.js';
import {recordLastingInjury} from './injury-events.js';
import {encounterBestiary} from './bestiary.js';

export function availablePublicTraveller(s,p,a){
  const rested=!enabled(s,'npc-needs')||!p?.needs?.sleeping&&(p?.needs?.energy??100)>=40&&(p?.needs?.hunger??0)<60;
  return Boolean(p?.alive&&canStartNPCActivity(s,p)&&p.area===a.id&&p.status==='resident'&&p.role!=='ребёнок'&&p.agenda&&!p.agenda.task&&rested&&p.health>=(p.maxHealth||100)*.6&&
    p.personalJourney?.status!=='active'&&!(p.migration&&s.migrations?.[p.migration]?.status==='active')&&
    !s.hero.companions.some(c=>c.person===p.id)&&!s.society.orders.some(o=>o.person===p.id)&&!s.society.journeys.some(j=>j.person===p.id)&&!s.logistics.convoys.some(c=>c.person===p.id));
}
export function publicDestinations(s,p){
  if(!enabled(s,'npc-travel')||!enabled(s,'npc-knowledge'))return [];
  return (p.navigation?.places||[]).filter(place=>place.area!==p.area&&Number.isFinite(place.workSeen)).map(place=>({place,path:npcKnownRoute(p,p.area,place.area,knownNPCHazards(s,p))})).filter(e=>e.path.length>=2&&e.path.length<=7);
}
function observe(s,p){observeNPCPlace(s,p);observeNPCContacts(s,p);observeFreightActor(s,p,p.area,true);}
function report(s,p,text,ctx,kind='journey'){
  const a=s.areas[p.area],event={tick:s.tick,area:a.id,text,kind,...areaObservation(s,a,'journey')};
  if(p.alive&&!event.witnesses.includes(p.id))event.witnesses.push(p.id);
  s.society.events.unshift(event);if(s.society.events.length>160)s.society.events.length=160;
  s.changes.push({tick:s.tick,text,id:event.id,area:a.id,knownBy:[...event.knownBy]});
  p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();
  if(heroPresent(s,a))ctx.log(s,text,kind);
}
function configure(s,j,p){
  const next=j.path[j.index+1];j.remaining=j.segmentTicks=Math.ceil(20*areaScale(s.areas[p.area]));j.startX=p.x;
  j.endX=next?(Number(next.slice(1))>Number(p.area.slice(1))?100:0):42;p.facing=Math.sign(j.endX-p.x)||p.facing||1;
  const passage=next&&campPassage(s,p.area,next,p.id);if(passage){j.endX=passage.x??p.x;j.remaining=j.segmentTicks=Math.max(1,Math.ceil(physicalDistance(s.areas[p.area],p.x,j.endX)/6));p.facing=Math.sign(j.endX-p.x)||p.facing||1;}
}
export function startPublicJourney(s,p,a,destination,ctx){
  if(!enabled(s,'npc-travel')||!availablePublicTraveller(s,p,a))return null;
  const known=publicDestinations(s,p).find(e=>e.place.area===destination?.place?.area);if(!known)return null;
  reserveRoadSupplies(s,p,a);
  const j={person:p.id,from:a.id,to:known.place.area,targetName:known.place.name,path:[...known.path],index:0,version:1,movement:'physical',started:s.tick,lastTick:s.tick,elapsed:0,reason:a.civic?.food<40?'Ищет убежище от местного голода на знакомой дороге.':'Хочет вернуться на знакомый рынок.'};
  p.status='travelling';p.agenda.task=null;a.population=a.population.filter(id=>id!==p.id);a.objects=a.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);
  s.society.journeys.push(j);markNPCDeparture(s,p,'journey');configure(s,j,p);observe(s,p);
  report(s,p,`${p.name} отправляется в ${j.targetName} по знакомой дороге. ${j.reason}`,ctx);return j;
}
function finish(s,j,p,ctx,outcome){
  if(!s.society.journeys.includes(j))return;
  s.society.journeys=s.society.journeys.filter(other=>other!==j);
  const a=s.areas[p.area];
  if(p.alive){
    p.status='resident';p.journeyReleasedAt=s.tick;p.agenda.task=null;p.agenda.due=s.tick+48;
    a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);
    const body=a.objects.find(o=>o.kind==='resident'&&o.person===p.id);if(body)body.x=p.x;else a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
    observe(s,p);
  }
  const text=outcome==='arrived'?`${p.name} прибывает в ${a.name}. ${j.reason}`:outcome==='returned'?`${p.name} возвращается в ${a.name}: прежняя дорога оказалась недоступна.`:outcome==='dead'?`${p.name} погибает на дороге в месте «${a.name}». Его путь здесь закончился.`:`${p.name} прекращает переход в месте «${a.name}». Дальше пройти не удалось.`;
  report(s,p,text,ctx,outcome==='dead'?'loss':'journey');
}
function turnBack(s,j,p,ctx){
  if(j.returning){finish(s,j,p,ctx,'stopped');return;}
  j.returning=true;j.path=j.path.slice(0,j.index+1).reverse();j.index=0;configure(s,j,p);
  report(s,p,`${p.name} меняет путь и пробует вернуться по уже пройденной дороге.`,ctx);
}
export function advancePublicJourney(s,j,ctx){
  if(!enabled(s,'npc-travel')||!s.society.journeys.includes(j)||j.lastTick===s.tick)return;
  const p=s.people[j.person];if(!p?.alive){s.society.journeys=s.society.journeys.filter(other=>other!==j);return;}
  if(!npcAction(s,p,'journey'))return;
  j.lastTick=s.tick;j.elapsed++;
  if(p.status!=='travelling'||p.area!==j.path[j.index]){if(enabled(s,'npc-control'))finish(s,j,p,ctx,'stopped');return;}
  if(!p.fordCrossing&&!p.liftTransit&&j.elapsed>720){finish(s,j,p,ctx,'stopped');return;}
  if(!p.fordCrossing&&!p.liftTransit&&j.elapsed>480&&!j.returning){turnBack(s,j,p,ctx);return;}
  if(roadNeeds(s,p,ctx)){if(!p.alive)finish(s,j,p,ctx,'dead');return;}
  if(p.fordCrossing||p.liftTransit){const r=npcFordGate(s,p,(p.fordCrossing||p.liftTransit).to,(p.fordCrossing||p.liftTransit).arrivalX,j,j.path.at(-1));if(r.status==='arrived'){p.area=r.crossing.to;p.x=r.crossing.arrivalX;j.index++;observe(s,p);configure(s,j,p);}else if(['aborted','unavailable'].includes(r.status))turnBack(s,j,p,ctx);return;}
  const camp=j.path[j.index+1]&&campPassage(s,p.area,j.path[j.index+1],p.id);if(camp&&!camp.allowed){turnBack(s,j,p,ctx);return;}
  if(camp&&j.endX!==camp.x){j.startX=p.x;j.endX=camp.x;j.remaining=j.segmentTicks=Math.max(1,Math.ceil(physicalDistance(s.areas[p.area],p.x,camp.x)/6));}
  j.remaining--;const oldX=p.x,progress=Math.max(0,Math.min(1,1-j.remaining/j.segmentTicks));p.x=j.startX+(j.endX-j.startX)*progress;
  const a=s.areas[p.area],enemy=a.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&Math.abs(p.x-o.x)*areaScale(s.areas[p.area])<Math.abs(oldX-o.x)*areaScale(s.areas[p.area])&&o.x>=Math.min(oldX,p.x)-areaOffset(s.areas[p.area],8)&&o.x<=Math.max(oldX,p.x)+areaOffset(s.areas[p.area],8));
  if(enemy){
    const before=p.health;
    p.x=Math.abs(oldX-enemy.x)*areaScale(s.areas[p.area])<=8?oldX:enemy.x-Math.sign(p.x-oldX)*areaOffset(s.areas[p.area],8);rememberNPCHazard(s,p);const damage=Math.max(1,enemy.attack||1);p.health=Math.max(0,p.health-damage);recordDangerContact(s,p,enemy,damage,'journey');
    recordLastingInjury(s,p,enemy,{before,after:p.health,maximum:p.maxHealth||100,area:a.id,controller:'journey'},ctx);
    if(p.health>0)encounterBestiary(s,p,enemy);
    if(!p.health){p.alive=false;p.status='dead';p.died=s.tick;p.deathCause=enemy.name||enemy.baseName||'Опасность на дороге';if(!a.objects.some(o=>o.id==='journey-grave-'+p.id))a.objects.push({id:'journey-grave-'+p.id,kind:'grave',name:p.name,x:p.x});recordPersonRemains(s,p);finish(s,j,p,ctx,'dead');}
    else turnBack(s,j,p,ctx);
    return;
  }
  if(j.remaining>0)return;
  const next=j.path[j.index+1];
  if(!next){finish(s,j,p,ctx,j.returning?'returned':'arrived');return;}
  if(!roadStillPresent(s,p.area,next)){forgetNPCRoad(p,p.area,next);turnBack(s,j,p,ctx);return;}
  const ford=camp?{status:'clear'}:npcFordGate(s,p,next,j.endX===100?5:95,j,j.path.at(-1));if(ford.status!=='clear'){if(ford.status==='bypass'){j.path=[...j.path.slice(0,j.index),...ford.path];configure(s,j,p);}else if(['defer','unavailable','aborted'].includes(ford.status))turnBack(s,j,p,ctx);return;}
  const direction=j.endX===100?1:-1;p.area=next;p.x=camp?.arrival??(direction>0?5:95);j.index++;observe(s,p);configure(s,j,p);
}
