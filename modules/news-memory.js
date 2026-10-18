import {enabled} from '../rules.js';
export const newsOn=s=>enabled(s,'witness-news');
export const newsMemory=p=>(p.news ||= {version:1,known:{},effects:{},lastExchangeTick:-1});
export function rememberNews(s,p,report){
 if(!newsOn(s)||!p?.alive)return false;const prior=p.news?.known[report.id],credited=p.news?.effects[report.id];
 if(Math.max(prior?.revision||0,credited?.revision||0)>=report.revision)return false;
 const m=newsMemory(p),amount=report.status==='helped'&&![report.actor.id,report.patient.id].includes(p.id)?1:0,delta=amount-(credited?.amount||0);
 let applied=0;if(delta&&enabled(s,'relationships')){p.agenda.bonds ||= {};const before=p.agenda.bonds[report.actor.id]||0;p.agenda.bonds[report.actor.id]=Math.max(-100,Math.min(100,before+delta));applied=p.agenda.bonds[report.actor.id]-before;}
 m.effects[report.id]={actor:report.actor.id,revision:report.revision,amount,applied:(credited?.applied||0)+applied};
 m.known[report.id]=structuredClone(report);const keys=Object.keys(m.known);if(keys.length>24){keys.sort((a,b)=>m.known[a].heardAt-m.known[b].heardAt||a.localeCompare(b));delete m.known[keys[0]];}return true;
}
