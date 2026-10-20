import {returnPastOn,returnPastMemory,returnPastNear,oldReturnRecognition} from './return-past-state.js';
import {authorityBody} from './authority-state.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {rootWorld} from '../world-ref.js';
import {actorView} from '../actor-view.js';
import {availableOffers,finishQuest,failQuest} from './quests.js';
import {walkCampOrder} from './camp-route.js';
import {physicalDistance} from '../geometry.js';
import {woundStride} from './wound-state.js';
import {revealArea,revealRoad,recordAreaVisit} from '../actor-atlas.js';
import {activeReturnBond} from './return-bond-state.js';
import {enabled} from '../rules.js';
const seenBodies=new WeakMap();
function returnedPeople(input){const s=rootWorld(input);let c=seenBodies.get(s);if(c?.tick!==s.tick){c={tick:s.tick,list:Object.values(s.people).filter(p=>p.returnEpisode)};seenBodies.set(s,c);}return c.list;}
const willing=p=>p?.alive&&!p.ailment&&!p.needs.sleeping&&p.needs.energy>=25&&p.needs.hunger<65&&p.health>=(p.maxHealth||100)*.5;
function needsConversation(s,p,other){const existing=p.returnEpisode.past?.contacts.some(n=>n.person===other.id);if(!existing)return (p.returnEpisode.past?.contacts.length||0)<16;return !activeReturnBond(p)&&enabled(s,'quests')&&s.actorStates[p.id]?.quests.some(q=>q.kind==='scout'&&q.status==='failed'&&q.giver===other.id&&q.source===other.area&&!q.returnReview&&!q.completed);}
export function settleReturnPast(s){for(const h of Object.values(s.actorStates||{})){const p=s.people[h.lineage];if(p?.alive||!p?.returnEpisode)continue;for(const q of h.quests)if(q.status==='active'&&q.returnReview?.decision==='renewed'){q.status='failed';q.failed=s.tick;q.failure='Вернувшееся тело вновь прекратило деятельность.';}}}
export function reviewReturnPromise(input,p,other,ctx){const s=rootWorld(input),h=s.actorStates?.[p.id];if(!returnPastOn(s)||!enabled(s,'quests')||activeReturnBond(p)||!h||!returnPastNear(s,p,other)||other.returnPastActionTick!==s.tick)return false;const view=actorView(s,h),contact=p.returnEpisode.past?.contacts.find(n=>n.person===other.id);
 const q=h.quests.find(q=>q.kind==='scout'&&q.giver===other.id&&q.source===other.area&&q.status==='failed'&&!q.returnReview&&!q.completed);if(!q)return false;
 const settled=s.areas[q.source].civic?.completedOffers.includes(q.offer),offer=!settled&&availableOffers(view,s.areas[q.source],false,{returnReview:true}).find(n=>n.offer===q.offer&&n.giver===other.id),desire=h.personality.curiosity>=.55&&p.returnEpisode.cohesion>=2;
 const decision=settled?'settled':contact?.stance==='afraid'?'refused':!offer?'changed':!desire?'declined':'renewed';q.returnReview={version:1,body:p.returnEpisode.body,at:s.tick,giver:other.id,decision,previousStatus:q.status,previousFailure:q.failure||null,sourceX:other.x,paidBefore:Boolean(settled),desire};
 if(decision==='renewed'){q.status='active';q.recalledAt=s.tick;revealArea(view,q.target);revealRoad(view,q.source,q.target);ctx.log(view,other.name+' вновь просит проверить прежнюю дорогу и объясняет известный ему выход. '+h.name+' соглашается: старое неудавшееся обещание остаётся в истории, новая награда ещё не получена.','choice');}
 else ctx.log(view,decision==='settled'?'За прежний отчёт уже рассчитались. Второй платы не будет.':decision==='declined'?h.name+' помнит просьбу, но сейчас выбирает другое дело.':'Прежнюю просьбу обсудили, но возобновлять её сейчас нельзя.','choice');return decision==='renewed';
}
export function returnPastMeet(input,p,other,ctx,{inTurn=false}={}){const s=rootWorld(input);if(!returnPastOn(s)||!p?.returnEpisode||!returnPastNear(s,p,other)||!willing(other)||other.returnPastActionTick===s.tick||npcController(s,other)!=='personal')return false;const proof=oldReturnRecognition(s,p,other);if(!proof||!needsConversation(s,p,other))return false;const m=returnPastMemory(p),prior=m.contacts.find(n=>n.person===other.id);
 if(inTurn){if(!canStartNPCActivity(s,other,{inTurn:true}))return false;}else if(!npcAction(s,other,'personal'))return false;
 if(prior){other.returnPastActionTick=s.tick;other.needs.energy--;reviewReturnPromise(s,p,other,ctx);return true;}
 const h=s.actorStates?.[p.id],r=h?.relations[other.id],fear=!other.returnRite&&other.agenda.job==='healer'&&other.agenda.duty>=.65&&other.agenda.curiosity<.35,friendly=!fear&&(proof.kind==='kin'||(r?.trust||0)>=10||(other.agenda.bonds[p.id]||0)>=10),n={person:other.id,at:s.tick,area:other.area,proof,stance:fear?'afraid':friendly?'welcomes':'cautious',gratitude:(r?.helped||0)>0,trust:r?.trust??other.agenda.bonds[p.id]??0,gift:null};
 if(friendly&&marketWallet(s,other.id)>=2){const from=marketWallet(s,other.id),to=marketWallet(s,p.id);setActorMoney(s,other,from-2);setActorMoney(s,p,to+2);n.gift={amount:2,fromBefore:from,fromAfter:from-2,toBefore:to,toAfter:to+2};}
 m.contacts.push(n);other.returnPastActionTick=s.tick;other.needs.energy--;
 if(h){const text=other.name+' узнаёт '+h.name+'. '+(fear?(n.gratitude?'Он благодарен за прежнюю помощь, но боится возвращённого и не принимает его в своей лечебнице.':'Страх сильнее готовности принять его в лечебнице.'):n.gift?'Из собственных денег передаёт две монеты, чтобы помочь продолжить путь.':friendly?'Он рад прежнему близкому, хотя помочь деньгами сейчас не может.':'Он помнит его, но держится осторожно.');ctx.log(actorView(s,h),text,'relationship');reviewReturnPromise(s,p,other,ctx);}return true;
}
export function returnPastHeroAttention(s,ctx){const h=s.hero,p=s.people[h.lineage];if(!returnPastOn(s)||!p.returnEpisode||h.actorMode==='npc'||h.transit||h.combat)return false;const m=p.returnEpisode.past;const other=Object.values(s.people).find(v=>v.id!==p.id&&needsConversation(s,p,v)&&returnPastNear(s,p,v)&&willing(v)&&npcController(s,v)==='personal'&&canStartNPCActivity(s,v)&&oldReturnRecognition(s,p,v));if(!other)return false;if(h.goal?.kind==='returnPastTalk'&&h.goal.person===other.id)return true;ctx.goal(s,'returnPastTalk',other.area,other.x,'Встретить прежнего знакомого','Личная встреча проверит узнавание, старое обещание и готовность помочь.',{person:other.id,remaining:1});return true;}
export function returnPastHeroAction(s,g,ctx){const p=s.people[s.hero.lineage],ok=returnPastMeet(s,p,s.people[g.person],ctx);if(ok){s.hero.energy=Math.max(0,s.hero.energy-1);s.hero.lastAction='talk';}s.hero.goal=null;return ok;}
export function returnPastNPCQuest(s,p,ctx){const h=s.actorStates?.[p.id],q=h?.actorMode==='npc'&&h.quests.find(q=>q.status==='active'&&q.returnReview?.decision==='renewed');if(!returnPastOn(s)||!p.alive||activeReturnBond(p)||!p.returnEpisode||!q||p.needs.energy<25)return false;const r=q.returnReview;if(r.lastAction===s.tick)return true;const target=q.visited?q.source:q.target,view=actorView(s,h);let x=q.visited?r.sourceX:84;const giver=s.people[q.giver];if(q.visited&&giver?.area===p.area&&physicalDistance(s.areas[p.area],p.x,giver.x)<=12)x=giver.x;
 if(p.area!==target||physicalDistance(s.areas[p.area],p.x,x)>2){const walk=walkCampOrder(s,p,target,x,{...ctx,route:()=>ctx.knownRoute(view,p.area,target),speed:()=>6*woundStride(s,p)},r);if(walk==='blocked'){failQuest(view,q,ctx,'Известный путь к прежнему обещанию недоступен.');return false;}p.needs.energy--;r.lastAction=s.tick;return true;}
 r.lastAction=s.tick;h.area=p.area;h.x=p.x;h.energy=p.needs.energy;if(!q.visited){recordAreaVisit(view,p.area);q.visited=true;r.visit={at:s.tick,area:p.area};p.needs.energy--;return true;}
 if(!giver?.alive||!returnPastNear(s,p,giver)){failQuest(view,q,ctx,'В знакомой точке нет живого адресата отчёта.');return false;}
 if(s.areas[q.source].civic.completedOffers.includes(q.offer)){failQuest(view,q,ctx,'Прежнее дело уже оплачено.');return false;}
 finishQuest(view,q,ctx);setActorMoney(s,p,h.gold);r.finished=s.tick;return true;
}
export function returnPastNPCTurn(s,p,ctx){if(!returnPastOn(s))return false;if(returnPastNPCQuest(s,p,ctx))return true;if(!willing(p)||npcController(s,p)!=='personal')return false;const target=returnedPeople(s).find(v=>v.id!==p.id&&v.alive&&needsConversation(s,v,p)&&returnPastNear(s,v,p)&&oldReturnRecognition(s,v,p));return target?returnPastMeet(s,target,p,ctx,{inTurn:true}):false;}
