import {takeGoods} from './goods.js';
import {consumeOriginal} from './item-originals.js';
import {skillBranchesEnabled,recordPracticalTrade} from './skill-branches.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {knownArea} from '../actor-atlas.js';
import {localContact} from './npc-contacts.js';
import {npcAction} from './npc-control.js';
import {availableToolMaster as master,toolTeacherTurn} from './tool-teaching.js';
import {setActorMoney} from '../actor-projection.js';
import {maySpend} from './finances.js';
import {craftPractice} from './craft-practice.js';
import {materialSource,observeMaterials,TOOL_PRICE} from './work-materials.js';
import {actualService} from './service-access.js';
import {observeWorkTools,mendWorkTool} from './workshop-tools.js';
import {workshopPosition,workshopInteriorsOn,workshopSite} from './workshop-place.js';
const on=s=>enabled(s,'property')&&enabled(s,'workshop-tools');
const workshop=(s,t)=>s.areas[t.area]?.objects.find(o=>o.kind==='workshop'&&o.id===t.property);
const part=h=>h.bag.find(i=>i.kind==='workPart'&&i.partType==='clamp-guide');
export function knowsClamp(s,id=s.hero.lineage){return Boolean(s.people[id]?.toolSkills?.clamp||craftPractice(s,id)?.method?.id==='fit-working-part');}
function masters(s,o){
 const a=s.areas[s.hero.area],site=workshopSite(s,a,o.id),x=site?.inside?a.interior.station:o.x,ids=site?.inside?Object.values(s.people).filter(p=>p.area===a.id).map(p=>p.id):a.population||[];
 return [...new Set(ids)].map(id=>s.people[id]).filter(p=>p?.id!==s.hero.lineage&&master(s,p)&&localContact(s,p.id,a.id)&&physicalDistance(a,localContact(s,p.id,a.id).x,x)<=18&&(!p.toolTeaching||p.toolTeaching.until<s.tick||p.toolTeaching.pupil===s.hero.lineage));
}
function observeOptions(s){
 observeWorkTools(s);const h=s.hero,physical=s.areas[h.area],site=workshopSite(s,physical),a=site?.inside?site.area:physical;for(const o of a.objects.filter(o=>o.kind==='workshop'&&physicalDistance(physical,h.x,site?.inside?physical.interior.station:o.x)<=18)){
  const k=h.workToolMemory?.known[o.id];if(k){k.material=Boolean(a.civic?.tools>=1&&actualService(s,a,'warehouse').available);k.teachers=masters(s,o).map(p=>p.id);}
 }
}
function signature(s,k){const h=s.hero;return JSON.stringify([k.owner,k.episode,k.material,k.teachers||[],knowsClamp(s),h.gold>=3,h.gold>=6,h.workMaterials?.revision||0,Boolean(part(h))]);}
function release(s,t){const p=s.people[t?.teacher];if(p?.toolTeaching?.pupil===s.hero.lineage&&p.toolTeaching.property===t.property)delete p.toolTeaching;}
function defer(s,t,ctx,why){
 release(s,t);const k=s.hero.workToolMemory?.known[t.property];if(k){const sig=signature(s,k);if(k.blocked!==sig)ctx.log(s,why,'work');k.blocked=sig;k.reason=why;}
 s.hero.toolTask=null;s.hero.goal=null;return false;
}
function validLocal(s,t,{lesson=false}={}){const o=workshop(s,t),pos=o&&workshopPosition(s,s.areas[t.area],o);return o&&s.hero.area===(lesson?t.teacherArea||t.area:pos.area)&&o.owner===s.hero.lineage&&o.state==='intact'&&o.workTool?.state==='broken'&&o.workTool.episode===t.episode?o:null;}
function finish(s,t,o,ctx,method,usedPart){
 if(!mendWorkTool(s,s.areas[t.area],o,s.hero.lineage,ctx,{method,part:usedPart}))return false;
 release(s,t);(s.hero.workToolMemory ||= {known:{},revision:0}).lastOutcome={property:t.property,episode:t.episode,method,tick:s.tick,...(usedPart?{part:usedPart.id||null}:{})};s.hero.toolTask=null;s.hero.goal=null;observeOptions(s);return true;
}
function assign(s,t,ctx){
 const o=workshop(s,t);if(!o)return defer(s,t,ctx,'Прежняя мастерская не найдена. Ремонт отложен.');
 const pos=workshopPosition(s,s.areas[t.area],o);
 if(t.stage==='inspect'){ctx.goal(s,'toolInspect',pos.area,pos.x,'Осмотреть свой верстак','Известную неисправность нужно проверить на месте.',{tool:t.property});return true;}
 if(t.stage==='fetch'){ctx.goal(s,'toolSupply',t.source,42,'Привезти сменную направляющую','В памяти есть поставщик. Наличие и цену он проверит на месте.',{tool:t.property});return true;}
 if(t.stage==='learn'){
  const area=t.teacherArea||t.area,p=s.people[t.teacher],position=p&&localContact(s,p.id,area);
  if(!position||!master(s,p))return defer(s,t,ctx,'Мастер сейчас недоступен. Оплаченные занятия и изученное не забыты; герой займётся другим делом.');
  p.toolTeaching={pupil:s.hero.lineage,property:t.property,area,episode:t.episode,until:s.tick+16};
  ctx.goal(s,'toolLearn',area,position.x,'Научиться чинить зажим','Мастер покажет приём за три настоящих занятия. Каждое стоит одну монету и занимает обоих.',{tool:t.property});return true;
 }
 ctx.goal(s,t.stage==='install'?'toolInstall':'toolFit',pos.area,pos.x,t.stage==='install'?'Установить привезённую деталь':'Подогнать направляющую','Исправный инструмент нужен для своей работы. Материал и оплата не возникают из намерения.',{tool:t.property});return true;
}
function chooseRepair(s,t,o,k,ctx){
 const h=s.hero;if(!o||o.owner!==h.lineage||o.state!=='intact'||o.workTool?.state!=='broken'||o.workTool.episode!==t.episode)return defer(s,t,ctx,'Условия ремонта изменились. Прежняя работа прекращена; вещи и знания остаются.');
 if(part(h)){t.stage='install';h.toolTask=t;return assign(s,t,ctx);}
 if(knowsClamp(s)&&(o.workTool.repair?.funded||k.material&&maySpend(s,'repair',TOOL_PRICE,ctx))){t.stage='fit';h.toolTask=t;return assign(s,t,ctx);}
 const interested=h.personality.curiosity>=.55,pupil=s.people[h.lineage],remaining=3-(pupil.toolStudy?.clamp?.lessons?.length||0),teacher=masters(s,o)[0];
 if(teacher&&k.material&&interested&&maySpend(s,'repair',TOOL_PRICE+remaining,ctx)){
  if(workshopInteriorsOn(s)&&workshopSite(s,t.area,o.id)?.room)t.teacherArea=h.area;
  t.stage='learn';t.teacher=teacher.id;h.toolTask=t;ctx.log(s,`${h.name} просит ${teacher.name} научить ремонту своего зажима. Это время мастера и плата за занятия.`,'work');return assign(s,t,ctx);
 }
 const source=materialSource(s,t,ctx);
 if(source&&maySpend(s,'repair',TOOL_PRICE,ctx)&&h.bag.length<24){t.stage='fetch';t.source=source.area;h.toolTask=t;ctx.log(s,`${h.name} решает привезти сменную направляющую из «${source.name}». Старый адрес не гарантирует наличия товара.`,'work');return assign(s,t,ctx);}
 return defer(s,t,ctx,'Для ремонта нет доступного способа, детали или средств. Верстак подождёт; можно выбрать другую работу.');
}
export function toolPlan(s,ctx){
 if(!on(s)||!s.hero.alive||s.hero.combat||s.hero.transit)return false;const h=s.hero;if(h.hp<h.maxHp*.65||h.energy<35||enabled(s,'body')&&h.hunger>=65)return false;
 observeOptions(s);
 if(h.toolTask){
  const t=h.toolTask;if(t.stage==='learn'&&knowsClamp(s)){release(s,t);t.stage='fit';}
  if(t.stage==='fetch'&&part(h))t.stage='install';
  if(t.stage==='choose'){if(h.area===t.area||workshopSite(s,h.area,t.property)?.area.id===t.area)return chooseRepair(s,t,workshop(s,t),h.workToolMemory.known[t.property],ctx);t.stage='inspect';}
  return assign(s,t,ctx);
 }
 for(const k of Object.values(h.workToolMemory?.known||{})){
  if(k.owner!==h.lineage||k.state!=='broken'||!knownArea(s,k.area)||k.blocked===signature(s,k))continue;
  const path=(ctx.knownRoute||ctx.route)(s,h.area,k.area);if(!path.length||path.length>6)continue;
  const t={property:k.property,area:k.area,episode:k.episode,stage:'inspect',started:s.tick};
  const position=workshopPosition(s,s.areas[t.area],workshop(s,t));
  if(h.area!==position.area||physicalDistance(s.areas[h.area],h.x,position.x)>9){h.toolTask=t;return assign(s,t,ctx);}
  const o=validLocal(s,t);if(!o)continue;
  return chooseRepair(s,t,o,k,ctx);
 }
 return false;
}
export function toolAction(s,ctx){
 const h=s.hero,t=h.toolTask,g=h.goal;if(!t||!g?.kind.startsWith('tool'))return false;
 if(!on(s)){release(s,t);h.goal=null;return false;}
 if(!h.alive||h.transit||h.combat||t.actionTick===s.tick)return false;
 t.actionTick=s.tick;
 if(g.kind==='toolSupply'){
  const a=s.areas[h.area];if(h.area!==t.source||physicalDistance(a,h.x,42)>1)return false;
  observeMaterials(s);
  if(!enabled(s,'work-materials')||!actualService(s,a,'warehouse').available||!(a.civic.tools>=1)||!maySpend(s,'repair',TOOL_PRICE,ctx)||h.bag.length>=24)return defer(s,t,ctx,'По старому адресу деталь купить не удалось. Неиспользованные деньги остались у владельца.');
  const m=h.workToolMemory ||= {known:{},revision:0};m.nextPart=(m.nextPart||0)+1;
  const item={id:`${h.lineage}/clamp-part/${m.nextPart}`,kind:'workPart',partType:'clamp-guide',name:'Сменная направляющая зажима',slot:'material',stat:'none',power:0,value:TOOL_PRICE,rarity:0,modifier:'plain',source:a.id,bought:s.tick,history:[{tick:s.tick,text:`Куплено в ${a.name} для своего верстака.`}]};
  takeGoods(s,a,'tools',1,{flow:'exported',reason:'tool-repair-part',actor:h.lineage});a.civic.treasury+=TOOL_PRICE;setActorMoney(s,s.people[h.lineage],h.gold-TOOL_PRICE);h.bag.push(item);if(skillBranchesEnabled(s)){item.tradeReceipt={id:item.id+'/purchase',tick:s.tick,actor:h.lineage,area:a.id,kind:'tools',side:'buy',quantity:1,total:TOOL_PRICE};recordPracticalTrade(s,item.tradeReceipt);}observeMaterials(s);t.stage='install';h.goal=null;h.lastAction='trade';ctx.log(s,'Сменная направляющая куплена из настоящего запаса. Теперь её нужно довезти до своего верстака.','work');return true;
 }
 const o=validLocal(s,t,{lesson:g.kind==='toolLearn'});if(!o){observeOptions(s);return defer(s,t,ctx,'Условия ремонта изменились. Прежняя работа прекращена; вещи и знания остаются.');}
 if(g.kind==='toolInspect'){if(workshopInteriorsOn(s)&&workshopSite(s,t.area,o.id)?.room)t.stage='choose';else h.toolTask=null;h.goal=null;observeOptions(s);h.lastAction='talk';return true;}
 if(g.kind==='toolLearn'){
  const area=t.teacherArea||t.area,p=s.people[t.teacher],pos=p&&localContact(s,p.id,area);
  if(!p||!pos||!master(s,p)||physicalDistance(s.areas[area],h.x,pos.x)>9||!maySpend(s,'repair',1,ctx))return defer(s,t,ctx,'Занятие не состоялось. Уже изученное сохранено, неоплаченный урок не засчитан.');
  if(p.toolTeaching?.turn!==s.tick){if(!npcAction(s,p,'personal')||!toolTeacherTurn(s,p)){h.lastAction='wait';return true;}}
  const student=s.people[h.lineage];student.toolStudy ||= {};const study=student.toolStudy.clamp ||= {lessons:[]};
  if(study.lessons.at(-1)?.tick===s.tick)return false;
  setActorMoney(s,student,h.gold-1);setActorMoney(s,p,(p.agenda?.wealth??p.actorLink?.wealth??0)+1);if(p.needs)p.needs.energy=Math.max(0,p.needs.energy-2);h.energy=Math.max(0,h.energy-2);h.lastAction='talk';study.lessons.push({teacher:p.id,tick:s.tick,paid:1});p.toolTeaching.until=s.tick+16;
  if(study.lessons.length>=3){student.toolSkills ||= {};student.toolSkills.clamp={learnedAt:s.tick,source:'paid-lessons',lessons:study.lessons.slice(-3)};delete student.toolStudy.clamp;release(s,t);t.stage='fit';h.goal=null;ctx.log(s,'Три занятия сложились в знакомый приём: подгонка направляющей. Знание останется, даже если он сменит профессию.','skill');}
  return true;
 }
 const position=workshopPosition(s,s.areas[t.area],o);if(h.area!==position.area||physicalDistance(s.areas[position.area],h.x,position.x)>1)return false;
 if(g.kind==='toolInstall'){
  const item=part(h);if(!item)return defer(s,t,ctx,'Привезённой детали больше нет в сумке. Установка отложена.');
  h.bag.splice(h.bag.indexOf(item),1);item.history.push({tick:s.tick,text:`Установлено в ${o.name}.`});h.energy=Math.max(0,h.energy-2);h.lastAction='work';const installed=finish(s,t,o,ctx,'replacement',item);if(installed)consumeOriginal(s,item,{area:t.area,object:o.id,reason:'clamp-installation'});return installed;
 }
 if(g.kind==='toolFit'){
  if(!knowsClamp(s))return defer(s,t,ctx,'Нужный приём пока не освоен. Ремонт отложен.');
  const a=s.areas[t.area],tool=o.workTool;
  if(!tool.repair?.funded){
   if(!(a.civic?.tools>=1)||!actualService(s,a,'warehouse').available||!maySpend(s,'repair',TOOL_PRICE,ctx))return defer(s,t,ctx,'Для подгонки закончился материал или бюджет. Бесплатной замены не будет.');
   takeGoods(s,a,'tools',1,{flow:'exported',reason:'tool-repair-part',actor:h.lineage});a.civic.treasury+=TOOL_PRICE;setActorMoney(s,s.people[h.lineage],h.gold-TOOL_PRICE);tool.repair={funded:true,payer:h.lineage,episode:t.episode,paid:TOOL_PRICE,remaining:2,part:{id:tool.id+'/fitted/'+t.episode,source:a.id,units:1,paid:TOOL_PRICE}};if(skillBranchesEnabled(s)){tool.repair.purchase={id:tool.repair.part.id+'/purchase',tick:s.tick,actor:h.lineage,area:a.id,kind:'tools',side:'buy',quantity:1,total:TOOL_PRICE};recordPracticalTrade(s,tool.repair.purchase);}h.lastAction='collect';return true;
  }
  tool.repair.remaining--;h.energy=Math.max(0,h.energy-2);h.lastAction='work';if(tool.repair.remaining<=0){const used=tool.repair.part;return finish(s,t,o,ctx,'learned-fit',used);}return true;
 }
 return false;
}
