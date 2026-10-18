import {physicalDistance} from '../geometry.js';
import {companionAffairsEnabled} from './companion-affair-state.js';
import {mentorEnabled} from './mentor-memory.js';
import {localContact} from './npc-contacts.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {knownNPCDeeds,observeNPCFamilyNeeds} from './npc-deeds.js';
import {stableAffairChoice} from './affair-choice.js';
import {safeCampActivity,campActivityAvailable,reserveCampActivity} from './camp-session.js';
import {npcAction,npcController} from './npc-control.js';
import {refreshMentorAddress} from './mentor-journey.js';

export const COMPANION_AFFAIR_POLICY={shared:48,urgentShared:16,postpone:48,history:8,effort:1};
const pending=c=>['known','active'].includes(c.status);
const cases=p=>Object.values(p.familyNeeds?.cases||{}).filter(pending);
const ensure=p=>p.companionAffairs ||= {version:1,current:null,agreement:null,postponed:null,history:[],lastActionTick:-1,lastBasis:null,reviewAfter:0};
export function hasCompanionAffairs(s,p){return Boolean(companionAffairsEnabled(s)&&mentorEnabled(s)&&p?.alive&&p.personalJourney?.kind==='seekMentor'&&p.personalJourney.status==='active'&&cases(p).length);}
function member(s,c){
 const p=s.people[c?.person],b=p&&localContact(s,p.id,s.hero.area);
 if(!p?.alive||!c||c.hp<=0||c.loyalty<=0||p.status!=='withHero'||npcController(s,p)!=='party'||!b||physicalDistance(s.areas[b.area],s.hero.x,b.x)>12)return null;
 return {p,body:{...p,area:b.area,x:b.x}};
}
function choice(s,p,body=p){
 const n=p.companionAffairs,at=body===p?p:{...p,area:body.area,x:body.x},options=knownNPCDeeds(s,at).filter(d=>['family','learning'].includes(d.domain)),available=options.filter(d=>d.available).sort((a,b)=>b.value-a.value||(a.id<b.id?-1:a.id>b.id?1:0));
 const selected=stableAffairChoice(available,{current:n?.current?.id||p.npcIntentions?.current?.id,since:n?.current?.since??p.npcIntentions?.current?.since??s.tick,tick:s.tick});
 return {options,selected};
}
const safe=s=>!s.hero.transit&&!s.hero.combat&&!s.areas[s.hero.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[s.hero.area],s.hero.x,o.x)<28);
const ready=p=>!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<65&&p.health>=(p.maxHealth||100)*.75;
function basis(s,p,options){const g=p.personalJourney;return JSON.stringify([cases(p).map(c=>[c.id,c.revision]),g.since,g.teacher,g.target,g.lessons.length,g.due,s.tick>=g.due-24,options.map(d=>[d.id,d.available,d.available?null:d.reason])]);}
function record(s,p,outcome,selected,reason,extra={}){
 const n=ensure(p);if(!selected)n.current=null;else if(n.current?.id!==selected.id)n.current={id:selected.id,domain:selected.domain,since:s.tick};n.history.push({tick:s.tick,area:s.hero.area,outcome,selected:selected?.id||null,reason,...extra});if(n.history.length>COMPANION_AFFAIR_POLICY.history)n.history.shift();
 p.agenda.knowledge.push({tick:s.tick,text:`${p.name}: ${reason}`});if(p.agenda.knowledge.length>8)p.agenda.knowledge.shift();
}
function claim(s,p,phase){if(p.companionAffairs?.lastActionTick>=s.tick||p.npcIntentions?.lastActionTick>=s.tick||p.partyNeeds?.tick===s.tick&&p.partyNeeds.activity||p.actionControl?.tick===s.tick&&p.actionControl.phases.some(v=>['pairCamp','camp-study','affair-talk','affair-depart'].includes(v))||!npcAction(s,p,'party',phase))return false;ensure(p).lastActionTick=s.tick;return true;}
function deferOther(s,p,selected,options){
 const n=ensure(p),familyRef=selected.domain==='family'?selected:options.filter(d=>d.domain==='family').sort((a,b)=>b.value-a.value||(a.id<b.id?-1:a.id>b.id?1:0))[0],family=cases(p).find(c=>c.id===familyRef?.id),other=selected.domain==='family'?options.find(d=>d.domain==='learning'):familyRef;
 if(!family||!other)return;n.postponed={id:other.id,domain:other.domain,family:family.id,revision:family.revision,since:s.tick,until:s.tick+COMPANION_AFFAIR_POLICY.postpone,reason:selected.domain==='learning'?'У костра решил сначала закончить уже начатую учёбу. Семейное дело помнит; отсрочка короткая.':'У костра решил сперва помочь родному. Оплаченные уроки сохранены; отсрочка короткая.'};
}
function depart(s,c,p,selected,ctx,leave,reason){
 record(s,p,'parted',selected,reason);ensure(p).agreement=null;
 leave(s,c,ctx,reason); // Existing physical party -> personal handoff, never a destination teleport.
}
// A known common leg, discussed at camp, is a bounded agreement rather than a
// promise that the adventurer will abandon its own plan to follow the pupil.
function sharedLeg(s,p,selected){
 const h=s.hero,a=s.areas[h.area],target=selected.domain==='family'?cases(p).find(c=>c.id===selected.id)?.area:p.personalJourney.target;
 const own=npcKnownRoute(p,h.area,target,knownNPCHazards(s,p)),task=h.campReturn?.task,from=a.temporaryCamp?.parent;
 if(!from||!task?.area||!own.length||own.length<2)return null;
 const route=npcKnownRoute(p,from,target,knownNPCHazards(s,p)),heroRoute=(h.atlas?.known?.includes(task.area)||task.area===h.area)?npcKnownRoute(p,from,task.area,knownNPCHazards(s,p)):[];
 if(route.length>1&&heroRoute.length>1&&route[1]===heroRoute[1])return {to:route[1],path:[s.hero.area,...route.slice(0,2)]};
 // The actual exit itself can be the whole short common way.
 return own[1]===from&&target===from?{to:from,path:[s.hero.area,from]}:null;
}
export function companionAffairsTick(s,c,ctx,leave){
 if(!companionAffairsEnabled(s))return false;const m=member(s,c);if(!m||!mentorEnabled(s)||m.p.personalJourney?.kind!=='seekMentor'||m.p.personalJourney.status!=='active')return false;
 const {p,body}=m;observeNPCFamilyNeeds(s,p);refreshMentorAddress(s,p);if(!hasCompanionAffairs(s,p)){if(p.companionAffairs?.agreement)p.companionAffairs.agreement=null;return false;}
 const {options,selected}=choice(s,p,body),n=p.companionAffairs,agreement=n?.agreement,newBasis=basis(s,p,options);
 if(agreement&&agreement.basis===newBasis&&s.tick<agreement.until&&s.hero.area!==agreement.to&&agreement.path.includes(s.hero.area))return true;
 if(s.areas[s.hero.area].temporaryCamp&&s.hero.goal?.kind==='rest'&&!agreement&&!(n?.reviewAfter&&s.tick>=n.reviewAfter))return true;
 if(!safe(s)||!ready(p))return true;
 if(!selected){if(s.tick>=p.personalJourney.due||n?.reviewAfter&&s.tick>=n.reviewAfter){if(claim(s,p,'affair-depart'))depart(s,c,p,null,ctx,leave,'Оба дела помню, но пока не хватает безопасного пути или припасов. Сначала займусь собственной жизнью и заработком.');}return true;}
 const shouldLeave=agreement||selected.domain==='family'&&selected.urgency>=60||s.tick>=p.personalJourney.due||s.hero.area===p.personalJourney.target;
 if(!shouldLeave)return true;
 if(!claim(s,p,'affair-depart'))return true;
 deferOther(s,p,selected,options);ensure(p).lastBasis=newBasis;
 const reason=selected.domain==='family'?'Я узнал, что родному нужна помощь. Продолжу к нему своим путём; оплаченную учёбу не забуду.':`Мне пора к ${p.personalJourney.name}. Уже начатые занятия и личный срок требуют моей дороги.`;
 depart(s,c,p,selected,ctx,leave,reason);return true;
}
export function campCompanionAffairs(s,ctx,leave){
 const h=s.hero,a=s.areas[h.area];if(!companionAffairsEnabled(s)||!safeCampActivity(s)||!campActivityAvailable(h)||h.goal?.kind!=='rest'||h.goal.area!==h.area||physicalDistance(a,h.x,h.goal.x)>1||!safe(s))return false;
 for(const c of h.companions){const m=member(s,c);if(!m||!ready(m.p))continue;const {p,body}=m;observeNPCFamilyNeeds(s,p);if(!hasCompanionAffairs(s,p))continue;
  const {options,selected}=choice(s,p,body),currentBasis=basis(s,p,options),n=p.companionAffairs;if(n?.lastBasis===currentBasis||n?.lastActionTick>=s.tick)continue;
  if(!claim(s,p,'affair-talk'))continue;if(!reserveCampActivity(h,'companion-affairs'))throw Error('Lost synchronous camp affair reservation');
  h.energy=Math.max(0,h.energy-COMPANION_AFFAIR_POLICY.effort);p.needs.energy=Math.max(0,p.needs.energy-COMPANION_AFFAIR_POLICY.effort);h.lastAction='talk';
  const state=ensure(p);state.lastBasis=currentBasis;const relation=h.relations[p.id];if(relation)relation.trust=Math.min(100,relation.trust+1);
  if(!selected){const reason='Оба дела помню, но сейчас нет безопасного доступного способа. Сначала восстановлю силы и средства.';state.reviewAfter=s.tick+COMPANION_AFFAIR_POLICY.postpone;record(s,p,'postponed',null,reason);ctx.log(s,`${p.name} у костра: «${reason}»`,'relationship');return true;}
  deferOther(s,p,selected,options);const leg=sharedLeg(s,p,selected),window=selected.domain==='family'?selected.urgency>=60?COMPANION_AFFAIR_POLICY.urgentShared:COMPANION_AFFAIR_POLICY.shared:Math.min(COMPANION_AFFAIR_POLICY.shared,Math.max(0,p.personalJourney.due-s.tick));
  if(leg&&window>=8){const reason=selected.domain==='family'?'Пройду с тобой ещё один общий отрезок, затем займусь семьёй. Уроки и своё обещание помню.':'Дойдём вместе до ближайшего общего места. Затем вернусь к урокам; семейное дело отложу ненадолго.';
   state.agreement={since:s.tick,until:s.tick+window,from:h.area,to:leg.to,toName:p.navigation?.places.find(v=>v.area===leg.to)?.name||'ближайшее общее место',path:leg.path,selected:selected.id,basis:basis(s,p,choice(s,p,body).options)};state.lastBasis=state.agreement.basis;record(s,p,'shared',selected,reason,{until:state.agreement.until,to:leg.to});c.motive=reason;ctx.log(s,`${p.name} у костра: «${reason}»`,'relationship');return true;
  }
  if(!selected.available)throw Error('Unavailable companion affair selected');const reason=selected.domain==='family'?'Родному нужна помощь, а нам дальше не по пути. Учёбу отложу ненадолго и пойду своим путём.':`Я уже платил за занятия и не хочу упустить срок. Пойду к ${p.personalJourney.name}; семейное дело помню.`;
  state.lastBasis=basis(s,p,choice(s,p,body).options);depart(s,c,p,selected,ctx,leave,reason);return true;
 }
 return false;
}
