import {controlBlocked,controllingThreat,buildingControlOn} from './building-control-state.js';
import {homeWorkbenchSite,homeAdmission} from './home-place.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {profile,hasHabit} from './common.js';
import {maySpend} from './finances.js';
import {reservedWorkshop,needsWorkshop,workshopService} from './workshop-contract-state.js';
import {recordWorkplaceLoss} from './work-loss.js';
import {denyService} from './service-access.js';
import {workshopSite,workshopInteriorsOn} from './workshop-place.js';
import {revealArea} from '../actor-atlas.js';

export function initializeProperty(h,newWorld){
  h.property ||= {known:{},nextAttempt:0};
  h.property.lost ||= {};h.property.memory ||= {losses:0,lastCheck:null};
  if(h.property.origin)return;
  let hash=newWorld?.seed>>>0;for(const ch of h.lineage+'/workshop-origin')hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
  const initial=newWorld?.generation===1&&newWorld.tick===0;
  h.property.origin={eligible:Boolean(initial&&enabled(newWorld,'property')&&h.career.path==='peaceful'&&['craft','time'].includes(profile(h).skill)&&hash%10===0),checked:!initial,granted:null};
}
export function workshopAt(s,a,initialOwner=null){
  if(a.interior?.kind==='workshop')return enabled(s,'property')?workshopSite(s,a)?.object||null:null;
  if(!enabled(s,'property')||a.district!=='Мастерские')return null;
  let o=a.objects.find(o=>o.kind==='workshop');if(o)return o;
  if(initialOwner&&(initialOwner!==s.hero.lineage||!s.people[initialOwner]||s.generation!==1||s.tick!==0||!s.hero.property?.origin?.eligible))return null;
  const owner=(a.population||[]).map(id=>s.people[id]).find(p=>p?.alive&&p.area===a.id&&p.status==='resident'&&p.agenda?.job==='artisan');
  if(!owner)return null;
  const price=120+Math.max(0,a.depth)*8;
  const title=initialOwner||owner.id;
  o={id:a.id+'-workshop',kind:'workshop',building:`${a.id}-building-1`,name:'Ремесленная мастерская',x:42,state:'intact',owner:title,history:[{tick:s.tick,kind:'origin',owner:title,basis:initialOwner?'adult-start':'local-artisan'}],offer:!initialOwner&&owner.agenda.duty<.6?{owner:owner.id,price,since:s.tick}:null,rent:2};
  a.objects.push(o);
  // Only a newly generated district carries this title layout. Legacy areas
  // never acquire a second owner merely through observation or loading.
  const second=enabled(s,'workshop-dispute')&&a.workshopLayout?.owners.map(id=>s.people[id]).find(p=>p?.alive&&p.id!==title&&p.id!==owner.id&&p.area===a.id&&p.agenda?.job==='artisan');
  if(second&&!a.workshopLayout.granted){
    a.objects.push({id:a.id+'-workshop-2',kind:'workshop',building:`${a.id}-building-2`,name:'Соседняя мастерская',x:58,state:'intact',owner:second.id,history:[{tick:s.tick,kind:'origin',owner:second.id,basis:'district-layout'}],offer:null,rent:2});
    a.workshopLayout.granted=true;
  }
  return o;
}
export function originProperty(s,a,ctx){
  const h=s.hero,origin=h.property?.origin;if(!origin||origin.checked)return;
  origin.checked=true;
  if(!origin.eligible||!enabled(s,'property')||s.generation!==1||s.tick!==0||s.tick!==h.born||a.city!==a.id)return;
  const room=(a.districts||[]).map(id=>s.areas[id]).find(d=>d.district==='Мастерские');
  if(!room||room.objects.some(o=>o.kind==='workshop'))return;
  const o=workshopAt(s,room,h.lineage);if(!o||o.owner!==h.lineage)return;
  origin.granted=o.id;h.property.known[o.id]={area:room.id,name:o.name,owner:h.lineage,price:null,state:o.state,seen:s.tick,source:'deed'};
  ctx.log(s,`${h.name} начинает путь с актом на свою мастерскую в поселении «${a.name}». Старый акт подтверждает право на помещение.`,'property');
}
export function observeProperty(s,a,ctx){
  if(!enabled(s,'property')||s.hero.area!==a.id)return;
  const physical=a.id,inside=workshopSite(s,a);if(inside?.inside)a=inside.area;
  initializeProperty(s.hero);const o=workshopAt(s,a);if(!o)return;
  const owner=s.people[o.owner];
  const workplace=s.hero.goal?.workplace||s.hero.goal?.workspace,observedClosure=enabled(s,'work-loss')&&(o.state!=='intact'||controlBlocked(s,a,o))&&(workplace?.id===o.id||s.hero.workLife?.last?.id===o.id);
  if(o.owner===s.hero.lineage||owner?.alive&&owner.area===physical&&owner.status==='resident'||observedClosure){
    const prior=s.hero.property.known[o.id]?.control,threat=controllingThreat(s,a,o),control=buildingControlOn(s)&&(threat||prior)?{version:1,blocked:Boolean(threat),captor:threat?.enemy.id||null,name:threat?.enemy.name||null,seen:s.tick}:prior;
    s.hero.property.known[o.id]={area:a.id,name:o.name,owner:o.owner,price:o.offer?.price??null,state:o.state,seen:s.tick,...(control?{control}:{})};
    if(s.hero.property.lost[o.id]){delete s.hero.property.lost[o.id];ctx?.log(s,o.owner===s.hero.lineage?'Старая мастерская нашлась. Адрес снова записан.':'Мастерская нашлась, но её нынешний владелец уже другой.','memory');}
  }
}
function find(s,id){for(const a of Object.values(s.areas)){const object=a.objects.find(o=>o.id===id&&o.kind==='workshop');if(object)return{area:a,object};}return null;}
function availableSeller(s,a,o){if(controlBlocked(s,a,o))return null;const p=s.people[o.owner];return p?.alive&&p.status==='resident'&&p.area===a.id?p:null;}
function propertySeller(s,a,o){
 if(controlBlocked(s,a,o))return null;
 const site=workshopInteriorsOn(s)&&workshopSite(s,a,o.id),p=s.people[o.owner];
 return site?.room&&p?.alive&&['resident','wandering'].includes(p.status)&&[a.id,site.room.id].includes(p.area)?p:availableSeller(s,a,o);
}
export function wantsWorkshop(h){return h.career.path==='peaceful'&&h.career.rank>=2&&['craft','time'].includes(profile(h).skill)&&(h.personality.curiosity<.75||hasHabit(h,'homebody')||hasHabit(h,'hoarder'));}
export function transferProperty(s,ctx,{id,seller,price,cash=price,credit=0,contract=null,basis='purchase',gift=null,recipient=null,aid=null}){
  if(!enabled(s,'property')||![price,cash,credit].every(Number.isInteger)||cash<0||credit<0||cash+credit!==price)return null;
  const h=s.hero,found=find(s,id),o=found?.object,donation=basis==='gift',p=o&&(donation?s.people[o.owner]:propertySeller(s,found.area,o));
  if(workshopService(s,o)?.status==='active'||o&&controlBlocked(s,found.area,o))return null;
  const room=o&&workshopInteriorsOn(s)&&workshopSite(s,found.area,o.id)?.room;
  if(!p?.alive||![found.area.id,room?.id].includes(p.area)||!h.alive||h.life.ended||h.area!==p.area||Math.abs(h.x-(p.x??42))*areaScale(s.areas[h.area])>9||o.owner!==seller)return null;
  const receiver=recipient??h.lineage,assisted=receiver!==h.lineage,help=o.aid;
  if(assisted){
    if(!enabled(s,'property-aid')||donation||credit||contract||help?.id!==aid||help.status!=='agreed'||help.remaining<=0||help.property!==id||help.payer!==h.lineage||help.recipient!==receiver||help.seller!==seller||help.price!==price||!Number.isInteger(help.consent?.recipient)||!Number.isInteger(help.consent?.payer)||!needsWorkshop(s,s.people[receiver],found.area.id,price)||['offered','accepted'].includes(o.gift?.status)||['active','performed','credited'].includes(s.propertyContracts?.[o.contract]?.status))return null;
  }else if(aid)return null;
  if(donation){
    const g=o.gift,t=p.agenda?.task,d=s.areas[g?.target],c=s.propertyContracts?.[o.contract];
    if(!enabled(s,'property-gifts')||price||cash||credit||contract||g?.id!==gift||g.status!=='accepted'||g.area!==found.area.id||g.from!==seller||g.to!==h.lineage||!Number.isInteger(g.consent?.giver)||!Number.isInteger(g.consent?.recipient)||(o.offer?.price??null)!==g.quote||!['intact','burned'].includes(o.state)||!['resident','wandering'].includes(p.status)||p.agenda?.job!=='artisan'||t?.kind!=='relocate'||t.target!==g.target||!d?.civic||d.civic.treasury<12||(d.city||d.id)===(found.area.city||found.area.id)||found.area.civic?.treasury!==0||['active','performed','credited'].includes(c?.status)||['requested','agreed'].includes(o.aid?.status))return null;
  }else if(basis!=='purchase'||gift||o.state!=='intact'||o.offer?.owner!==seller||o.offer?.price!==price)return null;
  const c=contract&&s.propertyContracts?.[contract];
  if((credit||contract)&&(!enabled(s,'property-contracts')||c?.status!=='credited'||!c.accepted||c.property!==id||c.buyer!==h.lineage||c.seller!==seller||c.credit!==credit||c.price!==price||c.deadline<s.tick))return null;
  if(!donation&&reservedWorkshop(s,o)&&(!c||o.contract!==contract)&&!assisted)return null;
  if(cash>0&&!maySpend(s,'property',cash,ctx))return null;
  h.gold-=cash;p.agenda.wealth+=cash;o.owner=receiver;o.offer=null;
  const act={id:`title-${id}-${s.tick}-${o.history.length}`,tick:s.tick,kind:donation?'gift':'purchase',from:seller,owner:receiver,payer:donation?null:h.lineage,price,cash,credit,currency:'gold',basis:donation?'gift':assisted?'sponsored-purchase':credit?'work-credit':'purchase',contract,...(donation?{gift,consent:{...o.gift.consent},departure:o.gift.target}: {}),...(assisted?{aid,consent:{...help.consent}}:{})};
  o.history.push(act);observeProperty(s,found.area,ctx);return act;
}
export function propertyPlan(s,ctx){
  if(!enabled(s,'property'))return false;
  const h=s.hero;initializeProperty(h);
  if(h.property.nextAttempt>s.tick||h.career.path!=='peaceful'||h.career.rank<2||!['craft','time'].includes(profile(h).skill)||h.personality.curiosity>=.75&&!hasHabit(h,'homebody')&&!hasHabit(h,'hoarder'))return false;
  if(Object.values(s.areas).some(a=>a.objects.some(o=>o.kind==='workshop'&&o.owner===h.lineage)))return false;
  for(const [id,known]of Object.entries(h.property.known)){
    if(h.life.residence?.away?.cause==='food'&&h.life.residence.away.from===known.area&&h.area!==known.area)continue;
    if(known.state!=='intact'||known.price===null||known.owner===h.lineage||!maySpend(s,'property',known.price,ctx))continue;
    const path=(ctx.knownRoute||ctx.route)(s,h.area,known.area);if(!path.length||path.length>5)continue;
    // The quote is remembered; its continued availability is checked on arrival.
    ctx.goal(s,'propertyBuy',known.area,42,'Приобрести свою мастерскую','Ремесло стало постоянным делом. Он помнит предложение и оставляет запас на ближайшие нужды.',{property:id,seller:known.owner,price:known.price,remaining:2});
    return true;
  }
  return false;
}
function refuse(s,ctx,text){s.hero.property.nextAttempt=s.tick+480;s.hero.goal=null;ctx.log(s,text,'choice');return false;}
export function propertyTarget(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyBuy')return true;
  initializeProperty(h);
  if(!enabled(s,'property')){h.goal=null;return false;}
  if(s.tick-g.started>180)return refuse(s,ctx,'Поиски владельца затянулись. Герой откладывает покупку и возвращается к другим делам.');
  const target=s.areas[g.area],exterior=g.propertyExterior||(target?.interior?.kind==='workshop'?target.interior.parent:g.area),current=s.areas[h.area];
  if(h.area!==exterior&&!(current.interior?.kind==='workshop'&&current.interior.parent===exterior&&current.interior.building===g.property))return true;
  const found=find(s,g.property),o=found?.object,p=o&&propertySeller(s,found.area,o);
  if(!o||o.state!=='intact'||reservedWorkshop(s,o)||o.owner!==g.seller||o.offer?.owner!==g.seller||o.offer?.price!==g.price||!p)return refuse(s,ctx,'Прежнее предложение мастерской больше недоступно. Монеты остаются при герое.');
  if(workshopInteriorsOn(s)&&workshopSite(s,found.area,o.id)?.room){g.propertyExterior=found.area.id;g.area=p.area;if(s.areas[p.area].interior)revealArea(s,s.areas[p.area]);}
  g.x=p.x??42;return true;
}
export function buyProperty(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyBuy'||!propertyTarget(s,ctx))return false;
  const found=find(s,g.property),o=found?.object,p=o&&propertySeller(s,found.area,o);
  if(!p||h.area!==p.area||Math.abs(h.x-(p.x??42))*areaScale(s.areas[h.area])>9)return false;
  if(!maySpend(s,'property',g.price,ctx))return refuse(s,ctx,'На мастерскую уже не хватает свободных монет. Покупка подождёт.');
  h.lastAction='talk';if(--g.remaining>0){h.speech='Проверим право и цену ещё раз.';return true;}
  const act=transferProperty(s,ctx,{id:o.id,seller:p.id,price:g.price});if(!act)return refuse(s,ctx,'Условия передачи изменились. Покупка отложена.');h.goal=null;
  ctx.log(s,`${h.name} покупает мастерскую у ${p.name} за ◈${g.price}. Теперь это его помещение; прежний хозяин получил оплату.`,'property');return true;
}
// A lease is one paid work session, separate from the permanent title.
export function workspaceAccess(s,ctx){
  const home=homeWorkbenchSite(s,s.hero.area);if(home)return homeAdmission(s,home.room,s.hero.lineage)?'ready':'denied';
  if(!enabled(s,'property'))return 'ready';
  const h=s.hero,g=h.goal,physical=s.areas[h.area],site=workshopSite(s,physical,['forgeWork','decoyWork'].includes(g.kind)?g.property:null),a=site?.inside?site.area:physical,o=['forgeWork','decoyWork'].includes(g.kind)?site?.object:workshopAt(s,physical);initializeProperty(h);observeProperty(s,physical,ctx);
  if(!o||o.state!=='intact'||controlBlocked(s,a,o)||enabled(s,'work-loss')&&g.workplace&&g.workplace.id!==o.id){
    const anchor=g.workplace||g.workspace,known=anchor&&h.property.known[anchor.id];
    if(enabled(s,'work-loss')&&known&&(!o||o.id!==anchor.id))Object.assign(known,{state:'missing',seen:s.tick});
    recordWorkplaceLoss(s,ctx,anchor,s.tick);h.goal=null;h.workAfter=s.tick+48;return 'denied';
  }
  if(g.kind==='work'&&denyService(s,ctx,'employment',{job:g.job,workshop:o})){h.goal=null;h.workAfter=s.tick+48;return 'denied';}
  if(site?.room&&workshopInteriorsOn(s)&&(!s.people[o.owner]?.alive||o.closed||g.workspace?.kind==='lease'&&g.workspace.owner!==o.owner||g.workspace?.kind==='owner'&&o.owner!==h.lineage)){h.goal=null;h.workAfter=s.tick+48;return 'denied';}
  if(g.workspace?.id===o.id&&g.workspace.kind==='lease'&&g.workspace.until>=s.tick)return 'ready';
  if(o.owner===h.lineage){g.workspace={id:o.id,kind:'owner'};return 'ready';}
  const p=site?.inside?s.people[o.owner]?.alive&&s.people[o.owner].status==='resident'&&s.people[o.owner].area===physical.id?s.people[o.owner]:null:availableSeller(s,a,o);
  if(!p||!maySpend(s,'rent',o.rent,ctx)){h.goal=null;h.workAfter=s.tick+48;return 'denied';}
  if(Math.abs(h.x-(p.x??42))*areaScale(s.areas[h.area])>9){g.x=p.x??42;return 'approach';}
  h.gold-=o.rent;p.agenda.wealth+=o.rent;g.workspace={id:o.id,kind:'lease',owner:p.id,paid:s.tick,until:s.tick+60};h.lastAction='talk';
  g.x=o.x;
  ctx.log(s,`${p.name} предоставляет рабочее место на один заказ за ◈${o.rent}. Мастерская остаётся его собственностью.`,'property');return 'leased';
}
