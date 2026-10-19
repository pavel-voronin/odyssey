import {enabled} from '../rules.js';
import {valueRevisionBias} from './value-revision.js';
import {profile} from './common.js';
import {questServiceBlocked} from './service-access.js';
import {reentryReason} from './delve-attempts.js';
import {AFFAIR_POLICY,stableAffairChoice} from './affair-choice.js';
export function questChoiceAvailable(s,q){
 if(questServiceBlocked(s,q))return false;
 if(q.dungeonRescue?.version!==1||q.dungeonRescue.stage!=='captive')return true;
 const r=s.hero.delveMemory?.places[q.target];
 return !(s.hero.delve?.root===q.target&&r?.status==='paused')||Boolean(reentryReason(s,r));
}
export const CHOICE_POLICY={...AFFAIR_POLICY,executors:4};
function tie(s,q){let n=(s.seed>>>0);const text=[s.hero.lineage,q.source,q.target,q.kind,q.giver,q.offer||q.person||q.object||''].join('/');for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;}
function kin(s,id){
 if(!enabled(s,'lineage')||!id)return false;
 const hero=s.people[s.hero.lineage],other=s.people[id];if(!hero||!other)return false;
 return (hero.parents||[]).includes(id)||(other.parents||[]).includes(hero.id)||(hero.parents||[]).some(p=>(other.parents||[]).includes(p));
}
export function questMeaning(s,q,ready=false){
 const h=s.hero,trust=h.relations[q.giver]?.trust||0,skill=profile(h).skill;
 let importance=15+h.personality.generosity*18+Math.max(-10,Math.min(20,trust*.25))+Math.min(8,(q.reward||0)/16)+valueRevisionBias(s,q);
 const family=kin(s,q.giver)||kin(s,q.person);if(family)importance+=24;
 if(q.kind==='rescue')importance+=18;
 if(q.kind==='medicine')importance+=12;
 if(['herbs','medicine'].includes(q.kind)&&['healing','spirit'].includes(skill))importance+=8;
 if(['delivery','supply'].includes(q.kind)&&(h.career.path==='peaceful'||['trade','parley','sea'].includes(skill)))importance+=8;
 if(q.kind==='relic'&&['relic','magic','time'].includes(skill))importance+=8;
 if(q.kind==='scout')importance+=h.personality.curiosity*6;
 if(q.kind==='wolves')importance+=h.personality.courage*6-(h.career.path==='peaceful'?8:0);
 if(ready)importance+=80;
 const left=Number.isFinite(q.deadline)?q.deadline-s.tick:null;
 const urgency=left===null?0:left<=6?96:left<=24?72:left<=60?52:left<180?(180-left)*.25:0;
 const reason=urgency>=52?'Срок обещания вот-вот истечёт.':ready?'Пора вернуться и завершить обещанное.':family?'Обещание связано с его семьёй.':trust>=20?'Обещание дано человеку, которому он доверяет.':'Он ещё хочет довести это дело до конца.';
 return {domain:'quest',id:q.id,importance,urgency,value:importance+urgency,reason,ready,family};
}
export function chooseQuest(s,active,ready,{available=null}={}){
 const h=s.hero,blocked=h.intentions?.balance?.blocked||{},options=active.filter(q=>(available?available(q):!blocked[q.id])&&questChoiceAvailable(s,q)).map(q=>({q,...questMeaning(s,q,ready(q))})).sort((a,b)=>b.value-a.value||tie(s,a.q)-tie(s,b.q)||(String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0));
 const id=h.goal?.quest||h.intentions?.balance?.current?.id,since=h.intentions?.balance?.current&&h.intentions.balance.current.id===id?h.intentions.balance.current.since:h.goal?.started??s.tick;
 return stableAffairChoice(options,{current:id,since,tick:s.tick,locked:h.goal?.quest===id,retainedReason:'Небольшой перевес другого дела не отменяет прежний выбор. Это обещание сохраняет значение.'});
}
export function stableCommitmentDecision(s,previous,q,promise,preparation){
 const next=q&&promise>=preparation?'promise:'+q.id:'prepare';
 if(!enabled(s,'intention-balance')||!previous||previous===next)return next;
 const urgent=q&&Number.isFinite(q.deadline)&&q.deadline-s.tick<=24;
 if(urgent&&next==='promise:'+q.id)return next;
 if(previous==='prepare'&&next!=='prepare'&&promise<preparation+CHOICE_POLICY.margin)return previous;
 if(previous==='promise:'+q?.id&&next==='prepare'&&preparation<promise+CHOICE_POLICY.margin)return previous;
 return next;
}
export function choiceState(h){
 h.intentions ||= {current:null,suspended:null,recent:[],last:null};
 return h.intentions.balance ||= {current:null,paused:{},personal:null,blocked:{},checked:null,last:null};
}
export function adoptQuestPlan(s,q){
 if(!enabled(s,'intention-balance'))return;
 const h=s.hero,state=choiceState(h),saved=state.paused[q.id],g=h.goal;if(!g)return;
 if(saved){
  delete state.paused[q.id];const old=saved.action;
  if(old.kind===g.kind&&old.area===g.area&&old.object===g.object){old.x=g.x;h.goal=old;h.intent=saved.intent;h.reason='Это обещание ещё в силе. Он продолжает с того места, где остановился.';}
 }
 if(state.current?.id!==q.id)state.current={domain:'quest',id:q.id,since:s.tick};
}
export function parkQuestPlan(s){
 const h=s.hero,g=h.goal;if(!g?.quest)return;
 const state=choiceState(h);state.paused[g.quest]={action:g,intent:h.intent,reason:h.reason};
 const keys=Object.keys(state.paused);if(keys.length>CHOICE_POLICY.executors)for(const key of keys.slice(0,keys.length-CHOICE_POLICY.executors))delete state.paused[key];
}
export function parkPersonalPlan(s,cause){
 const h=s.hero,state=choiceState(h);state.personal={cause,action:h.goal,intent:h.intent,reason:h.reason};
}
export function adoptPersonalPlan(s,p){
 if(!enabled(s,'intention-balance'))return;
 const h=s.hero,state=h.intentions?.balance,saved=state?.personal;if(!saved||!h.goal)return;state.personal=null;
 if(saved.cause!==p.cause)return;
 const g=h.goal,old=saved.action;
 if(old.kind===g.kind&&old.area===g.area&&old.object===g.object&&old.job===g.job){old.x=g.x;h.goal=old;h.intent=saved.intent;h.reason='После того отступления он всё ещё хочет лучше подготовиться.';}
}
