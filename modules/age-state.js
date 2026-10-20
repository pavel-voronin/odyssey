import {DAY_TICKS,YEAR_TICKS} from '../calendar-units.js';

// Fictional species calendar: maturity, old age, terminal age (world years).
export const AGE_LIMITS=Object.freeze({human:[18,65,95],elf:[45,240,360],dwarf:[30,150,220],goblin:[16,45,65],orc:[18,55,80],halfling:[22,90,130],fae:[25,180,280],dragonkin:[20,110,170],automaton:[3,180,300],myconid:[8,60,100],revenant:[24,100,160],gnome:[25,120,180]});
const ranges={human:28,elf:76,dwarf:51,goblin:20,orc:23,halfling:34,fae:76,dragonkin:36,automaton:28,myconid:23,revenant:47,gnome:46};
export function ageLimits(p){return AGE_LIMITS[p?.race]||AGE_LIMITS.human;}
export function initialAdultAge(s,p){let n=s.seed>>>0;for(const c of `adult:${p.id}:${s.tick}`)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return ageLimits(p)[0]+n%(ranges[p.race]||28);}
export function personAgeAt(p,tick){if(!p?.ageOrigin)return null;return p.ageOrigin.years+Math.floor(Math.max(0,(p.alive?tick:p.died??p.ageOrigin.at)-p.ageOrigin.at)/YEAR_TICKS);}
export function adultPerson(s,p){const age=personAgeAt(p,s.tick);return age===null?p?.role!=='ребёнок':age>=ageLimits(p)[0];}
// Only actual constructors call this. Unknown dates in an existing save stay unknown.
export function initializePersonAge(s,p,{years=null}={}){if(!p.alive||p.ageOrigin)return;const child=p.role==='ребёнок';p.ageOrigin={at:s.tick,years:child?0:years??initialAdultAge(s,p)};p.ageSource=child?'birth':s.tick===0?'initial-cohort':'adult-arrival';if(child)p.birth={at:s.tick,area:p.area,parents:[...p.parents]};}
export function canBearChild(s,p,area){return Boolean(p?.alive&&!p.returnEpisode&&p.area===area&&p.status==='resident'&&Number.isFinite(personAgeAt(p,s.tick))&&adultPerson(s,p)&&personAgeAt(p,s.tick)<ageLimits(p)[1]&&(p.health||0)>50&&(p.needs?.hunger??0)<65&&(p.needs?.energy??100)>=24&&!p.roadTransit&&!p.needs?.sleeping&&(!Number.isSafeInteger(p.lastBirth)||s.tick-p.lastBirth>=YEAR_TICKS));}
// One current dose, never elapsed years on restore. Terminal wear takes at least
// 100 actual daily doses; a prepared old date alone cannot kill a body.
export function ageDose(s,p){if(!p?.alive||p.returnEpisode||!p.ageOrigin)return null;const age=personAgeAt(p,s.tick),[mature,old,terminal]=ageLimits(p);let grown=false;if(p.role==='ребёнок'&&age>=mature){p.role='житель';p.maturedAt=s.tick;if(p.agenda){p.agenda.job='laborer';p.agenda.task=null;}grown=true;}
 const q=p.ageWear;if(s.tick%DAY_TICKS!==0||age<old||q?.tick===s.tick)return grown?{grown,loss:q?.loss||0}:null;
 const next=p.ageWear ||= {since:s.tick,tick:s.tick,loss:0,doses:0};next.tick=s.tick;next.doses++;if(age>=terminal||s.tick%YEAR_TICKS===0)next.loss=Math.min(100,next.loss+1);return {grown,loss:next.loss};}
