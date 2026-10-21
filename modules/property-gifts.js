import {careerRank} from './progression-state.js';
import {areaScale} from '../geometry.js';
import {enabled} from '../rules.js';
import {profile} from './common.js';
import {maySpend} from './finances.js';
import {observeProperty,transferProperty,wantsWorkshop} from './property.js';
import {reservedWorkshop} from './workshop-contract-state.js';
const active=s=>enabled(s,'property')&&enabled(s,'property-gifts');
const capable=h=>careerRank(h)>=2&&['craft','time'].includes(profile(h).skill);
function familiar(s,p){
  const h=s.hero,r=h.relations[p.id],self=s.people[h.lineage];
  const kin=self.parents.includes(p.id)||p.parents.includes(h.lineage)||self.parents.some(id=>p.parents.includes(id));
  return kin||Boolean(r?.helped>=2&&r.trust>=16&&h.memory.people.includes(p.id));
}
export function giftDeparture(s,a,p,target=p?.agenda?.task?.target){
  const task=p?.agenda?.task,d=s.areas[target];
  return Boolean(p?.alive&&p.area===a.id&&['resident','wandering'].includes(p.status)&&p.agenda.job==='artisan'&&task?.kind==='relocate'&&task.target===target&&d?.civic&&d.civic.treasury>=12&&(d.city||d.id)!==(a.city||a.id)&&a.civic?.treasury===0);
}
function eligible(s,a,o,p){return giftDeparture(s,a,p)&&p.agenda.duty<.4&&p.agenda.sociability>.65&&familiar(s,p)&&capable(s.hero)&&!reservedWorkshop(s,o)&&!Object.values(s.propertyContracts||{}).some(c=>c.property===o.id&&c.status==='claim'&&(c.claimAmount||0)>c.paidClaim);}
function reply(s,o,status,text,ctx){o.gift.status=status;o.gift.answered=s.tick;o.gift.reason=text;s.hero.goal=null;if(s.hero.area===o.gift.area)ctx.log(s,text,'property');return true;}
export function propertyGiftsTick(s,ctx){
  if(!active(s))return;
  for(const a of Object.values(s.areas))for(const o of a.objects){const g=o.gift;if(o.kind!=='workshop'||g?.status!=='offered')continue;
    const p=s.people[g.from],recipient=s.people[g.to];
    if(o.owner!==g.from||!recipient?.alive||s.hero.lineage===g.to&&s.hero.life.ended||!giftDeparture(s,a,p,g.target)){
      g.status='cancelled';g.answered=s.tick;g.reason='Передача не состоялась: стороны или намерение изменились.';
      if(s.hero.lineage===g.to&&s.hero.area===a.id)ctx.log(s,g.reason,'property');
    }
  }
}
export function propertyGiftPlan(s,ctx){
  if(!active(s)||!s.hero.alive)return false;const h=s.hero,a=s.areas[h.area];
  for(const o of a.objects.filter(o=>o.kind==='workshop')){
    const g=o.gift,p=s.people[o.owner];
    if(g?.status==='offered'&&g.to===h.lineage){ctx.goal(s,'propertyGift',a.id,p?.x??42,'Ответить на предложение мастерской','Хозяин собирается уехать. Нужно решить, есть ли место этому помещению в своей жизни.',{property:o.id,phase:'answer'});return true;}
    if(g&&(g.from===o.owner||['offered','accepted'].includes(g.status))||!eligible(s,a,o,p))continue;
    ctx.goal(s,'propertyGift',a.id,p.x??42,'Поговорить с уезжающим мастером','Знакомый ремесленник ищет работу в другом городе и думает, кому оставить своё помещение.',{property:o.id,phase:'offer'});return true;
  }
  return false;
}
export function propertyGiftTarget(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyGift')return true;
  if(!active(s)){h.goal=null;return false;}
  if(h.area!==g.area)return true;
  const a=s.areas[g.area],o=a.objects.find(o=>o.id===g.property),p=s.people[o?.owner];
  const valid=o&&(g.phase==='offer'?(!o.gift||o.gift.from!==o.owner&&!['offered','accepted'].includes(o.gift.status))&&eligible(s,a,o,p):o.gift?.status==='offered'&&o.gift.to===h.lineage&&o.gift.from===o.owner&&giftDeparture(s,a,p,o.gift.target));
  if(!valid){h.goal=null;return false;}g.x=p.x??42;return true;
}
export function propertyGiftAction(s,ctx){
  const h=s.hero,g=h.goal;if(g?.kind!=='propertyGift'||!propertyGiftTarget(s,ctx)||h.area!==g.area)return false;
  const a=s.areas[h.area],o=a.objects.find(o=>o.id===g.property),p=s.people[o.owner];if(Math.abs(h.x-(p.x??42))*areaScale(s.areas[h.area])>9)return false;h.lastAction='talk';
  if(g.phase==='offer'){
    observeProperty(s,a,ctx);
    o.gift={id:`gift-${o.id}-${s.tick}-${o.history.length}`,status:'offered',area:a.id,from:p.id,to:h.lineage,target:p.agenda.task.target,offered:s.tick,quote:o.offer?.price??null,consent:{giver:s.tick,recipient:null}};
    g.phase='answer';ctx.log(s,`${p.name} собирается переехать в ${s.areas[o.gift.target].name}: «Помещение мне больше не нужно. Возьмёшь мастерскую? Вещи и инструменты забираю с собой».`,'property');return true;
  }
  if(!wantsWorkshop(h)||!capable(h))return reply(s,o,'declined','Герой отказывается от мастерской: сейчас ему важнее другой путь. Хозяин сохраняет своё помещение.',ctx);
  if(Object.values(s.areas).some(a=>a.objects.some(other=>other.kind==='workshop'&&other.owner===h.lineage)))return reply(s,o,'declined','Своё рабочее место уже есть. Вторую мастерскую герой не принимает.',ctx);
  if(o.state==='burned'&&(!enabled(s,'property-damage')||!(a.civic?.tools>0)||!maySpend(s,'repair',18,ctx)))return reply(s,o,'declined','Дар требует ремонта, на который сейчас не хватает ресурсов. Герой отказывается, право остаётся у хозяина.',ctx);
  if((o.offer?.price??null)!==o.gift.quote)return reply(s,o,'cancelled','Хозяин изменил условия распоряжения мастерской. Прежнее предложение передачи больше не действует.',ctx);
  o.gift.consent.recipient=s.tick;o.gift.status='accepted';
  const act=transferProperty(s,ctx,{id:o.id,seller:p.id,price:0,cash:0,basis:'gift',gift:o.gift.id});
  if(!act)return reply(s,o,'cancelled','Оформить передачу не удалось: обстоятельства изменились. Прежний титул сохранён.',ctx);
  o.gift.status='done';o.gift.answered=s.tick;o.gift.act=act.id;h.goal=null;
  observeProperty(s,a,ctx);ctx.log(s,`${p.name} передаёт мастерскую ${h.name}. Помещение осталось на прежнем месте; вещи хозяина и запасы поселения не переходят в подарок.`,'property');return true;
}
