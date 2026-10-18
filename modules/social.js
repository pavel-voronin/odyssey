import {offerInvitation,declineInvitation,startInvitation} from './invitation-rhythm.js';
import {shareMoneyCacheAddresses} from './money-caches.js';
import {shareRouteMapReports} from './route-maps.js';
import {recordLastingInjury} from './injury-state.js';
import {shareBestiary,encounterBestiary} from './bestiary.js';
import {areaOffset} from '../geometry.js';
import {shareMarketKnowledge} from './market-knowledge.js';
import {selfDrivenActor} from '../actor-projection.js';
import {actorFact,companionKey,markActorDeath,companionShape} from '../actor-facts.js';
import {recordCompanionRemains} from './remains.js';
import {observeNPCPlace} from './npc-knowledge.js';
import {observeNPCContacts} from './npc-contacts.js';
import {observeFreightActor} from './freight-memory.js';
import {assignCompanionGoal,companionGoalText,companionGoalsTick} from './companion-goals.js';
import { enabled,moduleRandom } from '../rules.js';
import { clamp } from './common.js';
import { enchantedTrust } from './enchantments.js';
import {npcAction} from './npc-control.js';
import {mentorEnabled,observeMentors} from './mentor-memory.js';
import {mentorOfferExists,offerMentorEscort,finishMentorOffer} from './mentor-journey.js';

export function initializeSocial(s,h){
  h.relations ||= {};h.social ||= {fame:0,home:null,lastCivilQuestWork:0,lostCompanions:0};
  h.memory.npcNotes ||= {};
}
export function meetPerson(s,id,ctx,trust=1){
  shareMoneyCacheAddresses(s,id,s.hero.lineage);shareMoneyCacheAddresses(s,s.hero.lineage,id);
  shareRouteMapReports(s,id,s.hero.lineage);shareRouteMapReports(s,s.hero.lineage,id);
  shareBestiary(s,id,s.hero.lineage);shareBestiary(s,s.hero.lineage,id);
  shareMarketKnowledge(s,id,s.hero.lineage);shareMarketKnowledge(s,s.hero.lineage,id);
  const person=s.people?.[id];if(!person)return;
  if(!s.hero.memory.people.includes(id))s.hero.memory.people.push(id);
  if(enabled(s,'people'))for(const note of person.agenda?.knowledge.slice(-2)||[]){const key=id+':'+note.tick+':'+note.text;if(!s.hero.memory.npcNotes[key]){s.hero.memory.npcNotes[key]=true;s.hero.memory.facts.push({tick:s.tick,text:note.text,from:id});}}
  if(!enabled(s,'relationships'))return;
  const h=s.hero,r=h.relations[id] ||= {trust:0,met:s.tick,lastSeen:s.tick,helped:0};
  r.trust=clamp(r.trust+trust+(person.area===h.area?enchantedTrust(s,person.name,ctx):0),-100,100);r.lastSeen=s.tick;if(trust>=4)r.helped++;
  if(person.name.endsWith(h.family))r.trust=Math.min(100,r.trust+2);
}
export function recruitPerson(s,id,ctx,guaranteed=false){
  const h=s.hero,p=s.people?.[id];
  const learner=mentorEnabled(s)&&p?.personalJourney?.kind==='seekMentor'&&p.personalJourney.status==='active';
  if(selfDrivenActor(s,p?.id)||!enabled(s,'companions')||!enabled(s,'relationships')||!p?.alive||p.role==='ребёнок'||p.status!=='resident'&&!(learner&&p.status==='wandering')||p.migration&&(s.migrations?.[p.migration]?.status==='active')||(p.rejoinAfter||0)>s.tick||p.area!==h.area||h.companions.length>=3)return false;
  const relation=h.relations[id];
  if(mentorEnabled(s)&&p.personalJourney?.kind==='seekMentor'&&mentorOfferExists(s,p))return false;
  if(!guaranteed&&(!relation||relation.trust<9))return false;
  if(!guaranteed&&!offerInvitation(s,'companion',p.id))return false;
  if(learner&&!offerMentorEscort(s,p,ctx))return false;
  if(!guaranteed&&moduleRandom(s,'relationships')>.38){declineInvitation(s,'companion',p.id);if(learner)finishMentorOffer(s,p,false);return false;}
  const roles=[{job:'Страж',attack:3,healing:0,scouting:0,ethics:1},{job:'Травница',attack:0,healing:3,scouting:1,ethics:1},{job:'Картограф',attack:1,healing:0,scouting:4,ethics:0},{job:'Авантюрист',attack:2,healing:1,scouting:2,ethics:-1},{job:'Послушник',attack:0,healing:2,scouting:1,ethics:1}];
  const known={guard:0,healer:1,scholar:2,artisan:3,merchant:3,farmer:4};
  const role={...roles[known[p.agenda?.job]??Math.floor(moduleRandom(s,'relationships')*roles.length)]};
  if(p.agenda?.tools){if(role.job==='Страж')role.attack++;if(role.job==='Травница')role.healing++;if(role.job==='Картограф')role.scouting++;}
  if(role.ethics>0&&h.alignment<-25&&!guaranteed){declineInvitation(s,'companion',p.id);if(learner)finishMentorOffer(s,p,false);return false;}
  h.companions.push({id:p.id,uid:p.id,person:p.id,name:p.name,role:'person',race:p.race,...role,loyalty:Math.min(95,50+(relation?.trust||10)),hp:Math.max(1,Math.ceil(30*p.health/(p.maxHealth||100))),maxHp:30,joined:s.tick,motive:guaranteed?'После спасения считает дорогу общей.':'Хочет увидеть мир рядом с тем, кому доверяет.'});
  if(!guaranteed)startInvitation(s,'companion',p.id);
  assignCompanionGoal(s,p,ctx);h.companions.at(-1).motive=companionGoalText(s,h.companions.at(-1));
  if(learner)finishMentorOffer(s,p,true);
  p.status='withHero';p.home ||= p.area;
  if(enabled(s,'npc-control')&&p.agenda)p.agenda.task=null;
  const area=s.areas[p.area];if(area?.population)area.population=area.population.filter(personId=>personId!==id);
  h.counters.companions++;ctx.log(s,`${p.name} (${role.job.toLowerCase()}) присоединяется к отряду. ${guaranteed?'Спасение изменило чужую жизнь.':'Доверие превратилось в общий путь.'}`,'companion');return true;
}
export function socialTick(s,ctx){
  const h=s.hero;
  if(enabled(s,'npc-contacts')&&enabled(s,'companions')&&!h.transit)for(const c of h.companions){const p=s.people[c.person];if(p?.alive){p.area=h.area;observeNPCPlace(s,p);observeNPCContacts(s,p);observeMentors(s,p);}}
  if(enabled(s,'npc-logistics')&&enabled(s,'companions')&&!h.transit)for(const c of h.companions)if(c.person)observeFreightActor(s,s.people[c.person],h.area,enabled(s,'npc-contacts'));
  companionGoalsTick(s,ctx);
  for(const c of enabled(s,'companions')?[...h.companions]:[]){
    if(c.person&&!npcAction(s,s.people[c.person],'party','social'))continue;
    if(enabled(s,'npc-control')&&c.person&&s.people[c.person]?.agenda)s.people[c.person].agenda.task=null;
    if(c.person&&s.people[c.person])s.people[c.person].area=h.area;
    if(enabled(s,'relationships')&&s.tick%32===0){
      if(c.ethics>0&&h.alignment<-20)c.loyalty=Math.max(0,c.loyalty-8);
      if(c.ethics<0&&h.alignment>35)c.loyalty=Math.max(0,c.loyalty-3);
    }
    if(c.loyalty<=0&&c.person){
      h.companions=h.companions.filter(other=>other!==c);const p=s.people[c.person];p.status='resident';p.area=h.area;
      const a=s.areas[h.area];a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);
      if(!a.objects.some(o=>o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:38});
      ctx.log(s,`${c.name} уходит: поступки героя больше не совпадают с его убеждениями.`,'relationship');
      if(h.relations[c.person])h.relations[c.person].trust=-20;
    }
  }
}
export function hurtCompanion(s,c,damage,ctx,source=null){
  const h=s.hero,p=s.people[c.person];
  if(damage<=0||c.hp<=0||!h.companions.includes(c)||p&&!p.alive)return 0;
  const previousHp=c.hp;c.hp=Math.max(0,c.hp-damage);
  const previousPersonHealth=p?.health;
  actorFact(s,'hurt',companionKey(c),source,previousHp-c.hp);
  if(p)p.health=Math.ceil((p.maxHealth||100)*c.hp/c.maxHp);
  const enemy=source&&s.areas[h.area]?.objects.find(o=>o.id===source&&o.kind==='enemy');
  if(p&&enemy&&p.health>0)encounterBestiary(s,p,enemy);
  if(p&&enemy)recordLastingInjury(s,p,enemy,{before:previousPersonHealth,after:p.health,maximum:p.maxHealth||100,area:h.area,controller:'party'},ctx);
  if(c.hp===0){
    if(!c.uid)throw new Error('У попутчика отсутствует текущая личность');
    h.companions=h.companions.filter(other=>other!==c);h.social.lostCompanions++;
    if(p){p.alive=false;p.died=s.tick;p.status='dead';p.health=0;}
    const memorial={id:'memorial-'+c.uid,kind:'grave',name:c.name,x:h.x-areaOffset(s.areas[h.area],4)};
    const marked=markActorDeath(s,memorial,companionKey(c),companionShape(c));
    if(source&&!marked)actorFact(s,'death',companionKey(c));
    s.areas[h.area].objects.push(memorial);recordCompanionRemains(s,c,memorial);
    h.mind.stress=Math.min(100,h.mind.stress+18);ctx.log(s,`${c.name} погибает рядом с героем. Отряд и память дороги меняются.`,'loss');
  }
  return previousHp-c.hp;
}
export function partyHurt(s,damage,ctx,excluded=[]){
  if(!enabled(s,'companions')||damage<=0)return;
  const h=s.hero;
  for(const c of [...h.companions]){
    if(excluded.includes(c.person))continue;
    if(moduleRandom(s,'party-danger')>.18)continue;
    hurtCompanion(s,c,Math.max(1,Math.ceil(damage*.55)),ctx);
  }
}
export function partyRest(s){
  if(!enabled(s,'companions'))return;
  for(const c of s.hero.companions){
    const person=s.people[c.person];if(enabled(s,'npc-party-needs')&&person&&!person.alive)continue;
    c.hp=Math.min(c.maxHp,c.hp+5);if(!person){if(enabled(s,'pet-training')&&c.petTraining)c.petTraining.energy=Math.min(100,c.petTraining.energy+8);continue;}
    person.health=Math.ceil((person.maxHealth||100)*c.hp/c.maxHp);
    if((enabled(s,'camp-life')||enabled(s,'npc-party-needs'))&&enabled(s,'npc-needs')&&person.needs){
      const n=person.needs;n.energy=Math.min(100,n.energy+12);
      if(n.sleeping&&n.energy>=90){n.sleeping=false;n.sleeps++;}
    }
  }
}
export function releaseParty(s,ctx){
  const h=s.hero,a=s.areas[h.area];
  for(const c of h.companions){
    if(c.person&&s.people[c.person]?.alive){const p=s.people[c.person];p.status='resident';p.area=a.id;a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);if(!a.objects.some(o=>o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:Math.max(areaOffset(a,8),Math.min(100-areaOffset(a,8),h.x-areaOffset(a,10)))});}
    else if(!c.person&&c.hp>0)a.objects.push({id:'waiting-'+c.uid,kind:'encounter',encounter:'familiar',icon:'pet',name:c.name,x:Math.max(areaOffset(a,8),Math.min(100-areaOffset(a,8),h.x-areaOffset(a,12))),resolved:false,existingPet:{...c,previousOwner:h.lineage,loyalty:Math.max(25,c.loyalty-20)}});
  }
}
