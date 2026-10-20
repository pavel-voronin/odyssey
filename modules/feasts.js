import {feastsOn,FEAST,feastDate,feastNear,feastReason,feastActor,feastBody} from './feast-state.js';
import {YEAR_TICKS} from '../calendar-units.js';
import {isTown,profile} from './common.js';
import {marketWallet,marketEnabled,quoteMarket,tradeGoods} from './market.js';
import {putGoods} from './goods.js';
import {setActorMoney} from '../actor-projection.js';
import {carriedFood,consumeCarriedSupplies} from './stores.js';
import {physicalDistance} from '../geometry.js';
import {npcController} from './npc-control.js';
import {enabled} from '../rules.js';
const pending=e=>e&&['preparing','postponed','active'].includes(e.status);
const current=s=>s.localFeast?.edition;
function tell(s,e,text,ctx){if(s.hero?.alive&&feastNear(s,s.people[s.hero.lineage],e.area))ctx?.log?.(s,text,'npc');}
function close(s,e,status,reason,ctx){e.status=status;e.ended=s.tick;e.reason=reason;if(e.food){const n=putGoods(s,s.areas[e.area],'food',e.food,{reason:'feast-leftovers',actor:e.organizer,legacyCap:Infinity});e.returned+=n;e.food-=n;}tell(s,e,reason,ctx);}
export function feastTick(s,ctx){
 if(!feastsOn(s))return;const e=current(s);if(!pending(e))return;
 if(s.tick>=e.ends){close(s,e,e.status==='active'?'finished':'cancelled',e.status==='active'?'Праздник окончен; остатки стола отнесли в местную кладовую.':'День прошёл без застолья; потраченная работа не возвращается.',ctx);return;}
 if(!s.people[e.organizer]?.alive){close(s,e,'cancelled','Организатор не вернулся. Соседи отменили застолье.',ctx);return;}
 if(e.status==='active'||s.tick<e.starts)return;
 if(e.food>=2&&e.work>=2){e.status='active';e.size=e.food>=FEAST.food&&e.work>=3?'feast':'small';e.opened=s.tick;tell(s,e,e.size==='feast'?'На площади открыли приготовленное застолье.':'Запасов хватило лишь на малое застолье.',ctx);}
 else if(!e.postponed){e.postponed=true;e.status='postponed';e.starts+=FEAST.delay;e.ends+=FEAST.delay;tell(s,e,'Стол ещё не готов: начало отложено ненадолго.',ctx);}
 else close(s,e,'cancelled','Еды или работы не хватило. Праздник отменён, остатки сохранены.',ctx);
}
export function organizeFeast(s,p,ctx){
 if(!feastsOn(s)||npcController(s,p)!=='personal'||p.agenda.task||feastReason(s,p)||!feastNear(s,p,p.area))return false;
 const a=s.areas[p.area];if(!isTown(a)||!a.civic||p.role==='ребёнок')return false;
 if(!s.localFeast){if(p.agenda.sociability<.65||marketWallet(s,p.id)<10)return false;const year=Math.floor(s.tick/YEAR_TICKS),next=s.tick<=feastDate(year)?year:year+1;s.localFeast={version:1,area:a.id,adopted:s.tick,nextYear:next,edition:null};tell(s,{area:a.id},'Жители договорились встречаться в конце восьмидесятого дня года.',ctx);return true;}
 const c=s.localFeast;if(c.area!==a.id||pending(c.edition))return false;
 const year=Math.max(c.nextYear,Math.floor(s.tick/YEAR_TICKS)),date=feastDate(year);if(s.tick<date-FEAST.prepare||s.tick>date)return false;
 c.nextYear=year+1;c.edition={version:1,id:`feast/${a.id}/${year}`,year,area:a.id,organizer:p.id,created:s.tick,starts:date,ends:date+FEAST.duration,status:'preparing',postponed:false,size:null,food:0,contributed:0,eaten:0,returned:0,work:0,spent:0,invited:{},lastAction:{}};
 tell(s,c.edition,`${p.name} берётся готовить местный праздник из доступных запасов.`,ctx);return true;
}
function debit(s,e,amount){const p=s.people[e.organizer],wallet=marketWallet(s,p.id);if(amount>FEAST.budget-e.spent||wallet<amount)return false;setActorMoney(s,p,wallet-amount);e.spent+=amount;return true;}
function remember(s,e,p,choice,reason){const r=e.invited[p.id];r.choice=choice;r.reason=reason;r.decided=s.tick;return r;}
export function feastChoice(s,p){
 const e=current(s),r=e?.invited[p.id];if(!feastsOn(s)||!r||r.choice||!pending(e))return null;
 const reason=feastReason(s,p);if(reason)return {choice:'declined',reason};
 const h=feastActor(s,p.id),sociability=h?h.personality.generosity:p.agenda.sociability;
 if(h?profile(h).skill==='parley':p.agenda.job==='scholar'&&sociability>=.5)return {choice:'perform',reason:'Выступить перед теми, кто действительно собрался.'};
 if((h?profile(h).skill==='trade':p.agenda.job==='merchant')&&carriedFood(p,h?.inventory)>2)return {choice:'trade',reason:'Продать собственную порцию к общему столу.'};
 if(sociability>=.5)return {choice:'help',reason:'Помочь приготовить стол, сохранив еду для себя.'};
 return {choice:'declined',reason:'Предпочитает своё обычное дело.'};
}
export function decideFeast(s,p){const d=feastChoice(s,p);return d?remember(s,current(s),p,d.choice,d.reason):null;}
export function feastPreparation(s,p,ctx){
 const e=current(s);if(!feastsOn(s)||!e||!['preparing','postponed'].includes(e.status)||e.organizer!==p.id||!feastNear(s,p)||feastReason(s,p)||e.lastAction[p.id]===s.tick)return false;e.lastAction[p.id]=s.tick;
 // Only real acquaintances within speaking distance receive an invitation.
 const known=new Set([...(p.navigation?.contacts||[]).map(c=>c.person),...Object.keys(p.agenda.bonds)]);
 for(const id of known){const t=s.people[id];if(id!==p.id&&t?.alive&&!e.invited[id]&&Object.keys(e.invited).length<12&&feastNear(s,t)&&physicalDistance(s.areas[e.area],feastBody(s,p).x,feastBody(s,t).x)<=12&&!t.needs?.sleeping)e.invited[id]={invited:s.tick,by:p.id,choice:null,reason:null,decided:null,joined:null,paid:0,gift:false,speech:false};}
 if(e.food<FEAST.food){
  let own=carriedFood(p,feastActor(s,p.id)?.inventory);
  if(own<=2&&marketEnabled(s)&&e.spent<FEAST.budget){const money=marketWallet(s,p.id),price=quoteMarket(s,s.areas[e.area],'food','buy',1,{gold:money});const q=price.total<=FEAST.budget-e.spent?tradeGoods(s,s.areas[e.area],p.id,'food','buy',1):{quantity:0};if(q.quantity){e.spent+=money-marketWallet(s,p.id);own=carriedFood(p,feastActor(s,p.id)?.inventory);}}
  if(own>2&&consumeCarriedSupplies(p,null,'food',1)){e.food++;e.contributed++;}
 }
 e.work=Math.min(3,e.work+1);p.needs.energy=Math.max(0,p.needs.energy-2);return true;
}
function bond(s,listener,speaker){
 if(!enabled(s,'relationships')||!listener)return;const h=feastActor(s,listener.id);
 if(h){const r=h.relations[speaker.id] ||= {trust:0,met:s.tick,lastSeen:s.tick,helped:0};r.trust=Math.min(100,r.trust+1);r.lastSeen=s.tick;if(!h.memory.people.includes(speaker.id))h.memory.people.push(speaker.id);}
 else if(listener.agenda)listener.agenda.bonds[speaker.id]=Math.min(100,(listener.agenda.bonds[speaker.id]||0)+1);
}
export function attendFeast(s,p,ctx){
 const e=current(s),r=e?.invited[p.id];if(!feastsOn(s)||!r||r.gift&&(r.choice!=='perform'||r.speech)||!['help','perform','trade'].includes(r.choice)||!pending(e)||!feastNear(s,p)||feastReason(s,p)||e.lastAction[p.id]===s.tick)return false;
 e.lastAction[p.id]=s.tick;const h=feastActor(s,p.id);
 if(r.choice==='help'&&r.joined===null){e.work=Math.min(3,e.work+1);if(carriedFood(p,h?.inventory)>2&&e.food<FEAST.food&&consumeCarriedSupplies(p,null,'food',1)){e.food++;e.contributed++;}r.joined=s.tick;if(debit(s,e,2)){setActorMoney(s,p,marketWallet(s,p.id)+2);r.paid=2;}tell(s,e,`${p.name} помогает с настоящим столом.`,ctx);}
 else if(r.choice==='trade'&&r.joined===null){if(e.food<FEAST.food&&carriedFood(p,h?.inventory)>2&&marketWallet(s,s.people[e.organizer].id)>=2&&e.spent+2<=FEAST.budget&&consumeCarriedSupplies(p,null,'food',1)){debit(s,e,2);setActorMoney(s,p,marketWallet(s,p.id)+2);e.food++;e.contributed++;r.paid=2;}r.joined=s.tick;}
 else if(e.status!=='active')return false;
 if(e.status==='active'&&!r.gift){if(e.food){e.food--;e.eaten++;r.gift=true;if(h)h.hunger=Math.max(0,h.hunger-15);else p.needs.hunger=Math.max(0,p.needs.hunger-15);bond(s,p,s.people[e.organizer]);}r.joined ??=s.tick;}
 if(e.status==='active'&&r.choice==='perform'&&!r.speech){r.speech=true;r.joined ??=s.tick;const host=s.people[e.organizer];if(feastNear(s,host))bond(s,host,p);for(const [id,t]of Object.entries(e.invited))if(id!==p.id&&t.joined!==null&&feastNear(s,s.people[id])&&!s.people[id].needs?.sleeping)bond(s,s.people[id],p);tell(s,e,`${p.name} выступает перед собравшимися: отсутствующие речи не слышат.`,ctx);}
 if(h)h.energy=Math.max(0,h.energy-2);else p.needs.energy=Math.max(0,p.needs.energy-2);return true;
}
export function feastTask(s,p){
 const e=current(s);if(!feastsOn(s)||!pending(e))return null;const r=e.invited[p.id];if(!r||!['help','perform','trade'].includes(r.choice)||r.speech||r.gift||r.joined!==null&&e.status!=='active'&&r.choice!=='perform'||feastReason(s,p))return null;
 const b=feastBody(s,p);if(!b||b.area!==e.area)return null;
 return {kind:'feastJoin',target:e.area,x:42,remaining:1,feast:e.id};
}
