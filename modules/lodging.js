import {sleepPhase,nutritionView,restSatisfied} from './nutrition-state.js';
import {restoreHealth} from './fresh-reply.js';
import {ordinaryRecovery} from './biology.js';
import {partyRoomConsent} from './lodging-consent.js';
export {partyRoomConsent};
import {noteRoomDemand,homeBuildingOn} from './home-building.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {setActorMoney} from '../actor-projection.js';
import {ROOM_POLICY,activeBooking,roomAdmission} from './room-state.js';
import {interiorBuilding,tavernIn,tavernAvailable} from './interiors.js';
import {npcController} from './npc-control.js';
import {revealArea} from '../actor-atlas.js';
import {humanParty} from './party-needs.js';
import {elapsedLabel} from '../calendar.js';
import {registerSpatialArea,registerSpatialEdge} from './spatial.js';
const on=s=>enabled(s,'lodging')&&enabled(s,'interiors');
function money(s,p){const h=s.actorStates?.[p.id];return h?.alive&&h.actorMode!=='npc'?h.gold:p.agenda?.wealth||0;}
export function initializeLodging(s){
 if(!on(s))return;
 for(const a of Object.values(s.areas))for(const door of a.objects.filter(o=>o.kind==='tavern')){
  if(door.room)continue;
  const hall=s.areas[door.hall];if(!hall)continue;
  const id='a'+s.nextArea++;door.room=id;
  const room={id,type:'room',paletteVersion:2,name:door.name+' · гостевая',depth:a.depth,continent:a.continent,realm:a.realm,era:a.era,culture:a.culture,climate:a.climate,faction:a.faction,danger:0,expanded:true,discovered:false,visited:false,visits:0,links:[hall.id],population:[],objects:[{id:id+'-exit',kind:'door',name:'В общий зал',x:8,to:hall.id}],interior:{version:1,parent:hall.id,exterior:a.id,building:door.id,kind:'room',entrance:90},lodging:{version:1,state:'intact',price:ROOM_POLICY.price,capacity:ROOM_POLICY.capacity,nextBooking:0,booking:null},forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'В комнате нет съедобных растений'}};
  s.areas[id]=room;hall.links.push(id);hall.objects.push({id:hall.id+'-room-door',kind:'door',name:'Гостевая комната',x:90,to:id});s.edges[[hall.id,id].sort().join('|')]={a:hall.id,b:id,mode:'door',duration:0,cost:0};s.graphRevision=(s.graphRevision||0)+1;
  registerSpatialArea(s,room);registerSpatialEdge(s,[hall.id,id].sort().join('|'));
 }
}
export function lodgingTick(s){
 for(const room of Object.values(s.areas)){const r=room.lodging?.booking;if(r?.status!=='booked')continue;if(r.until<=s.tick||!r.occupants.some(id=>s.people[id]?.alive)){r.status=r.until<=s.tick?'expired':'ended';r.ended=s.tick;}}
}
function localDoor(s,area){const a=s.areas[area];return a.interior?interiorBuilding(s,a):tavernIn(s,area);}
function quote(s,door,person,occupants){
 const room=s.areas[door?.room],r=room?.lodging,owner=s.people[door?.owner],payer=s.people[person];
 if(!on(s)||!r||r.state!=='intact'||!occupants||occupants.length>r.capacity||!tavernAvailable(s,door)||!owner?.alive||!payer?.alive||payer.health<=0||payer.role==='ребёнок'||owner.id===person||money(s,payer)<r.price+2)return null;
 const old=activeBooking(s,room);if(old&&old.payer!==person)return null;
 return {room,owner,price:r.price};
}
export function lodgingPlan(s,ctx){
 const h=s.hero,a=s.areas[h.area];if(!on(s)||(h.lodgingAfter||0)>s.tick||h.combat||h.transit||h.hunger>70)return false;
 if(h.energy>=70&&h.hp>=h.maxHp*.75&&!(enabled(s,'companions')&&humanParty(s).some(c=>s.people[c.person].needs.energy<45)))return false;
 const occupants=partyRoomConsent(s);if(!occupants)return false;
 const own=a.residence?a:s.areas[s.people[h.lineage].privateHome?.room];if(own?.residence&&[own.id,own.interior.parent].includes(h.area)&&roomAdmission(s,own,h.lineage)&&occupants.every(id=>own.residence.occupants.includes(id))){ctx.goal(s,'rest',own.id,68,'Отдохнуть в своём доме','Жильё построено и доступно по настоящему праву; время мира продолжает идти.',{lodging:own.id});return true;}
 const door=localDoor(s,h.area),room=s.areas[door?.room],paid=activeBooking(s,room,h.lineage);
 if(paid&&roomAdmission(s,room,h.lineage)&&occupants.every(id=>paid.occupants.includes(id))){revealArea(s,room.id);ctx.goal(s,'rest',room.id,68,'Отдохнуть в оплаченной комнате',`Бронь: ещё ${elapsedLabel(paid.until-s.tick)} · места ${paid.occupants.length}/${room.lodging.capacity}`,{lodging:room.id});return true;}
 if(homeBuildingOn(s)&&door&&room&&occupants.length===room.lodging.capacity+1&&tavernAvailable(s,door)){revealArea(s,door.hall);ctx.goal(s,'roomBook',door.hall,76,'Спросить о месте для спутников','В известной гостевой меньше мест, чем нужно группе. Хозяин должен услышать действительный запрос.',{building:door.id,occupants});return true;}
 const q=quote(s,door,h.lineage,occupants);if(!q)return false;
 revealArea(s,door.hall);ctx.goal(s,'roomBook',door.hall,76,'Узнать о ночлеге',`Есть гостевая на ${q.room.lodging.capacity} места. Нужна встреча с хозяином; цена ◈${q.price}.`,{building:door.id,occupants});return true;
}
export function lodgingTarget(s){
 const h=s.hero,g=h.goal;if(!g)return true;
 if(g.lodging&&(!roomAdmission(s,s.areas[g.lodging],h.lineage)||!partyRoomConsent(s))){h.goal=null;h.lodgingAfter=s.tick+120;return false;}
 if(g.kind!=='roomBook')return true;
 const door=localDoor(s,h.area),room=s.areas[door?.room],owner=s.people[door?.owner];
 if(!on(s)||!door||door.id!==g.building||!tavernAvailable(s,door)||!owner?.alive){h.goal=null;h.lodgingAfter=s.tick+120;return false;}
 if(h.area===door.hall){if(owner.area!==h.area){h.goal=null;h.lodgingAfter=s.tick+120;return false;}g.x=owner.x;}
 return true;
}
function book(s,door,person,occupants){
 const q=quote(s,door,person,occupants);if(!q)return null;
 const p=s.people[person];if(p.area!==door.hall||q.owner.area!==p.area||Math.abs(p.x-q.owner.x)*areaScale(s.areas[p.area])>9)return null;
 const old=activeBooking(s,q.room);if(old){return occupants.every(id=>old.occupants.includes(id))?{booking:old,charged:false}:null;}
 setActorMoney(s,p,money(s,p)-q.price);setActorMoney(s,q.owner,money(s,q.owner)+q.price);
 q.room.lodging.nextBooking++;const booking=q.room.lodging.booking={id:q.room.id+'/booking/'+q.room.lodging.nextBooking,payer:person,owner:q.owner.id,occupants:[...occupants],price:q.price,paid:q.price,started:s.tick,until:s.tick+ROOM_POLICY.duration,status:'booked'};return {booking,charged:true};
}
export function bookRoom(s,ctx){
 const h=s.hero,door=localDoor(s,h.area);if(h.goal?.kind!=='roomBook'||h.goal.building!==door?.id||h.goal.area!==h.area)return;
 const occupants=partyRoomConsent(s),result=book(s,door,h.lineage,occupants),r=result?.booking;
 h.lastAction='talk';if(!r){noteRoomDemand(s,door,occupants);h.goal=null;h.lodgingAfter=s.tick+240;ctx.log(s,'Ночлег не удалось согласовать. Он ищет другой доступный отдых.','rest');return;}
 const room=s.areas[door.room];revealArea(s,room.id);if(result.charged)h.counters.roomsRented=(h.counters.roomsRented||0)+1;
 ctx.goal(s,'rest',room.id,68,'Отдохнуть в гостевой комнате',`Бронь: ещё ${elapsedLabel(r.until-s.tick)} · места ${r.occupants.length}/${room.lodging.capacity}`,{lodging:room.id});if(result.charged)ctx.log(s,`${h.name} снимает гостевую на ${elapsedLabel(ROOM_POLICY.duration)} за ◈${r.price}. Места: ${r.occupants.length}/${room.lodging.capacity}.`,'rest');
}
export function lodgingRest(s,ctx,continueRest=false){
 const h=s.hero,a=s.areas[h.area];if(!a.lodging)return false;
 if(!roomAdmission(s,a,h.lineage)||h.hunger>75){h.goal=null;return true;}
 const booking=activeBooking(s,a,h.lineage);h.reason=a.residence?'Отдых по праву на свой дом. Вместимость '+a.residence.occupants.length+'/'+a.residence.capacity:`Бронь: ещё ${elapsedLabel(booking.until-s.tick)} · места ${booking.occupants.length}/${a.lodging.capacity}`;
 if(h.goal.sleep||nutritionView(s,h).sleep||s.people[h.lineage].nutrition?.sleep.active){const phase=sleepPhase(s,h);if(phase?.done){h.goal=null;h.lodgingAfter=s.tick+120;}return true;}
 h.lastAction='rest';h.energy=Math.min(100,h.energy+10);restoreHealth(s,ordinaryRecovery(s,h,1));ctx.recoverRoomParty?.(s);
 if(!continueRest&&restSatisfied(s,h)){h.goal=null;h.lodgingAfter=s.tick+120;ctx.log(s,'Ночлег окончен. Можно вернуться к делам.','rest');}
 return true;
}
export function npcLodgingPlan(s,p){
 if(!on(s)||npcController(s,p)!=='personal'||(p.agenda.lodgingAfter||0)>s.tick||p.needs.hunger>=60||p.needs.energy>=60)return false;
 const door=localDoor(s,p.area),r=s.areas[door?.room];if(!quote(s,door,p.id,[p.id]))return false;
 p.agenda.task={kind:'roomBook',target:door.hall,x:76,remaining:1,building:door.id};p.status='wandering';return true;
}
export function npcLodgingTarget(s,p,t){
 if(!['roomBook','roomSleep'].includes(t.kind))return true;
 const door=localDoor(s,p.area),owner=s.people[door?.owner];
 if(t.kind==='roomSleep'){if(roomAdmission(s,s.areas[t.target],p.id))return true;}
 else if(on(s)&&door?.id===t.building&&tavernAvailable(s,door)){if(p.area!==door.hall)return true;if(owner?.area===p.area){t.x=owner.x;return true;}}
 p.agenda.task=null;p.agenda.lodgingAfter=s.tick+120;return false;
}
export function npcBookRoom(s,p,ctx){
 const m=p.agenda,door=localDoor(s,p.area);if(m.task?.kind!=='roomBook'||m.task.building!==door?.id||m.task.target!==p.area)return;
 const result=p.needs.energy<70?book(s,door,p.id,[p.id]):null,r=result?.booking;m.task=null;m.lodgingAfter=s.tick+240;
 if(!r){m.due=s.tick+48;return;}
 m.task={kind:'roomSleep',target:door.room,x:68,remaining:1};p.status='wandering';if(result.charged&&s.hero.area===p.area)ctx.log(s,`${p.name} оплачивает гостевую из собственного кошелька и идёт отдыхать.`,'rest');
}
export function npcRoomRest(s,p){
 const a=s.areas[p.area],t=p.agenda.task;if(t?.kind!=='roomSleep')return false;
 if(!roomAdmission(s,a,p.id)){p.agenda.task=null;return true;}
 if(nutritionView(s,p).sleep||p.nutrition?.sleep.active){const phase=sleepPhase(s,p,{native:true});if(phase?.done){p.agenda.task=null;p.agenda.due=s.tick;p.status='resident';}return true;}
 p.needs.energy=Math.min(100,p.needs.energy+10);if(p.needs.hunger<60&&!p.ailment)p.health=Math.min(p.maxHealth||100,p.health+1);
 if(p.needs.energy>=90){p.agenda.task=null;p.agenda.due=s.tick;p.status='resident';}else t.remaining=1;return true;
}
