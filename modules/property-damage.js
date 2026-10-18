import {takeGoods} from './goods.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {DAY_TICKS} from '../calendar.js';
import {weatherAt} from './weather.js';
import {recordWorkshop,restoreWorkshop} from './workshop-state.js';
import {maySpend} from './finances.js';
import {detailedActors,selfDrivenActor} from '../actor-projection.js';
import {npcControlledBy} from './npc-control.js';
import {fitWorkingPart} from './craft-practice.js';
import {skillBranchesEnabled,recordPracticalTrade} from './skill-branches.js';
import {workshopPosition,workshopSite,workshopInteriorsOn} from './workshop-place.js';
const active=s=>enabled(s,'property')&&enabled(s,'property-damage');
const property=(s,area,id)=>s.areas[area]?.objects.find(o=>o.kind==='workshop'&&o.id===id);
export function propertyDamageTick(s,ctx){
  if(!active(s)||s.tick%DAY_TICKS!==0)return;
  for(const a of Object.values(s.areas))for(const o of a.objects.filter(o=>o.kind==='workshop')){
    if(o.state!=='intact'||o.lastHazardTick===s.tick)continue;o.lastHazardTick=s.tick;
    const w=weatherAt(s,a),p=s.people[o.owner],position=workshopPosition(s,a,o);
    const heroBusy=enabled(s,'work')&&detailedActors(s).some(h=>selfDrivenActor(s,h)&&h.area===position.area&&h.goal?.kind==='work'&&h.goal.job==='repair'&&Math.abs(h.x-position.x)*areaScale(s.areas[h.area])<=9&&h.energy>=23&&!h.combat&&!h.transit);
    const npcBusy=enabled(s,'people')&&p?.alive&&!selfDrivenActor(s,p.id)&&npcControlledBy(s,p,'personal')&&p.area===position.area&&(!workshopInteriorsOn(s)||!workshopSite(s,a,o.id)?.room||Math.abs(p.x-position.x)*areaScale(s.areas[p.area])<=9)&&p.agenda?.job==='artisan'&&p.agenda.task?.kind==='work'&&(!enabled(s,'npc-needs')||!p.needs?.sleeping&&(p.needs?.energy??100)>=25&&(p.needs?.hunger??0)<65);
    const busy=heroBusy||npcBusy;
    const risk=w.id==='storm'? .02:(w.id==='heat'&&busy)? .035:0;
    if(!risk||ctx.random()>=risk)continue;
    o.state='burned';o.damagedAt=s.tick;o.repair=null;
    recordWorkshop(s,a,o,w.id==='storm'?'Молния повреждает мастерскую. Помещение непригодно для работы, но собственник остался прежним.':'Зной и работающий горн приводят к пожару. Рабочее место выгорело, право собственности сохранилось.','fire',ctx);
  }
}
export function repairPlan(s,ctx){
  if(!active(s))return false;
  const h=s.hero;if(h.hp<h.maxHp*.65||h.energy<40||enabled(s,'body')&&h.hunger>=65)return false;
  for(const [id,k]of Object.entries(h.property?.known||{})){
      if(h.life.residence?.away?.cause==='food'&&h.life.residence.away.from===k.area&&h.area!==k.area)continue;
    if(k.state!=='burned')continue;const o=property(s,k.area,id);if(!o||o.owner!==h.lineage)continue;
    const path=(ctx.knownRoute||ctx.route)(s,h.area,k.area);if(!path.length||path.length>5)continue;
    if(!o.repair?.materials&&(!maySpend(s,'repair',18,ctx)||h.area===k.area&&!(s.areas[k.area].civic?.tools>0)))continue;
    ctx.goal(s,'propertyRepair',k.area,o.x,'Восстановить свою мастерскую','Право сохранилось, но для работы нужны исправное помещение, инструмент и время.',{property:id});return true;
  }
  return false;
}
export function repairProperty(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyRepair')return false;
  const a=s.areas[h.area],o=property(s,h.area,g.property);
  if(!active(s)||!o||(o.owner!==h.lineage&&!ctx.mayRepairProperty?.(s,o,h.lineage))||o.state!=='burned'){h.goal=null;return false;}
  if(!o.repair?.materials){
    if(!(a.civic?.tools>0)&&!ctx.hasRepairTool?.(s,o)){h.goal=null;return false;}
    const funding=ctx.repairFunding?.(s,a,o,18);
    if(funding===false||funding===undefined&&!maySpend(s,'repair',18,ctx)){h.goal=null;return false;}
    if(funding===undefined)h.gold-=18;a.civic.treasury+=funding?.cost??18;if(!funding?.toolProvided)takeGoods(s,a,'tools',1,{reason:'property-repair',actor:h.lineage});
    const payer=funding?.payer||h.lineage;
    o.repair={materials:true,remaining:3,paidAt:s.tick,payer};h.lastAction='collect';
    if(skillBranchesEnabled(s)&&funding===undefined&&o.owner===h.lineage){const event={id:`${o.id}/own-material/${o.damagedAt}`,tick:s.tick,actor:h.lineage,area:a.id,kind:'tools',side:'buy',quantity:1,total:18};o.repair.purchase=event;recordPracticalTrade(s,event);}
    ctx.repairMaterials?.(s,a,o,{payer,damageAt:o.damagedAt,cost:18});
    ctx.log(s,funding?.toolProvided?`Материалы ремонта стоят ◈18: ◈${funding.advance} уже получил поставщик, ◈${funding.cost} — местная кладовая. Привезённый инструмент пошёл в дело.`:'На восстановление мастерской ушли ◈18 и один инструмент из запаса поселения. Материал оставлен в помещении.','repair');return true;
  }
  if(fitWorkingPart(s,a,o))ctx.log(s,'Мастер подгоняет рабочую деталь из уже оплаченного материала. Приём сокращает восстановление; новый инструмент или новая оплата не требуются.','repair');
  o.repair.remaining--;h.energy=Math.max(0,h.energy-2);h.lastAction='work';
  if(o.repair.remaining<=0){restoreWorkshop(s,a,o,ctx);h.goal=null;}
  return true;
}
