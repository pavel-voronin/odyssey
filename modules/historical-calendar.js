import {DAY_TICKS,DAYS_PER_YEAR} from '../calendar-units.js';
const tickOf=n=>Math.max(0,Math.floor(Number.isFinite(n)?n:0));
const baseYear=s=>Number.isFinite(s.chronology?.year)?Math.floor(s.chronology.year):743;
export function initializeHistoricalCalendar(s){
 if(s.rules?.['historical-calendar']===false||s.chronology.periodHistory)return;
 // A first observation of an old count is not a fabricated catastrophe at tick0.
 const id=`period/${s.seed}/0`;s.chronology.periodHistory={version:1,serial:0,entries:[{id,kind:'legacy',startTick:0,knownStart:false,firstYear:baseYear(s),name:'Прежний счёт',shortName:'Прежний счёт',reason:'Основание прежнего летосчисления не записано.',previous:null,cause:null}]};
}
export function periodAt(s,tick=s.tick){
 const entries=s.chronology?.periodHistory?.entries;if(!entries?.length)return null;const t=tickOf(tick);let lo=0,hi=entries.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(entries[mid].startTick<=t)lo=mid;else hi=mid-1;}return entries[lo];
}
export function historicalDate(s,tick=s.tick){
 const t=tickOf(tick),p=periodAt(s,t),civilDays=Math.floor(t/DAY_TICKS)-Math.floor((p?.startTick||0)/DAY_TICKS),year=(p?.firstYear??baseYear(s))+Math.floor(civilDays/DAYS_PER_YEAR);
 return {periodId:p?.id||null,periodName:p?.name||'Основание счёта не записано',periodShort:p?.shortName||'',periodKind:p?.kind||'unrecorded',periodStartTick:p?.knownStart?p.startTick:null,civilYear:year,civilDay:civilDays+1,civilDayOfYear:civilDays%DAYS_PER_YEAR+1};
}
// The later world-change registrar supplies one adjudicated canonical event.
// This calendar layer never declares a local success to be a global era itself.
export function recordHistoricalBoundary(s,{event,name,shortName}={}){
 const old=s.chronology?.periodHistory?.entries.find(p=>p.cause?.id===event?.id);if(old)return old;
 if(shortName===undefined)shortName=typeof name==='string'?[...name].slice(0,18).join(''):'';
 const boundary=event?.worldBoundary;if(s.rules?.['historical-calendar']===false||!s.chronology||!event||!boundary||event.tick!==s.tick||!(s.changes?.includes(event)||s.society?.events?.includes(event))||typeof event.id!=='string'||!event.id||typeof event.text!=='string'||typeof name!=='string'||!name.trim()||name.length>80||typeof shortName!=='string'||!shortName.trim()||shortName.length>24||typeof boundary.domain!=='string'||!boundary.domain||!Array.isArray(boundary.actors)||boundary.actors.some(id=>!s.people[id])||event.knownBy!==undefined&&!Array.isArray(event.knownBy)||event.witnesses!==undefined&&!Array.isArray(event.witnesses)||event.area&&!s.areas[event.area])return null;
 const existing=s.chronology.periodHistory;if(existing&&existing.entries.at(-1).startTick>=s.tick)return null;
 initializeHistoricalCalendar(s);const h=s.chronology.periodHistory;if(h.entries.at(-1).startTick>=s.tick)return null;
 const previous=h.entries.at(-1),serial=h.serial+1,id=`period/${s.seed}/${serial}`,p={id,kind:'historical',startTick:s.tick,knownStart:true,firstYear:1,name:name.trim(),shortName:shortName.trim(),reason:event.text,previous:previous.id,cause:{id:event.id,tick:event.tick,area:event.area||null,domain:boundary.domain,actors:[...boundary.actors],text:event.text,knownBy:[...(event.knownBy||[])],witnesses:[...(event.witnesses||[])]}};
 h.entries.push(p);h.serial=serial;return p;
}
