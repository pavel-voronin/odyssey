import {moduleRandom,enabled} from '../rules.js';
import {mechanismMemory} from './mechanism-memory.js';
export const SEQUENCE_TOKENS=['counterweight','latch','handle'];
export const SEQUENCE_NAMES={counterweight:'противовес',latch:'стопор',handle:'рукоять'};
export const sequencesOn=s=>enabled(s,'mechanism-sequences')&&enabled(s,'mechanisms');
export const sequenceSignature=order=>order.join('/');
export const validSequence=order=>Array.isArray(order)&&order.length>0&&order.length<=3&&new Set(order).size===order.length&&order.every(v=>SEQUENCE_TOKENS.includes(v));
export function newSequence(s,g){
 const choices=[['counterweight','latch','handle'],['latch','counterweight','handle'],['handle','latch','counterweight']],order=choices[Math.floor(moduleRandom(s,'mechanism-sequences')*choices.length)];
 return {version:1,id:g.id+'/sequence',created:s.tick,order:[...order],marks:[...order]};
}
export const sequenceNote=(p,node)=>p?.mechanisms?.sequences?.[node]||null;
export function ensureSequenceNote(s,p,info){
 const m=mechanismMemory(p);m.sequences ||= {};
 return m.sequences[info.node] ||= {version:1,node:info.node,key:info.key,area:info.area,x:info.x,name:info.name,parts:[],hint:null,failures:[],reports:[],lastStudyTick:-1,after:0};
}
export function learnSequence(s,p,info,source,{verified=false}={}){
 if(!p?.alive||!validSequence(info.order))return false;
 const n=ensureSequenceNote(s,p,info),complete=info.complete!==false&&info.order.length===3,hint=n.hint,sig=sequenceSignature(info.order);
 if(hint?.verified&&!verified)return false;
 if(hint&&sequenceSignature(hint.order)===sig&&hint.complete===complete&&(!verified||hint.verified))return false;
 if(hint?.complete&&!complete&&!n.failures.some(e=>e.signature===sequenceSignature(hint.order)))return false;
 n.hint={order:[...info.order],complete,verified,source:{...source},learnedAt:s.tick};return true;
}
export function usableSequence(p,g,tick){
 const n=sequenceNote(p,g.id),hint=n?.hint;if(!hint?.complete||hint.order.length!==3||n.after>tick)return false;
 return !n.failures.some(e=>e.signature===sequenceSignature(hint.order));
}
