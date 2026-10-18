import {areaScale} from '../geometry.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown} from './common.js';
import {knownRelatives,localContact,missContact} from './npc-contacts.js';
import {npcAction} from './npc-control.js';
import {mentorJourneyPlan,refreshMentorAddress} from './mentor-journey.js';
import {mentorEnabled} from './mentor-memory.js';
import {companionAffairsTick,campCompanionAffairs,hasCompanionAffairs} from './companion-affairs.js';

function active(s){return enabled(s,'companion-goals')&&enabled(s,'companions')&&enabled(s,'relationships');}
function related(a,b){return (a.parents||[]).includes(b.id)||(b.parents||[]).includes(a.id)||(a.parents||[]).some(id=>(b.parents||[]).includes(id));}
export function assignCompanionGoal(s,p,ctx){
  if(!active(s)||p.personalJourney||!ctx.route)return;
  const memory=enabled(s,'npc-contacts');
  const relatives=memory?knownRelatives(s,p,ctx,6).map(e=>({id:e.contact.person,area:e.contact.area,name:e.contact.name,addressSeen:e.contact.seen,placeName:e.contact.place})):Object.values(s.people).filter(r=>r.id!==p.id&&r.alive&&r.status==='resident'&&r.area!==p.area&&s.areas[r.area]&&isTown(s.areas[r.area])&&related(p,r)&&ctx.route(s,p.area,r.area).length>0&&ctx.route(s,p.area,r.area).length<=6);
  if(!relatives.length||moduleRandom(s,'companion-goals')>=.4)return;
  const relative=relatives[Math.floor(moduleRandom(s,'companion-goals')*relatives.length)];
  p.personalJourney={kind:'visitKin',person:relative.id,target:relative.area,origin:p.area,status:'active',phase:'together',since:s.tick,due:s.tick+192+Math.floor((p.agenda?.curiosity||0)*240),talkedAt:null,...(memory?{contactMemory:true,name:relative.name,addressSeen:relative.addressSeen,placeName:relative.placeName}:{})};
}
export function companionGoalText(s,c){
  const g=s.people[c.person]?.personalJourney;
  if(!g||g.status!=='active')return c.motive||'Выбрал идти рядом.';
  if(g.kind==='seekMentor')return `Хочет освоить подгонку зажима у ${g.name} в месте «${g.placeName}». Оплачено занятий: ${g.lessons.length}/3. Общая дорога не отменяет его личного срока.`;
  return `Хочет навестить ${g.name||s.people[g.person]?.name||'родственника'} в месте «${g.placeName||s.areas[g.target]?.name||'прежний дом'}». Идёт вместе, пока пути совпадают.`;
}
function leaveForOwnLife(s,c,ctx,reason){
  const h=s.hero,p=s.people[c.person],g=p.personalJourney,a=s.areas[h.area];
  h.companions=h.companions.filter(other=>other!==c);
  for(const place of Object.values(s.areas)){
    if(place.population)place.population=place.population.filter(id=>id!==p.id);
    place.objects=place.objects.filter(o=>o.kind!=='resident'||o.person!==p.id);
  }
  p.area=a.id;p.x=h.x;p.status='wandering';p.health=Math.max(1,Math.ceil((p.maxHealth||100)*c.hp/c.maxHp));
  a.population ||= [];a.population.push(p.id);a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
  g.phase='independent';g.parted=s.tick;if(g.kind!=='seekMentor')g.abandonAfter=s.tick+2400;
  p.rejoinAfter=s.tick+480;
  p.agenda.task=null;p.agenda.due=s.tick;
  const r=h.relations[p.id];if(r)r.trust=Math.min(100,r.trust+1);
  ctx.log(s,`${p.name}: «${reason}» Попутчики расстаются друзьями. ${enabled(s,'npc-contacts')?'Он отправляется к последнему известному адресу.':(s.people[g.person]?.name||'Родственник')+' всё ещё ждёт встречи.'}`,'relationship');
}
export function companionGoalsTick(s,ctx){
  if(!active(s)||s.hero.transit||s.hero.combat)return;
  const h=s.hero,a=s.areas[h.area];
  for(const c of [...h.companions]){
    const p=s.people[c.person],g=p?.personalJourney;
    if(!p?.alive||c.loyalty<=0||g?.status!=='active'||g.phase!=='together')continue;
    if(g.kind==='seekMentor'&&!mentorEnabled(s))continue;
    if(companionAffairsTick(s,c,ctx,leaveForOwnLife))continue;
    if(!npcAction(s,p,'party','goal'))continue;
    if(g.kind==='seekMentor')refreshMentorAddress(s,p);
    const arrived=h.area===g.target;
    const safe=!a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&Math.abs(o.x-h.x)*areaScale(s.areas[h.area])<28);
    if(safe&&(arrived||s.tick>=g.due))leaveForOwnLife(s,c,ctx,g.kind==='seekMentor'?`Мне пора к ${g.name}. Хочу освоить ремонт своего зажима. Спасибо за общую дорогу.`:arrived?'Вот и место нашей встречи. Дальше у меня семейное дело.':'Мне пора заняться своим обещанием семье. Спасибо за общую дорогу.');
  }
}
export function campPersonalTalk(s,ctx){
  if(!active(s))return;
  const c=s.hero.companions.find(c=>s.people[c.person]?.personalJourney?.status==='active');if(!c)return;
  const p=s.people[c.person],g=p.personalJourney;
  if(hasCompanionAffairs(s,p))return;
  if(g.talkedAt!==null&&s.tick-g.talkedAt<240)return;
  g.talkedAt=s.tick;
  const r=s.hero.relations[p.id];if(r)r.trust=Math.min(100,r.trust+2);
  c.loyalty=Math.min(100,c.loyalty+1);
  ctx.log(s,g.kind==='seekMentor'?`${p.name} у костра рассказывает: «Зажим моего верстака сломан. ${g.name} умеет его подгонять; я отложил свои деньги на уроки. Если нам не по пути, это не ссора». Разговор укрепляет доверие.`:`${p.name} у костра рассказывает о ${g.name||s.people[g.person]?.name||'родственнике'}: «Я иду, чтобы увидеться с семьёй. Если нам окажется не по пути, это не ссора». Разговор укрепляет доверие.`,'relationship');
}
export function campAffairTalk(s,ctx){return campCompanionAffairs(s,ctx,leaveForOwnLife);}
export function personalVisitPlan(s,p,ctx){
  if(p.personalJourney?.kind==='seekMentor')return mentorJourneyPlan(s,p,ctx);
  if(p.personalJourney?.status!=='active'&&mentorJourneyPlan(s,p,ctx))return true;
  if(!enabled(s,'companion-goals')||p.personalJourney?.status!=='active')return false;
  if(p.personalJourney.phase==='together'&&p.status!=='withHero'){
    p.personalJourney.phase='independent';p.personalJourney.parted=s.tick;p.personalJourney.abandonAfter=s.tick+2400;
  }
  if(p.personalJourney.phase!=='independent')return false;
  const g=p.personalJourney,relative=s.people[g.person];
  if(s.tick>g.abandonAfter||!s.areas[g.target]||!enabled(s,'npc-contacts')&&p.area===g.target&&!relative?.alive){g.status='abandoned';g.ended=s.tick;return false;}
  // Knowledge is the last agreed meeting place, never the relative's hidden live position.
  if(p.area===g.target&&(enabled(s,'npc-contacts')?!localContact(s,g.person,p.area):relative?.area!==g.target)){g.status='missed';g.ended=s.tick;missContact(s,p,g.person);if(p.area===s.hero.area)ctx.log(s,`${p.name} не застал родных в прежнем месте. Семейную встречу придётся отложить.`,'npc');return false;}
  p.agenda.task={kind:'visit',target:g.target,x:42,remaining:2,person:g.person,home:p.home||g.origin,personal:true,...(g.contactMemory?{contactMemory:true,addressSeen:g.addressSeen,knownNavigation:enabled(s,'npc-knowledge')}:{})};p.status='wandering';return true;
}
export function finishPersonalVisit(s,p,success){
  if(!enabled(s,'companion-goals')||p.personalJourney?.phase!=='independent')return;
  p.personalJourney.status=success?'done':'missed';p.personalJourney.ended=s.tick;
}
