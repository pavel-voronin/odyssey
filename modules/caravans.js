import {knownArea} from '../actor-atlas.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown,profile,repute,moral} from './common.js';
import {opportunity} from './opportunities.js';
import {launchConvoy,convoyHistory} from './supply.js';
import {rememberedMarket} from './freight-memory.js';
export function caravanPlan(s,ctx){
  const h=s.hero;if(!enabled(s,'caravans')||!enabled(s,'supply'))return false;
  if(h.caravanJob){
    const job=h.caravanJob,c=s.logistics.convoys.find(c=>c.id===job.id);
    if(!c){
      const result=s.logistics.history.find(r=>r.id===job.id);
      if(result?.outcome==='delivered'&&h.area===job.to){
        const treasury=s.areas[job.to].civic,pay=Math.min(job.role==='lead'?12:8,treasury.treasury);treasury.treasury-=pay;h.gold+=pay;
        h.counters.caravans=(h.counters.caravans||0)+1;repute(s,s.areas[job.to].faction,5);ctx.gainXp(s,10);ctx.log(s,`Караван доведён до цели. ${job.role==='lead'?'Караванщик':'Охранник'} получает ◈${pay} из казны получателя.`,'reward');
      }else ctx.log(s,'Караванная служба закончилась без выплаты. Груз и люди могли не дойти.','choice');
      h.caravanJob=null;h.memory.caravanAfter=s.tick+240;return false;
    }
    if(s.tick-job.started>700||h.hp<h.maxHp*.3){delete c.escort;h.caravanJob=null;h.memory.caravanAfter=s.tick+500;repute(s,s.areas[c.source].faction,-4);ctx.log(s,'Герой оставляет караванную службу. Возчик продолжает путь самостоятельно.','choice');return false;}
    const next=s.areas[c.path[Math.min(c.path.length-1,c.index+1)]];
    const enemy=(c.movement!=='physical'||h.area===next.id)&&next.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved);
    if(enemy)ctx.goal(s,'hunt',next.id,enemy.x,'Расчистить путь каравану','Груз ждёт, пока настоящий охранник разберётся с угрозой.',{object:enemy.id,caravan:true});
    else ctx.goal(s,'caravanWait',next.id,52,'Провести караван дальше','Возчик и груз идут по той же дороге. Герой не может защитить их из другого места.',{caravan:true});
    return true;
  }
  if(s.tick<(h.memory.caravanAfter||0)||h.energy<24||h.hp<h.maxHp*.65)return false;
  const a=s.areas[h.area],skill=profile(h).skill;
  const present=s.logistics.convoys.find(c=>s.people[c.person]?.area===h.area&&!c.escort&&!c.trade);
  if(present&&(opportunity(s,'raid').allowed||skill==='steal'&&(h.alignment<-10||h.gold<80&&h.personality.generosity<.45))){
    ctx.goal(s,'caravanRaid',a.id,s.people[present.person].x||42,'Перехватить караван','Чужой груз можно отнять. Поселение не получит припасы, а фракции запомнят поступок.',{convoy:present.id,remaining:3,caravan:true});return true;
  }
  if(present&&(opportunity(s,'escort').allowed||['physical','beast','sea'].includes(skill))){
    present.escort=h.lineage;h.caravanJob={id:present.id,role:'escort',to:present.to,started:s.tick};ctx.log(s,'Герой нанимается охранять настоящий караван. Поручения придётся отложить.','choice');return caravanPlan(s,ctx);
  }
  if(isTown(a)&&a.civic.food>65&&(skill==='trade'||opportunity(s,'fleet').allowed)&&moduleRandom(s,'caravans')<.5){
    const known=enabled(s,'npc-logistics')&&rememberedMarket(s,s.people[h.lineage],a,null,40);
    const target=enabled(s,'npc-logistics')?(known?s.areas[known.market.area]:null):Object.values(s.areas).find(t=>t.id!==a.id&&knownArea(s,t)&&t.civic&&(t.civic.food<40||t.civic.medicine<12)&&t.era===a.era&&ctx.route(s,a.id,t.id).length<=6);
    if(target){const c=launchConvoy(s,a,target,ctx);if(c){c.escort=h.lineage;h.caravanJob={id:c.id,role:'lead',to:c.to,started:s.tick};ctx.log(s,'Герой берётся вести караван: груз вычтен из запасов отправителя.','choice');return caravanPlan(s,ctx);}}
  }
  h.memory.caravanAfter=s.tick+32;return false;
}
export function noticeCaravan(s,ctx){
  const h=s.hero;
  if(!enabled(s,'caravans')||!enabled(s,'supply')||h.caravanJob||h.goal?.caravan||h.combat||h.transit||s.tick<(h.memory.caravanAfter||0)||['rest','provision','eat','forage','settle','factionDuty'].includes(h.goal?.kind))return;
  if(s.logistics.convoys.some(c=>!c.escort&&s.people[c.person]?.area===h.area))caravanPlan(s,ctx);
}
export function caravanRaid(s,ctx){
  const h=s.hero,g=h.goal,c=s.logistics.convoys.find(c=>c.id===g.convoy),p=c&&s.people[c.person];
  if(!enabled(s,'caravans')||!c||p.area!==h.area){h.goal=null;return;}
  h.energy=Math.max(0,h.energy-3);h.lastAction='attack';if(--g.remaining>0)return;
  const damage=Math.max(1,4-armorCoverage(h)),hpBefore=h.hp;h.hp=Math.max(0,h.hp-damage);if(h.hp===0){ctx.die(s,{name:p.name+' защитил свой груз'},{kind:'caravan',damage,hpBefore});return;}
  h.inventory.rations+=Math.floor(c.food/4);h.inventory.herbs+=c.medicine;const carrier=s.people[h.lineage];if(c.tools){carrier.marketCargo ||= {tools:0};carrier.marketCargo.tools+=c.tools;c.tools=0;}if(c.demand&&c.food%4){carrier.roadSupplies ||= {food:0,medicine:0};carrier.roadSupplies.food+=c.food%4;}p.health=Math.max(1,p.health-25);p.status='resident';
  const a=s.areas[p.area];a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);
  if(c.movement==='physical'){p.freightReleasedAt=s.tick;p.agenda.task=null;p.agenda.due=s.tick+8;p.x=h.x;if(!a.objects.some(o=>o.kind==='resident'&&o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});}
  s.logistics.losses++;convoyHistory(s,c,'robbed');s.logistics.convoys=s.logistics.convoys.filter(o=>o!==c);h.goal=null;h.memory.caravanAfter=s.tick+350;
  moral(s,-14);repute(s,s.areas[c.source].faction,-12);repute(s,'crown',-5);h.counters.caravanRaids=(h.counters.caravanRaids||0)+1;
  ctx.log(s,`${p.name} ограблен. Груз стал добычей героя; получатель остался без еды и лекарств.`,'choice');
}
import {armorCoverage} from './armor.js';
