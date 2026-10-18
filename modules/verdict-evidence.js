import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {noticeKnownMisjudgment} from './principles.js';
import {stat} from './common.js';
export const verdictKnowledgeOn=s=>enabled(s,'verdict-knowledge');
export const isRecordedCase=c=>c?.verdictKnowledge?.version===1;
export function bindVerdictEvidence(s,c){
 if(!verdictKnowledgeOn(s)||isRecordedCase(c)||c.kind!=='mystery'||c.status!=='active'||c.started!==s.tick||c.verdict||c.evidence.length||c.clues.some(e=>e.found)||!s.storyCases.includes(c))return;
 const a=s.areas[c.source],clue=c.clues[0],object=clue&&s.areas[clue.area]?.objects.find(o=>o.id===clue.object);
 const reserve=Math.min(24,Math.max(0,a.civic.treasury||0));a.civic.treasury=(a.civic.treasury||0)-reserve;
 c.verdictKnowledge={version:1,created:s.tick,fee:{quoted:24,owner:'civic/'+a.id,reserved:reserve,remaining:reserve,paid:0},basis:object?{area:clue.area,object:object.id,x:object.x}:null};
 for(const ref of c.clues)ref.x=s.areas[ref.area].objects.find(o=>o.id===ref.object)?.x??42;
 if(object)object.sealRecord={version:1,id:c.id+'/sealed-ledger',case:c.id,writtenAt:s.tick,pointsTo:c.culprit,name:s.people[c.culprit].name,suspects:[c.accused,c.other],description:'Подписанный реестр передачи поселковой печати'};
}
export function recordObject(s,ref){const o=ref&&s.areas[ref.area]?.objects.find(o=>o.id===ref.object);return o&&!o.destroyed&&o.state!=='burned'&&o.sealRecord?.version===1?o:null;}
export function caseMemory(s,id){return s.hero.verdictMemory?.cases.find(c=>c.case===id)||null;}
function rememberCase(s,c){
 const h=s.hero,m=h.verdictMemory ||= {cases:[]};let entry=m.cases.find(e=>e.case===c.id);if(entry)return entry;
 const basis=c.verdictKnowledge.basis,clue=basis&&c.clues.find(x=>x.object===basis.object&&x.found);
 entry={case:c.id,area:c.source,verdict:c.verdict,name:s.people[c.verdict].name,eventAt:s.tick,learnedAt:s.tick,status:'unverified',sources:[],trace:clue?{...basis,knownAt:s.tick}:null,attempts:{}};m.cases.push(entry);
 const protectedCase=h.principles?.verifyGuilt?.sources.at(-1)?.case;
 while(m.cases.length>8){const index=m.cases.findIndex(e=>e.case!==protectedCase&&e.case!==h.goal?.case);m.cases.splice(index<0?0:index,1);}return entry;
}
export function closeRecordedVerdict(s,c,ctx,guilty,present){
 const h=s.hero,a=s.areas[c.source],p=s.people[guilty],q=c.verdictKnowledge.fee;
 c.verdictKnowledge.verdictAt=s.tick;rememberCase(s,c);
 const paid=q.remaining;h.gold+=paid;q.remaining=0;q.paid+=paid;q.paidAt=s.tick;
 const text=`Вынесен приговор: ${p.name} ${present?'заключён под стражу':'объявлен в розыск'}. Подлинная запись ещё не проверена; печать не предъявлена. За разбирательство выплачено ◈${paid} из отложенных средств поселения.`;
 c.choices.push({tick:s.tick,text:`Приговор: ${p.name}.`});c.effects.push({tick:s.tick,text:`${p.name} ${present?'заключён под стражу':'объявлен в розыск'}. Истина дела пока не подтверждена.`});s.changes.push({tick:s.tick,text:c.effects.at(-1).text});
 ctx.storyFinish(s,c,ctx,'done',text);
}
export function refundVerdictFee(s,c){
 if(!isRecordedCase(c))return;const q=c.verdictKnowledge.fee,a=s.areas[c.source];if(q.remaining>0&&a?.civic){a.civic.treasury+=q.remaining;q.refunded=(q.refunded||0)+q.remaining;q.remaining=0;q.refundedAt=s.tick;}
}
export function learnVerdictSource(s,entry,source){
 if(!verdictKnowledgeOn(s)||!s.hero.alive||!entry||caseMemory(s,entry.case)!==entry||entry.sources.some(e=>e.id===source.id))return false;
 entry.sources.push(source);if(entry.sources.length>4){const active=s.hero.principles?.verifyGuilt?.sources.at(-1)?.id,index=entry.sources.findIndex(e=>e.id!==active&&e.kind!=='record');entry.sources.splice(index<0?0:index,1);}
 entry.status=source.known.pointsTo===entry.verdict?(source.kind==='record'?'confirmed':'reported-confirmed'):(source.kind==='record'?'rebutted':'reported-error');
 if(source.known.pointsTo!==entry.verdict)noticeKnownMisjudgment(s,source);return true;
}
export function recordReading(s,entry,ctx){
 const h=s.hero,o=recordObject(s,entry?.trace);if(!entry||!o||!h.alive||h.transit||h.combat||stat(h,'wit')<4||h.area!==entry.trace.area||physicalDistance(s.areas[h.area],h.x,o.x)>1||h.energy<1)return false;
 const record=o.sealRecord;if(record.case!==entry.case)return false;
 const source={id:record.id+'/direct',kind:'record',case:entry.case,object:o.id,area:h.area,eventAt:record.writtenAt,learnedAt:s.tick,tick:s.tick,person:entry.verdict,name:entry.name,directness:'direct',known:{pointsTo:record.pointsTo,signatory:record.name,exonerates:record.pointsTo===entry.verdict?null:entry.verdict,text:`В подписанном реестре получатель печати — ${record.name}.`}};
 if(!learnVerdictSource(s,entry,source))return false;
 h.energy--;h.lastAction='think';ctx.log(s,`${source.known.text} ${source.known.exonerates?`Это основание усомниться в прежнем приговоре ${entry.name}.`:'Запись согласуется с вынесенным приговором.'} Старое решение суда от этого само не меняется.`,'story');return true;
}
export function considerKnownVerdicts(s){
 if(!verdictKnowledgeOn(s))return;
 for(const entry of s.hero.verdictMemory?.cases||[])for(const source of entry.sources)if(source.known.exonerates)noticeKnownMisjudgment(s,source);
}
