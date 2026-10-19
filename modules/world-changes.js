import {DAY_TICKS} from '../calendar-units.js';
import {recordHistoricalBoundary} from './historical-calendar.js';
import {worldNetwork,assessGeography} from './world-change-network.js';
export const ERA_PAUSE=DAY_TICKS;
const domains=new Map([['geography',{capture:worldNetwork,assess:assessGeography}]]),names=new Set(['geography','knowledge','economy','politics']);
// Concrete domain owners register their own canonical network interpretation.
// The invariant registrar never implements their effects, votes, cures or roads.
export function registerEraDomain(name,adapter){if(!names.has(name)||typeof adapter?.capture!=='function'||typeof adapter.assess!=='function')throw Error('Invalid era domain adapter');domains.set(name,adapter);}
const on=s=>s.rules?.['world-eras']!==false;
const key=id=>'cause/'+id;
const clone=x=>JSON.parse(JSON.stringify(x));
export function readWorldEffect(s,ref){
 if(!ref||!['areas','edges','people','society','geographyFrame'].includes(ref.root)||typeof ref.id!=='string'||!Array.isArray(ref.path)||ref.path.length>8||ref.path.some(k=>typeof k!=='string'||['__proto__','prototype','constructor'].includes(k)))return null;
 let v=ref.root==='society'||ref.root==='geographyFrame'?s[ref.root]?.[ref.id]:s[ref.root]?.[ref.id];for(const k of ref.path)v=v?.[k];return v===undefined?{exists:false}:{exists:true,value:clone(v)};
}
export function beginWorldChange(s,{event,domain='geography',oldLimit,effects=[],name,shortName,actors=[]}={}){
 if(!on(s)||!names.has(domain)||typeof event?.id!=='string'||!event.id||event.id.length>300||event.tick!==s.tick||!(s.changes.includes(event)||s.society.events.includes(event))||typeof event.text!=='string'||!event.text||event.text.length>4000||event.area!==undefined&&event.area!==null&&!s.areas[event.area]||typeof oldLimit!=='string'||!oldLimit.trim()||oldLimit.length>400||typeof name!=='string'||!name.trim()||name.length>80||typeof shortName!=='string'||!shortName.trim()||shortName.length>24||!Array.isArray(actors)||actors.some(id=>!s.people[id])||!Array.isArray(effects)||effects.length<1||effects.length>32)return null;
 const present=s.chronology.worldChanges?.causes[key(event.id)];if(present)return present;const refs=effects.map(ref=>({ref:clone(ref),before:readWorldEffect(s,ref)}));if(refs.some(v=>v.before===null)||new Set(refs.map(v=>JSON.stringify(v.ref))).size!==refs.length)return null;
 const adapter=domains.get(domain),q={version:1,id:event.id,domain,causeTick:s.tick,source:clone(event),oldLimit:oldLimit.trim(),name:name.trim(),shortName:shortName.trim(),actors:[...actors],beforeNetwork:adapter?clone(adapter.capture(s)):null,effects:refs,status:'captured',reports:[],newState:null,firstWorld:null,lastSignature:null,period:null};
 const t=s.chronology.worldChanges ||= {version:1,causes:{}};t.causes[key(q.id)]=q;return q;
}
export function finishWorldChange(s,id,{newState}={}){
 const q=s.chronology.worldChanges?.causes[key(id)];if(!q||!on(s)||q.period)return q||null;if(typeof newState!=='string'||!newState.trim()||newState.length>400)return null;
 q.newState=newState.trim();for(const e of q.effects)e.after=readWorldEffect(s,e.ref);return assessWorldChange(s,id);
}
export function assessWorldChange(s,id){
 const q=s.chronology.worldChanges?.causes[key(id)];if(!q||!on(s)||q.period||!q.newState)return q||null;
 const adapter=domains.get(q.domain),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);let assessment=null,status,reason;
 if(q.effects.some(e=>!e.after||!same(readWorldEffect(s,e.ref),e.after))){status='changed-again';reason='Владелец должен подтвердить нынешние последствия, прежний снимок больше не совпадает.';}
 else if(!q.effects.some(e=>!same(e.before,e.after))){status='local';reason='Состоявшегося изменения ограничения нет.';}
 else if(!adapter||!q.beforeNetwork){status='domain-pending';reason='Семантику мировой сети подтверждает владелец этого домена.';}
 else {assessment=adapter.assess(q.beforeNetwork,adapter.capture(s),q);status=assessment.world?'world':'local';reason=assessment.reason;}
 if(status!=='world'){q.firstWorld=null;q.lastSignature=null;}
 else {
  if(q.firstWorld===null||q.lastSignature!==assessment.signature){q.firstWorld=s.tick;q.lastSignature=assessment.signature;}
  const last=s.chronology.periodHistory?.entries.filter(e=>e.kind==='historical').at(-1);
  if(s.tick<=q.firstWorld){status='stability-pending';reason='Нужна следующая действительная оценка сохранившегося мирового результата.';}
  else if(last&&s.tick-last.startTick<ERA_PAUSE){status='cooldown';reason='После прошлого рубежа ещё не прошёл один физический день; часы не запускают новый рубеж.';}
  else if(s.rules['historical-calendar']===false){status='calendar-paused';reason='Запись календаря отключена; последствия мира не применяются повторно.';}
  else {
   const event={id:'world-change/'+q.id,tick:s.tick,area:q.source.area||null,text:q.source.text+' '+q.oldLimit+' → '+q.newState,knownBy:[...(q.source.knownBy||[])],witnesses:[...(q.source.witnesses||[])],worldBoundary:{domain:q.domain,actors:[...q.actors]},worldChange:q.id};
   // This is adjudication of an already realized result. No domain effect here.
   s.changes.push(event);const period=recordHistoricalBoundary(s,{event,name:q.name,shortName:q.shortName});
   if(period){q.period=period.id;q.recordedAt=s.tick;status='recorded';reason='Подтверждён устойчивый мировой результат этой единственной причины.';}else {status='calendar-paused';reason='Запись рубежа сейчас недоступна; мир не получает эффект повторно.';}
  }
 }
 q.status=status;q.reason=reason;q.lastAssessment=s.tick;q.reports.push({at:s.tick,status,reason,...(assessment?{changed:clone(assessment.changed||[])}:{})});if(q.reports.length>4)q.reports.shift();return q;
}
