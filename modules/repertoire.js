import {navigationReturnChoices,startNavigationReturn,pauseNavigationReturn} from './navigation-memory.js';
import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {JOBS} from '../content.js';
import {profile,isTown,hasHabit} from './common.js';
import {workMotive} from './work.js';
import {questMeaning,questChoiceAvailable} from './intention-choice.js';
import {questReady} from './quests.js';
import {knownServiceAllows} from './service-access.js';
import {knownToolAllows} from './workshop-tools.js';
import {areaAvoided} from './route-memory.js';
import {partyDemand} from './party-needs.js';

const route=(s,ctx,id)=>(ctx.knownRoute||ctx.route)(s,s.hero.area,id);
const readyBody=s=>s.hero.alive&&!s.hero.combat&&!s.hero.transit&&!s.hero.goal?.intention&&s.hero.hp>=s.hero.maxHp*.65&&s.hero.energy>=30&&s.hero.hunger<65&&!partyDemand(s);
function state(h){return h.repertoire ||= {version:1,choices:[],paused:null};}
function craftPlace(s,ctx,job){
 const h=s.hero;
 if(job.id==='repair'&&enabled(s,'property'))return Object.entries(h.property?.known||{}).filter(([id,k])=>k.state==='intact'&&knownToolAllows(s,k.area,id)&&(k.owner===h.lineage||h.gold>=2)).map(([,k])=>s.areas[k.area]).find(a=>a&&knownArea(s,a)&&knownServiceAllows(s,a,'employment',{job:job.id})&&route(s,ctx,a.id).length);
 return Object.values(s.areas).find(a=>knownArea(s,a)&&isTown(a)&&knownServiceAllows(s,a,'employment',{job:job.id})&&route(s,ctx,a.id).length);
}
// Ephemeral alternatives refer to the canonical quest, job or known route.
// No renderer/load call creates an interest, completed work or a family member.
export function repertoireChoices(s,ctx,q=null){
 if(!enabled(s,'repertoire')||!readyBody(s)||s.hero.repertoire&&s.hero.repertoire.version!==1)return [];
 if(q&&q.status!=='active')q=null;
 const h=s.hero,meaning=q&&questMeaning(s,q,questReady(s,q));
 if(q&&(!meaning.family||meaning.ready||meaning.urgency>=52))return [];
 const choices=[],job=JOBS.find(j=>j.skills.includes(profile(h).skill));
 const motive=enabled(s,'work')?workMotive(s,ctx):null,place=job&&enabled(s,'work')&&(h.workAfter??0)<=s.tick?craftPlace(s,ctx,job):null;
 if(place){const score=20+Math.min(20,h.career.rank*4)+(1-h.personality.curiosity)*25+(motive?.kind==='income'?(h.gold<8?70:18):motive?.kind==='learning'?16:0)+(hasHabit(h,'homebody')?12:0);
  choices.push({line:'craft',id:job.id,area:place.id,score,reason:motive?.reason||'Хочется вернуться к знакомому ремеслу и поработать руками.'});}
 if(q&&questChoiceAvailable(s,q)&&route(s,ctx,q.target).length)choices.push({line:'family',id:q.id,area:q.target,score:25+h.personality.generosity*35+Math.min(24,Math.max(0,s.tick-(q.accepted??s.tick))/24)+Math.max(-8,Math.min(12,(h.relations[q.giver]?.trust||0)*.2)),reason:'Это обещание дано близкому человеку. Он хочет уделить ему время.'});
 const quiet=(h.life.residence?.since!==undefined||hasHabit(h,'homebody'))&&h.personality.curiosity<.6;
 const frontier=!quiet&&Object.values(s.areas).find(a=>!a.interior&&!a.temporaryCamp&&knownArea(s,a)&&!areaAvoided(s,a.id)&&(!h.memory.places.includes(a.id)||!a.expanded&&a.type!=='village')&&route(s,ctx,a.id).length);
 if(frontier)choices.push({line:'explore',id:frontier.id,area:frontier.id,score:12+h.personality.curiosity*65+(h.career.path==='adventure'?6:0),reason:'Любопытство зовёт на знакомую дорогу к ещё не исследованному месту.'});
 choices.push(...navigationReturnChoices(s,ctx));
 const last=h.repertoire?.choices?.at(-1);for(const c of choices)if(last?.line===c.line&&s.tick-last.tick<240)c.score-=12*(1-(s.tick-last.tick)/240);
 return choices.sort((a,b)=>b.score-a.score||a.line.localeCompare(b.line));
}
function remember(s,choice,options){
 const h=s.hero,r=state(h),id=choice.line==='family'?h.goal.quest:choice.line==='craft'?h.goal.job:choice.line==='navigation'?choice.id:h.goal.area,record={tick:s.tick,line:choice.line,id,area:h.goal.area,reason:choice.reason,alternatives:options.map(o=>({line:o.line,score:Math.round(o.score)}))};
 r.choices.push(record);if(r.choices.length>24)r.choices.shift();h.goal.repertoire={line:choice.line,since:s.tick,id};
 h.reason=choice.reason;
}
export function repertoirePlan(s,ctx,q=null){
 const h=s.hero,paused=h.repertoire?.paused;
 if(h.repertoire&&h.repertoire.version!==1)return false;
 if(!enabled(s,'repertoire')){
  if(!q&&paused&&enabled(s,'work')&&readyBody(s)&&route(s,ctx,paused.goal.area).length){h.goal=paused.goal;h.intent=paused.intent;h.reason='Можно закончить прерванную работу.';h.repertoire.paused=null;return true;}return false;
 }
 const options=repertoireChoices(s,ctx,q);
 for(const c of options){
  if(c.line==='navigation'){if(!startNavigationReturn(s,c,ctx))continue;}
  else if(c.line==='family')ctx.planQuest(s,q);
  else if(c.line==='craft'){
   if(paused&&paused.goal.job===c.id&&route(s,ctx,paused.goal.area).length){h.goal=paused.goal;h.intent=paused.intent;c.reason='Он возвращается к прерванной работе. Сделанная часть сохранилась.';h.repertoire.paused=null;}
   else if(!ctx.work(s))continue;
  }else ctx.explore(s);
  if(!h.goal)continue;remember(s,c,options);ctx.log(s,`${h.name} выбирает: ${h.intent}. ${c.reason}`,'choice');return true;
 }
 return false;
}
export function repertoireInterrupt(s,ctx,q){
 const h=s.hero;
 if(!enabled(s,'repertoire')||!readyBody(s)||h.repertoire&&h.repertoire.version!==1||!['craft','navigation'].includes(h.goal?.repertoire?.line)||h.repertoire?.paused&&h.goal?.repertoire?.line==='craft'||!q||!questChoiceAvailable(s,q))return false;
 const meaning=questMeaning(s,q,questReady(s,q));if(meaning.urgency<60||!route(s,ctx,meaning.ready?q.source:q.target).length)return false;
 if(h.goal.repertoire.line==='navigation'){pauseNavigationReturn(s,h.goal.navReturn||h.goal.navigationReturn);h.goal=null;ctx.planQuest(s,q);h.lastAction='idle';h.action='РЕШЕНИЕ';ctx.log(s,'Срочное обещание важнее возвращения к спуску. Возможность сохранена.','choice');return true;}
 const r=state(h);r.paused={goal:h.goal,intent:h.intent,reason:h.reason};h.goal=null;ctx.planQuest(s,q);h.lastAction='idle';h.action='РЕШЕНИЕ';
 ctx.log(s,`${h.name} откладывает работу: срок обещания уже близко. Сделанную часть он сможет закончить позже.`,'choice');return true;
}
