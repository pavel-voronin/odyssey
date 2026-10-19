import {weatherAt} from './weather.js';
import {rootWorld} from '../world-ref.js';
import {physicalDistance} from '../geometry.js';
import {setActorMoney,selfDrivenActor} from '../actor-projection.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
import {moduleRandom} from '../rules.js';
import {takeGoods} from './goods.js';
import {recordPersonRemains} from './remains.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {packView} from './container-state.js';
import {consumeCarriedSupplies} from './stores.js';
import {ferryOn,ferryActor,ferryPassenger,ferryPresence,ferryLoad,ferryDock,ferryHistory,FERRY_FARE} from './ferry-state.js';
const funds=p=>p.agenda?.wealth??p.actorLink?.wallet??0;
function note(s,text,ctx){const f=s.ferry;if([f.deck,f.port].includes(s.hero.area))ctx?.log?.(s,text,'travel');}
export function ferryBoardOffer(s,person,to,{work=false}={}){const f=s.ferry,p=s.people[person],h=ferryActor(s,person),from=h?.alive&&!h.life.ended&&h.actorMode!=='npc'?h:p;
 if(h?.companions?.some(c=>c.hp>0)||p?.pets?.some(c=>c.hp>0))return null;
 if(!ferryOn(s)||!f||!p?.alive||!from||f.passengers[person]||f.captain===person||f.phase!=='docked'||f.port!==from.area||to!==f.ports.find(id=>id!==from.area)||s.tick>=f.departure||!s.people[f.captain]?.alive||f.hull<25||!ferryDock(s,from.area)||!ferryDock(s,to)||physicalDistance(s.areas[from.area],from.x,50)>3||Object.keys(f.passengers).length>=f.seats||ferryLoad(s)+packView(s,person).used+8>f.capacity)return null;
 const own=h&&selfDrivenActor(s,h),energy=own?h.energy:p.needs?.energy||0,money=own?h.gold:funds(p);if(work?(f.rigging!==1||energy<12||p.needs?.sleeping):money<FERRY_FARE)return null;
 return {f,p,h,own,from:from.area,to,payment:work?'work':'ticket',fare:work?0:FERRY_FARE};
}
export function boardFerry(s,person,to,ctx={},options={}){const q=ferryBoardOffer(s,person,to,options);if(!q)return false;const {f,p,h,own,from,payment,fare}=q,owner=s.people[f.owner];if(!owner?.alive)return false;if(!own){if(p.actionControl?.tick===s.tick&&p.actionControl.owner!=='journey'||!npcAction(s,p,npcController(s,p),'ferry-board'))return false;}
 if(payment==='work'){if(own)h.energy-=4;else p.needs.energy-=4;f.rigging=0;}else{if(own)h.gold-=fare;else setActorMoney(s,p,funds(p)-fare);setActorMoney(s,owner,funds(owner)+fare);}
 const ticket={version:1,ship:f.id,voyage:f.voyage+1,from,to,boarded:s.tick,payment,fare,lastEvent:-1};f.passengers[person]=ticket;p.ferryTicket={version:1,ship:f.id,voyage:ticket.voyage};p.area=f.deck;p.x=42+(Object.keys(f.passengers).length-1)*10;
 if(own){const goal=h.goal;h.area=f.deck;h.x=p.x;h.transit={from,to,mode:'sea',remaining:Math.ceil(f.distance/f.speed),total:Math.ceil(f.distance/f.speed),arrivalX:50,crew:false,eventDone:true,ferry:{version:1,id:f.id,voyage:ticket.voyage},savedIntent:h.intent,savedReason:h.reason};if(goal?.area!==to&&s.areas[goal?.area]?.type==='sea')h.goal={...goal,area:to,x:50};h.lastAction='travel';h.action='ПАРОМ';h.intent='Ждать отправления парома';h.reason=payment==='work'?'Команде нужна помощь со снастями; действие оплачивает этот билет.':'Билет оплачен настоящему владельцу судна.';revealArea(s,to);revealRoad(s,from,to);}
 ferryHistory(s,'boarded',person,{payment,fare,from,to});note(s,p.name+(payment==='work'?' помогает со снастями и занимает согласованное место.':' оплачивает место на пароме: 6 монет.'),ctx);return true;
}
export function heroFerryBoard(s,next,ctx){const h=s.hero,f=s.ferry;if(!ferryOn(s))return false;const edge=s.edges[[h.area,next].sort().join('|')];if(edge?.mode!=='sea')return false;h.lastAction='wait';
 if(!f||!f.ports.includes(h.area)){h.goal=null;h.reason='Здесь нет подходящего настоящего рейса.';return true;}const to=f.ports.find(id=>id!==h.area);if(!boardFerry(s,h.lineage,to,ctx,{work:h.gold<FERRY_FARE})){h.reason=f.phase!=='docked'||f.port!==h.area?'Паром сейчас у другого берега. Нужно дождаться рейса.':Object.keys(f.passengers).length>=f.seats?'Свободных мест нет.':'Нет доступного билета или нужной команде работы.';if(h.gold<FERRY_FARE&&f.rigging!==1)h.goal=null;}return true;
}
function event(s,f,ctx){if(f.eventDone||f.travelled<f.distance/2)return;f.eventDone=true;const chance=moduleRandom(s,'voyages');if(chance<.2){const damage=3+Math.floor(moduleRandom(s,'voyages')*5);f.lastEvent={version:1,voyage:f.voyage,at:s.tick,kind:'storm',damage};f.hull=Math.max(0,f.hull-damage*3);f.pause=2;ferryHistory(s,'storm',null,{damage});note(s,'Шторм задерживает общий рейс. Все пассажиры остаются на том же судне.',ctx);}else if(chance<.38){const gold=3+Math.floor(moduleRandom(s,'voyages')*5);const id=f.id+'/salvage/'+f.voyage;s.areas[f.deck].objects.push({id,kind:'loot',name:'Поднятый командой сундук',x:84,gold,taken:false});f.lastEvent={version:1,voyage:f.voyage,at:s.tick,kind:'salvage',object:id};ferryHistory(s,'salvage',null,{object:id});}else{f.lastEvent={version:1,voyage:f.voyage,at:s.tick,kind:'quiet'};}}
function passengerEvent(s,p,h,t,ctx){const f=s.ferry,e=f.lastEvent;if(!e||e.voyage!==t.voyage||t.lastEvent===e.voyage)return false;t.lastEvent=e.voyage;if(e.kind!=='storm')return false;
 if(h&&selfDrivenActor(s,h)){const before=h.hp;h.hp-=e.damage;h.travel.storms++;if(s.rules.psychology!==false)h.routePreferences={...h.routePreferences,water:{version:1,source:'storm',at:s.tick,person:p.id,edge:[t.from,t.to].sort().join('|'),aversion:1}};if(h.hp<=0){ctx.die(s,{name:'Шторм на пароме'},{kind:'storm',damage:e.damage,hpBefore:before});t.deadAt=s.tick;return true;}}
 else{p.health=Math.max(0,p.health-e.damage);if(p.health===0){p.alive=false;p.status='dead';p.died=s.tick;p.deathCause='Шторм на пароме';t.deadAt=s.tick;recordPersonRemains(s,p);}}return true;
}
function disembarkNPC(s,p,t){const f=s.ferry;p.area=f.port;p.x=50;delete p.ferryTicket;delete f.passengers[p.id];p.ferryArrival={version:1,ship:f.id,from:t.from,to:f.port,at:s.tick};ferryHistory(s,'landed',p.id,{port:f.port});}
function drown(s,p,t){p.health=0;p.alive=false;p.status='dead';p.died=s.tick;p.deathCause='Гибель парома';if(t)t.deadAt=s.tick;recordPersonRemains(s,p);}
export function ferryBodyTurn(s,ctx){const h=s.hero,t=h.transit;if(!t?.ferry)return false;const f=s.ferry,p=s.people[h.lineage],ticket=f?.passengers[h.lineage];h.lastAction='travel';if(!f||!ticket){h.lastAction='wait';return true;}
 if(passengerEvent(s,p,h,ticket,ctx)&&!h.alive)return true;if(f.phase==='sunk'){ctx.die(s,{name:'Гибель парома'},{kind:'storm',damage:h.hp,hpBefore:h.hp});ticket.deadAt=s.tick;return true;}
 if(s.rules.supply!==false&&h.hunger>75&&consumeCarriedSupplies(p,null,'food',4)){h.hunger=Math.max(0,h.hunger-65);h.counters.meals++;h.lastAction='eat';return true;}
 const presence=ferryPresence(s,h.lineage);if(presence?.transit){t.remaining=presence.transit.remaining;t.total=presence.transit.total;}h.energy=Math.max(0,h.energy-.2);
 if(f.phase==='docked'&&f.port===ticket.to&&f.voyage===ticket.voyage&&ferryDock(s,f.port)){const port=f.port;delete f.passengers[h.lineage];delete p.ferryTicket;h.transit=null;h.x=50;ctx.enter(s,port);h.travel.voyages++;h.intent=t.savedIntent;h.reason=t.savedReason;ferryHistory(s,'landed',h.lineage,{port});note(s,'Паром причалил. Пассажир сходит в настоящий порт.',ctx);}return true;
}
export function ferryWorldTick(input,ctx={}){const s=rootWorld(input),f=s.ferry;if(!f||f.lastTick===s.tick)return;f.lastTick=s.tick;const captain=s.people[f.captain];if(!captain?.alive){if(f.phase!=='sunk')f.phase='disabled';return;}
 if(!npcAction(s,captain,'ferry','sailing'))return;if(f.phase==='docked')captain.needs.energy=Math.min(100,captain.needs.energy+4);
 if(f.phase==='docked'){
  // A body still disembarking owns its seat. A dead body remains aboard with its belongings.
  if(ferryOn(s)&&s.tick>=f.departure&&ferryDock(s,f.port)&&f.hull>=25&&!Object.values(f.passengers).some(t=>t.to===f.port&&!t.deadAt)){
   if(f.food<1){const a=s.areas[f.port],amount=Math.min(8,a.civic?.food||0,Math.floor(funds(captain)));if(amount){takeGoods(s,a,'food',amount,{reason:'ferry-provisions',actor:captain.id});setActorMoney(s,captain,funds(captain)-amount);a.civic.treasury+=amount;f.food+=amount;}}
   if(f.food>=1){f.food--;f.from=f.port;f.to=f.ports.find(id=>id!==f.port);const a=s.areas[f.from],b=s.areas[f.to],sa=s.geographyFrame.sites[a.geography.site],sb=s.geographyFrame.sites[b.geography.site];f.geometry={version:1,layer:a.spatial.layer,from:{...sa.berth},to:{...sb.berth}};f.port=null;f.phase='sailing';f.voyage++;f.travelled=0;f.eventDone=false;f.lastEvent=null;f.pause=0;ferryHistory(s,'departed',captain.id,{from:f.from,to:f.to});}
  }
 }else if(f.phase==='sailing'){
  if(f.pause>0)f.pause--;else{const wind=weatherAt(s,s.areas[f.from]).speed;f.travelled=Math.min(f.distance,f.travelled+f.speed*wind);captain.needs.energy=Math.max(0,captain.needs.energy-.2);event(s,f,ctx);}
  if(f.hull<=0){f.phase='sunk';drown(s,captain);ferryHistory(s,'sunk');}else if(f.travelled>=f.distance){if(ferryDock(s,f.to)){f.phase='docked';f.port=f.to;f.departure=s.tick+4;f.rigging=1;ferryHistory(s,'arrived',captain.id,{port:f.port});}else{f.phase='disabled';ferryHistory(s,'blocked-port',null,{port:f.to});}}
 }
 for(const [id,t]of Object.entries(f.passengers)){const p=s.people[id],h=ferryActor(s,id);if(!p?.alive||h&&selfDrivenActor(s,h))continue;if(!npcAction(s,p,'ferry','passenger'))continue;passengerEvent(s,p,null,t,ctx);if(!p.alive)continue;if(f.phase==='sunk'){drown(s,p,t);continue;}p.needs.energy=Math.max(0,p.needs.energy-.2);p.needs.hunger=Math.min(100,p.needs.hunger+.16);if(f.phase==='docked'&&f.port===t.to&&f.voyage===t.voyage)disembarkNPC(s,p,t);}
}
