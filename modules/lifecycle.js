import {careerRank,effectiveLevel,heroLevel} from './progression-state.js';
import {portraitModel} from '../portrait.js';
import {knownArea,revealArea} from '../actor-atlas.js';
import {takeLegacyMoney,takeLegacyItem,syncActiveActor} from '../actor-projection.js';
import {initializeAge} from './age.js';
import { enabled,moduleRandom } from '../rules.js';
import { isTown,hasHabit } from './common.js';
import { receiveItem } from './inventory.js';
import {YEAR_TICKS} from '../calendar.js';
import {initializeWorkOrders} from './resident-orders.js';
import {heroAppearance} from '../appearance.js';

const notable=new Set(['birth','discover','quest','reward','death','loss','heritage','career','destiny','companion','choice','condition','treasure','government','retirement','story','artifact']);
const copy=value=>JSON.parse(JSON.stringify(value));
export function initializeLife(s,h){
  initializeWorkOrders(s);
  initializeAge(s,h);
  s.lives ||= [];
  h.biography ||= [];
  h.timeline ||= [];h.timelineDropped ??=0;
  h.life ||= {phase:'wandering',reflectAfter:h.born+6000+Math.floor(moduleRandom(s,'life')*4000),home:null,motive:null,ended:false};
}
export function rememberMoment(s,event){
  const h=s.hero;
  if(!h?.life)return;
  h.timeline.push({...event});if(h.timeline.length>2000){h.timeline.shift();h.timelineDropped++;}
  if(!enabled(s,'lifecycle')||!notable.has(event.type))return;
  h.biography.push({...event,area:event.area===undefined?h.area:event.area});
  if(h.biography.length>120)h.biography.splice(1,1); // Keep the beginning and the recent turning points.
}
export function archiveLife(s,outcome,cause,{ended=s.tick,recordedAt,wealthBasis,causeMeaning,deathReport}={}){
  const h=s.hero;
  if(outcome!=='dead'||h.alive)throw new Error('Архив финала создаётся только после смерти тела');
  if(s.lives.some(l=>l.lineage===h.lineage&&l.outcome===outcome&&l.ended===ended))return;
  s.lives.push(copy({generation:s.generation,lineage:h.lineage,name:h.name,family:h.family,race:h.race,profession:h.profession,appearance:h.appearance,birthOrigin:h.birthOrigin,born:h.born,originTick:h.originTick,residentExperience:h.residentExperience,startAge:h.startAge,ageOrigin:h.ageOrigin,ended,recordedAt,wealthBasis,deathDateKnown:h.life.deathDateKnown,outcome,cause,area:h.actorMode==='npc'?(s.people[h.lineage]?.area??null):h.area,deathJourney:h.actorMode==='npc'?s.people[h.lineage]?.deathJourney:undefined,level:h.level,kills:h.kills,wealth:h.gold,actorMode:h.actorMode,npcProfile:h.npcProfile,destiny:h.destiny,titles:h.titles,counters:h.counters,travel:h.travel,places:h.memory.places,quests:h.quests,commitments:h.commitments,rejected:h.memory.rejected,storyRarity:h.storyRarity,innerLife:h.innerLife,money:h.money,campLife:h.campLife,sketchbook:h.sketchbook,smoking:h.smoking,property:h.property,stories:(s.storyCases||[]).filter(c=>c.owner===h.lineage),companions:h.companions,items:[...h.bag,...Object.values(h.equipment).filter(Boolean)],milestones:h.biography}));
  const archived=s.lives.at(-1);archived.career=copy(h.career);archived.developmentScale={level:heroLevel(h),careerRank:careerRank(h),cap:12,basicSkillCap:100,effort:copy(s.people[h.lineage].professionalDevelopment||null)};archived.affiliation=copy(h.affiliation||{});
  if(h.remainsId)archived.remainsId=h.remainsId;
  if(enabled(s,'outfit-appearance')&&enabled(s,'appearance'))archived.outfitSnapshot=copy(heroAppearance(s));
  if(enabled(s,'appearance'))archived.portraitSnapshot={version:1,race:enabled(s,'lineage')?h.race:null,alive:h.alive,look:copy(portraitModel(s).look)};
  if(causeMeaning)archived.causeMeaning=copy(causeMeaning);
  if(deathReport)archived.deathReport=copy(deathReport);
  if(h.workMaterials)archived.workMaterials=copy(h.workMaterials);
  archived.timeline=copy(h.timeline);archived.timelineDropped=h.timelineDropped;
  h.life.ended=true;h.life.outcome=outcome;h.life.endedAt=ended;
}
function reasonToSettle(h){
  if(h.career.path==='peaceful'&&(h.counters.peacefulWork||0)>=40)return 'Мастерство кормит, а своя мастерская манит сильнее дальней дороги.';
  if(h.personality.curiosity>.75&&h.memory.places.length>=35&&h.gold>=60)return 'Мир оказался велик. Теперь ему хочется дома и рассказов у своего очага.';
  if(h.civic.holdings.length)return 'Поселение стало своим. Он хочет жить среди людей, за которых отвечает.';
  if(h.destiny.completed&&h.quests.filter(q=>q.status==='done').length>=8)return 'Предназначение исполнено. Обещания выполнены; пора передать дорогу другим.';
  if(h.memory.places.length>=35&&h.gold>=60)return 'Мир оказался велик. Теперь ему хочется дома и рассказов у своего очага.';
  if(h.social.lostCompanions>=2&&h.memory.places.length>=15)return 'После потерь он выбирает беречь оставшихся близких, а не искать новую опасность.';
  return null;
}
export function settlementAssessment(s,home){
  const h=s.hero,l=h.life,motive=reasonToSettle(h);
  if(!motive||!home)return {ready:false,reason:'Пока нет места и дела, ради которых хочется оставить дорогу.',key:'no-home'};
  const years=Math.max(0,s.tick-h.born)/YEAR_TICKS;
  const friends=Object.entries(h.relations||{}).filter(([id,r])=>home.id===h.area&&r.trust>=15&&s.people[id]?.alive&&s.people[id]?.area===home.id&&s.people[id]?.status==='resident').length;
  let roots=12+Math.min(48,years*18)+Math.min(8,friends*2);
  if(hasHabit(h,'homebody'))roots+=18;
  if(h.social.lostCompanions>=2)roots+=18;
  if(enabled(s,'psychology'))roots+=Math.min(18,h.mind.stress*.18);
  let road=18+h.personality.curiosity*30;
  const learning=enabled(s,'identity')&&enabled(s,'work')&&l.nextMastery?.profession===h.profession&&careerRank(h)<effectiveLevel(l.nextMastery.rank);
  const personal=enabled(s,'commitments')&&h.commitments?.personal?.status==='active'||enabled(s,'property')&&enabled(s,'property-contracts')&&['active','performed','credited'].includes(s.propertyContracts?.[h.property?.contract]?.status);
  const story=enabled(s,'stories')&&(s.storyCases||[]).some(c=>c.owner===h.lineage&&c.status==='active');
  const companion=enabled(s,'companion-goals')&&h.companions.some(c=>s.people[c.person]?.personalJourney?.status==='active');
  if(learning)road+=10;
  if(personal)road+=24;
  if(story)road+=18;
  if(companion)road+=12;
  if(s.tick-h.career.lastChange<2400)road+=10;
  const ready=roots>=road;
  const key=ready?'settle':personal?'personal':story?'story':companion?'companion':learning?'learning':'horizons';
  const reason=ready?motive:personal?'Достаток уже есть, но после отступления осталось собственное незавершённое дело.':story?'Своё место уже можно найти, но начатая личная история ещё требует ответа.':companion?'Путь спутника ещё не закончен. Вместе хочется пройти дальше.':learning?`Мастерство уже кормит, но хочется освоить следующую ступень ремесла: ${effectiveLevel(l.nextMastery.rank)}.`:'Дом уже возможен, но любопытство пока сильнее желания остаться. Прожитый путь и новые связи могут это изменить.';
  return {ready,motive,roots,road,reason,key};
}
export function lifePlan(s,ctx){
  if(!enabled(s,'lifecycle'))return false;
  const h=s.hero,l=h.life;
  if(h.combat||h.transit||h.quests.some(q=>q.status==='active'))return false;
  // A home is a recorded fact, never a separate planner or permission to take other work.
  if(l.residence?.since!==undefined)return false;
  if(!l.motive){
    if(s.tick<l.reflectAfter)return false;
    const home=ctx.closest(s,a=>knownArea(s,a)&&isTown(a)&&(!a.civic?.crisis||a.civic.food>30));
    l.nextMastery ??= {profession:h.profession,rank:Math.min(12,careerRank(h)+2)};
    const assessment=settlementAssessment(s,home);
    l.reflection={tick:s.tick,...assessment};
    if(!assessment.ready){
      l.reflectAfter=s.tick+384;
      if(assessment.key!=='no-home'&&l.lastReflection!==assessment.key){ctx.log(s,`${h.name} размышляет о доме. ${assessment.reason}`,'choice');l.lastReflection=assessment.key;}
      return false;
    }
    l.motive=assessment.motive;
    l.home=home.id;
    ctx.log(s,`${h.name} решает обосноваться в месте «${home.name}». ${l.motive}`,'choice');
  }
  ctx.goal(s,'settle',l.home,42,'Найти свой дом',l.motive);
  return true;
}
export function settleLife(s,ctx){
  const h=s.hero,a=s.areas[h.area];
  if(!enabled(s,'lifecycle')||!h.alive||h.life.ended||!isTown(a)||h.area!==h.life.home){h.goal=null;return;}
  if(h.life.residence?.since!==undefined){h.goal=null;return;}
  syncActiveActor(s);
  h.life.ended=false;h.life.residence={since:s.tick};
  h.goal=null;h.lastAction='settle';h.action='ДОМ';h.intent='Обустроить повседневную жизнь';h.reason='Дом стал опорой. Работа, нужды и новые обстоятельства продолжают его историю.';
  const p=s.people[h.lineage];
  p.area=a.id;p.x=h.x;p.status='resident';p.role='оседлый путник';p.appearance={...h.appearance};p.health=Math.ceil((p.maxHealth||100)*h.hp/h.maxHp);p.legacy={...p.legacy,generation:h.actorGeneration||s.generation,profession:h.profession,wealth:h.gold,keepsakes:[...h.bag,...Object.values(h.equipment).filter(Boolean)],gifts:p.legacy?.gifts||[],places:[...h.memory.places]};
  a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);
  if(!a.objects.some(o=>o.id==='settled-'+p.id))a.objects.push({id:'settled-'+p.id,kind:'resident',person:p.id,name:p.name,x:h.x});
  ctx.log(s,`${h.name} ${h.family} обосновывается в месте «${a.name}». ${h.life.motive||'Здесь хочется устроить повседневную жизнь.'} Это новый уклад, а не конец истории.`,'retirement');
  syncActiveActor(s);
  s.changes.push({tick:s.tick,text:`${p.name} поселился в месте «${a.name}» и помнит прежние пути.`});
}
export function meetLegacy(s,id,ctx){
  if(!enabled(s,'lifecycle'))return;
  const h=s.hero,p=s.people[id],legacy=p?.legacy;
  if(!legacy||!p.alive||p.status!=='resident'||p.area!==h.area||id===h.lineage||legacy.gifts.includes(h.lineage))return;
  legacy.gifts.push(h.lineage);
  const related=s.people[h.lineage]?.parents.includes(id);
  const amount=takeLegacyMoney(s,p,related?12:4);h.gold+=amount;
  const item=related&&enabled(s,'equipment')?takeLegacyItem(s,p):null;
  if(item){item.history ||= [];item.history.push({tick:s.tick,text:`${p.name} передал вещь наследнику ${h.name}.`});receiveItem(s,ctx,null,item);}
  const place=legacy.places.find(area=>!h.memory.places.includes(area)&&s.areas[area]);
  if(place){revealArea(s,place);h.memory.facts.push({tick:s.tick,text:`${p.name} рассказал о месте «${s.areas[place].name}».`});}
  ctx.log(s,`${p.name} узнаёт ${related?'наследника своей семьи':'нового путника'}: «Я тоже однажды вышел на эту дорогу». ${amount?'Помощь: ◈'+amount+'. ':''}${place?'На карте появляется знакомое ему место.':''}`,'heritage');
}
