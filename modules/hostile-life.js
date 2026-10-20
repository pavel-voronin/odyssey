import {leaveCargoOriginal} from './cargo-inquiries.js';
import {assetRaidTurn} from './asset-raids.js';
import {strikeRaidGuard} from './raid-guard.js';
import {personLocation} from '../person-location.js';
import {personNeeds} from './needs.js';
import {hostileLifeOn,claimHostileAction} from './hostile-state.js';
import {personEnemy} from './enemy-person-state.js';
import {killEnemyPerson} from './enemy-mercy.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
import {actorView} from '../actor-view.js';
import {physicalDistance,areaStep} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {carriedFood,consumeCarriedSupplies} from './stores.js';
import {localFoodEnabled,localFoodChoice,localFoodWork,takeForage} from './local-food.js';
import {LOCAL_FOODS} from './food-stores.js';
import {woundStride,woundForce,woundActivity} from './wound-state.js';
import {guardWeapon} from './commissioned-orders.js';
import {canHoldWeapon} from './limb-state.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function record(s,p,kind,detail={}){const q=p.hostileLife;q.history.push({tick:s.tick,kind,...detail});if(q.history.length>8)q.history.shift();}
function ownMessage(s,p,ctx,text){p.agenda.knowledge.push({tick:s.tick,text});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();const h=s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id];if(h)ctx.log(actorView(s,h),text,'npc');}
function observe(s,p,e,contacts){
 const q=p.hostileLife,a=s.areas[p.area],f=a.forage;
 if(f&&physicalDistance(a,p.x,f.x)<=18)q.known.forage={area:a.id,x:f.x,seen:s.tick,stock:f.stock,available:!localFoodEnabled(s)||Boolean(localFoodChoice(s,p,null,a))};
 for(const {p:other,at} of contacts){
  if(other.id===p.id||!other.alive||selfDrivenActor(s,other.id)||other.role==='ребёнок'||other.needs?.sleeping||physicalDistance(a,p.x,at.x)>18)continue;
  if(other.agenda?.job==='guard'){q.known.danger={person:other.id,x:at.x,seen:s.tick};continue;}
  if(other.agenda?.job!=='merchant'||npcController(s,other)!=='personal')continue;
  let known=q.known.people.find(k=>k.person===other.id);if(!known){known={person:other.id,name:other.name,x:at.x,seen:s.tick,after:0};q.known.people.push(known);}known.x=at.x;known.seen=s.tick;
 }
 if(q.known.people.length>8)q.known.people.splice(0,q.known.people.length-8);
}
function choose(s,p,e){
 const q=p.hostileLife,n=p.needs,a=s.areas[p.area],food=carriedFood(p,p.actorLink?.inventory),danger=q.known.danger,unsafe=danger&&s.tick-danger.seen<=64&&physicalDistance(a,p.x,danger.x)<15;
 if(unsafe&&n.hunger<90&&(p.agenda.duty>=.5||e.hp<e.maxHp*.9))return physicalDistance(a,q.camp.x,danger.x)>=18?{kind:'camp',x:q.camp.x}:{kind:'relocate',x:danger.x<50?80:20};
 if((n.energy<25||e.hp<e.maxHp*.35)&&n.hunger<90){
  if(unsafe&&physicalDistance(a,q.camp.x,danger.x)<18)return {kind:'relocate',x:danger.x<50?80:20};return {kind:'camp',x:q.camp.x};
 }
 if(n.hunger>=65&&!food){
  const f=q.known.forage;if(f?.stock>0&&f.available)return {kind:'forage',x:f.x,remaining:3};
  const victim=q.known.people.find(k=>k.after<=s.tick&&s.tick-k.seen<=96);
  if(victim&&(!unsafe||n.hunger>=90))return {kind:'raid',x:victim.x,person:victim.person};
  if(unsafe)return {kind:'camp',x:q.camp.x};
  return {kind:'search',x:q.search%2?12:88};
 }
 return {kind:'camp',x:q.camp.x};
}
function witnesses(s,p,victim,at,receipt,ctx,contacts){
 const seen=contacts.filter(({p:other,at:b})=>other.id!==p.id&&other.alive&&!other.needs?.sleeping&&physicalDistance(s.areas[p.area],b.x,at)<=12).map(b=>b.p).sort((a,b)=>Number(b.id===victim.id)-Number(a.id===victim.id)||a.id.localeCompare(b.id)).slice(0,16);
 receipt.witnesses=seen.map(other=>other.id);
 for(const other of seen){other.raidWitnesses ||= [];other.raidWitnesses.push({id:receipt.id,tick:s.tick,area:p.area,x:at,actor:p.id,victim:victim.id,amount:receipt.amount,mode:'witness'});if(other.raidWitnesses.length>8)other.raidWitnesses.shift();const text=`${p.name} пытается отнять дорожную еду у ${victim.name}. ${receipt.amount?'Одна порция действительно перешла к нападавшему.':'Припасов он не получил.'}`;other.agenda.knowledge.push({tick:s.tick,text});if(other.agenda.knowledge.length>8)other.agenda.knowledge.shift();const h=s.hero.lineage===other.id?s.hero:s.actorStates?.[other.id];if(h)ctx.log(actorView(s,h),text,'npc');}
}
function raid(s,p,e,g,ctx,contacts){
 const q=p.hostileLife,known=q.known.people.find(k=>k.person===g.person),victim=s.people[g.person],at=victim&&localContact(s,victim.id,p.area);
 if(known)known.after=s.tick+64;
 if(!victim?.alive||victim.needs?.sleeping||!at||physicalDistance(s.areas[p.area],p.x,at.x)>3){record(s,p,'missed',{person:g.person});q.goal=null;return;}
 const defenders=contacts.filter(({p:other})=>other.id!==p.id&&other.alive&&!other.needs?.sleeping&&npcController(s,other)==='personal'&&canStartNPCActivity(s,other)&&other.needs.energy>=10&&(other.agenda.job==='guard'||other.id===victim.id&&other.agenda.duty>.7)).filter(d=>d.at&&physicalDistance(s.areas[p.area],d.at.x,at.x)<=12);
 const defender=defenders.find(d=>d.p.agenda.job==='guard')?.p||defenders[0]?.p;
 strikeRaidGuard(s,p,e,defender,ctx,record,at.x);
 const before=carriedFood(victim,victim.actorLink?.inventory),taken=e.hp>0&&consumeCarriedSupplies(victim,null,'food',1)?1:0;
 if(taken){p.roadSupplies.food++;q.supplies.raided++;}
 const receipt={id:p.id+'/raid/'+(++q.raids),person:victim.id,area:p.area,x:at.x,before,after:carriedFood(victim,victim.actorLink?.inventory),amount:taken};witnesses(s,p,victim,at.x,receipt,ctx,contacts);record(s,p,'raid',receipt);q.goal=null;
 if(e.hp<=0)killEnemyPerson(s,e,defender?.id||null);else ownMessage(s,p,ctx,taken?'Удалось забрать порцию еды. Обманутый путник остался на этой дороге.':'Налёт не принёс еды. Ищет иной выход.');
}
function act(s,p,e,ctx,contacts){
 const q=p.hostileLife,n=p.needs,a=s.areas[p.area];observe(s,p,e,contacts);if(n.sleeping&&n.hunger>=65)n.sleeping=false;
 if(n.hunger>=65&&carriedFood(p,p.actorLink?.inventory)>=1){if(!claimHostileAction(s,p,'eat'))return;consumeCarriedSupplies(p,null,'food',1);n.hunger=Math.max(0,n.hunger-48);n.meals++;q.supplies.eaten++;record(s,p,'meal');ownMessage(s,p,ctx,p.name+' съедает порцию из собственной поклажи. Запас уменьшается.');q.goal=null;return;}
 const burden=(p.looseItems||[]).find(i=>i.cargoOrigin&&i.cargoOrigin.owner!==p.id);if(n.energy<30&&burden&&leaveCargoOriginal(s,p,burden.id)){record(s,p,'cargo-left',{item:burden.id});q.goal=null;return;}
 if(assetRaidTurn(s,p,e,ctx,contacts))return;
 if(!q.goal||q.goal.kind==='camp'&&n.hunger>=65&&!carriedFood(p,p.actorLink?.inventory)||q.goal.kind==='forage'&&(!q.known.forage?.available||q.known.forage.stock===0))q.goal=choose(s,p,e);
 const g=q.goal;
 if(physicalDistance(a,p.x,g.x)>2){if(!claimHostileAction(s,p,'walk'))return;const before=p.x;p.x+=areaStep(a,p.x,g.x,6*woundStride(s,p));e.x=p.x;e.facing=Math.sign(p.x-before)||e.facing;n.energy=Math.max(0,n.energy-1);n.sleeping=false;woundActivity(s,p,'leg');return;}
 if(g.kind==='search'){if(!claimHostileAction(s,p,'search'))return;q.search++;record(s,p,'searched',{x:p.x});q.goal=null;return;}
 if(g.kind==='relocate'){if(!claimHostileAction(s,p,'camp'))return;const from=q.camp.x;q.camp={area:p.area,x:p.x,established:s.tick};const marker=a.objects.find(o=>o.id==='hostile-camp/'+p.id);if(marker){marker.x=p.x;marker.established=s.tick;}record(s,p,'camp-moved',{from,to:p.x});ownMessage(s,p,ctx,p.name+' переносит стоянку подальше от замеченной опасности. Припасы остаются с ним.');q.goal=null;return;}
 if(g.kind==='forage'){
  if(!claimHostileAction(s,p,'forage'))return;
  if(localFoodEnabled(s)){const choice=localFoodChoice(s,p,null,a);if(!choice){q.goal=null;return;}g.foodSource=choice.id;g.required ||= choice.remaining;const result=localFoodWork(s,p,a,g,null,ctx);if(result.finished){if(result.receipt){const portions=result.receipt.quantity*LOCAL_FOODS[result.receipt.kind].portions;q.supplies.gathered+=portions;record(s,p,'gathered',{source:choice.id,quantity:result.receipt.quantity,portions});ownMessage(s,p,ctx,p.name+' собирает съедобные припасы в знакомом месте. Местный запас действительно уменьшился.');}q.goal=null;}}
  else{const before=a.forage?.stock||0,quantity=takeForage(a,1);p.roadSupplies.food+=quantity;q.supplies.gathered+=quantity;record(s,p,'gathered',{source:a.id+'/forage',quantity,portions:quantity,before,after:a.forage?.stock||0});if(quantity)ownMessage(s,p,ctx,p.name+' находит порцию еды. На этом участке её стало меньше.');q.goal=null;}return;
 }
 if(g.kind==='raid'){if(claimHostileAction(s,p,'raid'))raid(s,p,e,g,ctx,contacts);return;}
 if(!claimHostileAction(s,p,'rest'))return;n.sleeping=n.energy<80;n.energy=Math.min(100,n.energy+8);woundActivity(s,p,'body',true);if(n.hunger<65&&e.hp<e.maxHp){e.hp=Math.min(e.maxHp,e.hp+1);p.health=e.hp;}if(n.energy>=80)n.sleeping=false;q.goal=null;
}
export function hostileLifeTick(s,ctx){
 if(!hostileLifeOn(s)||s.tick%8!==0)return;
 const areas=new Set(Object.values(s.people).filter(p=>p.alive&&p.hostileLife?.stage==='active').map(p=>p.enemyBody.origin)),contacts=new Map([...areas].map(id=>[id,[]]));
 for(const other of Object.values(s.people)){if(!other.alive||other.needs?.sleeping)continue;const area=personLocation(s,other.id)?.area;if(!areas.has(area))continue;const at=localContact(s,other.id,area);if(at)contacts.get(area).push({p:other,at});}
 const fights=new Set(detailedActors(s).filter(h=>selfDrivenActor(s,h)&&h.combat&&!h.transit).map(h=>JSON.stringify([h.area,h.combat])));
 for(const p of Object.values(s.people)){const q=p.hostileLife,e=personEnemy(s,p);if(q?.stage!=='active'||p.enemyBody?.stage!=='hostile'||!e?.alive||!p.alive||q.lastTick===s.tick)continue;
  q.lastTick=s.tick;p.area=p.enemyBody.origin;p.x=e.x;p.health=e.hp;const n=p.needs;n.energy=Math.max(0,n.energy-1);
  if(n.hunger>=95&&!carriedFood(p,p.actorLink?.inventory)){const before=e.hp;e.hp=Math.max(0,e.hp-1);p.health=e.hp;record(s,p,'hunger',{before,after:e.hp});if(!e.hp){ownMessage(s,p,ctx,p.name+' не пережил голод на дороге.');killEnemyPerson(s,e,null,'Голод на дороге');continue;}}
  if(fights.has(JSON.stringify([p.area,e.id]))||q.lastActionTick===s.tick)continue;act(s,p,e,ctx,contacts.get(p.area)||[]);
 }
}
