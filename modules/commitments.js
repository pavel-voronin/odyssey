import {promiseCampWitnesses,rememberCampBrokenPromise} from './camp-topic-memory.js';
import {enabled} from '../rules.js';
import {equipmentPrice} from './prices.js';
import {maySpend,needsIncome} from './finances.js';
import {innerPerspective} from './inner-life.js';
import {valueRevisionBias} from './value-revision.js';
import {questMeaning,stableCommitmentDecision,adoptPersonalPlan} from './intention-choice.js';
import {startCausalHistory,causalDecision,causalOutcome} from './causal-history.js';

export function initializeCommitments(h){h.commitments ||= {memories:[],personal:null,decisions:[],nextPersonalAt:0};}
function remember(s,event){
  const c=s.hero.commitments;
  const memory={id:`memory-${s.generation}-${s.tick}-${c.memories.length}`,tick:s.tick,area:s.hero.area,...event};
  c.memories.push(memory);if(c.memories.length>32){const oldest=c.memories.findIndex(m=>m.id!==c.personal?.cause);c.memories.splice(oldest,1);}return memory;
}
export function rememberPromise(s,q){
  if(!enabled(s,'commitments'))return;
  initializeCommitments(s.hero);
  const memory=remember(s,{kind:'promise',quest:q.id,person:q.giver,cause:q.cause,status:q.status});
  q.memory=memory.id;const witnesses=promiseCampWitnesses(s,q);if(witnesses)q.promiseWitnesses=witnesses;
}
export function rememberRetreat(s,enemy){
  if(!enabled(s,'commitments'))return;
  const h=s.hero;initializeCommitments(h);const c=h.commitments;
  const memory=remember(s,{kind:'retreat',enemy:enemy.id,name:enemy.name,hp:h.hp,cause:`Отступление от ${enemy.name}: прежнего снаряжения не хватило для безопасного боя.`});
  if(h.weapon>=3||c.personal?.status==='active'||c.nextPersonalAt>s.tick)return;
  c.personal={kind:'weapon',status:'active',target:h.weapon+1,since:s.tick,cause:memory.id,decision:null};
  startCausalHistory(s,memory,c.personal);
}
export function commitmentTick(s,ctx){
  if(!enabled(s,'commitments'))return;
  const h=s.hero,c=h.commitments;
  for(const m of c.memories)if(m.kind==='promise'){
    const q=h.quests.find(q=>q.id===m.quest);if(q&&m.status!==q.status){m.status=q.status;m.changed=s.tick;m.outcome=q.failure||q.status;rememberCampBrokenPromise(s,q,m);}
  }
  const p=c.personal;if(p?.status!=='active')return;
  if(h.weapon>=p.target){p.status='done';p.ended=s.tick;c.nextPersonalAt=s.tick+480;causalOutcome(s,p);ctx.log(s,'После прежнего отступления герой добыл более надёжное оружие. Теперь можно вернуться к отложенным делам.','choice');}
  else if(s.tick-p.since>1800){p.status='abandoned';p.ended=s.tick;c.nextPersonalAt=s.tick+720;causalOutcome(s,p);ctx.log(s,'Новое оружие так и осталось намерением. Герой перестаёт откладывать жизнь ради одной покупки.','choice');}
}
export function promiseWeight(s,q,ready=false){
  if(!q)return 0;
  const h=s.hero,trust=h.relations[q.giver]?.trust||0;
  return 10+h.personality.generosity*22+Math.max(-10,Math.min(15,trust*.2))+(q.kind==='rescue'?12:0)+(q.deadline&&q.deadline-s.tick<180?24:0)+(ready?100:0)+valueRevisionBias(s,q);
}
export function commitmentQuestBias(s,q){
  if(!enabled(s,'commitments'))return 0;
  const h=s.hero,p=h.commitments?.personal;
  const trust=h.relations[q.giver]?.trust||0;
  return Math.max(-3,Math.min(5,trust/10))+(p?.status==='active'&&['wolves','relic','rescue'].includes(q.kind)?-(1-h.personality.courage)*10:0)+valueRevisionBias(s,q);
}
function assessPreparation(s,q,ready){
  const h=s.hero,p=h.commitments.personal;
  const importance=10+(1-h.personality.courage)*24+(enabled(s,'psychology')?h.mind.stress*.08:0);
  const assessment=innerPerspective(s,q,enabled(s,'intention-balance')&&q?questMeaning(s,q,ready).value:promiseWeight(s,q,ready),importance);
  const decision=stableCommitmentDecision(s,p.decision,q,assessment.promise,assessment.preparation);
  return {assessment,decision};
}
function recordPreparation(s,q,assessment,decision,ctx){
  const h=s.hero,c=h.commitments,p=c.personal;
  if(p.decision!==decision){
    p.decision=decision;c.decisions.push({tick:s.tick,cause:p.cause,choice:decision,quest:q?.id||null});if(c.decisions.length>24)c.decisions.shift();
    causalDecision(s,p,decision,q);
    const explanation=decision==='prepare'?'Герой помнит недавнее отступление: сначала более надёжное оружие, потом новые опасности.':`Несмотря на отступление, обещание «${q.title||q.kind}» сейчас важнее покупки. ${q.deadline&&q.deadline-s.tick<180?'Времени осталось мало.':'Личное дело подождёт.'}`;
    ctx.log(s,assessment.dialogue?assessment.dialogue+' '+explanation:explanation,'choice');
  }else if(assessment.dialogue)ctx.log(s,assessment.dialogue,'inner');
}
export function deferPreparation(s,q,ready,ctx){
  const h=s.hero,p=h.commitments?.personal;
  if(!enabled(s,'intention-balance')||!enabled(s,'commitments')||p?.status!=='active'||h.goal?.commitment!==p.cause)return false;
  const {assessment,decision}=assessPreparation(s,q,ready);if(decision!=='promise:'+q.id){if(assessment.dialogue)ctx.log(s,assessment.dialogue,'inner');return false;}
  recordPreparation(s,q,assessment,decision,ctx);return true;
}
export function commitmentPlan(s,q,ready,ctx){
  if(!enabled(s,'commitments'))return false;
  const h=s.hero,c=h.commitments,p=c.personal;
  if(p?.status!=='active'||h.weapon>=p.target)return false;
  const {assessment,decision}=assessPreparation(s,q,ready);recordPreparation(s,q,assessment,decision,ctx);
  if(decision!=='prepare')return false;
  const known=h.memory.merchant;
  const price=equipmentPrice(s,'weapon',known&&s.areas[known]?known:h.area);
  if(known&&s.areas[known]&&(h.memory.shopAfter||0)<=s.tick&&maySpend(s,'weapon',price,ctx)&&ctx.route(s,h.area,known).length>0&&ctx.route(s,h.area,known).length<=5){
    ctx.goal(s,'trade',known,58,'Оружие после отступления','Он помнит опасного противника и хочет подготовиться перед возвращением.',{commitment:p.cause});adoptPersonalPlan(s,p);return true;
  }
  if((h.gold<price||needsIncome(s,ctx))&&ctx.work?.()){
    if(h.goal.kind!=='work'){h.goal=null;return false;}
    h.goal.reason='После отступления герой зарабатывает на более надёжное оружие, прежде чем снова рисковать.';h.goal.commitment=p.cause;adoptPersonalPlan(s,p);return true;
  }
  // No invented wage or teleport: ordinary promises and exploration remain available.
  return false;
}
