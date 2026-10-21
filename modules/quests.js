import {activeReturnBond} from './return-bond-state.js';
import {promiseRemembered,forgetOldPromise} from './recollection-state.js';
import {knownArea} from '../actor-atlas.js';
import {scentPlantKnown} from './pet-scent-policy.js';
import {recordValueOutcome,promiseBreachChance} from './value-revision.js';
import {goodsEnabled,takeGoods,putGoods} from './goods.js';
import {rememberRescue} from './camp-life.js';
import {rememberPromise,commitmentQuestBias} from './commitments.js';
import { enabled,moduleRandom } from '../rules.js';
import { isTown,profile,stat,moral,repute } from './common.js';
import { meetPerson,recruitPerson } from './social.js';
import { temporalAid } from './travel.js';
import {chooseQuest,adoptQuestPlan,parkQuestPlan,questChoiceAvailable} from './intention-choice.js';
import {actualService,denyService,questServiceBlocked} from './service-access.js';
import {isDungeonRescue,dungeonRescueReady} from './rescue-escape.js';
import {planDungeonRescue,finishDungeonRescue} from './rescue-plan.js';

export const QUEST_NAMES={wolves:'Устранить опасность',herbs:'Травы для лекаря',relic:'Реликвия из старого мира',delivery:'Доставить письмо',supply:'Привезти припасы',medicine:'Помочь заболевшему',scout:'Проверить неизвестный путь',rescue:'Вернуть пропавшего'};
export function currentQuest(h,s){
  if(h.ruleFlags?.quests===false)return null;
  const active=h.quests.filter(q=>q.status==='active'&&promiseRemembered(h,q)&&(!s||questChoiceAvailable(s,q)));
  if(!s)return active.find(q=>q.id===h.goal?.quest)||active[0];
  if(enabled(s,'intention-balance'))return chooseQuest(s,active,q=>questReady(s,q))?.q||null;
  const priority=q=>score(s,q,h.career.path==='peaceful')+(questReady(s,q)?12:0)+(h.area===(questReady(s,q)?q.source:q.target)?10:0)+(q.deadline?Math.max(0,8-(q.deadline-s.tick)/40):0)-(s.tick-q.accepted)/350;
  return active.sort((a,b)=>priority(b)-priority(a))[0];
}
export function registerReinforcement(s,parent,child){if(!enabled(s,'quests'))return;for(const q of s.hero.quests)if(q.status==='active'&&q.targets?.includes(parent.id)&&s.areas[q.target]?.objects.some(e=>e.id===child.id)){q.targets.push(child.id);if(q.kind==='wolves')q.required++;}}
export function questProgress(s,q){
  const h=s.hero,a=s.areas[q.target];
  if(q.kind==='wolves')return(q.targets||[]).filter(id=>{const o=a?.objects.find(o=>o.id===id);return !o?.alive||o.resolved;}).length;
  if(q.kind==='herbs'||q.kind==='medicine')return Math.min(q.required,h.inventory.herbs);
  if(q.kind==='relic')return Math.min(q.required,h.inventory.relics);
  if(q.kind==='rescue')return isDungeonRescue(q)?(dungeonRescueReady(s,q)?1:0):(q.rescued?1:0);
  if(q.kind==='supply')return q.cargo?1:0;
  if(q.kind==='delivery')return q.delivered?1:0;
  return q.visited?1:0;
}
export function questReady(s,q){return questProgress(s,q)>=(q.required||1);}
function livingGiver(s,a){return(a.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.status==='resident');}
export function availableOffers(s,a,peacefulOnly=false,{returnReview=false}={}){
  if(!enabled(s,'quests')||!isTown(a)||!a.civic||activeReturnBond(s.people[s.hero.lineage]))return[];
  const giver=livingGiver(s,a);if(!giver)return[];
  if((s.hero.reputation[a.faction]||0)<-25&&(s.hero.relations[giver.id]?.trust||0)<10)return[];
  const h=s.hero,completed=a.civic.completedOffers||[],offers=[];
  const add=(kind,target,details={})=>{
    const key=`${a.id}:${kind}:${target.id}:${details.object||details.person&&details.person+'-'+(s.people[details.person]?.illSince||0)||details.targets?.join(',')||a.civic.eventSerial||0}`;
    const episode=s.people[h.lineage]?.returnEpisode;if(!returnReview&&episode&&h.quests.some(q=>q.kind==='scout'&&q.offer===key&&q.accepted<=episode.at))return;
    if(completed.includes(key)||h.quests.some(q=>q.offer===key&&q.status!=='failed')||(h.memory.refusedOffers?.[key]||0)>s.tick)return;
    offers.push({offer:key,kind,source:a.id,target:target.id,giver:giver.id,required:1,reward:16,title:QUEST_NAMES[kind],...details});
  };
  for(const id of a.links){
    const target=s.areas[id];
    const enemies=target.objects.filter(o=>o.kind==='enemy'&&o.alive&&!o.resolved);
    if(enemies.length&&!peacefulOnly)add('wolves',target,{targets:enemies.map(o=>o.id),required:enemies.length,reward:22+Math.min(16,target.depth*2),cause:`Опасные существа из ${target.name} угрожают дороге.`});
    const herbs=target.objects.find(o=>o.kind==='herb'&&o.count>0);
    if(herbs&&(!peacefulOnly||h.inventory.herbs>0))add('herbs',target,{object:herbs.id,required:Math.min(2,herbs.count),reward:12,cause:'Лекарю нужны свежие травы для путников.'});
    const relic=target.objects.find(o=>o.kind==='relic'&&!o.taken);
    if(relic&&!peacefulOnly)add('relic',target,{object:relic.id,reward:28,cause:'В старых вещах ищут сведения о прошлом поселения.'});
    if(!h.memory.places.includes(id)&&!peacefulOnly&&(!a.city||a.city!==target.city))add('scout',target,{reward:14,cause:'Жители хотят знать, куда ведёт неизвестная дорога.'});
    const captive=target.objects.find(o=>o.kind==='captive'&&!o.resolved);
    if(captive&&!peacefulOnly&&!captive.dungeonRescue)add('rescue',target,{object:captive.id,person:captive.person,targets:enemies.map(o=>o.id),reward:30,cause:`${s.people[captive.person]?.name||'Житель'} пропал на дороге.`});
  }
  const ill=(a.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.ailment);
  if(ill&&h.inventory.herbs>0)add('medicine',a,{person:ill.id,required:1,reward:14,cause:`${ill.name} болеет. Имеющиеся травы могут помочь.`,deadline:a.civic.crisis?.until?s.tick+240:undefined});
  const otherTowns=Object.values(s.areas).filter(target=>knownArea(s,target)&&isTown(target)&&target.id!==a.id&&target.era===a.era);
  const supplier=otherTowns.find(target=>target.civic?.food>55);
  if(a.civic.food<40&&supplier)add('supply',supplier,{reward:24,cause:`В ${a.name} не хватает еды, а в ${supplier.name} есть запасы.`,deadline:s.tick+500});
  const target=otherTowns.find(target=>(!a.city||target.city!==a.city)&&target.population?.some(id=>s.people[id]?.alive));
  if(target&&h.quests.filter(q=>q.kind==='delivery').length<2)add('delivery',target,{reward:15,cause:`Семья ${giver.name} хочет передать весть в ${target.name}.`,recipient:target.population.find(id=>s.people[id]?.alive),payload:'Письмо о доме и незаконченных обещаниях'});
  return offers;
}
export function hasOffer(s,a){return availableOffers(s,a).length>0;}
function score(s,q,peaceful){
  const h=s.hero,skill=profile(h).skill;
  let value=commitmentQuestBias(s,q)+q.reward/8+(q.kind==='rescue'?h.personality.generosity*8:0);
  if(['herbs','medicine'].includes(q.kind)&&['healing','spirit'].includes(skill))value+=7;
  if(['delivery','supply'].includes(q.kind)&&(peaceful||['trade','parley','sea'].includes(skill)))value+=8;
  if(q.kind==='relic'&&['relic','magic','time'].includes(skill))value+=8;
  if(q.kind==='scout')value+=h.personality.curiosity*4;
  if(q.kind==='wolves')value+=h.personality.courage*6-(peaceful?9:0);
  if(q.kind==='medicine')value+=7;
  const risks=s.areas[q.target].objects.filter(o=>o.kind==='enemy'&&o.alive&&!o.resolved).reduce((n,o)=>n+o.attack,0);
  if(q.kind!=='wolves')value-=risks*(1-h.personality.courage)*.6;
  return value;
}
export function acceptQuest(s,ctx){
  const h=s.hero,a=s.areas[h.area],peaceful=h.goal?.peaceful||h.career.path==='peaceful';
  if(h.quests.filter(q=>q.status==='active').length>=4){h.goal=null;return;}
  const offers=availableOffers(s,a,Boolean(h.goal?.peaceful));
  if(!offers.length){h.goal=null;return;}
  const ranked=offers.map(q=>({q,score:score(s,q,peaceful)+moduleRandom(s,'quests')*2})).sort((a,b)=>b.score-a.score);
  return acceptOfferedQuest(s,ranked[0].q.offer,ctx);
}
// Select a real offered affair; both the ordinary planner and focused domains
// use the same acceptance constructor and its existing possessions/memory.
export function acceptOfferedQuest(s,offerId,ctx){
  const h=s.hero,a=s.areas[h.area];if(h.quests.filter(q=>q.status==='active').length>=4)return null;
  const offer=availableOffers(s,a,Boolean(h.goal?.peaceful)).find(q=>q.offer===offerId);if(!offer)return null;
  const q={...offer,id:`quest-${s.generation}-${s.tick}-${h.quests.length}`,status:'active',accepted:s.tick,visited:false,cargo:false,delivered:false};
  h.quests.push(q);rememberPromise(s,q);meetPerson(s,q.giver,ctx,2);
  if(q.kind==='delivery'){q.cargo=true;h.questCargo ||= {};h.questCargo[q.id]=q.payload;}
  h.memory.facts.push({tick:s.tick,text:q.cause});h.goal=null;h.lastAction='talk';
  ctx.log(s,`${s.people[q.giver].name}: «${q.cause}» Герой принимает дело «${q.title}». Награда ◈${q.reward}.${q.deadline?' Срок: '+(q.deadline-s.tick)+' тиков.':''}`,'quest');
}
export function civilianQuestPlan(s,ctx){
  const h=s.hero;if(!enabled(s,'quests')||h.career.path!=='peaceful'||currentQuest(h))return false;
  const work=h.counters.peacefulWork||0;if(work<5||work-h.social.lastCivilQuestWork<5)return false;
  const town=ctx.closest(s,a=>knownArea(s,a)&&isTown(a)&&availableOffers(s,a,true).length>0);if(!town)return false;
  h.social.lastCivilQuestWork=work;ctx.goal(s,'talk',town.id,42,'Выслушать нужды знакомых','После обычной работы герой хочет помочь семье или соседям.',{peaceful:true});return true;
}
export function planQuest(s,q,ctx){
  if(!promiseRemembered(s.hero,q)||questServiceBlocked(s,q))return;
  if(enabled(s,'intention-balance')){const original=ctx;ctx={...original,goal:(...args)=>{original.goal(...args);adoptQuestPlan(s,q);}};}
  const h=s.hero,target=s.areas[q.target];if(!target){failQuest(s,q,ctx,'Путь к цели утрачен.');return;}
  if(questReady(s,q)){ctx.goal(s,'turnin',q.source,42,'Вернуться с выполненным обещанием',q.cause||'Дело сделано. Теперь нужно вернуться.',{quest:q.id});return;}
  if(planDungeonRescue(s,q,{...ctx,failQuest}))return;
  if(q.kind==='wolves'||q.kind==='rescue'){
    const enemy=target.objects.find(o=>(q.targets||[]).includes(o.id)&&o.alive&&!o.resolved);
    if(enemy){ctx.goal(s,'hunt',target.id,enemy.x,q.title||'Устранить опасность',q.cause||'Жители ждут безопасной дороги.',{object:enemy.id,quest:q.id});return;}
    if(q.kind==='rescue'){ctx.goal(s,'questAction',target.id,84,'Найти пропавшего',q.cause,{quest:q.id});return;}
  }
  if(['delivery','supply','scout'].includes(q.kind)){ctx.goal(s,'questAction',target.id,q.kind==='scout'?84:42,q.title,q.cause,{quest:q.id,remaining:3});return;}
  const kind=q.kind==='herbs'||q.kind==='medicine'?'herb':'relic';
  const obj=target.objects.find(o=>o.kind===kind&&(kind==='herb'?o.count>0:!o.taken));
  if(!obj){failQuest(s,q,ctx,'Нужная находка уже исчезла. Обещание придётся пересмотреть.');return;}
  if(kind==='herb'&&!scentPlantKnown(s,h,target,obj)){ctx.goal(s,'explore',target.id,h.area===target.id&&h.x>=50?15:85,q.title||'Поиск травы','Известно место сбора, но нужное растение ещё предстоит увидеть в зарослях.',{quest:q.id});return;}
  ctx.goal(s,'collect',target.id,obj.x,q.title||'Собрать находки',q.cause||'Он знает, зачем возвращается сюда.',{object:obj.id,quest:q.id});
}
export function failQuest(s,q,ctx,reason){
  if(q.status!=='active')return;
  q.status='failed';q.failed=s.tick;q.failure=reason;
  if(promiseRemembered(s.hero,q))hCleanup(s,q);if(!enabled(s,'intention-balance')||s.hero.goal?.quest===q.id)s.hero.goal=null;ctx.log(s,`Дело «${q.title||QUEST_NAMES[q.kind]||'Обещание'}» не удалось: ${reason}`,'quest-failed');
}
function hCleanup(s,q){
 if(s.hero.questCargo)delete s.hero.questCargo[q.id];
 if(q.kind!=='supply'||!q.cargo||q.status==='done')return;
 const quantity=q.foodCargo.quantity,kept=goodsEnabled(s);
 if(kept&&quantity){const p=s.people[s.hero.lineage];p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food+=quantity;}
 q.foodCargo={...q.foodCargo,owner:s.hero.lineage,quantity:0,disposition:kept?'kept-after-abandoning':'lost-with-production-off',...(!kept?{lost:quantity}:{})};
}
const OLD_ABANDON_REASON='Другие дела изменили планы. Герой отказывается от старого обещания.';
export function abandonQuest(s,q,ctx,reason=OLD_ABANDON_REASON,{retainCargo=false}={}){
  if(q.status!=='active')return false;
  q.status='abandoned';q.failed=s.tick;q.failure=reason;
  recordValueOutcome(s,q,'brokenPromise',ctx);
  if(!retainCargo)hCleanup(s,q);if(s.hero.goal?.quest===q.id)s.hero.goal=null;
  if(q.offer){s.hero.memory.refusedOffers ||= {};s.hero.memory.refusedOffers[q.offer]=s.tick+2400;}
  moral(s,-1);repute(s,s.areas[q.source]?.faction,-2);ctx.log(s,`«${q.title||QUEST_NAMES[q.kind]}»: герой больше не собирается этим заниматься.${reason===OLD_ABANDON_REASON?'':' '+reason}`,'choice');return true;
}
export function questTick(s,ctx){
  if(!enabled(s,'quests'))return;
  for(const q of s.hero.quests.filter(q=>q.status==='active')){
    if(s.tick-(q.recalledAt??q.accepted)>1800&&!questReady(s,q)&&promiseRemembered(s.hero,q)){
      if(enabled(s,'recollection'))forgetOldPromise(s,q,ctx);else{abandonQuest(s,q,ctx);continue;}
    }
    if(q.kind==='medicine'&&s.people[q.person]?.alive&&!s.people[q.person].ailment&&s.people[q.person].health>=(s.people[q.person].maxHealth||100)*.85){failQuest(s,q,ctx,'Житель уже выздоровел. Прежняя нужда исчезла.');continue;}
    if(q.deadline&&s.tick>q.deadline)failQuest(s,q,ctx,'Срок истёк. Мир успел измениться.');
    else if(q.giver&&s.people[q.giver]?.alive===false&&s.hero.area===q.source)failQuest(s,q,ctx,'Тот, кто попросил помощь, уже не вернётся.');
    if(q.kind==='scout'&&s.hero.area===q.target)q.visited=true;
  }
}
export function questAction(s,q,ctx){
  if(!q||q.status!=='active'||!promiseRemembered(s.hero,q)){s.hero.goal=null;return;}
  if(isDungeonRescue(q)){s.hero.goal=null;return;}
  const h=s.hero,a=s.areas[h.area];h.lastAction='talk';
  if(q.kind==='delivery'){
    const person=s.people[q.recipient];
    if(person?.alive===false){failQuest(s,q,ctx,'Адресат письма умер.');return;}
    if(person?.area&&person.area!==a.id){q.target=person.area;h.goal=null;ctx.log(s,`Адресат переехал: ${person.name} теперь в ${s.areas[person.area].name}. Герой меняет маршрут.`,'talk');return;}
    if(['travelling','wandering','caravan'].includes(person?.status)){h.goal=null;h.memory.refusedOffers ||= {};ctx.log(s,'Адресат ещё в дороге. Герой подождёт следующей встречи.','talk');return;}
    if(h.alignment<-35&&profile(h).skill==='steal'&&moduleRandom(s,'quests')<promiseBreachChance(s)){h.gold+=20;moral(s,-8);repute(s,s.areas[q.source].faction,-6);q.promiseBreach={kind:'sold-letter',tick:s.tick,actor:h.lineage};failQuest(s,q,ctx,'Герой продал чужое письмо вместо доставки.');recordValueOutcome(s,q,'brokenPromise',ctx);return;}
    q.delivered=true;meetPerson(s,q.recipient,ctx,5);hCleanup(s,q);ctx.log(s,`${person?.name||'Адресат'} получает письмо. Две семьи снова знают друг о друге.`,'delivery');
  }else if(q.kind==='supply'){
    if(q.cargo)return;
    if(!actualService(s,a,'food',{units:35}).available){if(enabled(s,'intention-balance'))parkQuestPlan(s);denyService(s,ctx,'food',{units:35});h.goal=null;return;}
    if(a.civic.food<35){failQuest(s,q,ctx,'У поставщика тоже кончились припасы.');return;}
    if(h.gold>=4){h.gold-=4;if(goodsEnabled(s))a.civic.treasury+=4;q.cargo=true;takeGoods(s,a,'food',8,{flow:'exported',reason:'quest-supply',actor:h.lineage});ctx.log(s,'Герой покупает ящик припасов для голодающего поселения.','supply');}
    else{h.goal.remaining--;h.energy=Math.max(0,h.energy-2);if(h.goal.remaining<=0){q.cargo=true;takeGoods(s,a,'food',8,{flow:'exported',reason:'quest-barter',actor:h.lineage});ctx.log(s,'За работу на складе герой получает ящик припасов.','supply');}else return;}
    q.foodCargo={id:q.id+'/food',owner:h.lineage,source:a.id,quantity:8};
    h.questCargo ||= {};h.questCargo[q.id]='Ящик припасов';
  }else if(q.kind==='scout'){q.visited=true;ctx.log(s,`Герой проверил ${a.name}. Теперь в поселении узнают, что ждёт на этой дороге.`,'discover');}
  else if(q.kind==='rescue'){
    const obj=a.objects.find(o=>o.id===q.object);if(!obj||obj.resolved){failQuest(s,q,ctx,'Пропавший уже покинул это место.');return;}
    const p=s.people[q.person];if(!p?.alive){failQuest(s,q,ctx,'Герой пришёл слишком поздно.');return;}obj.resolved=true;q.rescued=true;p.status='escorted';p.area=h.area;rememberRescue(s,q);
    meetPerson(s,p.id,ctx,10);ctx.log(s,`${p.name} найден. Герой ведёт его домой по уже известной дороге.`,'rescue');
  }
  h.goal=null;
}
export function finishQuest(s,q,ctx){
  const h=s.hero;if(!q||q.status!=='active'||!promiseRemembered(h,q)||!questReady(s,q)){h.goal=null;return;}
  if(q.returnReview?.decision==='renewed'){
    const giver=s.people[q.giver];if(!giver?.alive||giver.area!==h.area||h.area!==q.source||Math.abs(giver.x-h.x)*(s.areas[h.area].length||100)/100>6||s.areas[q.source].civic.completedOffers.includes(q.offer)){failQuest(s,q,ctx,'Живой адресат прежнего отчёта недоступен или дело уже оплачено.');return;}
    q.returnReview.finished=s.tick;q.returnReview.rewarded={before:h.gold,after:h.gold+q.reward,amount:q.reward};
  }
  if(isDungeonRescue(q)){finishDungeonRescue(s,q,ctx);return;}
  if(q.kind==='medicine'){
    const patient=s.people[q.person];
    if(!patient?.alive){failQuest(s,q,ctx,'Пациента уже нет в живых.');return;}
    if(patient.area!==h.area||patient.status==='travelling'||patient.status==='wandering'){
      if(patient.area&&patient.area!==h.area)ctx.goal(s,'turnin',patient.area,patient.x??42,'Найти пациента','Травы нельзя передать человеку в другом месте.',{quest:q.id});
      else h.goal=null;
      return;
    }
  }
  q.status='done';q.completed=s.tick;h.gold+=q.reward;ctx.gainXp(s,12,'quest/'+q.id);h.lastAction='talk';
  if(['herbs','medicine'].includes(q.kind))h.inventory.herbs=Math.max(0,h.inventory.herbs-q.required);
  if(q.kind==='relic')h.inventory.relics=Math.max(0,h.inventory.relics-q.required);
  const source=s.areas[q.source],c=source.civic;
  if(q.offer&&!c.completedOffers.includes(q.offer))c.completedOffers.push(q.offer);
  if(q.kind==='supply'){if(goodsEnabled(s)){const quantity=q.cargo?q.foodCargo.quantity:0;putGoods(s,source,'food',quantity,{reason:'quest-delivery',actor:h.lineage});q.foodCargo={...q.foodCargo,owner:'civic/'+source.id,quantity:0,delivered:quantity};}else{c.food=Math.min(100,c.food+40);if(q.foodCargo)q.foodCargo={...q.foodCargo,quantity:0,delivered:q.foodCargo.quantity,disposition:'delivered-with-production-off'};}if(c.food>=40&&c.crisis?.kind==='hunger')c.crisis=null;hCleanup(s,q);}
  if(q.kind==='medicine'){const p=s.people[q.person];if(p){p.ailment=null;p.health=p.maxHealth||100;}c.medicine=Math.min(100,c.medicine+15);if(c.crisis?.kind==='epidemic')c.crisis=null;}
  if(q.kind==='wolves'){c.safety=Math.min(100,c.safety+25);if(c.crisis?.kind==='raid')c.crisis=null;}
  if(q.kind==='rescue'){
    const p=s.people[q.person];p.status='resident';p.area=q.source;source.population ||= [];if(!source.population.includes(p.id))source.population.push(p.id);
    if(!source.objects.some(o=>o.person===p.id))source.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:48});
    c.missing=(c.missing||[]).filter(id=>id!==p.id);recruitPerson(s,p.id,ctx,p.role!=='ребёнок');
    recordValueOutcome(s,q,'rescue',ctx);
  }
  h.social.fame++;moral(s,3);repute(s,source.faction,5);source.prosperity=Math.min(100,(source.prosperity||50)+6);
  if(s.people[q.giver]?.area===h.area){meetPerson(s,q.giver,ctx,5);recruitPerson(s,q.giver,ctx);}
  s.changes.push({tick:s.tick,text:`${source.name}: ${h.name} выполнил дело «${q.title||QUEST_NAMES[q.kind]}».`});
  ctx.log(s,`Дело «${q.title||QUEST_NAMES[q.kind]}» выполнено. ${h.name} получает ◈${q.reward}; доверие жителей растёт.`,'reward');
  temporalAid(s,q.source,ctx);h.goal=null;
}
