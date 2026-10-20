import {KNIFE_RECIPE,WHISTLE_RECIPE} from './manufacture-recipes.js';
export {KNIFE_RECIPE,WHISTLE_RECIPE} from './manufacture-recipes.js';
import {homeWorkbenchSite,homeAdmission} from './home-place.js';
import {fitsAcquisition,fitsPack} from './container-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {setActorMoney} from '../actor-projection.js';
import {profile} from './common.js';
import {goodsEnabled,productionSources} from './goods.js';
import {workshopSite,workshopPosition,ownedWorkshopSite} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {recordToolUse} from './workshop-tools.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {npcLooseItems,actorItemLocation,itemLocation,consumeOriginal,cacheItems,ITEM_CAPACITY} from './item-originals.js';
import {biomaterialOn,isFang} from './biomaterial-state.js';
import {collectionItems} from './collection-state.js';
import {initializeItemMemory,itemBearer} from './enchantments.js';
import {initializeNewItemCondition,itemWorking} from './item-condition.js';
import {knownMelody,musicInstrument,musicOn} from './camp-music-state.js';



export const forgingEnabled=s=>enabled(s,'forging')&&enabled(s,'equipment')&&enabled(s,'property')&&goodsEnabled(s);
const body=(s,p)=>s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id];
const activeBody=(s,p)=>{const h=body(s,p);return h?.actorMode!=='npc'?h:null;};
const position=(s,p)=>activeBody(s,p)||p;
const purse=(s,p)=>body(s,p)?.gold??p.agenda.wealth;
const state=p=>p.forging;
const ensure=p=>p.forging ||= {version:1,serial:0,recipes:{},orders:{},active:null,after:0};
const current=p=>state(p)?.orders[state(p).active];
const canAct=(s,p)=>Boolean(activeBody(s,p)||npcController(s,p)==='personal');
const near=(s,p,area,x)=>{const at=position(s,p);return at.area===area&&physicalDistance(s.areas[area],at.x,x)<=9;};
const prepared=(s,p)=>{const h=activeBody(s,p);return h?['craft','time'].includes(profile(h).skill):p.agenda?.job==='artisan';};
const healthy=(s,p)=>{const h=activeBody(s,p);return p.alive&&!p.needs?.sleeping&&(h?h.hp>=h.maxHp*.75&&h.energy>=35&&h.hunger<55:p.health>=(p.maxHealth||100)*.75&&p.needs.energy>=35&&p.needs.hunger<55);};
const knife=(s,p)=>collectionItems(s,p.id).find(i=>i.toolKind==='knife'&&itemWorking(i));
function announce(s,p,ctx,text){if(s.hero.lineage===p.id||s.hero.area===p.area)ctx.log(s,text,'craft');}
function rest(s,p,delay=240){ensure(p).after=s.tick+delay;const h=body(s,p);if(h)h.goal=null;else{p.agenda.task=null;p.agenda.due=s.tick+48;}}
function know(s,p,origin,teacher=null){ensure(p).recipes[KNIFE_RECIPE.id] ||= {learnedAt:s.tick,origin,teacher};}
function readySite(s,p,id,area){const site=workshopSite(s,area,id);return site&&(!site.home||homeAdmission(s,site.room,p.id))&&site.object.state==='intact'&&!site.object.closed&&(site.home||s.people[site.object.owner]?.alive)&&workToolReady(s,site.object)?site:null;}
function accessible(s,p,site){if(site.home)return homeAdmission(s,site.room,p.id);if(site.object.owner===p.id)return true;const lease=body(s,p)?.goal?.workspace;return lease?.id===site.object.id&&lease.kind==='lease'&&lease.owner===site.object.owner&&lease.until>=s.tick;}

// A real held fang or dismantled lift part can replace the blade blank. The handle still comes from
// the finite warehouse; neither route creates another raw stock.
export function startKnife(s,p,site,ctx){
 if(!forgingEnabled(s)||!healthy(s,p)||!canAct(s,p)||current(p)||!site||!near(s,p,site.area.id,42)||readySite(s,p,site.object.id,site.area.id)?.object!==site.object)return null;
 if(!state(p)?.recipes[KNIFE_RECIPE.id]&&!prepared(s,p))return null;
 const sources=productionSources(s,site.area),raw=sources?.materials,held=body(s,p)?.bag||p.looseItems||[],fang=biomaterialOn(s)&&held.find(isFang),reclaimed=held.find(i=>i.mechanismPart?.version===1),original=fang||reclaimed,units=original?1:2,price=units*3;
 if(!raw||raw.stock<units||purse(s,p)<price)return null;
 if(!state(p)?.recipes[KNIFE_RECIPE.id])know(s,p,'current-role');
 const q=ensure(p),id=`${p.id}/forge/${++q.serial}`;
 raw.stock-=units;raw.used+=units;setActorMoney(s,p,purse(s,p)-price);site.area.civic.treasury+=price;
 const order={id,recipe:KNIFE_RECIPE.id,owner:p.id,master:p.id,area:site.area.id,workshop:site.object.id,started:s.tick,progress:0,required:knowsPracticalMethod(s,p.id,'craft')?4:KNIFE_RECIPE.work,lastWorkTick:-1,status:'working',materials:KNIFE_RECIPE.materials.map((kind,i)=>({id:id+'/material/'+i,kind,owner:p.id,source:raw.id,sourceOwner:'civic/'+raw.place,acquiredAt:s.tick,price:3,state:'reserved'}))};
 if(fang){held.splice(held.indexOf(fang),1);itemLocation(s,fang,{kind:'forge-order',id});order.materials[0]={id:id+'/material/0',kind:'wolf-fang',owner:p.id,source:fang.bioMaterial.body,sourceOwner:'animal/'+fang.bioMaterial.animal,acquiredAt:s.tick,price:0,state:'reserved',original:fang,provenance:{...fang.bioMaterial,item:fang.id}};}
 else if(reclaimed){held.splice(held.indexOf(reclaimed),1);itemLocation(s,reclaimed,{kind:'forge-order',id});order.materials[0]={id:id+'/material/0',kind:'reclaimed-metal',owner:p.id,source:reclaimed.mechanismPart.node,sourceOwner:reclaimed.mechanismPart.node,acquiredAt:s.tick,price:0,state:'reserved',original:reclaimed,provenance:{node:reclaimed.mechanismPart.node,item:reclaimed.id}};}
 for(const old of Object.values(q.orders).filter(o=>o.status==='completed').slice(0,-7))delete q.orders[old.id];
 q.orders[id]=order;q.active=id;
 announce(s,p,ctx,original?`${p.name} вкладывает ${fang?'свой волчий клык':'деталь разобранного подъёмника'} в заказ и покупает рукоять за ◈3. Тот же материал ждёт работы у верстака.`:`${p.name} покупает заготовку и рукоять за ◈6. Рабочий нож ещё предстоит изготовить.`);return order;
}
export function startWhistle(s,p,site,ctx){
 if(!musicOn(s)||!forgingEnabled(s)||!healthy(s,p)||!canAct(s,p)||current(p)||!site||!near(s,p,site.area.id,42)||readySite(s,p,site.object.id,site.area.id)?.object!==site.object||!prepared(s,p)&&!knowsPracticalMethod(s,p.id,'craft'))return null;
 const raw=productionSources(s,site.area)?.materials;if(!raw||raw.stock<2||purse(s,p)<WHISTLE_RECIPE.price)return null;
 const q=ensure(p),id=p.id+'/forge/'+(++q.serial);q.recipes[WHISTLE_RECIPE.id] ||= {learnedAt:s.tick,origin:prepared(s,p)?'current-role':'practice',teacher:null};
 raw.stock-=2;raw.used+=2;setActorMoney(s,p,purse(s,p)-6);site.area.civic.treasury+=6;
 const o={id,recipe:WHISTLE_RECIPE.id,owner:p.id,master:p.id,area:site.area.id,workshop:site.object.id,started:s.tick,progress:0,required:3,lastWorkTick:-1,status:'working',materials:WHISTLE_RECIPE.materials.map((kind,i)=>({id:id+'/material/'+i,kind,owner:p.id,source:raw.id,sourceOwner:'civic/'+raw.place,acquiredAt:s.tick,price:3,state:'reserved'}))};for(const old of Object.values(q.orders).filter(o=>o.status==='completed').slice(0,-7))delete q.orders[old.id];q.orders[id]=o;q.active=id;
 announce(s,p,ctx,p.name+' приобретает две заготовки за ◈6. До музыкального инструмента остаются три рабочих действия.');return o;
}
function makeWhistle(s,p,o){const item={id:o.id+'/whistle',base:'whistle',name:WHISTLE_RECIPE.name,slot:'charm',stat:'spirit',power:0,rarity:1,modifier:'plain',value:9,creator:p.id,createdAt:s.tick,found:s.tick,foundArea:o.area,physical:{version:1,holder:{kind:'person',id:p.id},movedAt:s.tick},instrument:{version:1,kind:'whistle',order:o.id,maker:p.id},manufacture:{version:1,order:o.id,recipe:o.recipe,master:p.id,workshop:o.workshop,started:o.started,finished:s.tick,actions:o.progress,materials:o.materials.map(m=>({...m}))},history:[{tick:s.tick,text:'Изготовлено: '+p.name+'. Две оплаченные заготовки и три рабочих действия у верстака.'}]};initializeItemMemory(item);itemBearer(s,item,p.id);return item;}
function makeKnife(s,p,o){
 const item={id:o.id+'/knife',base:'blade',name:'Рабочий нож',slot:'weapon',stat:'attack',power:1,rarity:1,modifier:'plain',value:10,toolKind:'knife',found:s.tick,foundArea:position(s,p).area,creator:p.id,createdAt:s.tick,physical:{version:1,holder:{kind:'person',id:p.id},movedAt:s.tick},manufacture:{version:1,order:o.id,recipe:o.recipe,master:p.id,workshop:o.workshop,started:o.started,finished:s.tick,actions:o.progress,materials:o.materials.map(m=>({...m}))},history:[{tick:s.tick,text:`Изготовлено: ${p.name}. Заготовка и рукоять со склада «${s.areas[o.area].name}»; ${o.progress} рабочих действий.`}]};
 const biological=o.materials.find(m=>m.kind==='wolf-fang');if(biological){item.name='Рабочий нож · волчий клык';item.history[0].text=`Изготовлено: ${p.name}. Клык «${biological.provenance.animalName}», извлечённый ${biological.provenance.extractorName}; рукоять со склада «${s.areas[o.area].name}», ${o.progress} рабочих действий.`;}
 const reclaimed=o.materials.find(m=>m.kind==='reclaimed-metal');if(reclaimed)item.history[0].text=`Изготовлено: ${p.name}. Металл детали ${reclaimed.provenance.item} разобранного подъёмника; рукоять со склада «${s.areas[o.area].name}».`;
 initializeItemMemory(item);itemBearer(s,item,p.id);initializeNewItemCondition(s,item);return item;
}
export function workKnife(s,p,ctx){
 const o=current(p);if(!forgingEnabled(s)||!o||o.status!=='working'||!healthy(s,p)||!canAct(s,p)||o.lastWorkTick>=s.tick)return false;
 const site=readySite(s,p,o.workshop,o.area);if(!site||!accessible(s,p,site))return false;
 const pos=workshopPosition(s,site.area,site.object);if(!near(s,p,pos.area,pos.x))return false;
 o.lastWorkTick=s.tick;o.progress++;const h=activeBody(s,p);if(h){h.energy=Math.max(0,h.energy-2);h.lastAction='work';h.speech=`${o.recipe===WHISTLE_RECIPE.id?WHISTLE_RECIPE.name:KNIFE_RECIPE.name}: ${o.progress}/${o.required}`;}else p.needs.energy=Math.max(0,p.needs.energy-2);
 if(o.progress<o.required)return true;
 // Commit before delivery: a repeated action or restored completed order cannot
 // produce another original. The receipt keeps the actual creation date.
 o.status='completed';o.finished=s.tick;o.item=o.id+(o.recipe===WHISTLE_RECIPE.id?'/whistle':'/knife');for(const m of o.materials){m.state='consumed';if(m.original){const original=m.original;consumeOriginal(s,original,{area:o.area,object:o.id,reason:'working-knife-material'});s.itemArchive ||= {};s.itemArchive[original.id]=JSON.parse(JSON.stringify(original));delete m.original;}}
 const item=o.recipe===WHISTLE_RECIPE.id?makeWhistle(s,p,o):makeKnife(s,p,o);const q=state(p);q.active=null;q.after=s.tick+960;
 if(h)ctx.receiveItem(s,ctx,null,item,{crafted:true});
 else {const bag=npcLooseItems(s,p);if(fitsPack(s,p.id,{items:[...bag,item]})&&bag.length<ITEM_CAPACITY){bag.push(item);actorItemLocation(s,item,p.id);}else cacheItems(s,[item],{area:p.area,x:p.x,leftBy:p.id,name:'Изделие у верстака'});}
 recordToolUse(s,site.area,site.object,p.id,ctx);
 announce(s,p,ctx,`${p.name} заканчивает изделие «${item.name}». Это его собственная работа, а не случайная находка.`);
 if(!h)q.offer={item:item.id,price:item.value,area:p.area,at:s.tick};
 if(h)h.goal=null;else{p.agenda.task=null;p.agenda.due=s.tick+48;}return true;
}
function canTeach(s,p,t){return t&&t.id!==p.id&&t.alive&&t.area===position(s,p).area&&!t.needs?.sleeping&&t.needs.energy>=35&&t.needs.hunger<55&&!t.agenda?.task&&npcController(s,t)==='personal'&&canStartNPCActivity(s,t)&&t.health>=(t.maxHealth||100)*.75&&(state(t)?.recipes[KNIFE_RECIPE.id]||prepared(s,t));}
function teacher(s,p){const id=state(p)?.study?.teacher;return id?(canTeach(s,p,s.people[id])?s.people[id]:null):Object.values(s.people).find(t=>canTeach(s,p,t));}
export function learnKnife(s,p,t,ctx){
 if(!forgingEnabled(s)||!healthy(s,p)||!canAct(s,p)||!canTeach(s,p,t)||state(p)?.study&&state(p).study.teacher!==t.id||!near(s,p,t.area,t.x)||t.forgeTeachingTick>=s.tick)return false;
 const q=ensure(p);if(q.recipes[KNIFE_RECIPE.id])return false;
 if(!q.study&&purse(s,p)<2||!npcAction(s,t,'personal','forge-lesson'))return false;
 if(!q.study){if(purse(s,p)<2)return false;setActorMoney(s,p,purse(s,p)-2);setActorMoney(s,t,purse(s,t)+2);q.study={teacher:t.id,paid:2,started:s.tick,progress:0,lastTick:-1};}
 if(q.study.teacher!==t.id||q.study.lastTick>=s.tick)return false;
 t.forgeTeachingTick=s.tick;q.study.lastTick=s.tick;q.study.progress++;t.needs.energy=Math.max(0,t.needs.energy-1);know(s,t,'current-role');
 const h=body(s,p);if(h){h.lastAction='talk';h.speech='Как закрепить рукоять?';}
 if(q.study.progress>=3){know(s,p,'lesson',t.id);q.study=null;announce(s,p,ctx,`${p.name} осваивает рецепт рабочего ножа у ${t.name}. Это знание способа, ещё не опыт изготовления.`);rest(s,p,0);}return true;
}
export function buyKnife(s,p,seller,ctx){
 if(!seller)return false;
 const offer=state(seller)?.offer,item=offer&&collectionItems(s,seller.id).find(i=>i.id===offer.item),bag=body(s,seller)?.bag||seller.looseItems;
 if(!forgingEnabled(s)||s.hero.lineage!==p.id||!activeBody(s,p)||!healthy(s,p)||!seller.alive||seller.needs?.sleeping||seller.agenda?.task||npcController(s,seller)!=='personal'||!canStartNPCActivity(s,seller)||!near(s,p,seller.area,seller.x)||!item||!itemWorking(item)||!bag?.includes(item)||!fitsAcquisition(s,item)||purse(s,p)<offer.price||seller.forgeTeachingTick>=s.tick||!npcAction(s,seller,'personal','forge-sale'))return false;
 bag.splice(bag.indexOf(item),1);setActorMoney(s,p,purse(s,p)-offer.price);setActorMoney(s,seller,purse(s,seller)+offer.price);seller.forgeTeachingTick=s.tick;delete seller.forging.offer;
 item.history.push({tick:s.tick,text:`Продано: ${seller.name} → ${p.name}, ◈${offer.price}.`});
 ctx.receiveItem(s,ctx,null,item,{purchased:true});rest(s,p,960);return true;
}
export function forgePlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!forgingEnabled(s)||h.goal||h.combat||h.transit||!healthy(s,p)||state(p)?.after>s.tick)return false;
 const q=state(p),o=current(p);if(o){const site=readySite(s,p,o.workshop,o.area),route=site&&(ctx.knownRoute||ctx.route)(s,h.area,site.area.id);if(!site||!route?.length){rest(s,p);return false;}const pos=workshopPosition(s,site.area,site.object);ctx.goal(s,'forgeWork',pos.area,pos.x,o.recipe===WHISTLE_RECIPE.id?'Изготовить дорожную свистульку':'Изготовить рабочий нож','Материалы уже принадлежат этому заказу. Осталось поработать у верстака.',{property:o.workshop});return true;}
 const musical=musicOn(s)&&knownMelody(p)&&!musicInstrument(s,p);
 if(musical&&(prepared(s,p)||knowsPracticalMethod(s,p.id,'craft'))){const site=ownedWorkshopSite(s,h.area,p.id);if(site&&readySite(s,p,site.object.id,site.area.id)&&h.gold>=6){ctx.goal(s,'forgeSupply',site.area.id,42,'Подготовить дорожную свистульку','Нужны две оплаченные заготовки и три рабочих действия.',{property:site.object.id,recipe:WHISTLE_RECIPE.id});return true;}}
 if(knife(s,p)&&!musical)return false;
 const a=s.areas[h.area];
 const home=Object.values(s.areas).map(r=>homeWorkbenchSite(s,r)).find(site=>site&&homeAdmission(s,site.room,p.id)&&[site.area.id,site.room.id,site.room.interior.parent].includes(h.area));
 if(home&&(q?.recipes[KNIFE_RECIPE.id]||prepared(s,p))&&h.gold>=KNIFE_RECIPE.price&&!h.quests.some(q=>q.status==='active')){ctx.goal(s,'forgeSupply',home.area.id,42,'Приобрести материалы для домашнего ножа','Стол поставлен с согласия хозяина, но заготовку и рукоять нужно действительно приобрести на местном складе.',{property:home.object.id});return true;}
 if(!a.civic||a.interior||h.quests?.some(x=>x.status==='active')||h.career?.path!=='peaceful'&&h.personality.curiosity<.7)return false;
 const seller=Object.values(s.people).find(t=>t.alive&&t.area===h.area&&state(t)?.offer&&purse(s,p)>=state(t).offer.price&&collectionItems(s,t.id).some(i=>i.id===state(t).offer.item&&(i.toolKind==='knife'&&!knife(s,p)||musical&&i.instrument?.kind==='whistle')));
 if(seller){ctx.goal(s,'forgeBuy',h.area,seller.x,'Купить собственное изделие мастера','Местный мастер предлагает уже изготовленный нож либо нужный музыкальный инструмент.',{person:seller.id});return true;}
 if(!q?.recipes[KNIFE_RECIPE.id]&&!prepared(s,p)){const t=teacher(s,p);if(!t||q?.study&&q.study.teacher!==t.id||!q?.study&&h.gold<2)return false;ctx.goal(s,'forgeLearn',h.area,t.x,'Узнать рецепт ножа','Любопытство и свободный мастер: можно освоить способ за три занятия.',{person:t.id});return true;}
 const price=biomaterialOn(s)&&h.bag.some(isFang)?3:KNIFE_RECIPE.price,site=workshopSite(s,a);if(!site||!readySite(s,p,site.object.id,a.id)||h.gold<price+(site.object.owner===p.id?0:site.object.rent))return false;
 ctx.goal(s,'forgeSupply',a.id,42,'Подготовить рабочий нож','Сначала приобрести настоящую заготовку и рукоять. Без них изготовление невозможно.',{property:site.object.id});return true;
}
export function forgeAction(s,ctx){
 const p=s.people[s.hero.lineage],g=s.hero.goal;if(!g)return false;
 if(!forgingEnabled(s)){s.hero.goal=null;return false;}
 if(g.kind==='forgeSupply'){const site=workshopSite(s,g.area,g.property);const o=g.recipe===WHISTLE_RECIPE.id?startWhistle(s,p,site,ctx):startKnife(s,p,site,ctx);if(o){const pos=workshopPosition(s,site.area,site.object);Object.assign(g,{kind:'forgeWork',area:pos.area,x:pos.x});}else rest(s,p);return Boolean(o);}
 if(g.kind==='forgeWork'){const access=ctx.workspaceAccess(s);if(access!=='ready')return false;const done=workKnife(s,p,ctx);if(!done)rest(s,p);return done;}
 if(g.kind==='forgeLearn'){const t=s.people[g.person];if(t?.area===s.hero.area)g.x=t.x;if(learnKnife(s,p,t,ctx))return true;rest(s,p);return false;}
 if(g.kind==='forgeBuy'){if(buyKnife(s,p,s.people[g.person],ctx))return true;rest(s,p);return false;}
 return false;
}
export function npcForgePlan(s,p){
 if(!forgingEnabled(s)||!current(p)&&p.agenda.job!=='artisan'||!healthy(s,p)||state(p)?.after>s.tick||!current(p)&&knife(s,p)&&!(musicOn(s)&&knownMelody(p)&&!musicInstrument(s,p)))return null;
 const o=current(p),site=o?readySite(s,p,o.workshop,o.area):ownedWorkshopSite(s,p.area,p.id),price=biomaterialOn(s)&&collectionItems(s,p.id).some(isFang)?3:6;if(!site||site.object.owner!==p.id||!readySite(s,p,site.object.id,site.area.id)||!o&&purse(s,p)<price)return null;
 return {kind:o?'forgeWork':'forgeSupply',target:site.area.id,x:o?site.object.x:42,remaining:1,property:site.object.id,...(!o&&musicOn(s)&&knownMelody(p)&&!musicInstrument(s,p)?{recipe:WHISTLE_RECIPE.id}:{})};
}
export function npcForgeAction(s,p,t,ctx){
 if(!forgingEnabled(s)){p.agenda.task=null;p.agenda.due=s.tick+48;return false;}
 if(t.kind==='forgeSupply'){const site=workshopSite(s,t.target,t.property);if(t.recipe===WHISTLE_RECIPE.id?startWhistle(s,p,site,ctx):startKnife(s,p,site,ctx)){t.kind='forgeWork';t.x=site.object.x;return true;}rest(s,p);return false;}
 if(workKnife(s,p,ctx))return true;rest(s,p);return false;
}
