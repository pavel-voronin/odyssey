import {consumedFood} from './nutrition-state.js';
import {recordFamilyCooperation} from './family-state.js';
import {rememberCampPairCare} from './camp-topic-memory.js';
import {enabled} from '../rules.js';
import {recordPracticalAid,fieldMedicineCost,skillBranchesEnabled} from './skill-branches.js';
import {safeCampActivity,campActivityAvailable,reserveCampActivity} from './camp-session.js';
import {consumeCarriedSupplies,carriedFood} from './stores.js';
import {npcAction,npcController} from './npc-control.js';
import {clamp} from './common.js';
import {physicalDistance} from '../geometry.js';

const active=s=>s.hero.alive&&enabled(s,'party-relations')&&enabled(s,'companions')&&enabled(s,'relationships')&&enabled(s,'camp-life')&&enabled(s,'npc-needs');
function present(s){const seen=new Set();return s.hero.companions.filter(c=>{const p=s.people[c.person];if(seen.has(c.person)||!p?.alive||p.health<=0||c.hp<=0||p.status!=='withHero'||p.area!==s.hero.area||!Number.isFinite(p.x)||physicalDistance(s.areas[p.area],p.x,s.hero.x)>12)return false;seen.add(p.id);return true;}).slice(0,3);}
const campIdentity=h=>h.counters.camps??`legacy@${h.area}`;
function session(h){const number=campIdentity(h);if(!h.pairCamp||h.pairCamp.number!==number)h.pairCamp={number,care:null};return h.pairCamp;}
export function pairFeeling(p,id){return p?.partyRelations?.[id]?.feeling??0;}
function remember(p,other,event,delta){
 const relations=p.partyRelations ||= {};
 const r=relations[other.id] ||= {person:other.id,name:other.name,feeling:0,events:[]};
 if(r.events.some(e=>e.id===event.id))return r;
 r.feeling=clamp(r.feeling+delta,-12,12);r.last=event.tick;r.events.push({...event,delta});if(r.events.length>8)r.events.shift();
 const ids=Object.keys(relations).sort((a,b)=>relations[a].last-relations[b].last||a.localeCompare(b));for(const id of ids.slice(0,Math.max(0,ids.length-12)))delete relations[id];return r;
}
function watchBasis(p,id){return p.partyRelations?.[id]?.events.filter(e=>e.kind==='food'||e.kind==='medicine').at(-1)?.id??null;}
function newWatch(a,b){return !a.partyRelations?.[b.id]?.lastWatch||!b.partyRelations?.[a.id]?.lastWatch||a.partyRelations[b.id].lastWatch.basis!==watchBasis(a,b.id)||b.partyRelations[a.id].lastWatch.basis!==watchBasis(b,a.id);}
function awake(p){return p.needs&&!p.needs.sleeping&&p.needs.energy>=30;}
function free(s,p){return !(p.partyNeeds?.tick===s.tick&&p.partyNeeds.activity)&&!(p.actionControl?.tick===s.tick&&(p.actionControl.phases.includes('pairCamp')||p.actionControl.phases.length>=4));}
function stock(p,kind){return kind==='food'?carriedFood(p,p.actorLink?.inventory):p.roadSupplies?.[kind]||0;}
function claim(s,a,b){if(!free(s,a)||!free(s,b)||enabled(s,'npc-control')&&(npcController(s,a)!=='party'||npcController(s,b)!=='party'))return false;return npcAction(s,a,'party','pairCamp')&&npcAction(s,b,'party','pairCamp');}
// One concrete request per pitched camp. No public stock, invented parcel or remote witness.
export function pairCampCare(s,ctx){
 if(!active(s)||!enabled(s,'supply')||!enabled(s,'npc-personal-supplies')||s.hero.goal?.kind!=='rest'||s.hero.goal.area!==s.hero.area||physicalDistance(s.areas[s.hero.area],s.hero.x,s.hero.goal.x)>1||!safeCampActivity(s))return false;
 const h=s.hero;if(h.pairCamp?.number===campIdentity(h)&&h.pairCamp?.care)return false;
 const members=present(s);
 for(const c of members){
  const recipient=s.people[c.person];if(!awake(recipient))continue;
  const medical=recipient.health<(recipient.maxHealth||100)*.75;
  const kind=medical?'medicine':recipient.needs.hunger>=65?'food':null;
  if(!kind||stock(recipient,kind)>=(medical?fieldMedicineCost(s,recipient.id):1))continue;
  const donorC=members.find(other=>other!==c&&awake(s.people[other.person])&&s.people[other.person].needs.hunger<45&&stock(s.people[other.person],kind)>=(medical?fieldMedicineCost(s,other.person):1));
  if(!donorC)continue;
  const donor=s.people[donorC.person],amount=medical?fieldMedicineCost(s,donor.id):1,before=recipient.health;if(!claim(s,recipient,donor))continue;
  const refuse=(donor.agenda?.sociability??.5)<.3&&(donor.agenda?.duty??.5)<.5&&pairFeeling(donor,recipient.id)<3;
  if(!refuse&&!consumeCarriedSupplies(donor,null,kind,amount))return false;
  if(!refuse){if(medical){recipient.health=Math.min(recipient.maxHealth||100,recipient.health+25);c.hp=Math.max(1,Math.ceil(c.maxHp*recipient.health/(recipient.maxHealth||100)));}else{consumedFood(s,recipient,{source:'shared-owned-meal'});recipient.needs.meals++;}}
  const event={id:`${h.lineage}/camp/${campIdentity(h)}/care`,tick:s.tick,area:h.area,kind,outcome:refuse?'refused':'shared',donor:donor.id,recipient:recipient.id,spent:refuse?0:amount,...(refuse&&donor.health<(donor.maxHealth||100)*.75?{need:'own-health',ownHealth:donor.health,ownMaximum:donor.maxHealth||100}:{})};
  if(skillBranchesEnabled(s)&&medical&&!refuse){Object.assign(event,{actor:donor.id,patient:recipient.id,before,after:recipient.health,resource:'medicine'});session(h).care=event;recordPracticalAid(s,event);}
  remember(recipient,donor,event,refuse?-3:3);remember(donor,recipient,event,refuse?0:1);session(h).care=event;rememberCampPairCare(s,event);
  recipient.needs.energy--;donor.needs.energy--;h.energy--;h.lastAction='talk';
  ctx.log(s,refuse?`${recipient.name} просит немного ${kind==='food'?'еды':'лекарств'}. ${donor.name}: «Этот запас оставлю себе${event.need?': мне самому сейчас нужно лекарство':''}». У костра повисает неловкое молчание.`:`${donor.name} делится ${kind==='food'?'своей едой':'своими лекарствами'} у костра. ${recipient.name}: «Спасибо. Я это запомню».`,'relationship');return true;
 }
 return false;
}

// Joint watch is a real optional action, not a new combat bonus or free skill level.
export function pairCampWatch(s,ctx){
 if(!active(s)||!safeCampActivity(s)||!campActivityAvailable(s.hero))return false;
 const h=s.hero,members=present(s).filter(c=>{const p=s.people[c.person];return awake(p)&&p.needs.energy>=40&&p.needs.hunger<65&&c.hp>=c.maxHp*.8;});
 let leader,other;for(const c of members){if(c.attack<=0||(s.people[c.person].agenda?.duty??0)<.55)continue;const partner=members.find(o=>o!==c&&newWatch(s.people[c.person],s.people[o.person]));if(partner){leader=c;other=partner;break;}}if(!leader||!other)return false;
 const a=s.people[leader.person],b=s.people[other.person];if(!claim(s,a,b))return false;
 const willing=pairFeeling(a,b.id)>-3&&pairFeeling(b,a.id)>-3;
 reserveCampActivity(h,'pair-watch');const camp=session(h);
 camp.watch={tick:s.tick,area:h.area,people:[a.id,b.id],outcome:willing?'together':'separate'};
 const event={...camp.watch,id:`${h.lineage}/camp/${campIdentity(h)}/watch`,kind:'watch'};
 for(const [p,partner]of [[a,b],[b,a]]){const basis=watchBasis(p,partner.id);remember(p,partner,event,0).lastWatch={tick:s.tick,basis,outcome:event.outcome};}
 a.needs.energy-=willing?3:1;b.needs.energy-=willing?3:1;h.energy--;h.lastAction='talk';
 if(willing){recordFamilyCooperation(s,[a.id,b.id],{id:event.id+'/'+s.tick,kind:'watch'});h.mind.stress=Math.max(0,h.mind.stress-3);ctx.log(s,`${a.name} и ${b.name} вместе обходят лагерь и договариваются о сигналах тревоги. У огня становится спокойнее.`,'relationship');}
 else {const refusing=pairFeeling(a,b.id)<=-3?a:b;ctx.log(s,`${a.name} и ${b.name} обсуждают общий дозор. ${refusing.name}: «После того отказа я пока предпочту побыть один». Разговор затихает. К совместному дозору они не приступают.`,'relationship');}
 return true;
}

export function campPairFeeling(s,p,other,event,delta){if(!enabled(s,'party-relations')||!enabled(s,'relationships'))return 0;const before=pairFeeling(p,other.id);remember(p,other,event,delta);return pairFeeling(p,other.id)-before;}
