import {dwellingNPCTask,dwellingNPCAction,dwellingPlan,dwellingAction} from './dwellings.js';
import {constructionWork} from './construction-work.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {productionSources,goodsEnabled} from './goods.js';
import {localContact} from './npc-contacts.js';
import {npcAction,npcController} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
export const homeBuildingOn=s=>enabled(s,'home-building')&&enabled(s,'homes')&&enabled(s,'interiors')&&enabled(s,'lodging')&&enabled(s,'people')&&goodsEnabled(s);
const facts=(s,a)=>{const outside=s.areas[a?.interior?.exterior],door=outside?.objects.find(o=>o.id===a.interior.building&&o.kind==='tavern');return{outside,door};};
const ready=p=>p?.alive&&p.health>=(p.maxHealth||100)*.75&&!p.ailment&&!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<60;
const danger=(s,h)=>s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[h.area],h.x,o.x)<=28);
const body=h=>h.alive&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.75&&h.energy>=35&&h.hunger<60&&!h.quests.some(q=>q.status==='active')&&!h.stories.active;
function task(p,kind,target,x,room){p.agenda.task={kind,target,x,room,remaining:1,knownNavigation:true};if(p.area!==target)p.status='wandering';return p.agenda.task;}
export function noteRoomDemand(s,door,occupants){
 if(!homeBuildingOn(s)||!door||!occupants)return false;const a=s.areas[door.room],h=s.hero,p=localContact(s,door.owner,h.area)?.person;
 if(!a?.lodging||occupants.length!==a.lodging.capacity+1||a.extension||!p||h.area!==door.hall||physicalDistance(s.areas[h.area],h.x,p.x)>9||p.id===h.lineage)return false;
 if(a.roomDemand?.actor===h.lineage&&a.roomDemand.party.join('|')===occupants.join('|'))return false;
 a.roomDemand={version:1,actor:h.lineage,owner:p.id,tick:s.tick,party:[...occupants],capacity:a.lodging.capacity,needed:occupants.length};return true;
}
// Invoked inside the owner's ordinary personal planning turn. A thought does
// not purchase raw stock, increase capacity or create a second building title.
export function homeBuildingNPCTask(s,p){
 const own=dwellingNPCTask(s,p);if(own)return own;
 if(!homeBuildingOn(s)||p.role!=='Хозяин трактира'||!ready(p)||npcController(s,p)!=='personal')return null;
 for(const a of Object.values(s.areas)){
  if(!a.lodging)continue;const {outside,door}=facts(s,a);if(door?.owner!==p.id||door.state!=='intact')continue;
  let r=a.extension;if(r?.status==='done')continue;
  if(!r){
   const d=a.roomDemand;if(!d||d.owner!==p.id||d.needed!==a.lodging.capacity+1)return null;
   if(marketWallet(s,p.id)<15){p.agenda.due=s.tick+48;return null;}
   const mode=p.agenda.duty<.55&&marketWallet(s,p.id)>=30?'hire':'self';
   r=a.extension={version:1,id:a.id+'/extension/1',owner:p.id,room:a.id,building:door.id,area:outside.id,x:Math.min(94,door.x+6),planned:s.tick,baseCapacity:a.lodging.capacity,status:'planned',mode,worker:mode==='self'?p.id:null,hired:null,claimUntil:null,materials:null,steps:[],lastWorkTick:-1,payment:{reserved:0,available:0,paid:0,refunded:0,recipient:null,claimed:null}};
  }
  if(r.owner!==p.id)return null;
  if(!r.materials)return task(p,'homeBuildSupply',outside.id,42,a.id);
  if(r.mode==='hire'&&s.tick<r.claimUntil)return task(p,'homeBuildWait',door.hall,76,a.id);
  if(r.mode==='hire'){r.mode='self';r.worker=p.id;r.resumedAt=s.tick;}
  return task(p,'homeBuildWork',outside.id,r.x,a.id);
 }return null;
}
function complete(s,a,r){
 r.status='done';r.completed=s.tick;a.lodging.capacity=r.baseCapacity+1;
 const owner=s.people[r.owner],pay=r.payment,earned=r.hired?r.steps.filter(e=>e.actor===r.hired.person).length*2:0;
 pay.available=earned;pay.recipient=r.hired?.person??null;pay.refunded=pay.reserved-earned;
 if(pay.refunded)setActorMoney(s,owner,marketWallet(s,owner.id)+pay.refunded);
}
function work(s,a,r,id){
 if(r.status==='done'||!r.materials||r.worker!==id||r.lastWorkTick>=s.tick||r.steps.length>=6)return false;
 if(!constructionWork(r,id,s.tick))return false;
 if(r.steps.length===6)complete(s,a,r);return true;
}
export function homeBuildingNPCAction(s,p){
 if(p.agenda.task?.dwelling)return dwellingNPCAction(s,p);
 const t=p.agenda.task;if(!['homeBuildSupply','homeBuildWait','homeBuildWork'].includes(t?.kind))return false;
 if(!homeBuildingOn(s))return true;
 const a=s.areas[t.room],r=a?.extension,{outside,door}=facts(s,a);
 if(!r||r.owner!==p.id||door?.owner!==p.id||door.state!=='intact'||!ready(p)){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
 if(r.status==='done'){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
 if(t.kind==='homeBuildSupply'){
  if(p.area!==outside.id||physicalDistance(outside,p.x,42)>1)return true;
  if(!r.materials){const raw=productionSources(s,outside)?.materials,reserve=r.mode==='hire'?12:0,total=9+reserve;
   if(!raw||raw.stock<3||marketWallet(s,p.id)<total+6){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
   const before=raw.stock;raw.stock-=3;raw.used+=3;setActorMoney(s,p,marketWallet(s,p.id)-total);outside.civic.treasury+=9;
   r.materials={source:raw.id,place:outside.id,owner:p.id,units:3,stockBefore:before,stockAfter:raw.stock,paid:9,tick:s.tick};r.payment.reserved=reserve;r.status='foundation';p.needs.energy-=1;r.claimUntil=r.mode==='hire'?s.tick+96:null;
  }
  if(r.mode==='hire')task(p,'homeBuildWait',door.hall,76,a.id);else task(p,'homeBuildWork',outside.id,r.x,a.id);return true;
 }
 if(t.kind==='homeBuildWait'){
  if(s.tick>=r.claimUntil){r.mode='self';r.worker=p.id;r.resumedAt=s.tick;task(p,'homeBuildWork',outside.id,r.x,a.id);}return true;
 }
 if(p.area===outside.id&&physicalDistance(outside,p.x,r.x)<=1&&work(s,a,r,p.id))p.needs.energy-=3;
 if(r.status==='done'){p.agenda.task=null;p.agenda.due=s.tick+48;}return true;
}
export function homeBuildingPlan(s,ctx){
 if(dwellingPlan(s,ctx))return true;
 const h=s.hero;if(!homeBuildingOn(s)||h.goal||!body(h)||danger(s,h))return false;
 for(const a of Object.values(s.areas)){
  const r=a.extension;if(!r)continue;
  if(!(ctx.knownRoute||ctx.route)(s,h.area,r.area).length)continue;
  if(r.status==='done'&&r.payment.recipient===h.lineage&&r.payment.available>0){ctx.goal(s,'homeBuildPay',r.area,r.x,'Получить плату за пристройку','Оплачены только действительно выполненные действия; деньги отложены у стройки из средств хозяина.',{buildingRoom:a.id});return true;}
  if(r.worker===h.lineage&&r.hired&&s.tick<r.claimUntil&&r.status!=='done'){ctx.goal(s,'homeBuildWork',r.area,r.x,'Продолжить пристройку','Материалы и сделанные этапы остаются здесь. Старые места и чужая поклажа доступны по прежним правам.',{buildingRoom:a.id});return true;}
  const p=s.people[r.owner],bodyHere=localContact(s,r.owner,h.area);
  if(r.mode!=='hire'||r.hired||!r.materials||r.status==='done'||s.tick>=r.claimUntil||!bodyHere||p.agenda.task?.kind!=='homeBuildWait'||physicalDistance(s.areas[h.area],h.x,bodyHere.x)>12||(h.relations[p.id]?.trust??0)<0||h.career.path!=='peaceful'&&h.gold>=12)continue;
  ctx.goal(s,'homeBuildHire',h.area,bodyHere.x,'Взяться за пристройку комнаты','Хозяин уже купил материал и отложил двенадцать монет. Шесть действий оплачиваются после выполнения; можно предпочесть своё дело.',{buildingRoom:a.id});return true;
 }return false;
}
export function homeBuildingAction(s,ctx){
 if(s.hero.goal?.dwelling)return dwellingAction(s,ctx);
 const h=s.hero,g=h.goal,a=s.areas[g?.buildingRoom],r=a?.extension;
 if(!homeBuildingOn(s)||!r||!body(h)||danger(s,h)){h.goal=null;return false;}
 if(r.hired?.person===h.lineage&&r.hired.lastActionTick>=s.tick)return false;
 const {door}=facts(s,a);
 if(g.kind==='homeBuildPay'){
  if(h.area!==r.area||physicalDistance(s.areas[h.area],h.x,r.x)>3)return false;
  const pay=r.payment;if(r.status!=='done'||pay.recipient!==h.lineage||pay.available<=0){h.goal=null;return false;}
  const amount=pay.available;pay.available=0;pay.paid=amount;pay.claimed=s.tick;r.hired.lastActionTick=s.tick;setActorMoney(s,s.people[h.lineage],h.gold+amount);h.energy--;h.goal=null;h.lastAction='trade';ctx.log(s,`За действительную работу на пристройке получено ◈${amount}. Деньги взяты из отложенной платы хозяина.`,'work');return true;
 }
 if(door?.owner!==r.owner||door.state!=='intact'||r.status==='done'){h.goal=null;return false;}
 if(g.kind==='homeBuildHire'){
  const p=localContact(s,r.owner,h.area)?.person;if(!p||physicalDistance(s.areas[h.area],h.x,p.x)>3||r.mode!=='hire'||r.hired||!ready(p)||npcController(s,p)!=='personal'||(h.relations[p.id]?.trust??0)<0||p.agenda.task?.kind!=='homeBuildWait'||s.tick>=r.claimUntil||!npcAction(s,p,'personal')){h.goal=null;return false;}
  r.hired={person:h.lineage,tick:s.tick,lastActionTick:s.tick};r.worker=h.lineage;r.claimUntil=s.tick+96;h.energy--;p.needs.energy--;h.goal=null;h.lastAction='talk';ctx.log(s,'Согласована работа: фундамент, каркас и пригодность. Каждое из шести действий стоит две монеты; уже купленные материалы остаются на участке.','work');return true;
 }
 if(g.kind==='homeBuildWork'){
  if(r.worker!==h.lineage||!r.hired||s.tick>=r.claimUntil){h.goal=null;return false;}
  if(h.area!==r.area||physicalDistance(s.areas[h.area],h.x,r.x)>3)return false;
  if(!work(s,a,r,h.lineage))return false;r.hired.lastActionTick=s.tick;h.energy-=3;h.lastAction='work';if(r.status==='done'){h.goal=null;ctx.log(s,'Пристройка стала пригодной. В той же комнате появилось одно настоящее место, прежние вещи и хозяин сохранены.','property');}return true;
 }return false;
}
