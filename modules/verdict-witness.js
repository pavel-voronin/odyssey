import {physicalDistance} from '../geometry.js';
import {detailedActors,setActorMoney} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcController,npcAction} from './npc-control.js';
import {verdictKnowledgeOn,recordObject,learnVerdictSource,caseMemory} from './verdict-evidence.js';
// A reader owns a recollection of an actual document, never a query into guilt.
export function caseRecordStudyPlan(s,p){
 if(!verdictKnowledgeOn(s)||p.agenda?.job!=='scholar'||p.needs.energy<35)return false;
 const a=s.areas[p.area],o=a.objects.find(o=>o.sealRecord?.version===1&&!o.destroyed&&o.state!=='burned'&&physicalDistance(a,p.x,o.x)<=18&&!p.caseReports?.some(r=>r.record===o.sealRecord.id));
 if(!o)return false;p.agenda.task={kind:'caseRecordStudy',target:a.id,x:o.x,object:o.id,remaining:1};return true;
}
export function caseRecordStudyAction(s,p){
 const t=p.agenda?.task;if(t?.kind!=='caseRecordStudy')return false;
 if(!verdictKnowledgeOn(s))return false;
 const o=recordObject(s,{area:p.area,object:t.object});
 if(o&&p.alive&&p.area===t.target&&physicalDistance(s.areas[p.area],p.x,o.x)<=1&&p.needs.energy>=1){
  const r=o.sealRecord;p.caseReports ||= [];
  if(!p.caseReports.some(e=>e.record===r.id)){
   p.caseReports.push({case:r.case,record:r.id,object:o.id,area:p.area,eventAt:r.writtenAt,readAt:s.tick,known:{pointsTo:r.pointsTo,name:r.name,suspects:[...r.suspects],names:Object.fromEntries(r.suspects.map(id=>[id,s.people[id]?.name||'другой участник']))}});
   if(p.caseReports.length>8)p.caseReports.shift();p.needs.energy--;
  }
 }
 p.agenda.task=null;p.agenda.due=s.tick+48;return true;
}
function rememberWitness(s,h,p){
 if(!h.alive||h.transit||p.id===h.lineage)return;
  if(!p.caseReports?.length)return;const body=localContact(s,p.id,h.area);
  if(!body||physicalDistance(s.areas[h.area],h.x,body.x)>12)return;
  for(const report of p.caseReports){
   if(!h.verdictMemory?.cases.some(e=>e.case===report.case))continue;
   h.caseWitnesses ||= [];let seen=h.caseWitnesses.find(e=>e.person===p.id&&e.case===report.case);
   if(!seen){seen={case:report.case,person:p.id};h.caseWitnesses.push(seen);}
   Object.assign(seen,{name:p.name,area:h.area,x:body.x,seen:s.tick,record:report.record});
   if(h.caseWitnesses.length>8)h.caseWitnesses.shift();
  }
}
export function observeCaseWitnesses(s){if(verdictKnowledgeOn(s))for(const p of Object.values(s.people))rememberWitness(s,s.hero,p);}
export function announceCaseWitness(s,p){
 // Availability is overheard only in the same physical scene, including unobserved owners.
 if(!verdictKnowledgeOn(s))return;
 for(const h of detailedActors(s))if(h.area===p.area)rememberWitness(s,h,p);
}
export function witnessInterview(s,entry,contact,ctx){
 const h=s.hero;if(!verdictKnowledgeOn(s)||!h.alive||h.transit||h.combat||h.energy<1||h.gold<1||!entry||caseMemory(s,entry.case)!==entry||!contact||contact.case!==entry.case)return false;
 const body=localContact(s,contact.person,h.area),p=body?.person;
 if(!p||h.area!==contact.area||physicalDistance(s.areas[h.area],h.x,body.x)>12||p.health<(p.maxHealth||100)*.75||p.ailment||p.needs?.sleeping||p.needs?.hunger>=65||p.needs?.energy<25||p.agenda?.task||npcController(s,p)!=='personal')return false;
 const report=p.caseReports?.find(e=>e.case===entry.case&&e.record===contact.record);if(!report)return false;
 // A bounded payment receipt survives pruning of the fuller source descriptions.
 if(entry.interviews?.some(e=>e.person===p.id)||(entry.interviews?.length||0)>=8)return false;
 // A friend may be shielded in the retelling. The listener cannot inspect that motive.
 const shield=(p.agenda.bonds[report.known.pointsTo]||0)>=60,claim=shield?report.known.suspects.find(id=>id!==report.known.pointsTo):report.known.pointsTo;
 if(!claim)return false;
 const id=report.record+'/report/'+p.id+'/'+claim;if(entry.sources.some(e=>e.id===id))return false;
 if(!npcAction(s,p,'personal'))return false;
 const name=report.known.names[claim]||'другой участник';
 const source={id,kind:'report',case:entry.case,person:entry.verdict,name:entry.name,reporter:p.id,reporterName:p.name,record:report.record,object:report.object,area:h.area,eventAt:report.eventAt,readAt:report.readAt,learnedAt:s.tick,tick:s.tick,directness:'reported',known:{pointsTo:claim,signatory:name,exonerates:claim===entry.verdict?null:entry.verdict,text:`По словам ${p.name}, в реестре получателем печати назван ${name}.`}};
 if(!learnVerdictSource(s,entry,source))return false;
 (entry.interviews ||= []).push({person:p.id,source:id,paid:1,tick:s.tick});
 h.gold--;h.energy--;setActorMoney(s,p,(p.agenda.wealth||0)+1);p.needs.energy--;h.lastAction='talk';
 ctx.log(s,`${source.known.text} За объяснение уплачена ◈1. Это пересказ; подлинник герой ещё может проверить сам.`,'story');return true;
}
