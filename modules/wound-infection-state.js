import {enabled} from '../rules.js';import {presentParts,boneBody} from './anatomy-state.js';
export const infectionOn=s=>enabled(s,'local-wounds')&&enabled(s,'wound-infection');
const bandaged=w=>Boolean(w.dressing?.remaining>4);
const bounded=(list,e)=>{list.push(e);if(list.length>8)list.shift();};
export const infectionSite=(p,w)=>!boneBody(p)&&w.kind==='cut'&&!w.loss&&presentParts(p).some(([id])=>id===w.part);
export const infectionSeverity=(s,p,w)=>infectionOn(s)&&infectionSite(p,w)&&!w.infection?.ended?w.infection?.severity||0:0;
export const infectionNeedsCare=(s,p,w)=>infectionOn(s)&&infectionSite(p,w)&&!w.infection?.ended&&Boolean(w.infection&&(w.infection.contamination>=6||w.infection.severity===0&&w.infection.contamination>=4||w.infection.severity>0&&!bandaged(w)));
export const infectionPending=w=>Boolean(w.infection&&!w.infection.ended&&(w.infection.severity>0||w.infection.contamination>0));
export function infectionPhase(s,p,w,{load,rest,fed,dressed,changed}={}){
 if(!infectionOn(s))return {drain:0,harm:0,penalty:0};let i=w.infection;
 if(i?.lastTick===s.tick)return {drain:0,harm:0,penalty:infectionSite(p,w)&&!i.ended?i.severity:0};
 if(!infectionSite(p,w)){if(i&&!i.ended){i.ended={at:s.tick,kind:'part-lost',loss:w.loss||null};i.severity=0;i.lastTick=s.tick;i.state='inactive';}return {drain:0,harm:0,penalty:0};}
 const worn=Boolean(w.dressing&&w.dressing.remaining<=4&&w.dressing.age>0),exposure=w.closure<100?(load&&!dressed?2:worn&&!rest?1:0):0;
 if(!i){if(!exposure)return {drain:0,harm:0,penalty:0};i=w.infection={version:1,wound:w.id,created:s.tick,lastTick:s.tick,contamination:0,exposed:0,cleared:0,severity:0,episodes:0,infectedAt:null,recovery:0,restClock:0,fatigue:0,harmClock:0,state:'exposed',history:[],treatments:[]};}
 i.lastTick=s.tick;if(i.ended)return {drain:0,harm:0,penalty:0};const previous=i.severity;
 if(exposure){const amount=Math.min(exposure,24-i.contamination);if(amount){const before=i.contamination;i.contamination+=amount;i.exposed+=amount;bounded(i.history,{at:s.tick,kind:load&&!dressed?'loaded-open':'worn-care',amount,before,after:i.contamination,part:w.part,cause:w.lastCause.id,activity:p.localWounds.activity?.tick??null,dressing:worn?w.dressing.applied:null});}i.recovery=0;i.restClock=0;}
 else if(rest&&fed){i.restClock++;const amount=Math.min(i.contamination,dressed||i.restClock%4===0?1:0);if(amount){const before=i.contamination;i.contamination-=amount;i.cleared+=amount;bounded(i.history,{at:s.tick,kind:'rest',amount,before,after:i.contamination,part:w.part,cause:w.lastCause.id});}}
 if(w.closure<100&&i.contamination>=6&&!i.severity){i.severity=1;i.infectedAt=s.tick;i.episodes++;changed?.(p,w,'infected');}
 if(exposure&&i.severity&&i.severity<3&&i.contamination>=6*(i.severity+1))i.severity++;
 if(i.severity&&i.contamination<6&&rest&&fed){if(++i.recovery>=(dressed?4:8)){i.severity--;i.recovery=0;}}else if(!rest||!fed||i.contamination>=6)i.recovery=0;
 i.state=i.severity?'infected':i.contamination?'exposed':'clear';if(previous&&i.severity!==previous)changed?.(p,w,i.severity?'infection-changed':'infection-resolved');
 if(!i.severity)i.fatigue=0;i.fatigue+=i.severity;const drain=Math.floor(i.fatigue/4);i.fatigue%=4;let harm=0;
 if(i.severity===3){if(++i.harmClock>=8){harm=1;i.harmClock=0;}}else i.harmClock=0;
 return {drain,harm,penalty:i.severity};
}
export function cleanInfection(s,p,w,by,method,material,supply){
 const i=w.infection;if(!infectionOn(s)||!i||i.ended||!infectionSite(p,w))return;
 const amount=Math.min(i.contamination,material==='herbs'?4:8),before=i.contamination;i.contamination-=amount;i.cleared+=amount;i.recovery=0;
 bounded(i.treatments,{at:s.tick,by:by.id,method,material,units:1,before,after:i.contamination,removed:amount,supply});if(amount)bounded(i.history,{at:s.tick,kind:'care',amount,before,after:i.contamination,part:w.part,cause:w.lastCause.id});i.state=i.severity?'infected':i.contamination?'exposed':'clear';
}
export function infectionRiskAllowed(s,p,w,h){const severity=infectionSeverity(s,p,w),q=h?.quests.find(q=>q.id===h.goal?.quest&&q.status==='active');return Boolean(severity>0&&severity<3&&h.personality.courage>=.7&&h.hp>=h.maxHp*.65&&h.energy>=25&&q&&q.deadline>s.tick&&q.deadline-s.tick<=16);}
export function infectionText(w){const i=w.infection;if(!i||i.ended)return '';return i.severity?' · нагноение '+i.severity+'/3'+(i.contamination<6&&bandaged(w)?', обработано — нужен покой':' — нужен очищающий уход'):i.contamination?' · загрязнение '+i.contamination+'/24':'';}
