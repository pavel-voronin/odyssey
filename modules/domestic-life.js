import {canBargain} from './skill-branches.js';
import {marketWallet,marketEnabled,quoteMarket,tradeGoods} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {domesticOn,domesticBody,domesticStock,initializeDomestic,domesticWays} from './domestic-state.js';
import {adultPerson,personAgeAt,ageLimits} from './age-state.js';
import {physicalDistance} from '../geometry.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
import {consumeCarriedSupplies} from './stores.js';
import {foodStores,openProductFood,LOCAL_FOODS} from './food-stores.js';
import {foodSourceState,localFoodChoice,takeForage} from './local-food.js';
import {nutritionView,consumedFood,wantsFood} from './nutrition-state.js';
import {evaluateDevelopment,commitDevelopment} from './development-skills.js';
import {limbWorkAllows} from './limb-state.js';
import {moduleRandom} from '../rules.js';

const near=(s,p,q)=>{const a=domesticBody(s,p),b=domesticBody(s,q);return a&&b&&(a.lineage||['resident','wandering'].includes(p.status))&&(b.lineage||['resident','wandering'].includes(q.status))&&a.area===b.area&&!a.transit&&!b.transit&&!p.roadTransit&&!q.roadTransit&&s.areas[a.area]&&physicalDistance(s.areas[a.area],a.x,b.x)<=12;};
const noticed=(s,p)=>Boolean(s.hero&&(s.hero.lineage===p.id||s.people[s.hero.lineage]&&near(s,s.people[s.hero.lineage],p)));
const ownRecord=(s,p)=>p.domestic||initializeDomestic(s,p,domesticBody(s,p).lineage?domesticBody(s,p):null,{kind:'actual-contact'});
function receipt(q,r){q.care.receipts.push(r);if(q.care.receipts.length>16)q.care.receipts.shift();q.care.serial++;q.care.lastAt=r.at;}
const willing=(s,p,child)=>((domesticBody(s,p).personality?.generosity??p.agenda.duty)>=((child.parents||[]).includes(p.id)?.25:.75));
function ready(s,p){const b=domesticBody(s,p),n=b.lineage?b:p.needs;return adultPerson(s,p)&&!p.ailment&&(b.lineage||npcController(s,p)==='personal')&&!p.needs.sleeping&&!b.combat&&!b.transit&&!p.roadTransit&&!p.agenda.task&&!(b.goal&&(b.goal.quest||['work','propertyRepair','forgeWork'].includes(b.goal.kind)))&&n.energy>=25&&(b.hp??p.health)>(b.maxHp||p.maxHealth||100)*.4&&!nutritionView(s,b).deficient&&!nutritionView(s,b).sleep;}
function claim(s,p,inTurn){const b=domesticBody(s,p);if(b.lineage)return inTurn&&b===s.hero;if(!canStartNPCActivity(s,p,{inTurn}))return false;return inTurn&&p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'||npcAction(s,p,'personal','act');}
function request(s,child,adult,reason){const q=ownRecord(s,child);if(q.care.requests.some(r=>r.person===adult.id&&r.retryAt>s.tick))return;const r={person:adult.id,at:s.tick,retryAt:s.tick+16,reason};q.care.requests.push(r);if(q.care.requests.length>8)q.care.requests.shift();}
export function careFor(s,adult,child,ctx={}, {inTurn=false,lesson=false}={}){
 if(!domesticOn(s)||!adult?.alive||!child?.alive||adult.id===child.id||!lesson&&adultPerson(s,child)||!near(s,adult,child))return false;
 const q=ownRecord(s,child),aq=ownRecord(s,adult);if(!q||!aq||aq.care.lastAt===s.tick||q.care.lastAt===s.tick)return false;
 const reason=!ready(s,adult)?'busy':!willing(s,adult,child)?'declined':null;
 if(reason){request(s,child,adult,reason);return false;}
 const b=domesticBody(s,adult),a=s.areas[b.area],node=foodSourceState(s,a),known=node&&adult.domestic.sources[node.id];
 if(lesson){
  if(wantsFood(s,child)||personAgeAt(child,s.tick)<Math.ceil(ageLimits(child)[0]/3)||!node||!known||q.sources[node.id]||physicalDistance(a,b.x,node.x)>12)return false;
 }else if(!wantsFood(s,child))return false;
 let owner=domesticStock(s,adult)>0?adult:domesticStock(s,child)>0?child:null,purchase=null;if(!lesson&&!owner&&marketEnabled(s)&&a.civic&&physicalDistance(a,b.x,42)<=18){const price=quoteMarket(s,a,'food','buy',1,{gold:marketWallet(s,adult.id),trade:canBargain(s,adult.id)});if(price.quantity===1){purchase={area:a.id,stockBefore:a.civic.food,walletBefore:marketWallet(s,adult.id)};owner=adult;}}
 if(!lesson&&!owner){request(s,child,adult,'no-food');return false;}
 const paid=lesson&&adultPerson(s,child)?1:0,learner=domesticBody(s,child),pupilMoney=marketWallet(s,child.id),teacherMoney=marketWallet(s,adult.id);if(paid&&pupilMoney<paid){request(s,child,adult,'poor');return false;}if(!claim(s,adult,inTurn)||!(learner.lineage?learner===s.hero&&learner.actorStep===s.tick:q.care.waitingAt===s.tick&&q.care.waitingFor===adult.id||npcAction(s,child,'personal','act')))return false;if(paid){setActorMoney(s,child,pupilMoney-paid);setActorMoney(s,adult,teacherMoney+paid);}
 const energy=b.lineage?b:adult.needs;energy.energy=Math.max(0,energy.energy-1);child.needs.energy=Math.max(0,child.needs.energy-1);aq.care.lastAt=s.tick;
 if(!lesson){if(purchase){const deal=tradeGoods(s,a,adult.id,'food','buy',1);if(deal.quantity!==1)return false;Object.assign(purchase,{cost:deal.total,stockAfter:a.civic.food,walletAfter:marketWallet(s,adult.id)});}const before=domesticStock(s,owner);if(!consumeCarriedSupplies(owner,null,'food',1))return false;consumedFood(s,child,{source:'care/'+adult.id});q.care.guardian=adult.id;receipt(q,{kind:'food',at:s.tick,adult:adult.id,child:child.id,owner:owner.id,units:1,before,after:domesticStock(s,owner),...(purchase?{purchase}:{})});}
 else{
  const record=q.care.lessons[node.id] ||= {teacher:adult.id,area:a.id,kind:node.kind,steps:[],teachers:[],started:s.tick};record.steps.push(s.tick);record.teachers.push(adult.id);
  const quote=evaluateDevelopment(s,child.id,{id:'domestic/local-food-lesson',channel:'observation',cap:.2,skills:[{id:'observation',weight:1}],capabilities:['present-teacher','local-source']});commitDevelopment(s,child.id,quote,{action:'local-food-lesson/'+s.tick,source:node.id,budget:.5});
  receipt(q,{kind:'lesson',at:s.tick,adult:adult.id,child:child.id,area:a.id,food:node.kind,source:node.id,paid,pupilBefore:pupilMoney,pupilAfter:marketWallet(s,child.id),teacherBefore:teacherMoney,teacherAfter:marketWallet(s,adult.id)});
  if(record.steps.length===2){const f=foodStores(child);f.methods[node.kind] ||= {id:LOCAL_FOODS[node.kind].method,source:'domestic-lesson',teacher:adult.id,recordedAt:s.tick};q.sources[node.id]={area:a.id,kind:node.kind,method:LOCAL_FOODS[node.kind].method,at:s.tick,origin:'lesson',teacher:adult.id};record.completed=s.tick;}
 }
 aq.care.given.push({...q.care.receipts.at(-1)});if(aq.care.given.length>16)aq.care.given.shift();
 if(learner.lineage){learner.lastAction='talk';learner.speech=lesson?'Учусь узнавать знакомый местный источник.':'Спасибо за настоящую еду.';}if(b.lineage){b.lastAction='talk';b.speech=lesson?'Покажу, как узнать знакомый продукт.':'Поешь. Это часть нашего настоящего запаса.';}
 if(noticed(s,adult))ctx.log?.(s,lesson?adult.name+' показывает ученику местный пищевой источник.':adult.name+' кормит '+child.name+' из настоящего запаса.','life');return true;
}
export function childNeedTurn(s,p,ctx={}){
 if(!domesticOn(s)||adultPerson(s,p)||!p.alive)return false;
 const q=ownRecord(s,p);if(!q)return false;if(q.care.lastAt===s.tick)return true;
 if(wantsFood(s,p)){
  const locals=Object.values(s.people).filter(a=>a.id!==p.id&&a.alive&&adultPerson(s,a)&&near(s,p,a)).sort((a,b)=>Number(p.parents.includes(b.id))-Number(p.parents.includes(a.id))||a.id.localeCompare(b.id));
  for(const adult of locals){if(q.care.requests.some(r=>r.person===adult.id&&r.retryAt>s.tick))continue;request(s,p,adult,!ready(s,adult)?'busy':!willing(s,adult,p)?'declined':domesticStock(s,adult)||domesticStock(s,p)?'asked':'no-food');}
  return true;
 }
 return false;
}
export function domesticTurn(s,p,ctx={}, {inTurn=false}={}){
 if(!domesticOn(s)||!p?.alive)return false;
 if(!adultPerson(s,p))return childNeedTurn(s,p,ctx);
 if(p.role==='ребёнок'){
  p.role='житель';if(p.agenda.job==='student')p.agenda.job='laborer';const q=ownRecord(s,p);q.ways=domesticWays(s,p);q.mode=q.ways.length>=2?'independent':q.care.guardian?'dependent':'distress';q.matured=s.tick; // No new occupation kit, food, past work or profession rank.
 }
 const children=Object.values(s.people).filter(child=>child.alive&&!adultPerson(s,child)&&near(s,p,child)&&((child.parents||[]).includes(p.id)||child.domestic?.care.guardian===p.id||child.domestic?.care.requests.some(r=>r.person===p.id&&r.reason==='asked')));
 for(const child of children)if(careFor(s,p,child,ctx,{inTurn,lesson:!wantsFood(s,child)}))return true;
 const pupils=Object.values(s.people).filter(student=>student.id!==p.id&&student.alive&&adultPerson(s,student)&&!domesticBody(s,student).lineage&&near(s,p,student)&&student.domestic?.care.requests.some(r=>r.person===p.id&&r.reason==='lesson'&&s.tick-r.at<=48));for(const student of pupils)if(careFor(s,p,student,ctx,{inTurn,lesson:true}))return true;
 const b=domesticBody(s,p),a=s.areas[b.area],q=p.domestic;if(q&&!b.goal&&!p.agenda.task&&!nutritionView(s,b).deficient&&!nutritionView(s,b).sleep){const node=foodSourceState(s,a);if(node?.available&&!q.sources[node.id]&&marketWallet(s,p.id)>=2){const teacher=Object.values(s.people).find(t=>t.id!==p.id&&t.alive&&near(s,p,t)&&t.domestic?.sources[node.id]&&!q.care.requests.some(r=>r.person===t.id&&r.retryAt>s.tick));if(teacher){if(careFor(s,teacher,p,ctx,{lesson:true}))return true;const last=q.care.requests.at(-1);if(last?.person!==teacher.id||last.at!==s.tick)request(s,p,teacher,'lesson');if(!last||last.reason==='lesson'){q.care.waitingAt=s.tick;q.care.waitingFor=teacher.id;return true;}}else{const pending=q.care.requests.find(r=>r.reason==='lesson'&&r.retryAt>s.tick&&s.people[r.person]?.alive&&near(s,p,s.people[r.person])&&ready(s,s.people[r.person]));if(pending){q.care.waitingAt=s.tick;q.care.waitingFor=pending.person;return true;}}}}
 return uncertainFood(s,p,ctx);
}
export function uncertainFood(s,p,ctx={}){
 const b=domesticBody(s,p),n=b.lineage?b:p.needs,a=s.areas[b.area],source=foodSourceState(s,a),view=nutritionView(s,b);
 if(!domesticOn(s)||!adultPerson(s,p)||!b.lineage&&!['resident','wandering'].includes(p.status)||!view.deficient||domesticStock(s,p)>0||a?.civic?.food>0||!source?.available||source.kind!=='mushroom'||localFoodChoice(s,p,b.lineage?b:null,a)||!limbWorkAllows(p,'harvest')||n.energy<12||(b.hp??p.health)<=10||b.combat||b.transit||physicalDistance(a,b.x,source.x)>9||ctx.domesticCanFeed?.(s,p))return false;
 const q=ownRecord(s,p);if(q.care.lastAt===s.tick||q.risk?.retryAt>s.tick)return false;
 const r=q.risk?.status==='working'&&q.risk.source===source.id?q.risk:(q.risk={source:source.id,area:a.id,started:s.tick,steps:[],status:'working'});r.steps.push(s.tick);q.care.lastAt=s.tick;n.energy--;if(b.lineage){b.lastAction='collect';b.intent='Проверить сомнительные грибы';b.reason='Доступной обычной еды нет; это сознательный риск, а не известный безопасный способ.';}
 if(r.steps.length<3)return true;
 if(!takeForage(a,1)){r.status='empty';r.retryAt=s.tick+24;return true;}
 const roll=moduleRandom(s,'local-food');r.status=roll<.5?'food':roll<.8?'poison':'nothing';r.ended=s.tick;r.removed=1;r.retryAt=s.tick+24;
 if(r.status!=='nothing'){const f=foodStores(p);f.stock.mushroom++;f.obtained.mushroom++;if(r.status==='poison'){openProductFood(p,2);consumeCarriedSupplies(p,null,'food',2);consumedFood(s,b,{portions:2,source:'uncertain-food/'+source.id});if(b.lineage){b.hp-=8;ctx.domesticPoison?.(s);}else{p.health-=8;p.ailment='poison';}}}
 if(b.lineage)b.goal=null;if(noticed(s,p))ctx.log?.(s,r.status==='food'?'Удалось добыть одну настоящую связку. Способ ещё не освоен.':r.status==='poison'?'Сомнительная пища отравила тело. Съеденный продукт уже израсходован.':'Среди сорванных грибов не нашлось съедобной еды.','food');return true;
}
