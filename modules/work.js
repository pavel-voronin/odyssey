import {knownArea} from '../actor-atlas.js';
import {goodsEnabled,productionSources,goodsWorkReceipt,completeGoodsWork} from './goods.js';
import {planSongWork,songAction} from './hall-activities.js';
import {workspaceAccess,wantsWorkshop} from './property.js';
import {moneyBudget} from './finances.js';
import { JOBS,destiny } from '../content.js';
import { enabled,moduleRandom } from '../rules.js';
import { profile,isTown } from './common.js';
import { advanceCareer } from './identity.js';
import { civicWork } from './society.js';
import {opportunity} from './opportunities.js';
import {rememberWorkplace} from './work-loss.js';
import {knownServiceAllows,denyService} from './service-access.js';
import {witnessRepairWork} from './craft-respect.js';
import {causalWork} from './causal-history.js';
import {observeWorkTools,knownToolAllows,workToolReady,recordToolUse} from './workshop-tools.js';
import {workshopSite,workshopInteriorsOn,workshopPosition} from './workshop-place.js';
import {physicalDistance} from '../geometry.js';
export function initializeWork(s,h){if(!h.career.path)h.career.path=['bard','merchant','alchemist','clockmaker'].includes(h.profession)?'peaceful':'adventure';h.career.records ||= {[h.profession]:{xp:h.career.xp,rank:h.career.rank}};h.career.lastChange ??=h.born;h.career.history ||= [];}
export function workMotive(s,ctx){
 const h=s.hero,b=moneyBudget(s,ctx),buffer=b.style==='carefree'?8:b.style==='cautious'?20:14;
 let target=Math.max(buffer,enabled(s,'finances')?b.reserve+b.targetCost:0),reason=enabled(s,'finances')&&b.targetNeed>0?'Заработать на намеченное снаряжение и ближайшие нужды.':'Оставить деньги на еду, лечение и доступ к рабочему месту.';
 if(enabled(s,'property')&&wantsWorkshop(h)&&h.property.nextAttempt<=s.tick&&!Object.values(s.areas).some(a=>a.objects.some(o=>o.kind==='workshop'&&o.owner===h.lineage))){
  const quote=Object.values(h.property.known).find(k=>{const path=(ctx.knownRoute||ctx.route)?.(s,h.area,k.area)||[];return k.state==='intact'&&Number.isFinite(k.price)&&k.owner!==h.lineage&&knownArea(s,k.area)&&path.length>0&&path.length<=5;});
  if(quote&&quote.price+b.reserve>target){target=quote.price+b.reserve;reason='Накопить на известное предложение мастерской, сохраняя запас на жизнь.';}
 }
 const aim=destiny(h.destiny.id);if(enabled(s,'identity')&&!h.destiny.completed&&aim.counter==='gold'&&aim.target>target){target=aim.target;reason='Заработок приближает собственную цель: '+aim.name+'.';}
 if(h.gold<target)return {kind:'income',target,reason};
 const learning=h.life.nextMastery;
 if(enabled(s,'identity')&&learning?.profession===h.profession&&h.career.rank<learning.rank)return {kind:'learning',target:learning.rank,reason:'Практикой освоить намеченную ступень ремесла: '+learning.rank+'.'};
 const a=s.areas[h.area],job=JOBS.find(j=>j.skills.includes(profile(h).skill));
 if(enabled(s,'events')&&a.civic&&(job?.id==='dock'||job?.id==='market')&&a.civic.food<35)return {kind:'need',reason:'Помочь пополнить действительные местные запасы еды.'};
 if(enabled(s,'events')&&job?.id==='medicine'&&a.civic?.medicine<15)return {kind:'need',reason:'Пополнить запас лекарств, которого сейчас не хватает поселению.'};
 return null;
}
export function planWork(s,ctx,{interest=false}={}){
  const h=s.hero;if(!enabled(s,'work'))return false;
  observeWorkTools(s);
  const p=profile(h),motive=workMotive(s,ctx)||(interest&&JOBS.some(j=>j.skills.includes(p.skill))?{kind:'interest',reason:'Практиковать знакомое ремесло, сохраняя старые умения.'}:null);
  if(!motive||h.workAfter>s.tick||h.hp<h.maxHp*.65)return false;
  let town=ctx.closest(s,a=>knownArea(s,a)&&isTown(a)&&knownServiceAllows(s,a,'employment'));if(!town)return false;
  if(enabled(s,'districts')&&town.city){const district=Object.values(s.areas).find(a=>a.city===town.city&&a.services?.includes(p.skill));if(district)town=district;}
  let job=JOBS.find(j=>j.skills.includes(p.skill))||JOBS.find(j=>j.id==='dock');
  if(goodsEnabled(s)&&motive.kind==='need'&&town.civic.food<35&&productionSources(s,town).field.stock>0)job=JOBS.find(j=>j.id==='harvest');
  if(job.id==='song'){if(planSongWork(s,ctx,motive))return true;job=JOBS.find(j=>j.id==='dock');}
  if(job.id==='repair'&&enabled(s,'property')){
    const away=h.life.residence?.away;
    const place=Object.entries(h.property?.known||{}).filter(([id,k])=>k.state==='intact'&&knownToolAllows(s,k.area,id)&&s.areas[k.area]&&knownArea(s,k.area)&&knownServiceAllows(s,s.areas[k.area],'employment',{job:'repair'})&&!(away?.cause==='food'&&k.area===away.from&&h.area!==away.from)&&((ctx.knownRoute||ctx.route)?.(s,h.area,k.area)||[]).length).map(([,k])=>k).find(k=>k.owner===h.lineage||h.gold>=2);
    if(place)town=s.areas[place.area];
    else if(motive.kind==='interest')return false;
    else job=JOBS.find(j=>j.id==='dock'); // Wage labour until a real workspace is known and accessible.
  }
  if(!knownServiceAllows(s,town,'employment',{job:job.id}))return false;
  ctx.goal(s,'work',town.id,42,job.name,motive.reason,{job:job.id,remaining:job.duration,motive:motive.kind});
  if(enabled(s,'work-loss')&&job.id==='repair'){const known=Object.entries(h.property.known).find(([,k])=>k.area===town.id&&k.state==='intact');if(known)h.goal.workplace={id:known[0],area:town.id,owner:known[1].owner};}return true;
}
export function workTick(s,ctx){
  const h=s.hero,g=h.goal,job=JOBS.find(j=>j.id===g.job);
  if(!job||!enabled(s,'work')){h.goal=null;return;}
  if(job.id==='harvest'&&!goodsEnabled(s))return;
  if(job.id==='song'){songAction(s,ctx);return;}
  if(job.id==='repair'){
    const site=workshopSite(s,h.area),o=site?.object;
    if(site?.room){const pos=workshopPosition(s,site.area,o);if(site.inside&&!workshopInteriorsOn(s)||workshopInteriorsOn(s)&&(h.area!==pos.area||physicalDistance(s.areas[pos.area],h.x,pos.x)>1))return;}
    observeWorkTools(s);
    if(o&&!workToolReady(s,o)){h.goal=null;h.workAfter=s.tick+48;ctx.log(s,'Зажим неисправен: этот заказ не начат. Нужен ремонт инструмента или другая работа.','work');return;}
  }
  if(job.id==='repair'&&workspaceAccess(s,ctx)!=='ready')return;
  if(denyService(s,ctx,'employment',{job:job.id})){h.goal=null;h.workAfter=s.tick+48;return;}
  rememberWorkplace(s,g);
  if(goodsEnabled(s)&&job.id==='harvest')goodsWorkReceipt(s,s.people[h.lineage],g,job.duration);
  g.remaining--;h.energy=Math.max(0,h.energy-2);h.lastAction='work';h.speech=job.name+'…';
  if(g.remaining<=0){
    const site=job.id==='repair'?workshopSite(s,h.area):null,workArea=site?.area||s.areas[h.area],employer=workArea.civic,harvest=goodsEnabled(s)&&job.id==='harvest'?completeGoodsWork(s,s.areas[h.area],g.goodsWork,{units:8}):null;
    const pay=goodsEnabled(s)?harvest&&!harvest.quantity?0:Math.min(job.pay,Math.max(0,employer?.treasury||0)):job.pay;
    if(goodsEnabled(s)||enabled(s,'service-access')){if(employer)employer.treasury-=pay;}
    h.gold+=pay;advanceCareer(s,5,ctx);ctx.gainXp(s,5);h.workAfter=s.tick+(h.career.path==='peaceful'?18:120);h.goal=null;
    witnessRepairWork(s,job);
    if(job.id==='repair'){const a=workArea,o=site?.object;if(o)recordToolUse(s,a,o,h.lineage,ctx);observeWorkTools(s);}
    causalWork(s,g,job);
    const workshop=opportunity(s,'workshop'),town=workArea;if((!harvest||harvest.quantity>0)&&workshop.allowed&&town.faction===workshop.source&&town.civic?.treasury>0){town.civic.treasury--;h.gold++;}
    h.counters.peacefulWork=(h.counters.peacefulWork||0)+1;h.mind.stress=Math.max(0,h.mind.stress-8);
    ctx.log(s,`${job.name}: закончено. Оплата ◈${pay}. ${harvest?harvest.quantity?'Собрано порций: '+harvest.quantity+'.':'Доступный урожай уже собран. За пустой заказ плата не начислена.':job.text}`,'work');
    civicWork(s,job.id,ctx,workArea);
    if(moduleRandom(s,'work')<.3){h.inventory.herbs++;ctx.log(s,'За работу добавляют пучок лечебных трав.','reward');}
  }
}
export function leisureTick(s,ctx){
  const h=s.hero,g=h.goal;g.remaining--;h.energy=Math.min(100,h.energy+8);h.hp=Math.min(h.maxHp,h.hp+2);h.lastAction='rest';h.mind.stress=Math.max(0,h.mind.stress-3);
  if(g.remaining<=0){
    if(g.signals!==undefined){h.goal=null;return;} // Quiet reconsideration is not an invented neighbour event every twelve ticks.
    const ordinary=['Герой чинит пуговицу и слушает спор соседей. Сегодня никто не погиб.','Герой записывает расходы. Приход впервые выглядит убедительнее расходов.','День проходит за разговорами, хлебом и несбывшимися предсказаниями погоды.','Герой заканчивает работу и смотрит на дорогу. Пока хочется остаться.','Житель просит починить детскую игрушку. Герой помогает бесплатно.'];
    ctx.log(s,ordinary[Math.floor(moduleRandom(s,'work')*ordinary.length)],'life');h.goal=null;
  }
}
