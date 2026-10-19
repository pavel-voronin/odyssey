import {buildingControlOn,controlSite,controllingThreat} from './building-control-state.js';
import {areaStep,physicalDistance} from '../geometry.js';
function event(s,o,kind,captor,reason=null){const q=o.control;q.history.push({tick:s.tick,kind,captor,reason});if(q.history.length>8)q.history.shift();}
export function buildingControlTick(s){if(!buildingControlOn(s))return;const claimed=new Set();for(const a of Object.values(s.areas))for(const o of a.objects.filter(o=>o.kind==='workshop')){
 const found=controllingThreat(s,a,o),e=found?.enemy,q=o.control;
 if(e&&!claimed.has(e.id)){claimed.add(e.id);if(q?.status==='blocked'&&q.captor===e.id){q.lastSeen=s.tick;continue;}const history=q?.history||[];o.control={version:1,status:'blocked',captor:e.id,person:e.person||null,area:found.place.id,started:s.tick,lastSeen:s.tick,released:null,reason:null,ownerAtStart:o.owner,history};event(s,o,'blocked',e.id);}
 else if(q?.status==='blocked'){const old=s.areas[q.area]?.objects.find(x=>x.id===q.captor),reason=!old||old.alive&&!old.resolved?'gone':old.alive?'resolved':'defeated';q.status='released';q.released=s.tick;q.reason=reason;event(s,o,'released',q.captor,reason);}
 }}
// The existing personal controller has already claimed this body's action.
export function displacedOwnerTurn(s,p,ctx){if(!buildingControlOn(s))return false;let site;
 for(const a of Object.values(s.areas)){const o=a.objects.find(o=>o.kind==='workshop'&&o.owner===p.id&&[a.id,o.workshopInterior?.area].includes(p.area)&&controllingThreat(s,a,o));if(o){site=controlSite(s,a,o);break;}}
 let q=p.controlDisplacement;if(site){const {area:a,object:o,room}=site;if(![a.id,room?.id].includes(p.area)||p.status!=='resident'||!p.alive)return false;const threat=controllingThreat(s,a,o);if(!q||q.property!==o.id){q=p.controlDisplacement={version:1,property:o.id,area:a.id,started:s.tick,lastTick:-1,stage:'leaving',owner:p.id,task:p.agenda.task?structuredClone(p.agenda.task):null};p.agenda.knowledge.push({tick:s.tick,text:'Мастерская занята '+threat.enemy.name+'. Право осталось моим, но работать там сейчас нельзя.'});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();}
 if(q.lastTick===s.tick)return false;q.lastTick=s.tick;p.agenda.task=null;
 if(p.area===room?.id){if(physicalDistance(room,p.x,8)>1){p.x+=areaStep(room,p.x,8,6);p.needs.energy=Math.max(0,p.needs.energy-1);}else{p.area=a.id;p.x=o.x;}q.stage='leaving';return true;}
 const target=o.x<50?Math.min(95,o.x+22):Math.max(5,o.x-22);if(physicalDistance(a,p.x,target)>1){p.x+=areaStep(a,p.x,target,6);p.needs.energy=Math.max(0,p.needs.energy-1);q.stage='leaving';}else{q.stage='waiting';p.needs.energy=Math.min(100,p.needs.energy+2);}return true;
 }
 if(!q||!p.alive||q.owner!==p.id)return false;const a=s.areas[q.area],o=a?.objects.find(o=>o.id===q.property);if(!o||o.owner!==p.id){delete p.controlDisplacement;return false;}if(p.area!==a.id||p.needs.energy<15||p.needs.hunger>=70)return false;if(q.lastTick===s.tick)return false;q.lastTick=s.tick;q.stage='returning';if(physicalDistance(a,p.x,o.x)>1){p.x+=areaStep(a,p.x,o.x,6);p.needs.energy=Math.max(0,p.needs.energy-1);return true;}if(q.task&&o.state==='intact')p.agenda.task=q.task;delete p.controlDisplacement;p.agenda.knowledge.push({tick:s.tick,text:'Проход к своей мастерской снова свободен. Состояние помещения и прежние договоры сохранились.'});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();return true;
}
