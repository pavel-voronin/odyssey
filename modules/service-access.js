import {structurallySound} from './building-condition.js';
import {controlBlocked} from './building-control-state.js';
import {enabled} from '../rules.js';
import {rescueQuestAvailable} from './rescue-escape.js';
import {observeMarket} from './market-knowledge.js';
import {BIOMES,JOBS} from '../content.js';
import {areaScale} from '../geometry.js';
import {npcController} from './npc-control.js';
import {workToolReady} from './workshop-tool-state.js';
import {workshopSite,workshopInteriorsOn} from './workshop-place.js';
const on=s=>enabled(s,'service-access');
const kinds=new Set(['clinic','food','warehouse','employment','merchant']);
const town=a=>Boolean(a&&BIOMES[a.type]?.town);
const roles={clinic:['healer','alchemist'],food:['farmer','merchant'],warehouse:['artisan','merchant']};
export function serviceStaff(s,a,kind,{sleeping=false}={}){
 return [...new Set(a?.population||[])].map(id=>s.people[id]).filter(p=>p?.alive&&p.health>0&&(p.area===a.id||kind==='employment'&&workshopInteriorsOn(s)&&workshopSite(s,p.area)?.area.id===a.id)&&p.status==='resident'&&p.role!=='ребёнок'&&p.agenda?.job!=='student'&&npcController(s,p)==='personal'&&(!roles[kind]||roles[kind].includes(p.agenda?.job)||a.foundedSettlement?.service.kind===kind&&a.foundedSettlement.service.provider===p.id)&&(sleeping||!enabled(s,'npc-needs')||!p.needs?.sleeping&&(p.needs?.energy??100)>=15&&(p.needs?.hunger??0)<90));
}
export function merchantGoods(s){
 return s.merchant.serviceStock;
}
export function merchantResupply(s,arrived=false){
 if(!on(s))return;const m=s.merchant,stock=merchantGoods(s),a=s.areas[m.area];
 if(arrived&&a?.civic)for(const [kind,field,provider]of [['gear','tools','warehouse'],['medicine','medicine','clinic']]){
  if(!serviceStaff(s,a,provider).length)continue;const amount=Math.min(Math.max(0,3-stock[kind]),Math.max(0,Math.floor(a.civic[field]||0)));if(amount>0){if(field==='tools')takeGoods(s,a,'tools',amount,{flow:'exported',reason:'merchant-resupply'});else a.civic[field]-=amount;stock[kind]+=amount;}
 }
 m.stock=stock.gear+stock.medicine;
}
export function merchantCanSell(s,kind){return !on(s)||s.hero.alive&&!s.hero.transit&&['weapon','armor','potion'].includes(kind)&&s.merchant.area===s.hero.area&&Math.abs(s.hero.x-58)*areaScale(s.areas[s.hero.area])<=9&&merchantGoods(s)[kind==='potion'?'medicine':'gear']>=1;}
export function consumeMerchantGood(s,kind){
 if(!on(s))return true;if(!merchantCanSell(s,kind))return false;const stock=merchantGoods(s);stock[kind==='potion'?'medicine':'gear']--;s.merchant.stock=stock.gear+stock.medicine;return true;
}
export function actualService(s,a,kind,{job=null,units=1,workshop=null}={}){
 if(kind==='employment'&&job==='repair'&&controlBlocked(s,a,workshop))return {available:false,reason:'Мастерская занята вооружённым захватчиком. Право владельца сохранилось, но доступа нет.'};
 if(!on(s))return {available:true,reason:null};
 if(a?.interior?.kind==='workshop'&&kind==='employment'&&job==='repair'){
  const site=workshopSite(s,a);if(!workshopInteriorsOn(s)||!site||site.object.state!=='intact'||!s.people[site.object.owner]?.alive)return {available:false,reason:'Мастерская больше не принимает работу.'};
  a=site.area;workshop=site.object;
 }
 if(!kinds.has(kind))return {available:false,reason:'Такой службы здесь нет.'};
 if(kind==='merchant'){const present=s.merchant.area===a?.id;return {available:present,reason:present?null:'Торговца здесь нет.',provider:present?'merchant':null,...(present?merchantGoods(s):{})};}
 if(!town(a)||!a.civic)return {available:false,reason:'Здесь нет действующей службы.'};
 if(kind==='food'&&a.foundedSettlement&&!structurallySound(a.facades?.profiles.find(p=>p.id===a.foundedSettlement.housing.building)))return {available:false,reason:'Общий дом повреждён: выдача пищи приостановлена.'};
 if(kind==='clinic'&&!a.objects.some(o=>o.kind==='rest'&&(!o.state||o.state==='intact')))return {available:false,reason:'Место лечения недоступно.'};
 const people=serviceStaff(s,a,kind),provider=people[0]?.id||null;
 if(!provider)return {available:false,reason:kind==='clinic'?'Нет лекаря, который сейчас принимает.':kind==='food'?'Некому выдать еду.':kind==='warehouse'?'В кладовой нет работника.':'Некому предоставить оплачиваемую работу.'};
 if(kind==='clinic'&&enabled(s,'supply')&&!(a.civic.medicine>=units))return {available:false,reason:'В лечебнице нет нужного лекарства.',provider,stock:a.civic.medicine};
 if(kind==='food'&&(enabled(s,'supply')||units>4)&&!(a.civic.food>=Math.max(marketEnabled(s)?1:4,units)))return {available:false,reason:units>4?'Поставщик не может выделить ящик припасов.':'Кладовая с едой пуста.',provider,stock:a.civic.food};
 if(kind==='warehouse'&&!(a.civic.tools>=1))return {available:false,reason:'Нужный инструмент закончился.',provider,stock:a.civic.tools};
 if(kind==='employment'){
  const pay=JOBS.find(j=>j.id===job)?.pay??8;
  if(!(a.civic.treasury>=pay))return {available:false,reason:'Здесь сейчас нечем оплатить работу.',provider};
  if(job==='repair'&&enabled(s,'property')){const place=workshop||a.objects.find(o=>o.kind==='workshop');if(!place||!a.objects.includes(place)||place.state!=='intact')return {available:false,reason:'Рабочая мастерская недоступна.',provider};}
  if(job==='repair'&&enabled(s,'property')&&!workToolReady(s,workshop||a.objects.find(o=>o.kind==='workshop')))return {available:false,reason:'Рабочий зажим сломан.',provider};
  if(job==='repair'&&enabled(s,'work-materials')&&!(a.civic.tools>=1))return {available:false,reason:'Для работы нет инструмента.',provider};
  if(job==='medicine'&&enabled(s,'supply')&&!(a.civic.medicine>=1))return {available:false,reason:'Для работы нет лечебных средств.',provider};
 }
 return {available:true,provider,reason:null,...(kind==='clinic'?{stock:a.civic.medicine}:kind==='food'?{stock:a.civic.food}:kind==='warehouse'?{stock:a.civic.tools}:{})};
}
const key=(area,kind,job)=>area+'/'+kind+(job?':'+job:'');
export function rememberService(s,a,kind,options={}){
 if(!on(s)||!s.hero.alive||s.hero.transit||a.id!==s.hero.area)return null;
 const h=s.hero,services=h.memory.services ||= {},record={version:1,area:a.id,kind,...(options.job?{job:options.job}:{}),...actualService(s,a,kind,options),seen:s.tick};services[key(a.id,kind,options.job)]=record;
 const entries=Object.entries(services).sort((a,b)=>a[1].seen-b[1].seen);for(const [id]of entries.slice(0,Math.max(0,entries.length-128)))delete services[id];return record;
}
export function observeServices(s){
 observeMarket(s,s.hero.lineage);
 if(!on(s)||!s.hero.alive||s.hero.transit)return;const h=s.hero,a=s.areas[h.area],near=x=>Math.abs(h.x-x)*areaScale(a)<=18;
 if(town(a)&&a.civic){
  if(near(68))rememberService(s,a,'clinic');
  if(near(42)){rememberService(s,a,'food');rememberService(s,a,'warehouse');rememberService(s,a,'employment');const jobs=new Set(Object.values(h.memory.services||{}).filter(k=>k.area===a.id&&k.kind==='employment'&&k.job).map(k=>k.job));if(h.goal?.kind==='work'&&h.goal.job!=='song')jobs.add(h.goal.job);for(const job of jobs)rememberService(s,a,'employment',{job});}
 }
 if(near(58)&&(s.merchant.area===a.id||h.memory.merchant===a.id||h.goal?.kind==='trade'||h.memory.services?.[key(a.id,'merchant')])){const info=rememberService(s,a,'merchant');if(info?.available)h.memory.merchant=a.id;}
}
export function knownServiceAllows(s,a,kind,{job=null,units=1,purchase=null}={}){
 if(!on(s))return true;if(!a)return false;const services=s.hero.memory.services||{},specific=services[key(a.id,kind,job)],general=services[key(a.id,kind)],info=specific||general;
 if(!info)return true;if(!info.available)return false;
 if(kind==='clinic'&&enabled(s,'supply')&&Number.isFinite(info.stock)&&info.stock<units)return false;
 if(kind==='food'&&(enabled(s,'supply')||units>4)&&Number.isFinite(info.stock)&&info.stock<Math.max(marketEnabled(s)?1:4,units))return false;
 if(kind==='merchant'&&purchase&&Number.isFinite(info[purchase==='potion'?'medicine':'gear'])&&info[purchase==='potion'?'medicine':'gear']<1)return false;
 return true;
}
export function questServiceBlocked(s,q){return !rescueQuestAvailable(s,q)||Boolean(on(s)&&q.kind==='supply'&&!q.cargo&&!knownServiceAllows(s,s.areas[q.target],'food',{units:35}));}
export function questServiceReason(s,q){return q&&questServiceBlocked(s,q)?'У известного поставщика сейчас нельзя получить ящик припасов.':null;}
export function denyService(s,ctx,kind,options={}){
 const a=s.areas[s.hero.area],info=rememberService(s,a,kind,options);if(!info||info.available)return false;
 s.hero.lastAction='talk';s.hero.intent='Служба недоступна';s.hero.reason=info.reason;ctx.log(s,info.reason+' Он учитывает это в дальнейших планах.','choice');return true;
}
import {takeGoods} from './goods.js';
import {marketEnabled} from './market.js';
