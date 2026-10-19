import {promiseRemembered} from './recollection-state.js';
import {enabled} from '../rules.js';
import {currentQuest,questReady,abandonQuest} from './quests.js';
import {choiceState,chooseQuest,parkQuestPlan,parkPersonalPlan,CHOICE_POLICY} from './intention-choice.js';
import {deferPreparation} from './commitments.js';
import {partyDemand} from './party-needs.js';
import {areaAvoided} from './route-memory.js';
import {questServiceReason} from './service-access.js';
function signals(s,active){const h=s.hero;return JSON.stringify([h.area,s.graphRevision,h.atlas?.known.length,h.atlas?.roads.length,Object.entries(h.memory.avoided).filter(([,until])=>until>s.tick),Object.keys(h.memory.rejected||{}).map(id=>[id,areaAvoided(s,id)]),active.map(q=>[q.id,q.source,q.target,questReady(s,q)])]);}
export function balanceIntentions(s,ctx){
 if(!enabled(s,'intention-balance')||!enabled(s,'quests'))return;
 const h=s.hero,active=h.quests.filter(q=>q.status==='active'&&promiseRemembered(h,q));if(!active.length&&!h.intentions?.balance)return;
 if(h.combat||h.transit||h.goal?.intention||h.goal?.poisonCare||h.hp<h.maxHp*(.35+(1-h.personality.courage)*.28)||h.energy<23||enabled(s,'body')&&h.hunger>75||partyDemand(s))return;
 const state=choiceState(h),ids=new Set(active.map(q=>q.id));
 const refused=h.personality.generosity<.35&&active.find(q=>(h.relations[q.giver]?.trust||0)<=-40&&!['rescue','medicine'].includes(q.kind)&&!questReady(s,q));
 if(refused){const cargo=h.questCargo?.[refused.id],reason='Он утратил доверие к тому, кому дал обещание, и сознательно отказывается продолжать.'+(cargo?' Взятый груз «'+cargo+'» остаётся у него.':'');abandonQuest(s,refused,ctx,reason,{retainCargo:true});state.last={kind:'refused',tick:s.tick,from:refused.id,to:null,reason};h.lastAction='idle';h.action='РАЗМЫШЛЕНИЕ';h.intent='Отказаться от обещания';h.reason=reason;h.speech='Больше не верю.';return true;}
 for(const id of Object.keys(state.paused))if(!ids.has(id))delete state.paused[id];
 if(state.personal&&(h.commitments?.personal?.status!=='active'||h.commitments.personal.cause!==state.personal.cause))state.personal=null;
 if(!active.length){state.current=null;if(Object.keys(state.blocked).length)state.blocked={};state.checked=null;return;}
 const key=signals(s,active);
 if(state.checked!==key){
  state.checked=key;state.blocked={};
  for(const q of active){const area=questReady(s,q)?q.source:q.target;if(!s.areas[area]||!(ctx.knownRoute||ctx.route)(s,h.area,area).length)state.blocked[q.id]={at:s.tick,reason:'Подходящего знакомого пути пока нет.'};}
 }
 if(!h.goal)return;
 if(h.goal.kind==='routeWait'&&state.last?.kind==='route-blocked'){const selected=chooseQuest(s,active,q=>questReady(s,q));if(selected){state.last={kind:'route-opened',tick:s.tick,from:null,to:selected.id,reason:'Известный путь снова доступен. Прежнее обещание сохраняет смысл.'};h.goal=null;ctx.log(s,`${h.name} теперь знает, как продолжить прежнее дело. Можно вернуться к обещанию.`,'plan');ctx.planQuest(s,selected.q);}return;}
 if(h.goal.commitment){
  const selected=chooseQuest(s,active,q=>questReady(s,q));if(!selected||s.tick-(h.goal.started??s.tick)<CHOICE_POLICY.minimumTicks&&selected.urgency<60)return;
  const cause=h.goal.commitment;if(!deferPreparation(s,selected.q,selected.ready,ctx))return;
  parkPersonalPlan(s,cause);h.goal=null;state.last={kind:'preparation-switch',tick:s.tick,from:'commitment/'+cause,to:selected.id,reason:selected.reason};
  ctx.log(s,`${h.name} откладывает личную подготовку ради «${selected.q.title||selected.q.kind}». ${selected.reason} Со своей подготовкой он пока повременит.`,'plan');ctx.planQuest(s,selected.q);return;
 }
 if(!h.goal.quest)return;
 const actual=active.find(q=>q.id===h.goal.quest),selected=chooseQuest(s,active,q=>questReady(s,q));
 if(selected?.id===actual?.id)return;
 const old=h.goal.quest;parkQuestPlan(s);h.goal=null;
 if(!selected){state.last={kind:'route-blocked',tick:s.tick,from:old,to:null,reason:questServiceReason(s,actual)||state.blocked[old]?.reason||'Прежнее дело уже потеряло смысл.'};ctx.log(s,`${h.name} откладывает прежнее дело: ${state.last.reason} Обещание придётся отложить.`,'plan');return;}
 state.last={kind:'quest-switch',tick:s.tick,from:old,to:selected.id,reason:selected.reason};
 ctx.log(s,`${h.name} пересматривает дела: «${selected.q.title||selected.q.kind}». ${selected.reason} К прежнему делу он ещё рассчитывает вернуться.`,'plan');
 ctx.planQuest(s,currentQuest(h,s)||selected.q);
}
