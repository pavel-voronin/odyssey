import {rootWorld} from '../world-ref.js';
import {localContact} from './npc-contacts.js';
import {physicalDistance} from '../geometry.js';
import {newsOn,rememberNews} from './news-memory.js';
import {relayNews} from './witness-news.js';
import {authorityBody} from './authority-state.js';
import {diplomaticSpeech} from './diplomacy-state.js';
export function publishDiplomacyNews(input,q,phase,actor,patient,status,details={}){
 const s=rootWorld(input),a=localContact(s,actor.id,authorityBody(s,actor.id)?.area),b=localContact(s,patient.id,a?.area);if(!newsOn(s)||!a||!b||actor.id===patient.id||physicalDistance(s.areas[a.area],a.x,b.x)>12||!diplomaticSpeech(s,actor,patient))return null;
 const id='news/diplomacy/'+q.id+'/'+phase,registry=s.newsEvents ||= {version:1,events:{}};if(registry.events[id])return id;
 const targetX=b.x,witnesses=Object.values(s.people).map(p=>({p,b:localContact(s,p.id,a.area)})).filter(({p,b})=>b&&!p.needs.sleeping&&diplomaticSpeech(s,actor,p)&&physicalDistance(s.areas[a.area],b.x,a.x)<=12&&physicalDistance(s.areas[a.area],b.x,targetX)<=12).map(({p})=>p.id).sort((a,b)=>Number([actor.id,patient.id].includes(b))-Number([actor.id,patient.id].includes(a))||a.localeCompare(b)).slice(0,32);
 const fact={id,revision:1,status,occurred:s.tick,area:a.area,actor:{id:actor.id,name:actor.name},patient:{id:patient.id,name:patient.name},source:{kind:'diplomacy-action',id:q.id},diplomacy:{proposal:q.id,phase,from:q.fromState,to:q.toState,fromName:q.fromName,toName:q.toName,...details}};
 registry.events[id]={version:1,id,kind:'diplomacy',source:q.id,phase,versions:{1:{...fact,witnesses}}};for(const person of witnesses)rememberNews(s,s.people[person],{...fact,origin:{person,at:s.tick},heardAt:s.tick,mode:'witness',via:[]});return id;
}
export function relayProposal(s,q,from,to){for(const id of [q.reportNews,q.originNews,q.responseNews,q.implementationNews,...q.support.map(r=>r.news)].filter(Boolean))relayNews(s,from,to,id);}
