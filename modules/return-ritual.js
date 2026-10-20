import {returnsOn,returnReason,returnSource} from './return-state.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {canStartNPCActivity} from './npc-control.js';
// Called inside the native personal action, after needs and the controller gate.
export function returnNPCTurn(s,p,ctx){
 const q=p.returnRite,a=s.areas[p.area];
 if(!returnsOn(s)||!q||q.used||!a||!canStartNPCActivity(s,p,{inTurn:true})||q.lastAction===s.tick)return false;
 if(p.health<(p.maxHealth||100)*.7||p.needs.hunger>=65||p.needs.energy<30||p.agenda.duty<.6){if(q.task){q.refusal={body:q.task.body,at:s.tick,reason:'Не хватает сил или готовности'};q.task=null;}return false;}
 const nearby=b=>b.position.kind==='area'&&b.position.area===a.id&&physicalDistance(a,p.x,b.position.x)<=24;
 let b=q.task&&s.remains?.byId[q.task.body];
 if(q.task&&(!returnSource(s,b)||!nearby(b)||!returnReason(s,p,b))){q.refusal={body:q.task.body,at:s.tick,reason:'Тело недоступно или обряд опоздал'};q.task=null;return false;}
 if(!b)b=Object.values(s.remains?.byId||{}).find(b=>returnSource(s,b)&&nearby(b)&&returnReason(s,p,b));
 if(!b)return false;
 // A visible physical relic is collected once through the same taken flag as exploration.
 if(!q.relic){const r=a.objects.find(o=>o.kind==='relic'&&!o.taken&&physicalDistance(a,p.x,o.x)<=24);if(!r)return false;q.lastAction=s.tick;p.needs.energy-=2;
  if(physicalDistance(a,p.x,r.x)>2){p.x+=areaStep(a,p.x,r.x,6);return true;}
  r.taken=true;q.relic={area:a.id,object:r.id,at:s.tick};p.agenda.task=null;return true;
 }
 q.task ||= {body:b.id,deathId:b.deathId,known:s.tick,reason:returnReason(s,p,b),prepared:0};
 p.agenda.task=null;q.lastAction=s.tick;p.needs.energy-=2;
 if(physicalDistance(a,p.x,b.position.x)>2){p.x+=areaStep(a,p.x,b.position.x,6);return true;}
 q.task.prepared++;
 if(q.task.prepared===3){if(ctx.returnPerson?.(s,p,b,q.task,q.relic)){q.used={body:b.id,at:s.tick};q.relic=null;q.task=null;}else{q.refusal={body:b.id,at:s.tick,reason:'Возвращение уже невозможно'};q.task=null;}}
 return true;
}
