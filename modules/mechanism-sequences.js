import {physicalDistance} from '../geometry.js';
import {enabled} from '../rules.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcController,npcAction} from './npc-control.js';
import {partyBodySpent,PARTY_PASSIVE_PHASES} from './party-combat-policy.js';
import {marketWallet} from './market.js';
import {literacyOn,literacyCaps} from './literacy-state.js';
import {mechanismMemory} from './mechanism-memory.js';
import {sequenceNote,ensureSequenceNote,learnSequence,sequencesOn,usableSequence,sequenceSignature,SEQUENCE_NAMES} from './sequence-memory.js';
const actor=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
const body=(s,p)=>actor(s,p)||localContact(s,p.id,p.area);
const info=(s,g)=>({node:g.id,key:[g.from,g.to].sort().join('|'),area:g.lever.area,x:g.lever.x,name:'Решётка · '+s.areas[g.lever.area].name});
function spend(s,p,n){const h=actor(s,p);if(h){h.energy-=n;h.lastAction='mechanism';h.goal=null;}else p.needs.energy-=n;mechanismMemory(p).lastActionTick=s.tick;}
function witnessSuccess(s,p,g,order){
 for(const q of Object.values(s.people)){
  if(!q.alive||q.id===p.id||q.needs.sleeping)continue;const b=body(s,q);
  if(!b||b.transit||b.area!==g.lever.area||physicalDistance(s.areas[b.area],b.x,g.lever.x)>12)continue;
  const m=mechanismMemory(q),key=[g.from,g.to].sort().join('|');let note=m.known.find(n=>n.key===key);if(!note){note={key,state:'open',at:s.tick,witness:q.id,leverArea:g.lever.area,understood:true,requiresHold:false};m.known.push(note);if(m.known.length>24)m.known.shift();}else Object.assign(note,{state:'open',at:s.tick,understood:true});
  learnSequence(s,q,{...info(s,g),order,complete:true},{kind:'witnessed-operation',person:p.id,tick:s.tick,id:g.id+'/open/'+s.tick},{verified:true});
 }
}
// Called after the ordinary lever has checked body, position and its one NPC
// controller. Only an actual inspection can read the physical component marks.
export function sequenceOperation(s,p,g,action,ctx){
 const m=mechanismMemory(p);if(m.lastActionTick>=s.tick)return false;
 const n=ensureSequenceNote(s,p,info(s,g));
 if(action==='inspect'){
  if(n.parts.length>=3)return false;const index=n.parts.length,token=g.sequence.marks[index];
  n.parts.push({index,token,tick:s.tick});n.lastStudyTick=s.tick;spend(s,p,1);
  if(n.parts.length===3){const order=n.parts.map(e=>e.token).filter(Boolean);if(order.length)learnSequence(s,p,{...info(s,g),order,complete:order.length===3},{kind:'observed-components',person:p.id,tick:s.tick,id:g.id+'/study/'+p.id});}
  ctx.log?.(s,token?`Изучена часть тяги: ${SEQUENCE_NAMES[token]}. Это ${n.parts.length} из трёх следов устройства.`:'След этой части тяги утрачен. Неизвестность не даёт готового порядка.','choice');return true;
 }
 if(!usableSequence(p,g,s.tick))return false;
 const hint=n.hint,signature=sequenceSignature(hint.order);spend(s,p,2);
 if(signature!==sequenceSignature(g.sequence.order)){
  n.failures.push({tick:s.tick,signature,order:[...hint.order],source:{...hint.source}});n.after=s.tick+8;
  ctx.log?.(s,'Усвоенный порядок не сработал. Эту же подсказку герой не будет повторять; нужны новые сведения, осмотр или другой путь.','choice');return true;
 }
 g.state='open';g.changed=s.tick;g.operations.push({tick:s.tick,person:p.id,state:'open',sequence:[...hint.order]});if(g.operations.length>8)g.operations.shift();s.graphRevision=(s.graphRevision||0)+1;
 const known=m.known.find(e=>e.key===[g.from,g.to].sort().join('|'));if(known)Object.assign(known,{state:'open',at:s.tick,understood:true});
 learnSequence(s,p,{...info(s,g),order:hint.order,complete:true},{kind:'performed-operation',person:p.id,tick:s.tick,id:g.id+'/open/'+s.tick},{verified:true});witnessSuccess(s,p,g,hint.order);
 ctx.log?.(s,'Знакомый порядок сработал: '+hint.order.map(t=>SEQUENCE_NAMES[t]).join(' → ')+'. Решётка открыта одним действием, без нового уровня.','choice');return true;
}
function commonSpeech(s,p,q){if(!literacyOn(s))return true;const a=literacyCaps(s,p,actor(s,p)).spoken,b=literacyCaps(s,q,actor(s,q)).spoken;return a.some(id=>b.includes(id));}
function spokenOrder(q,hint){return q.needs.energy<45?hint.order.slice(0,2):q.agenda.duty<.55?[hint.order[1],hint.order[0],...hint.order.slice(2)]:[...hint.order];}
export function sequenceWitness(s,p,g,person=null){
 const h=actor(s,p),b=body(s,p);if(!p?.alive||!b||b.transit||h?.combat||p.needs.sleeping||(h?.energy??p.needs.energy)<30||(h?.hunger??p.needs.hunger)>=60)return null;
 return Object.values(s.people).find(q=>{
  if(person&&q.id!==person||q.id===p.id||!q.alive||q.needs.sleeping||q.needs.energy<30||q.needs.hunger>=60||q.health<(q.maxHealth||100)*.75||!commonSpeech(s,p,q)||!sequenceNote(q,g.id)?.hint?.complete)return false;
  const hint=sequenceNote(q,g.id).hint,claimID=q.id+'/'+hint.source.id+'/'+sequenceSignature(spokenOrder(q,hint));if(sequenceNote(p,g.id)?.reports.some(e=>e.signature===claimID))return false;
  const pos=body(s,q),owner=npcController(s,q),c=h?.companions.find(c=>c.person===q.id),claim=q.actionControl;
  if(!pos||pos.transit||pos.area!==b.area||physicalDistance(s.areas[b.area],b.x,pos.x)>12||partyBodySpent(s,q)||claim?.tick===s.tick&&claim.phases.some(k=>!PARTY_PASSIVE_PHASES.includes(k)))return false;
  if(owner==='party')return enabled(s,'companions')&&c?.loyalty>=55&&h.memory.people.includes(q.id);
  return owner==='personal'&&!q.agenda.task&&(q.agenda.duty>=.4||(h?.relations[q.id]?.trust??0)>=10)&&marketWallet(s,p.id)>=1;
 })||null;
}
export function askSequenceWitness(s,p,q,key,ctx={}){
 const g=s.edges?.[key]?.mechanism,a=p&&body(s,p),b=q&&body(s,q),hint=q&&g&&sequenceNote(q,g.id)?.hint;
 if(!sequencesOn(s)||!g?.sequence||!a||!b||!p.alive||!hint?.complete||p.needs.sleeping||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>3||mechanismMemory(p).lastActionTick>=s.tick||sequenceWitness(s,p,g,q.id)?.id!==q.id)return false;
 const partial=q.needs.energy<45,order=spokenOrder(q,hint);
 const n=ensureSequenceNote(s,p,info(s,g)),signature=q.id+'/'+hint.source.id+'/'+sequenceSignature(order);if(n.reports.some(e=>e.signature===signature))return false;
 const owner=npcController(s,q),fee=owner==='personal'?1:0;if(!npcAction(s,q,owner,'sequence-advice'))return false;
 if(fee){setActorMoney(s,p,marketWallet(s,p.id)-fee);setActorMoney(s,q,marketWallet(s,q.id)+fee);}spend(s,p,1);q.needs.energy-=1;
 n.reports.push({signature,person:q.id,tick:s.tick,paid:fee,order:[...order],complete:!partial});
 learnSequence(s,p,{...info(s,g),order,complete:!partial},{kind:'heard-witness',person:q.id,tick:s.tick,id:signature});
 ctx.log?.(s,partial?`${q.name} смог вспомнить лишь часть порядка. Это подсказка, не готовый способ открыть дверь.`:`По словам ${q.name}: ${order.map(t=>SEQUENCE_NAMES[t]).join(' → ')}. Это услышанный порядок, который ещё предстоит проверить.`,'choice');return true;
}
export function blockedSequencePlan(s,p,g,ctx){
 const h=actor(s,p),n=sequenceNote(p,g.id);if(!h)return false;
 if(usableSequence(p,g,s.tick)){ctx.goal(s,'mechanism',h.area,g.lever.x,'Применить знакомый порядок','Он уже узнал этот порядок; уровень и название профессии не заменяют знание.',{key:[g.from,g.to].sort().join('|'),operation:'open'});return true;}
 const witness=sequenceWitness(s,p,g);if(witness){ctx.goal(s,'sequenceAdvice',h.area,body(s,witness).x,'Спросить знающего свидетеля','Нужно подойти к живому человеку. Устный совет понятен и неграмотному, но может быть неполным.',{key:[g.from,g.to].sort().join('|'),person:witness.id});return true;}
 if(h.personality.curiosity>=.65&&(n?.parts.length||0)<3){ctx.goal(s,'mechanism',h.area,g.lever.x,'Исследовать части тяги','Три настоящих осмотра могут показать порядок. Ответ не появляется от уровня.',{key:[g.from,g.to].sort().join('|'),operation:'inspect'});return true;}
 h.goal=null;ctx.log?.(s,'Порядок решётки неизвестен или прежняя подсказка не сработала. Герой оставляет попытку и ищет известный обход.','plan');return true;
}
