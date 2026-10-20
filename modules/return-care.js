import {careOn,careBody,careInventory,careMemory,careReady,doctorReady,observeReturnCare,careChoice,blockCare,safeCareLocal} from './return-care-state.js';
import {npcController,canStartNPCActivity} from './npc-control.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {walkCampOrder} from './camp-route.js';
import {physicalDistance} from '../geometry.js';
function spend(s,p,kind='work',cost=1){const c=careMemory(p),b=careBody(s,p);c.lastAction=s.tick;c.activity=kind;if(b.lineage){b.energy=Math.max(0,b.energy-cost);b.lastAction=kind;}else p.needs.energy=Math.max(0,p.needs.energy-cost);}
const contact=(s,p,d)=>{const b=careBody(s,p);return d?.area===b.area&&physicalDistance(s.areas[b.area],b.x,d.x)<=2;};
function stop(s,p,reason,block=true){const c=careMemory(p),r=c.request;if(r&&block){const n=c.doctors.find(n=>n.person===r.doctor);blockCare(s,p,{...n,doctor:r.doctor,area:r.area},reason);}c.request=null;c.refusal={at:s.tick,reason};}
export function settleReturnCare(s){for(const p of Object.values(s.people)){const c=p.returnEpisode?.care,r=c?.request;if(r&&(!careOn(s)||!p.alive||s.tick-r.asked>=48))stop(s,p,!p.alive?'Тело больше не действует':!careOn(s)?'Обряды приостановлены':'Специалист не завершил обряд в срок',careOn(s));}}
export function returnCareAction(s,p,g,ctx,{inTurn=false}={}){const c=p.returnEpisode&&careMemory(p),b=c&&careBody(s,p);if(!c||!careReady(s,p)||c.lastAction===s.tick||!b.lineage&&(!inTurn||!canStartNPCActivity(s,p,{inTurn:true})))return false;
 if(g.kind==='returnCareWait'){if(c.request&&(!s.people[c.request.doctor]?.alive||!contact(s,p,s.people[c.request.doctor])||!safeCareLocal(s,p,b.x))){stop(s,p,'Пришлось прервать ожидание');return false;}spend(s,p,'rest',0);if(b.lineage)b.energy=Math.min(100,b.energy+2);else p.needs.energy=Math.min(100,p.needs.energy+2);g.remaining=0;return true;}
 if(b.area!==g.area||physicalDistance(s.areas[b.area],b.x,g.x)>2)return false;
 if(!safeCareLocal(s,p,g.x)){blockCare(s,p,g,'На пути замечена опасность');return false;}
 if(g.kind==='returnCareCollect'){const o=s.areas[g.area].objects.find(o=>o.id===g.object&&o.kind==='relic'&&!o.taken);if(!o){const n=c.resources.find(n=>n.object===g.object);if(n){n.available=false;n.seen=s.tick;}blockCare(s,p,{...g,available:false},'У знакомого источника больше нет реликвии');return false;}if(b.lineage)ctx.collectForCare(s,o);else{const inventory=careInventory(s,p)||(c.inventory={herbs:0,potions:0,relics:0,rations:0});o.taken=true;inventory.relics++;}spend(s,p,'collect');observeReturnCare(s,p);return true;}
 const d=s.people[g.doctor];if(!contact(s,p,d)||!doctorReady(s,d)){const n=c.doctors.find(n=>n.person===g.doctor);if(n){n.ready=false;n.seen=s.tick;}blockCare(s,p,{...g,ready:false},'В знакомой точке нет готового помочь специалиста');return false;}
 if(g.kind==='returnCareVisit'){observeReturnCare(s,p);spend(s,p,'talk');return true;}
 if((careInventory(s,p)?.relics||0)<1||p.returnEpisode.cohesion>=3)return false;
 c.request={version:1,id:p.id+'/care/'+(++c.serial),doctor:d.id,area:b.area,x:b.x,asked:s.tick,progress:0,lastTick:s.tick};spend(s,p,'talk');return true;
}
export function returnCareProviderTurn(s,d,ctx){if(!careOn(s)||!doctorReady(s,d)||!canStartNPCActivity(s,d,{inTurn:true})||d.returnCareActionTick===s.tick)return false;
 const p=Object.values(s.people).find(p=>p.alive&&p.returnEpisode?.care?.request?.doctor===d.id&&p.returnEpisode.care.request.asked<s.tick&&contact(s,p,d));if(!p)return false;const q=p.returnEpisode,c=q.care,r=c.request;
 if(!safeCareLocal(s,p,d.x)||!careReady(s,p)||(careInventory(s,p)?.relics||0)<1||q.cohesion>=3){stop(s,p,'Опасность, отсутствие оплаты или изменившаяся нужда');return false;}
 if(r.lastTick===s.tick)return false;r.lastTick=s.tick;r.progress++;d.needs.energy=Math.max(0,d.needs.energy-2);d.returnCareActionTick=s.tick;
 if(r.progress===3){const inv=careInventory(s,p),before=inv.relics,gain=Math.min(2,3-q.cohesion),record={id:r.id,doctor:d.id,area:d.area,asked:r.asked,at:s.tick,actions:3,before:q.cohesion,after:q.cohesion+gain,gain,relicBefore:before,relicAfter:before-1};inv.relics--;q.cohesion+=gain;q.restored=(q.restored||0)+gain;c.restored+=gain;c.receipts.push(record);if(c.receipts.length>8)c.droppedGain+=c.receipts.shift().gain;c.request=null;c.blocked=[];
  if(s.hero?.lineage===p.id)ctx.log(s,'Обряд поддерживает связность: +'+gain+'. Одна настоящая реликвия израсходована; прежний отсчёт дней продолжается.','magic');}
 return true;
}
export function returnCareHeroAttention(s,ctx){const p=s.people[s.hero.lineage],h=s.hero;if(h.actorMode==='npc'||h.transit||h.combat||!p.returnEpisode)return false;const g=careChoice(s,p,ctx);if(!g){if(h.goal?.kind.startsWith('returnCare'))h.goal=null;return false;}if(h.goal?.kind===g.kind&&h.goal.area===g.area&&h.goal.doctor===g.doctor&&h.goal.object===g.object&&h.goal.x===g.x)return true;ctx.goal(s,g.kind,g.area,g.x,g.kind==='returnCareWait'?'Ждать настоящего обряда':'Поддержать связность тела',p.returnEpisode.care.decision?.reason||'Реликвия и знающий специалист нужны на месте.',{...g,remaining:1});return true;}
export function returnCareHeroAction(s,g,ctx){const ok=returnCareAction(s,s.people[s.hero.lineage],g,ctx);s.hero.goal=null;return ok;}
export function returnCareNPCTurn(s,p,ctx){if(!careOn(s)||!p.returnEpisode||p.needs.energy<25||npcController(s,p)!=='personal')return false;const c=careMemory(p),g=c.trip||careChoice(s,p,ctx);if(!g)return false;const b=careBody(s,p);if(c.lastAction===s.tick)return true;
 if(p.roadTransit||p.fordCrossing||p.liftTransit||b.area!==g.area||physicalDistance(s.areas[b.area],b.x,g.x)>2){c.trip={...g};const result=walkCampOrder(s,p,g.area,g.x,{...ctx,route:()=>npcKnownRoute(p,p.area,g.area,knownNPCHazards(s,p))},c);if(result==='blocked'){blockCare(s,p,g,'Известный путь оказался недоступен');delete c.trip;return false;}spend(s,p,'walk');return true;}
 delete c.trip;return returnCareAction(s,p,g,ctx,{inTurn:true});
}

