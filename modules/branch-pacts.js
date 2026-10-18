import {factionRelation} from './diplomacy.js';
import {branchPactsOn} from './branch-pact-state.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {npcController,canStartNPCActivity,npcAction} from './npc-control.js';
import {relayNews} from './witness-news.js';
const body=(s,id,area)=>localContact(s,id,area);
const ready=p=>p?.alive&&!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<65&&!p.agenda.task;
export function bindBranchPact(s,ctx){
 const h=s.hero,g=h.goal,a=s.areas[h.area],path=h.affiliation.paths[g?.faction];
 if(!branchPactsOn(s)||h.branchPact||g?.kind!=='factionDuty'||g.area!==h.area||h.affiliation.primary!=='crown'||g.faction!=='crown'||factionRelation(s,'crown','tide')>=0||path?.branch!=='marshal'||a.faction!=='crown'||physicalDistance(a,h.x,42)>12)return false;
 const leader=Object.values(s.people).filter(p=>p.id!==h.lineage&&ready(p)&&npcController(s,p)==='personal'&&(p.role==='страж'||p.agenda.job==='guard')&&body(s,p.id,a.id)&&physicalDistance(a,h.x,body(s,p.id,a.id).x)<=12&&canStartNPCActivity(s,p)).sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(!leader||!npcAction(s,leader,'personal'))return false;
 h.branchPact={version:1,id:`branch-pact/${h.lineage}/${s.tick}`,member:h.lineage,faction:'crown',branch:'marshal',against:'tide',area:a.id,leader:leader.id,issued:s.tick,cases:{},after:0};
 ctx?.log?.(s,`${leader.name} принимает служебное слово: не помогать семьям Морского союза без согласования. Это условие здешней маршальской службы.`,'choice');return true;
}
function review(s,leader,ctx,request=null){
 for(const h of Object.values(s.actorStates||{})){
  const b=h.branchPact;if(!b||b.leader!==leader.id)continue;
  for(const c of Object.values(b.cases)){
   const together=!s.people[b.member].needs.sleeping&&body(s,b.member,b.area)&&body(s,leader.id,b.area)&&physicalDistance(s.areas[b.area],body(s,b.member,b.area).x,body(s,leader.id,b.area).x)<=12;
   if(!request&&c.review&&c.notified===null&&together){c.notified=s.tick;ctx?.log?.(s,leader.name+': решение о здешней службе теперь передано лично. Можно обсудить исключение или отказаться.','choice');return true;}
   const r=leader.news?.known['news/aid/'+c.request];
   if(request&&c.request!==request||c.review||c.choice!=='help'||c.performed===null||r?.status!=='helped'||r.actor.id!==b.member||r.patient.id!==c.patient||r.area!==c.area)continue;
   c.heard=r.heardAt;c.reviewed=s.tick;c.blocked=leader.agenda.duty>=.65;c.review=c.blocked?'suspended':'explain';
   leader.agenda.bonds[b.member]=Math.max(-100,(leader.agenda.bonds[b.member]||0)-(c.blocked?2:1));
   if(together)c.notified=s.tick;if(together||s.hero.lineage===leader.id){ctx?.log?.(s,`${leader.name} узнал о помощи семье противника: ${c.blocked?'доступ к его службе приостановлен, можно объясниться':'просит объяснить поступок, не объявляя войны'}.`,'choice');}return true;
  }
 }
 return false;
}
export function pactLeaderTurn(s,p,ctx){if(!branchPactsOn(s)||!ready(p))return false;return review(s,p,ctx);}
export function pactTalkPlan(s,ctx){
 const h=s.hero,b=h.branchPact;if(!branchPactsOn(s)||!b||h.goal||h.area!==b.area||h.combat||h.transit||h.energy<30||h.hunger>=65||b.after>s.tick)return false;
 const leader=s.people[b.leader],at=ready(leader)&&body(s,leader.id,h.area);if(!at||physicalDistance(s.areas[h.area],h.x,at.x)>12)return false;
 const c=Object.values(b.cases).find(c=>c.choice==='help'&&c.performed!==null&&!c.answer&&(c.notified!==null||h.personality.generosity>=.65));if(!c)return false;
 ctx.goal(s,'pactTalk',h.area,at.x,'Объясниться с руководителем своей ветви','Личная благодарность семьи не отменяет служебного слова. Возможен разговор или отказ, без войны.',{request:c.request,remaining:1});return true;
}
export function pactTalkAction(s,ctx){
 const h=s.hero,b=h.branchPact,c=b?.cases[h.goal?.request],leader=s.people[b?.leader],at=leader&&body(s,leader.id,h.area);
 if(!branchPactsOn(s)){h.lastAction='wait';return false;}
 if(!c||c.answer||h.area!==b.area||!at||!ready(leader)||physicalDistance(s.areas[h.area],h.x,at.x)>12){h.goal=null;return false;}
 if(!canStartNPCActivity(s,leader)||!npcAction(s,leader,'personal')){h.lastAction='wait';return false;}
 relayNews(s,s.people[h.lineage],leader,'news/aid/'+c.request);review(s,leader,ctx,c.request);
 if(!c.review){h.goal=null;b.after=s.tick+32;return false;}
 c.notified=s.tick;
 if(h.personality.generosity>=.75&&leader.agenda.curiosity>=.45){c.answer='negotiated';c.blocked=false;ctx.log(s,`${leader.name} принимает объяснение: для этой семьи согласовано исключение. Личная помощь не меняет отношения государств.`,'choice');}
 else if(h.personality.curiosity<.45){c.answer='accepted';ctx.log(s,'Он принимает решение руководителя и продолжает другие дела. Война не начинается.','choice');}
 else {c.answer='refused';ctx.log(s,'Он отказывается оправдывать помощь семье. Ограничение здешней службы остаётся; обязательной войны нет.','choice');}
 h.energy=Math.max(0,h.energy-2);h.lastAction='talk';h.goal=null;b.after=s.tick+96;return true;
}
