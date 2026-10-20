import {councilsOn} from './council-state.js';
import {establishAuthority,establishBorder,borderCandidate} from './authority-foundation.js';
import {authorityAt,authoritiesOn} from './authority-state.js';
import {routeDistance} from '../geometry.js';
import {recordPersonRemains} from './remains.js';
import {pathHasFord} from './fords.js';
import {grateClosed} from './mechanism-policy.js';
import {timedLiftPassage,liftAt} from './lift-policy.js';
import {goodsEnabled,takeGoods,requestHarvest} from './goods.js';
import { enabled,moduleRandom } from '../rules.js';
import {detailedActors} from '../actor-projection.js';
import {civicCandidates,civicObservation,civicDestinations,heroPresent} from './background-towns.js';
import { isTown,clamp } from './common.js';
import { createPerson } from './lineage.js';
import { meetPerson } from './social.js';
import { sendGuards } from './orders.js';
import {opportunity} from './opportunities.js';
import {availablePublicTraveller,publicDestinations,startPublicJourney,advancePublicJourney} from './public-journeys.js';
import {npcAction,markNPCDeparture} from './npc-control.js';
const pick=(s,list)=>list[Math.floor(moduleRandom(s,'society')*list.length)];
export function civicArea(s,a){
  if(!isTown(a)||a.civic)return;
  a.civic={food:65,medicine:55,safety:60,tax:4,ruler:null,crisis:null,marketUntil:0,lastEvent:0,completedOffers:[],eventSerial:0};
}
export function initializeSociety(s,h){
  s.society ||= {events:[],journeys:[],orders:[],nextEvent:72,nextEnemy:0};s.society.orders ||= [];
  h.civic ||= {authority:0,holdings:[],lastDecision:0};
}
function record(s,a,text,ctx,kind='world'){
  const event={tick:s.tick,area:a.id,text,kind,...civicObservation(s,a)};s.society.events.unshift(event);if(s.society.events.length>160)s.society.events.length=160;
  s.changes.push({tick:s.tick,text,...(event.knownBy?{id:event.id,area:a.id,knownBy:[...event.knownBy]}:{})});
  if(enabled(s,'background-towns')?heroPresent(s,a):a.id===s.hero.area||s.hero.memory.places.includes(a.id)&&s.tick%144===0)ctx.log(s,text,kind);
  return event;
}
function resident(s,a){return a.population?.map(id=>s.people[id]).find(p=>p?.alive&&p.status==='resident'&&p.area===a.id);}
function npcDies(s,a,p,ctx,cause){
  p.alive=false;p.status='dead';p.died=s.tick;p.health=0;p.deathCause=cause;
  a.objects.push({id:'npc-grave-'+p.id,kind:'grave',name:p.name,x:42});
  recordPersonRemains(s,p,{area:a.id});
  record(s,a,`${a.name}: ${p.name} не переживает ${cause}. Семья и незавершённые обещания остаются.` ,ctx,'loss');
  witnessNPCLoss(s,a,p);
}
export function witnessNPCLoss(s,a,p){for(const h of detailedActors(s))if(h.alive&&!h.life.ended&&h.relations?.[p.id]&&(!enabled(s,'background-towns')||!h.transit&&h.area===a.id))h.mind.stress=Math.min(100,h.mind.stress+8);}
function applyEvent(s,a,ctx){
  const c=a.civic,p=resident(s,a),draw=moduleRandom(s,'society');c.eventSerial++;c.lastEvent=s.tick;
  if(c.crisis&&c.crisis.until<=s.tick){
    if(c.crisis.kind==='epidemic'&&p?.ailment){p.health-=40;if(p.health<=0)npcDies(s,a,p,ctx,'лихорадку');else c.crisis.until=s.tick+220;}
    else if(c.crisis.kind==='hunger'&&c.food<20){a.prosperity=Math.max(0,a.prosperity-12);if(p){p.health-=30;if(p.health<=0)npcDies(s,a,p,ctx,'голод');}c.crisis.until=s.tick+220;}
    else c.crisis=null;
  }
  if(!p){
    if(enabled(s,'migrations'))return;
    const ancestor=(a.population||[]).map(id=>s.people[id]).find(Boolean);
    const origin=enabled(s,'background-towns')?{race:ancestor?.race||'human',culture:a.culture}:{name:'Вела '+s.hero.family,race:s.hero.race};
    const id=createPerson(s,{...origin,role:'переселенец',area:a.id,parents:[],alive:true,health:100,ailment:null,status:'resident',procedural:true});
    a.population ||= [];a.population.push(id);a.objects.push({id:a.id+'-resident-'+id,kind:'resident',person:id,name:s.people[id].name,x:42});
    record(s,a,`${a.name}: пустой дом занимает новая семья.`,ctx);return;
  }
  if(draw<.16&&c.food>20){
    if(goodsEnabled(s))takeGoods(s,a,'food',Math.min(c.food,Math.min(35,Math.max(0,c.food-5))),{flow:'lost',reason:'drought'});else c.food=Math.max(5,c.food-35);a.prosperity=Math.max(0,a.prosperity-8);c.crisis={kind:'hunger',since:s.tick,until:s.tick+260};
    record(s,a,`${a.name}: засуха портит урожай. Нужны припасы из другого поселения.`,ctx);
  }else if(draw<.31&&!p.ailment){
    p.ailment='fever';p.illSince=s.tick;p.health=Math.max(10,p.health-25);c.medicine=Math.max(0,c.medicine-20);c.crisis={kind:'epidemic',person:p.id,since:s.tick,until:s.tick+320};
    record(s,a,`${a.name}: ${p.name} заболевает. Лекарю нужны травы.`,ctx);
  }else if(draw<.45){
    const nearby=a.links.map(id=>s.areas[id]).find(region=>!isTown(region));
    if(nearby&&!nearby.objects.some(o=>o.eventThreat&&o.alive&&!o.resolved)){
      const enemy=ctx.spawnEnemy(s,nearby,{species:'bandit',eventThreat:true,x:57,boss:moduleRandom(s,'society')<.12});c.safety=Math.max(5,c.safety-25);c.crisis={kind:'raid',enemy:enemy.id,area:nearby.id,since:s.tick,until:s.tick+400};
      if(a.population.length>1&&p.role!=='ребёнок'&&moduleRandom(s,'society')<.4){
        p.status='captive';p.area=nearby.id;a.population=a.population.filter(id=>id!==p.id);c.missing ||= [];c.missing.push(p.id);
        nearby.objects.push({id:'captive-'+p.id+'-'+s.tick,kind:'captive',person:p.id,name:p.name,x:84,resolved:false});
        record(s,a,`${p.name} пропадает после нападения. Семья ищет человека, который вернёт его домой.`,ctx,'quest');
      }
      record(s,a,`${a.name}: новый отряд сборщиков дани перекрывает путь из места «${nearby.name}».`,ctx);
    }
  }else if(draw<.57){
    c.marketUntil=s.tick+160;a.prosperity=Math.min(100,a.prosperity+5);if(goodsEnabled(s))requestHarvest(s,a,'fair');else c.food=Math.min(100,c.food+18);
    if(!goodsEnabled(s)&&c.treasury!==undefined)c.treasury=Math.min(200,c.treasury+20);
    record(s,a,goodsEnabled(s)?`${a.name}: ярмарка. Объявлен сбор урожая для рынка; продукты появятся после работы жителей.`:`${a.name}: ярмарка. Еды больше, снаряжение дешевле, приезжие приносят новости.`,ctx);
  }else if(draw<.68&&enabled(s,'politics')){
    if(c.tax>=10||a.prosperity<35){
      a.faction=a.faction==='crown'?'lantern':'crown';c.tax=4;c.safety=Math.max(20,c.safety-10);
      record(s,a,authorityAt(s,a.id)?`${a.name}: другая фракция получает местное влияние; правитель и пограничный закон сохраняются.`:`${a.name}: жители меняют власть. Новая печать принадлежит другой фракции.`,ctx,'politics');
    }else{c.tax+=2;record(s,a,`${a.name}: канцелярия поднимает подать до ${c.tax}%. Недовольство растёт.`,ctx,'politics');}
  }else if(draw<.79){
    const family=enabled(s,'background-towns')?p.family||p.name.split(' ').slice(1).join(' '):p.name.split(' ').slice(1).join(' ')||s.hero.family;
    const child=createPerson(s,{name:pick(s,['Ним','Летта','Саф','Юна'])+' '+family,race:p.race,role:'ребёнок',parents:[p.id],area:a.id,alive:true,health:100,ailment:null,status:'resident',born:s.tick,procedural:true,family:p.culture==='ember'?undefined:p.family});
    a.population.push(child);record(s,a,`${a.name}: в семье ${p.name} появляется ребёнок. Родословная мира продолжается.`,ctx,'family');
  }else if(draw<.9){
    if(enabled(s,'npc-travel')){
      const traveller=(a.population||[]).map(id=>s.people[id]).find(person=>availablePublicTraveller(s,person,a)&&publicDestinations(s,person).length);
      if(traveller)startPublicJourney(s,traveller,a,pick(s,publicDestinations(s,traveller)),ctx);
      return;
    }
    const towns=civicDestinations(s,a);
    if(towns.length&&p.role!=='ребёнок'){
      const destination=pick(s,towns),path=ctx.route(s,a.id,destination.id);if(path.slice(1).some((id,i)=>s.edges[[path[i],id].sort().join('|')]?.metric)||pathHasFord(s,path)||path.some((id,i)=>i>0&&liftAt(s,path[i-1],id)))return;const duration=enabled(s,'background-towns')?20:Math.max(20,Math.ceil(routeDistance(s,path)/100*20));
      p.status='travelling';p.area=null;a.population=a.population.filter(id=>id!==p.id);
      s.society.journeys.push({version:1,movement:'timed',person:p.id,from:a.id,to:destination.id,arrival:s.tick+duration,...(enabled(s,'scene-boundaries')?{departedAt:s.tick,duration}:{}),reason:c.food<40?'Ищет место без голода.':'Хочет увидеть родственников и другой рынок.'});
      markNPCDeparture(s,p,'journey');
      record(s,a,`${p.name} отправляется в ${destination.name}. Знакомого человека теперь можно найти в другом месте.`,ctx);
    }
  }else{
    if(goodsEnabled(s))requestHarvest(s,a,'quiet-season');else c.food=Math.min(100,c.food+12);c.medicine=Math.min(100,c.medicine+8);a.prosperity=Math.min(100,a.prosperity+3);
    record(s,a,`${a.name}: тихий урожайный день. Жители чинят дома и возвращаются к обычным делам.`,ctx);
  }
}
export function societyTick(s,ctx){
  if(!enabled(s,'events'))return;
  for(const journey of [...s.society.journeys]){
    if(journey.movement==='physical'){advancePublicJourney(s,journey,ctx);continue;}
    if(journey.movement!=='timed')throw new Error('Неизвестный текущий способ путешествия');
    if(grateClosed(s,journey.from,journey.to))continue;
    if(s.tick>=journey.arrival){
    const p=s.people[journey.person],a=s.areas[journey.to];
    if(p?.alive&&!npcAction(s,p,'journey'))continue;
    if(p?.alive){if(p.area===null&&liftAt(s,journey.from,journey.to))p.area=journey.from;const r=timedLiftPassage(s,p,journey.to,Number(journey.to.slice(1))>Number(journey.from.slice(1))?5:95);if(!['clear','arrived'].includes(r.status))continue;}
    if(p?.alive){p.area=a.id;p.status='resident';a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);
      if(!a.objects.some(o=>o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:42+(a.population.length%3)*9});
      record(s,a,`${p.name} прибывает в ${a.name}. ${journey.reason}`,ctx,'arrival');}
    s.society.journeys=s.society.journeys.filter(j=>j!==journey);
    }
  }
  if(s.tick>=s.society.nextEvent){
    const towns=civicCandidates(s);
    if(towns.length)applyEvent(s,pick(s,towns),ctx);
    s.society.nextEvent=s.tick+72;
  }
}
export function civicWork(s,job,ctx,workplace=s.areas[s.hero.area]){
  const a=workplace;if(!a.civic||!enabled(s,'events'))return;
  a.prosperity=clamp(a.prosperity+2,0,100);
  if(job==='medicine'){a.civic.medicine=clamp(a.civic.medicine+10,0,100);const p=resident(s,a);if(p?.ailment){const maximum=p.maxHealth||100;p.health=Math.min(maximum,p.health+20);if(p.health>=maximum*.85){p.ailment=null;a.civic.crisis=null;meetPerson(s,p.id,ctx,5);ctx.log(s,`${p.name} выздоравливает благодаря работе героя.`,'heal');}}}
  if(job==='dock'||job==='market'){if(goodsEnabled(s))requestHarvest(s,a,'local-work');else a.civic.food=clamp(a.civic.food+5,0,100);}
}
export {shopPrice} from './prices.js';
export function politicalPlan(s,ctx){
  const h=s.hero,a=s.areas[h.area];if(!enabled(s,'politics')||!isTown(a)||!a.civic||h.civic.lastDecision>s.tick)return false;
  const receiver=Object.values(s.authorities?.byId||{})[1],guard=receiver?.capital===a.id&&receiver.ruler===h.lineage&&borderCandidate(s);if(guard){ctx.goal(s,'govern',a.id,42,'Утвердить действительную пограничную службу','Существующий свободный страж получит оплату из казны и пойдёт на пост своим телом.',{remaining:1,borderRatification:true,person:guard.id});return true;}
  const reputation=h.reputation[a.faction]||0;
  const council=opportunity(s,'council');
  if(!a.civic.ruler&&(reputation>=20&&h.social.fame>=3||reputation>=12&&council.allowed&&council.source===a.faction)&&h.gold>=40){ctx.goal(s,'govern',a.id,42,'Принять место в совете','Жители доверяют поступкам или рекомендации службы. Теперь решения затронут целое поселение.',{remaining:3});return true;}
  if(a.civic.ruler===h.lineage&&a.civic.crisis&&h.gold>=12&&!(councilsOn(s)&&authorityAt(s,a.id)&&a.civic.crisis.kind==='hunger')){ctx.goal(s,'govern',a.id,42,'Разобраться с нуждами поселения','Власть означает ответственность за еду, лечение и безопасность.',{remaining:2});return true;}
  return false;
}
export function governTick(s,ctx){
  const h=s.hero,a=s.areas[h.area],g=h.goal;if(!enabled(s,'politics')){h.goal=null;return;}
  if(authorityAt(s,a.id)&&a.civic.ruler&&a.civic.ruler!==h.lineage){h.goal=null;h.lastAction='talk';return false;}
  if(councilsOn(s)&&authorityAt(s,a.id)&&a.civic.ruler===h.lineage&&a.civic.crisis?.kind==='hunger'&&!g.borderRatification){h.goal=null;ctx.log(s,'Провиант требует настоящего доклада, доступного источника и решения о поставке. Само обсуждение не наполняет кладовую.','politics');return false;}
  g.remaining--;h.lastAction='talk';if(g.remaining>0)return;
  if(g.borderRatification){const made=establishBorder(s);if(made)ctx.log(s,'Совет оплачивает настоящего стража: он идёт к пограничному посту, без переноса тела или второй казны.','politics');h.civic.lastDecision=s.tick+8;h.goal=null;return Boolean(made);}
  if(!a.civic.ruler){
    h.gold-=40;a.civic.ruler=h.lineage;if(authoritiesOn(s)){a.civic.treasury+=40;establishAuthority(s,a.id,h.lineage);establishBorder(s);}h.civic.holdings.push(a.id);h.civic.authority++;h.titles.push('Советник: '+a.name);
    ctx.log(s,`Жители ${a.name} выбирают героя в совет. Одно приключение стало чьей-то властью.`,'politics');
  }else if(h.alignment<-20||h.personality.generosity<.4){
    const tax=Math.min(18,Math.floor(a.prosperity/5),authorityAt(s,a.id)?a.civic.treasury:Infinity);if(authorityAt(s,a.id))a.civic.treasury-=tax;h.gold+=tax;a.prosperity=Math.max(0,a.prosperity-8);a.civic.tax=Math.min(25,a.civic.tax+3);h.alignment=Math.max(-100,h.alignment-4);
    ctx.log(s,`Герой извлекает ◈${tax} из поселения. Подати и недовольство растут.`,'politics');
  }else{
    h.gold-=12;if(goodsEnabled(s)){a.civic.treasury+=12;requestHarvest(s,a,'council-funded');}else a.civic.food=Math.min(100,a.civic.food+25);a.civic.medicine=Math.min(100,a.civic.medicine+20);a.prosperity=Math.min(100,a.prosperity+8);h.alignment=Math.min(100,h.alignment+4);
    if(a.civic.crisis?.kind==='hunger')a.civic.crisis=null;
    if(a.civic.crisis?.kind==='raid')sendGuards(s,a,a.civic.crisis,ctx);
    ctx.log(s,`Герой тратит ◈12 на жителей ${a.name}. Поселение становится благополучнее.`,'politics');
  }
  h.civic.lastDecision=s.tick+100;h.goal=null;
}
