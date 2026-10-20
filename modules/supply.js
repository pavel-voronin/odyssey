import {harvestFactor} from './harvest-failure-state.js';
import {physicalDistance} from '../geometry.js';
import {containersOn,stackRoom} from './container-state.js';
import {loadPackCargo} from './container-cargo.js';
import {heroCreditPlan} from './provision-credit-actors.js';
import {merchantDispatch} from './merchant-freight.js';
import {canBargain} from './skill-branches.js';
import {pathHasFord} from './fords.js';
import {grateClosed} from './mechanism-policy.js';
import {timedLiftPassage} from './lift-policy.js';
import {edibleBroth,actualHearth,kitchenTick} from './hearth-food.js';
import {initializeFoodSource,localFoodEnabled,localFoodChoice,localFoodWork,forageGrowth,takeForage,LOCAL_FOODS} from './local-food.js';
import {areaScale,areaOffset} from '../geometry.js';
import {goodsEnabled,takeGoods,putGoods} from './goods.js';
import {marketEnabled,quoteMarket,tradeGoods} from './market.js';
import {marketKnowledgeEnabled,observeMarket} from './market-knowledge.js';
import {knownFoodChoice} from './market-food.js';
import {knownArea,knownRoad} from '../actor-atlas.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
import {feedParty,partyMealSize,humanParty} from './party-needs.js';
import {consumeTravelMeal,carriedFood} from './stores.js';
import {foodPrice} from './prices.js';
import {freightDispatch,freightEvent,observeConvoy,observeFreightActor} from './freight-memory.js';
import {createFreight,advanceFreight,freightHistory,abandonFreight} from './freight.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown,profile,moral} from './common.js';
import {createPerson} from './lineage.js';
import {opportunity} from './opportunities.js';
import {weatherAt} from './weather.js';
import {npcAction,markNPCDeparture} from './npc-control.js';
import {roadNeeds} from './road-needs.js';
import {actualService,knownServiceAllows,rememberService,denyService,serviceStaff} from './service-access.js';
export function supplyArea(s,a){
  if(a.forage)return;
  const fertile=['forest','camp','island'].includes(a.type),fungal=['cave','undercity'].includes(a.type);
  a.forage={stock:fertile?12:fungal?6:0,max:fertile?12:fungal?6:0,x:18,lastGrowth:s.tick||0,kind:fungal?'Съедобные грибы':'Ягоды и съедобные коренья'};
  initializeFoodSource(s,a);
}
export function initializeSupply(s,h){
  h.inventory.rations ??= 0;h.counters.forage ??= 0;h.counters.meals ??= 0;
  s.logistics ||= {convoys:[],nextConvoy:0,nextDispatch:192,deliveries:0,losses:0};
  s.logistics.history ||= [];
}
function clearSegment(a,from,to){return !a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&o.x>=Math.min(from,to)-9&&o.x<=Math.max(from,to)+9);}
export function serviceReachable(s,a,x,ctx,knownPath=null){
  const h=s.hero,path=knownPath||(ctx.knownRoute||ctx.route)(s,h.area,a.id);if(!path.length||path.some((id,i)=>!knownArea(s,id)||i&&!knownRoad(s,path[i-1],id)))return false;
  let from=h.x;
  for(let i=0;i<path.length;i++){
    const node=s.areas[path[i]],next=path[i+1],to=next?(Number(next.slice(1))>Number(node.id.slice(1))?100:0):x;
    if(!clearSegment(node,from,to))return false;
    if(next)from=to===100?5:95;
  }
  return true;
}
export function foodPlan(s,ctx,{reserve=false}={}){
  if(!enabled(s,'supply'))return false;
  const h=s.hero;
  if(!reserve&&edibleBroth(s,h)){const fire=actualHearth(s,h.area);ctx.goal(s,'brothEat',h.area,fire.x,'Поесть у очага','Здесь осталась приготовленная похлёбка. Готовое блюдо ждёт у огня.');return true;}
  if(!reserve&&carriedFood(s.people[h.lineage],h.inventory)>0){ctx.goal(s,'eat',h.area,h.x,'Съесть дорожные припасы','Еда уже в сумке; голод не требует похода в поселение.');return true;}
  if(heroCreditPlan(s,ctx,{request:true}))return true;
  const local=localFoodChoice(s,s.people[h.lineage],h,s.areas[h.area]);
  if(local&&serviceReachable(s,s.areas[h.area],local.x,ctx)){ctx.goal(s,'forage',h.area,local.x,local.kind==='fish'?'Поймать рыбу':'Собрать знакомые грибы',`${local.name}: известен способ и есть собственное средство. ${local.remaining} рабочих действий у местного источника.`,{remaining:local.remaining,foodSource:local.id});return true;}
  if(marketKnowledgeEnabled(s)){
    observeMarket(s,h.lineage,{force:true});const choice=knownFoodChoice(s,ctx,{allowed:a=>knownServiceAllows(s,a,'food'),reachable:(a,path)=>serviceReachable(s,a,42,ctx,path)});
    if(choice){ctx.goal(s,'provision',choice.area,42,'Купить еду по известной цене',`Последние сведения о ${choice.name}: ${choice.quantity} порц. за ◈${choice.total}, ${choice.age<240?'менее дня':Math.floor(choice.age/240)+' дн.'} назад. К приезду цена и запас могут измениться.`);return true;}
  }
  const town=ctx.closest(s,a=>knownArea(s,a)&&isTown(a)&&(marketKnowledgeEnabled(s)?(!s.people[h.lineage]?.marketKnowledge?.entries.some(e=>e.market===a.id&&e.kind==='food'&&s.tick-e.at<480))&&h.gold>0:a.civic.food>=(marketEnabled(s)?1:4)&&(!marketEnabled(s)||quoteMarket(s,a,'food','buy',4,{gold:h.gold,trade:canBargain(s,h.lineage,profile(h).skill==='trade')}).quantity>0))&&knownServiceAllows(s,a,'food')&&serviceReachable(s,a,42,ctx));
  if(town){ctx.goal(s,'provision',town.id,42,'Найти еду в поселении',marketKnowledgeEnabled(s)?'Последних цен отсюда нет. Герой узнает условия на месте; наличие еды не гарантировано.':'В кладовой есть реальные запасы; часть можно взять в дорогу.');return true;}
  const forage=ctx.closest(s,a=>knownArea(s,a)&&a.forage?.stock>0&&(!localFoodEnabled(s)||!a.forage.localFood||localFoodChoice(s,s.people[h.lineage],h,a))&&serviceReachable(s,a,a.forage.x,ctx));
  if(forage){const source=localFoodChoice(s,s.people[h.lineage],h,forage);ctx.goal(s,'forage',forage.id,forage.forage.x,source?.kind==='fish'?'Поймать рыбу':'Добыть еду на дороге','Кладовые пусты или дорога перекрыта. Здесь известен доступный источник пищи.',{remaining:source?.remaining||3,...(source?{foodSource:source.id}:{})});return true;}
  ctx.goal(s,'forage',h.area,h.x,'Искать съедобное поблизости','Известного безопасного источника нет. Он проверяет окрестности.',{remaining:3,search:true});return true;
}
export function eat(s,ctx){
  const h=s.hero;if(!enabled(s,'supply')){h.goal=null;return;}
  const opened=(s.people[h.lineage]?.roadSupplies?.food||0)>0,portions=consumeTravelMeal(s.people[h.lineage],h.inventory,partyMealSize(s));if(!portions){h.goal=null;return;}
  h.hunger=Math.max(0,h.hunger-65);h.lastAction='eat';h.goal=null;h.counters.meals++;feedParty(s,portions-1);
  const fed=new Set(humanParty(s).slice(0,portions-1).map(c=>c.person));for(const c of h.companions)if(!opened||!c.person||fed.has(c.person))c.loyalty=Math.min(100,c.loyalty+3);
  ctx.log(s,opened?`Герой расходует открытые припасы: порций ${portions}. Остаток остаётся в сумке.`:'Герой делит дорожный паёк с отрядом. В сумке на один запас меньше.','food');
}
export function buyFood(s,ctx){
  if(!enabled(s,'supply'))return false;
  const h=s.hero,a=s.areas[h.area],price=foodPrice(s);
  if(denyService(s,ctx,'food')){h.goal=null;h.memory.foodAfter=s.tick+96;return true;}
  if(marketEnabled(s)){
    if(containersOn(s)&&!stackRoom(s,h.lineage,'food',1)&&!h.transit&&physicalDistance(a,h.x,42)<=1){const q=quoteMarket(s,a,'food','buy',partyMealSize(s),{trade:canBargain(s,h.lineage,profile(h).skill==='trade'),gold:h.gold});if(q.quantity&&takeGoods(s,a,'food',q.quantity,{flow:'consumed',reason:'hero-on-site-meal',actor:h.lineage})===q.quantity){h.gold-=q.total;a.civic.treasury=(a.civic.treasury||0)+q.total;h.hunger=Math.max(5,h.hunger-65);h.counters.meals++;h.lastAction='eat';h.goal=null;feedParty(s,q.quantity-1);ctx.log(s,'Рюкзак заполнен: герой покупает еду и ест на месте, не выбрасывая поклажу.','food');return true;}}
    const deal=tradeGoods(s,a,h.lineage,'food','buy',4,{trade:canBargain(s,h.lineage,profile(h).skill==='trade')});
    h.goal=null;
    if(!deal.quantity){h.memory.foodAfter=s.tick+24;ctx.log(s,deal.reason==='capacity'?'В рюкзаке нет места для новой еды. Нужно освободить поклажу.':deal.reason==='money'?'На еду не хватает монет. Нужен заработок или съедобные растения.':'Поселение бережёт последний запас. Герою нужен другой источник еды.','food');return true;}
    const portions=consumeTravelMeal(s.people[h.lineage],h.inventory,partyMealSize(s));
    h.hunger=Math.max(5,h.hunger-65);h.counters.meals++;h.lastAction='eat';feedParty(s,portions-1);
    ctx.log(s,`Куплено ${deal.quantity} порц. за ◈${deal.total}; съедено ${portions}. Остаток остаётся в сумке.`,'food');return true;
  }
  if(!a.civic||a.civic.food<4){h.goal=null;h.memory.foodAfter=s.tick+96;ctx.log(s,'Кладовая пуста. За деньги или работу здесь сейчас нельзя получить еду.','food');return true;}
  takeGoods(s,a,'food',4,{flow:goodsEnabled(s)?'exported':'consumed',reason:'hero-meal',actor:h.lineage});
  if(h.gold>=price){h.gold-=price;if(goodsEnabled(s)||enabled(s,'service-access'))a.civic.treasury=(Number.isFinite(a.civic.treasury)?a.civic.treasury:0)+price;}else {h.energy=Math.max(0,h.energy-5);moral(s,1);}
  h.hunger=5;h.counters.meals++;h.lastAction='eat';h.goal=null;
  if(goodsEnabled(s)){const p=s.people[h.lineage];p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food=(p.roadSupplies.food||0)+4;const portions=consumeTravelMeal(p,h.inventory,partyMealSize(s));feedParty(s,portions-1);}else feedParty(s);
  if(a.civic.food>=8&&h.gold>=price&&stackRoom(s,h.lineage,'rations',1)>=1){h.gold-=price;if(goodsEnabled(s)||enabled(s,'service-access'))a.civic.treasury=(Number.isFinite(a.civic.treasury)?a.civic.treasury:0)+price;takeGoods(s,a,'food',4,{flow:'exported',reason:'hero-ration',actor:h.lineage});h.inventory.rations++;}
  ctx.log(s,`Герой получает еду из кладовой. Запас поселения: ${a.civic.food} / 100; дорожных пайков: ${h.inventory.rations}.`,'food');return true;
}
export function forageTick(s,ctx){
  const h=s.hero,g=h.goal,a=s.areas[h.area];
  if(!enabled(s,'supply')){h.goal=null;return;}
  if(localFoodEnabled(s)&&g.foodSource){const result=localFoodWork(s,s.people[h.lineage],a,g,h,ctx);h.lastAction='collect';if(result.finished){h.goal=null;if(result.receipt){h.counters.forage++;ctx.log(s,`${LOCAL_FOODS[result.receipt.kind].name}: получено ${result.receipt.quantity}. Добыча убрана в сумку.`,'food');}else {h.memory.foodAfter=s.tick+24;ctx.log(s,result.reason||'Источник истощён. Нужен другой способ добыть еду.','food');}}return;}
  if(localFoodEnabled(s)&&a.forage?.localFood){h.goal=null;h.memory.foodAfter=s.tick+24;ctx.log(s,'Здесь нужен известный способ добычи и своё средство. Герой ищет другую еду.','food');return;}
  if(!localFoodEnabled(s)&&g.foodSource){delete g.foodSource;delete g.foodWork;g.remaining=3;}
  g.remaining--;h.energy=Math.max(0,h.energy-1);h.lastAction='collect';
  if(g.remaining>0)return;
  const available=a.forage?.stock||0;
  if(available>0){const found=takeForage(a,stackRoom(s,h.lineage,'rations',3));h.inventory.rations+=found;h.counters.forage++;ctx.log(s,`${a.forage.kind}: получено пайков — ${found}. Растениям нужно время, чтобы восстановиться.`,'food');}
  else if(g.search&&stackRoom(s,h.lineage,'rations',1)&&moduleRandom(s,'supply')<.35){h.inventory.rations++;h.counters.forage++;ctx.log(s,'В расщелине найдены съедобные коренья. Один паёк — результат поисков, не бесконечная кладовая.','food');}
  else {h.memory.foodAfter=s.tick+24;ctx.log(s,'Поиски еды ничего не дали. Герой запоминает нехватку и проверит другое место.','food');}
  h.goal=null;
}
export function restAmount(s,a){
  if(enabled(s,'body')&&s.hero.hunger>90)return 0;
  if(enabled(s,'service-access')&&isTown(a)){
    if(Math.abs(s.hero.x-68)*areaScale(a)>=2)return 2;
    if(!actualService(s,a,'clinic').available){rememberService(s,a,'clinic');return 2;}
  }
  if(!enabled(s,'supply'))return isTown(a)?5:3;
  const h=s.hero;
  if(isTown(a)&&Math.abs(h.x-68)*areaScale(s.areas[h.area])<2&&a.civic.medicine>=1&&h.hp<h.maxHp){a.civic.medicine--;const clinic=opportunity(s,'clinic');return 5+(clinic.allowed&&clinic.source===a.faction?1:0);}
  return isTown(a)?2:3;
}
export function clinicTreatment(s,ctx){
  const here=s.areas[s.hero.area];
  if(enabled(s,'service-access')&&isTown(here)&&Math.abs(s.hero.x-68)*areaScale(here)<2&&!actualService(s,here,'clinic',{units:2}).available){const info=rememberService(s,here,'clinic',{units:2});if(!s.hero.goal?.serviceWarned){ctx.log(s,(info?.reason||'Лечебница недоступна.')+' Отдых и собственные лекарства остаются доступны.','heal');if(s.hero.goal)s.hero.goal.serviceWarned=true;}return true;}
  if(!enabled(s,'supply'))return false;
  const h=s.hero,a=s.areas[h.area];
  if(!isTown(a)||Math.abs(h.x-68)*areaScale(s.areas[h.area])>=2)return true;
  const ailments=h.conditions.filter(c=>!['blessing','inspiration'].includes(c.id));if(!ailments.length)return true;
  if(a.civic.medicine<2){if(!h.goal?.clinicWarned){ctx.log(s,'Лекарь остался без средств. Отдых возвращает силы, но лекарства нужно привезти.','heal');if(h.goal)h.goal.clinicWarned=true;}return true;}
  a.civic.medicine-=2;h.conditions=h.conditions.filter(c=>['blessing','inspiration'].includes(c.id));ctx.log(s,'Лекарь расходует средства из аптечки, снимая жар и отравление. Запас медицины уменьшился.','heal');return true;
}
function report(s,text,ctx,c,area){if(enabled(s,'npc-logistics')&&c&&area)return freightEvent(s,c,area,text,ctx);s.changes.push({tick:s.tick,text});ctx.log(s,text,'supply');}
export function supplyTick(s,ctx){
  if(!enabled(s,'supply'))return;
  for(const a of Object.values(s.areas)){
    kitchenTick(s,a,ctx);
    initializeFoodSource(s,a);
    if(a.forage?.max&&s.tick-a.forage.lastGrowth>=384){forageGrowth(s,a,weatherAt(s,a).growth);a.forage.lastGrowth=s.tick;}
    if(a.civic&&s.tick%96===0){
      const residents=(a.population||[]).filter(id=>s.people[id]?.alive&&s.people[id].status==='resident'&&(!enabled(s,'service-access')||s.people[id].area===a.id)).length;
      const workers=enabled(s,'service-access')?serviceStaff(s,a,'employment',{sleeping:true}).length:residents;
      const produced=a.civic.crisis?.kind==='hunger'?0:workers?(['village','island'].includes(a.type)?4:2):0;
      if(!goodsEnabled(s))a.civic.food=Math.max(0,Math.min(100,a.civic.food+Math.round(produced*weatherAt(s,a).harvest*harvestFactor(s,a))-Math.min(4,Math.ceil(residents/2))));
      if((enabled(s,'service-access')?serviceStaff(s,a,'clinic',{sleeping:true}).length:residents)&&s.tick%192===0)a.civic.medicine=Math.min(100,a.civic.medicine+1);
    }
  }
  for(const c of [...s.logistics.convoys]){
    const raided=enabled(s,'caravans')&&detailedActors(s).some(h=>selfDrivenActor(s,h)&&!h.transit&&h.goal?.kind==='caravanRaid'&&h.goal.convoy===c.id&&s.people[c.person]?.area===h.area);
    if(c.movement==='physical'){if(!raided)advanceFreight(s,c,ctx);continue;}
    if(c.movement!=='timed')throw new Error('Неизвестный текущий способ перевозки');
    if(enabled(s,'npc-control')&&s.people[c.person]&&!s.people[c.person].alive){abandonFreight(s,c,ctx);continue;}
    if(!npcAction(s,s.people[c.person],'caravan'))continue;
    if(enabled(s,'npc-control')){const driver=s.people[c.person];if(driver.status!=='caravan'){const a=s.areas[driver.area];if(a){a.population=(a.population||[]).filter(id=>id!==driver.id);a.objects=a.objects.filter(o=>o.kind!=='resident'||o.person!==driver.id);}driver.status='caravan';}}
    if(roadNeeds(s,s.people[c.person],ctx,c)){if(!s.people[c.person].alive)abandonFreight(s,c,ctx);continue;}
    if(enabled(s,'npc-logistics'))observeConvoy(s,c);
    if(raided)continue;
    const escort=s.actorStates?.[c.escort];if(enabled(s,'caravans')&&selfDrivenActor(s,escort)){
      const next=s.areas[c.path[c.index+1]];
      if(next&&(escort.transit||escort.area!==next.id||escort.combat||next.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved)))continue;
    }
    if(grateClosed(s,c.path[c.index],c.path[c.index+1]))continue;
    if(c.remaining<=1||s.people[c.person].liftTransit){const from=c.path[c.index],to=c.path[c.index+1],r=timedLiftPassage(s,s.people[c.person],to,Number(to?.slice(1))>Number(from.slice(1))?5:95);if(!['clear','arrived'].includes(r.status))continue;}
    c.remaining--;if(c.remaining>0)continue;
    c.index++;const a=s.areas[c.path[c.index]],p=s.people[c.person];p.area=a.id;
    const enemy=a.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved);
    if(enemy){
      s.logistics.losses++;p.status='captive';p.health=Math.max(1,p.health-20);
      a.objects.push({id:c.id+'-captive',kind:'captive',person:p.id,name:p.name,x:Math.min(100-areaOffset(a,8),enemy.x+areaOffset(a,7)),resolved:false});
      a.objects.push({id:c.id+'-cargo',kind:'supplyCache',name:'Брошенный груз каравана',x:Math.min(100-areaOffset(a,8),enemy.x+areaOffset(a,12)),food:c.food,medicine:c.medicine,taken:false});
      report(s,`${p.name} перехвачен в месте «${a.name}». Груз потерян на дороге, поселение ждёт припасов.`,ctx,c,a);
      convoyHistory(s,c,'captured');
      s.logistics.convoys=s.logistics.convoys.filter(other=>other!==c);continue;
    }
    if(c.index===c.path.length-1){
      putGoods(s,a,'food',c.food,{reason:'legacy-convoy',actor:p.id});a.civic.medicine=Math.min(100,a.civic.medicine+c.medicine);if(a.civic.food>=40&&a.civic.crisis?.kind==='hunger')a.civic.crisis=null;
      p.status='resident';a.population ||= [];a.population.push(p.id);a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:55});s.logistics.deliveries++;
      report(s,`${p.name} привозит в ${a.name}: еда +${c.food}, медицина +${c.medicine}. Груз действительно прошёл дорогу.`,ctx,c,a);s.logistics.convoys=s.logistics.convoys.filter(other=>other!==c);observeFreightActor(s,p);
      convoyHistory(s,c,'delivered');
    }else c.remaining=Math.ceil(16*areaScale(a));
  }
  if(s.tick<s.logistics.nextDispatch)return;s.logistics.nextDispatch=s.tick+192;
  if(enabled(s,'npc-logistics')){if(merchantDispatch(s,ctx))return;const request=freightDispatch(s);if(request)createFreight(s,request.source,request.target,ctx,request.driver);return;}
  const towns=Object.values(s.areas).filter(a=>isTown(a)&&a.discovered);
  const destination=towns.find(a=>a.civic.food<35||a.civic.medicine<12);if(!destination)return;
  const source=towns.find(a=>{const path=ctx.route(s,a.id,destination.id);return a.id!==destination.id&&a.era===destination.era&&a.realm===destination.realm&&a.civic.food>60&&path.length>=2&&path.length<=7&&path.slice(1).every((node,i)=>!['time','portal'].includes(s.edges[[path[i],node].sort().join('|')]?.mode));});if(!source)return;
  launchConvoy(s,source,destination,ctx);
}
export function convoyHistory(s,c,outcome){s.logistics.history ||= [];if(c.movement==='physical'){const p=s.people[c.person],a=s.areas[p.area],proof=freightEvent(s,c,a,`${p.name}: рейс завершён.`,{log:()=>{}});freightHistory(s,c,outcome,proof);return;}const proof=enabled(s,'npc-logistics')&&s.logistics.events?.find(e=>e.id===c.lastEvent);s.logistics.history.push({id:c.id,source:c.source,to:c.to,person:c.person,tick:s.tick,outcome,...(proof?{area:proof.area,eventId:proof.id,knownBy:[...proof.knownBy]}:{})});if(s.logistics.history.length>80)s.logistics.history.shift();}
export function launchConvoy(s,source,destination,ctx){
  if(enabled(s,'npc-logistics'))return enabled(s,'supply')?createFreight(s,source,destination,ctx):null;
  if(!enabled(s,'supply')||!source?.civic||!destination?.civic||source.id===destination.id||source.civic.food<12)return null;
  const path=ctx.route(s,source.id,destination.id);if(path.length<2||pathHasFord(s,path)||path.slice(1).some((id,i)=>s.edges[[path[i],id].sort().join('|')]?.metric))return null;
  if(source.era!==destination.era||path.slice(1).some((node,i)=>['time','portal'].includes(s.edges[[path[i],node].sort().join('|')]?.mode)))return null;
  takeGoods(s,source,'food',12,{flow:'exported',reason:'legacy-convoy'});const medicine=Math.min(4,Math.max(0,source.civic.medicine-30));source.civic.medicine-=medicine;
  const person=createPerson(s,{name:'Возчик '+['Ивар','Адель','Корен','Юна','Летта','Саф'][s.logistics.nextConvoy%6],race:s.people[source.population?.[0]]?.race||'human',role:'возчик',alive:true,status:'caravan',area:source.id,procedural:true});
  const c={version:1,movement:'timed',sightings:{},sourceName:source.name,targetName:destination.name,id:'convoy-'+s.logistics.nextConvoy++,person,source:source.id,to:destination.id,path,index:0,remaining:48,food:12,medicine};s.logistics.convoys.push(c);
  markNPCDeparture(s,s.people[person],'caravan');
  report(s,`${source.name} отправляет припасы в ${destination.name}. Они вычтены из исходной кладовой и пока находятся в дороге.`,ctx,c,source);
  return c;
}
export function recoverCargo(s,o,ctx){if(!enabled(s,'supply')||o.taken)return;if(o.itemOriginals===1&&o.items?.length){if(s.hero.transit||!s.areas[s.hero.area]?.objects.includes(o)||physicalDistance(s.areas[s.hero.area],s.hero.x,o.x)>1)return;ctx.recoverHeirloom?.(s,o,ctx);o.taken=false;}if(containersOn(s)){if(s.hero.transit||!s.areas[s.hero.area]?.objects.includes(o)||physicalDistance(s.areas[s.hero.area],s.hero.x,o.x)>1)return;const accepted=loadPackCargo(s,o);o.taken=!['food','medicine','tools'].some(k=>o[k]>0)&&!(o.items?.length);if(Object.values(accepted).some(n=>n>0))ctx.log(s,'Часть припасов перенесена в рюкзак. Непоместившийся остаток сохраняется здесь.','food');return;}o.taken=!(o.items?.length);s.hero.inventory.rations+=Math.floor(o.food/4);s.hero.inventory.herbs+=o.medicine;if(goodsEnabled(s)){const p=s.people[s.hero.lineage];p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food=(p.roadSupplies.food||0)+o.food%4;o.food=0;o.medicine=0;}if(o.tools){const p=s.people[s.hero.lineage];p.marketCargo ||= {tools:0};p.marketCargo.tools+=o.tools;o.tools=0;}ctx.log(s,'Найден потерянный груз каравана. Еда и лечебные средства теперь в сумке героя.','food');}
export function spoilRation(s){if(!enabled(s,'supply')||s.hero.inventory.rations<=0)return false;s.hero.inventory.rations--;return true;}
