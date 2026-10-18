import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {caseMemory,recordObject,verdictKnowledgeOn} from './verdict-evidence.js';
import {localContact} from './npc-contacts.js';
import {npcController,npcAction} from './npc-control.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
export const verdictReviewOn=s=>enabled(s,'verdict-review')&&verdictKnowledgeOn(s)&&enabled(s,'people');
const safe=(s,h)=>h.alive&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.7&&h.energy>=30&&h.hunger<60;
const official=(s,p,area)=>p?.alive&&p.area===area&&p.status==='resident'&&p.agenda?.job==='guard'&&npcController(s,p)==='personal';
const fit=p=>p.health>=(p.maxHealth||100)*.75&&!p.ailment&&!p.needs.sleeping&&p.needs.energy>=30&&p.needs.hunger<60;
const distance=(s,x,y)=>physicalDistance(s.areas[s.hero.area],x,y);
const source=(s,c)=>caseMemory(s,c.id)?.sources.find(e=>e.kind==='record'&&e.known.exonerates===c.verdict&&e.learnedAt>=c.verdictKnowledge.verdictAt);
function available(s,c){return c.kind==='mystery'&&c.status==='done'&&c.owner===s.hero.lineage&&c.verdictKnowledge?.version===1&&source(s,c);}
export function verdictReviewPlan(s,ctx){
 const h=s.hero;if(!verdictReviewOn(s)||h.goal||!safe(s,h)||h.stories.active||h.quests.some(q=>q.status==='active')||h.personality.generosity<.55)return false;
 for(const c of s.storyCases){
  if(!available(s,c)||h.area!==c.source)continue;
  // The local threat and a known hostile official justify leaving the decision.
  if(s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&distance(s,h.x,o.x)<=30))continue;
  const r=c.verdictReview;
  if(r){if(!['checking','ready'].includes(r.status)||s.tick>r.until)continue;ctx.goal(s,'verdictReview',c.source,r.meetingX,'Дождаться пересмотра','Страж сам проверяет подлинный документ. Вынесенный приговор ещё действует.',{reviewCase:c.id});return true;}
  const p=Object.values(s.people).find(p=>![h.lineage,c.accused,c.other].includes(p.id)&&official(s,p,c.source)&&localContact(s,p.id,h.area)&&distance(s,h.x,p.x)<=12&&!p.agenda.task&&fit(p)&&(h.relations[p.id]?.trust??0)>-20);
  if(!p)continue;
  ctx.goal(s,'verdictPetition',c.source,p.x,'Предъявить основание пересмотра','Лично прочитанный подписанный реестр противоречит приговору. Местный страж может сам проверить его.',{reviewCase:c.id,official:p.id});return true;
 }return false;
}
export function verdictReviewAction(s,ctx){
 const h=s.hero,g=h.goal,c=s.storyCases.find(c=>c.id===g?.reviewCase);
 if(!verdictReviewOn(s)||!c||!available(s,c)||!safe(s,h)||h.quests.some(q=>q.status==='active')){h.goal=null;return false;}
 if(h.area!==c.source)return false;
 if(s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&distance(s,h.x,o.x)<=30)){h.goal=null;return false;}
 if(g.kind==='verdictPetition'){
  const p=s.people[g.official],body=localContact(s,g.official,h.area),e=source(s,c);
  if(c.verdictReview||!body||distance(s,h.x,body.x)>3||!official(s,p,c.source)||!fit(p)||p.agenda.task||p.id===c.verdict||e.area!==c.source||(h.relations[p.id]?.trust??0)<=-20||!npcAction(s,p,'personal')){h.goal=null;return false;}
  c.verdictReview={version:1,id:c.id+'/review/1',status:'checking',owner:h.lineage,official:p.id,source:e.id,object:e.object,area:e.area,requested:s.tick,until:s.tick+240,meetingX:p.x,originalVerdict:c.verdict,proof:null,result:null};
  p.agenda.task={kind:'caseReviewRead',target:e.area,x:caseMemory(s,c.id).trace.x,case:c.id,remaining:1,knownNavigation:true};h.energy-=1;p.needs.energy-=1;h.lastAction='talk';h.goal=null;ctx.log(s,`${p.name} принимает основание пересмотра и идёт к самому реестру. Приговор пока сохраняется.`,'story');return true;
 }
 const r=c.verdictReview;if(!r||!['checking','ready'].includes(r.status)){h.goal=null;return false;}
 if(distance(s,h.x,r.meetingX)>3)return false;
 const p=s.people[r.official],body=localContact(s,r.official,h.area);
 if(s.tick>r.until){r.status='unavailable';h.goal=null;ctx.log(s,'Проверка не состоялась в согласованный срок. Прежний приговор не изменён.','story');return false;}
 if(r.status!=='ready'||!body||distance(s,h.x,body.x)>3){h.lastAction='wait';return false;}
 if(!official(s,p,c.source)||!fit(p)||p.agenda.task?.kind!=='caseReviewWait'||!npcAction(s,p,'personal'))return false;
 const victim=s.people[r.originalVerdict],culprit=s.people[r.proof.pointsTo];
 const actionable=victim?.alive&&(victim.status==='imprisoned'&&victim.imprisoned===c.verdictKnowledge.verdictAt||victim.wanted===c.id);
 let released=false;if(actionable){if(victim.status==='imprisoned'){victim.status='resident';released=true;}if(victim.wanted===c.id)delete victim.wanted;}
 // The finding corrects this case, never frees somebody held under another fact.
 const kin=!victim.alive?Object.values(s.people).find(k=>k.alive&&k.area===c.source&&k.status==='resident'&&((victim.parents||[]).includes(k.id)||(k.parents||[]).includes(victim.id))):null;
 const recipient=victim.alive?victim:kin,a=s.areas[c.source],claim=12,paid=recipient?Math.min(claim,Math.max(0,a.civic.treasury)):0;
 if(paid){a.civic.treasury-=paid;setActorMoney(s,recipient,marketWallet(s,recipient.id)+paid);}
 const finding={version:1,case:c.id,official:p.id,tick:s.tick,exonerated:true,detainedAt:victim.imprisoned??null,elapsed:Math.max(0,s.tick-(victim.imprisoned??c.verdictKnowledge.verdictAt)),paid,claim,recipient:recipient?.id??null};
 (victim.courtMemory ||= []).push(finding);
 if(culprit?.alive)culprit.wanted=c.id;
 r.status='done';r.result={tick:s.tick,exonerated:victim.id,pointsTo:r.proof.pointsTo,released,posthumous:!victim.alive,recipient:recipient?.id??null,claim,paid,treasuryBefore:a.civic.treasury+paid,treasuryAfter:a.civic.treasury};
 h.energy-=1;p.needs.energy-=1;p.agenda.task=null;p.agenda.due=s.tick+48;h.goal=null;h.lastAction='talk';
 const text=`Пересмотр: обвинение с ${victim.name} снято${victim.alive?(released?', тот же заключённый освобождён':''):' посмертно'}. Возмещение ◈${paid} из казны${recipient&&recipient!==victim?' получает '+recipient.name:''}. Потраченное время, утраченные запасы и прежняя обида не исчезли.`;
 c.choices.push({tick:s.tick,text});c.effects.push({tick:s.tick,text});s.changes.push({tick:s.tick,text});ctx.log(s,text,'story');return true;
}
// Called only in the official's ordinary personal turn, after real movement.
export function verdictReviewNPCAction(s,p){
 const t=p.agenda.task;if(!['caseReviewRead','caseReviewReturn','caseReviewWait'].includes(t?.kind))return false;
 if(!verdictReviewOn(s))return true;
 const c=s.storyCases.find(c=>c.id===t.case),r=c?.verdictReview;
 if(!r||r.official!==p.id||!['checking','ready'].includes(r.status)||s.tick>r.until||!official(s,p,c.source)||!fit(p)){if(r&&['checking','ready'].includes(r.status))r.status='unavailable';p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
 if(t.kind==='caseReviewRead'){
  const o=recordObject(s,{area:p.area,object:r.object}),record=o?.sealRecord;
  if(!record||record.case!==c.id||physicalDistance(s.areas[p.area],p.x,o.x)>1||record.pointsTo===r.originalVerdict||!s.people[record.pointsTo]){r.status='unavailable';p.agenda.task=null;p.agenda.due=s.tick+48;return true;}
  r.proof={record:record.id,object:o.id,area:p.area,readAt:s.tick,reader:p.id,pointsTo:record.pointsTo};p.needs.energy-=1;p.agenda.task={kind:'caseReviewReturn',target:c.source,x:r.meetingX,case:c.id,remaining:1,knownNavigation:true};return true;
 }
 if(t.kind==='caseReviewReturn'){r.status='ready';p.agenda.task={kind:'caseReviewWait',target:c.source,x:r.meetingX,case:c.id,remaining:1};}return true;
}
