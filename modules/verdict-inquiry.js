import {heroLevel} from './progression-state.js';
import {knownArea} from '../actor-atlas.js';
import {stat} from './common.js';
import {caseMemory,verdictKnowledgeOn,recordReading,considerKnownVerdicts} from './verdict-evidence.js';
import {observeCaseWitnesses,witnessInterview} from './verdict-witness.js';
function reachable(s,ref,ctx){
 if(!ref||!knownArea(s,ref.area))return false;
 const path=ctx.knownRoute(s,s.hero.area,ref.area);
 // Known topography and remembered hazards guide a plan; unseen source state does not.
 return path.length>0&&path.length<=4&&path.every(id=>(s.areas[id].danger||0)<=Math.max(2,heroLevel(s.hero)*.65)&&!(s.hero.memory.threats&&Object.values(s.hero.memory.threats).some(t=>t.area===id&&t.alive)))&&s.hero.energy>=30+path.length*5;
}
export function verdictInquiryPlan(s,ctx){
 const h=s.hero;if(!verdictKnowledgeOn(s)||!h.alive||h.goal||h.combat||h.transit)return false;
 considerKnownVerdicts(s);observeCaseWitnesses(s);
 if(h.personality.curiosity<.65||h.hp<h.maxHp*.8||h.energy<45)return false;
 for(const entry of h.verdictMemory?.cases||[]){
  if(entry.sources.some(e=>e.kind==='record'))continue;
  if(stat(h,'wit')>=4&&entry.trace&&!entry.attempts.record&&reachable(s,entry.trace,ctx)){
   ctx.goal(s,'verdictRecord',entry.trace.area,entry.trace.x,'Вернуться к подписанному реестру','Вынести приговор и убедиться в его основании — разные вещи.',{case:entry.case});return true;
  }
  if(h.gold<1||entry.sources.some(e=>e.kind==='report'))continue;
  // A retry period coprime to the eight-tick NPC cadence avoids repeatedly asking on its occupied turn.
  const contact=h.caseWitnesses?.find(c=>c.case===entry.case&&(!entry.attempts[c.person]||entry.attempts[c.person].seen!==c.seen&&s.tick-entry.attempts[c.person].tick>=73)&&reachable(s,c,ctx));
  if(contact){ctx.goal(s,'verdictWitness',contact.area,contact.x,'Расспросить читавшего реестр','Он встречал этого свидетеля здесь. Объяснение стоит одну монету; адрес мог устареть.',{case:entry.case,person:contact.person,seen:contact.seen});return true;}
 }
 return false;
}
export function verdictInquiryAction(s,ctx){
 const h=s.hero,g=h.goal;if(!['verdictRecord','verdictWitness'].includes(g?.kind))return false;
 const entry=caseMemory(s,g.case);if(!verdictKnowledgeOn(s)||!entry){h.goal=null;return false;}
 let success=false;
 if(g.kind==='verdictRecord'){success=recordReading(s,entry,ctx);entry.attempts.record={tick:s.tick,read:success};}
 else{
  const contact=h.caseWitnesses?.find(e=>e.case===entry.case&&e.person===g.person&&e.seen===g.seen);
  success=witnessInterview(s,entry,contact,ctx);entry.attempts[g.person]={seen:g.seen,tick:s.tick};
 }
 if(!success)ctx.log(s,'Проверить прежний приговор сейчас не удалось. Незнание не доказывает ни вину, ни невиновность.','thought');
 h.goal=null;return success;
}
