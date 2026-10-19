import {migrationKnowledgeOn} from './migration-memory.js';
import {exchangeMigrationNotes} from './migration-contact.js';
import {rootWorld} from '../world-ref.js';
import {selfDrivenActor} from '../actor-projection.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {literacyOn,literacyCaps} from './literacy-state.js';
import {newsOn,newsMemory,rememberNews} from './news-memory.js';
const actor=(s,p)=>selfDrivenActor(s,p?.id)?s.actorStates[p.id]:null;
function available(s,p){const h=actor(s,p);return p?.alive&&!p.needs.sleeping&&!h?.combat&&!h?.transit&&!p.liftTransit&&!p.fordCrossing;}
function commonSpeech(s,p,q){return !literacyOn(s)||literacyCaps(s,p,actor(s,p)).spoken.some(lang=>literacyCaps(s,q,actor(s,q)).spoken.includes(lang));}
export function publishAidNews(input,patient){
 const s=rootWorld(input),h=input.hero,r=patient?.aidRequest,a=s.areas[h.area],body=patient&&localContact(s,patient.id,h.area),status=r?.status;
 if(!newsOn(s)||!patient?.alive||!h.alive||r?.to!==h.lineage||!['agreed','helped'].includes(status)||(status==='agreed'?r.answered:r.finished)!==s.tick||!body||physicalDistance(a,h.x,body.x)>12)return false;
 const id='news/aid/'+r.id,revision=status==='helped'?2:1,registry=s.newsEvents ||= {version:1,events:{}},event=registry.events[id] ||= {version:1,id,kind:'aid',source:r.id,versions:{}};
 if(event.versions[revision])return false;
 const witnesses=Object.values(s.people).filter(p=>{const b=available(s,p)&&localContact(s,p.id,a.id);return b&&physicalDistance(a,b.x,h.x)<=12&&physicalDistance(a,b.x,body.x)<=12;}).sort((a,b)=>Number([h.lineage,patient.id].includes(b.id))-Number([h.lineage,patient.id].includes(a.id))||a.id.localeCompare(b.id)).slice(0,32);
 const fact={id,revision,status,occurred:s.tick,area:a.id,actor:{id:h.lineage,name:h.name},patient:{id:patient.id,name:patient.name},source:{kind:'aid-action',id:r.id}};event.versions[revision]={...fact,witnesses:witnesses.map(p=>p.id)};
 for(const p of witnesses){
  rememberNews(s,p,{...fact,origin:{person:p.id,at:s.tick},heardAt:s.tick,mode:'witness',via:[]});
 }
 return true;
}
// A physical speaker shares a retained version, never the world's latest event.
export function relayNews(s,from,to,id){
 const report=from?.news?.known[id],a=from&&localContact(s,from.id,actor(s,from)?.area||from.area),b=to&&localContact(s,to.id,a?.area);
 if(!newsOn(s)||!report||from.id===to?.id||!available(s,from)||!available(s,to)||!a||!b||physicalDistance(s.areas[a.area],a.x,b.x)>12||!commonSpeech(s,from,to)||report.via.length>=6||report.via.some(e=>e.to===to.id))return false;
 return rememberNews(s,to,{...report,heardAt:s.tick,mode:'reported',via:[...report.via,{from:from.id,to:to.id,area:a.area,tick:s.tick}]});
}
export function carrierNewsContact(s,p,ctx={}){
 if(!newsOn(s)||!s.newsEvents&&!migrationKnowledgeOn(s)||!available(s,p)||p.news?.lastExchangeTick===s.tick||!s.logistics.convoys.some(c=>c.person===p.id&&c.movement==='physical')||!localContact(s,p.id,p.area))return false;
 const locals=Object.values(s.people).filter(q=>q.id!==p.id&&available(s,q)).map(q=>({q,b:localContact(s,q.id,p.area)})).filter(({b})=>b&&physicalDistance(s.areas[p.area],p.x,b.x)<=12).sort((a,b)=>Math.abs(p.x-a.b.x)-Math.abs(p.x-b.b.x)||a.q.id.localeCompare(b.q.id));
 for(const {q}of locals){const placeChanged=exchangeMigrationNotes(s,p,q);let learned=false,told=false;
  for(const r of Object.values(q.news?.known||{}).sort((a,b)=>b.revision-a.revision||b.occurred-a.occurred))if(relayNews(s,q,p,r.id)){learned=true;break;}
  for(const r of Object.values(p.news?.known||{}).sort((a,b)=>b.revision-a.revision||b.occurred-a.occurred))if(relayNews(s,p,q,r.id)){told=true;break;}
  if(learned||told||placeChanged){newsMemory(p).lastExchangeTick=s.tick;const h=s.hero;if(q.id===h.lineage||p.id===h.lineage)ctx.log?.(s,placeChanged&&!learned&&!told?`${p.name} и ${q.name} обмениваются датированными сведениями о знакомом поселении.`:told&&q.id===h.lineage?`${p.name} передаёт датированный рассказ о поступке. Сведения получены со слов перевозчика.`:`${q.name} делится известным рассказом с перевозчиком ${p.name}.`,'talk');return true;}
 }
 return false;
}

// A real local housing decision is retained and relayed by the same physical speakers.
export function publishHousingNews(s,a,r){
 if(!newsOn(s)||r.tick!==s.tick||!['help','lease','refused','claim'].includes(r.mode))return false;
 const host=s.people[r.host],guest=s.people[r.guest],h=available(s,host)&&localContact(s,host.id,a.id),g=available(s,guest)&&localContact(s,guest.id,a.id);if(!h||!g||physicalDistance(a,h.x,g.x)>12)return false;
 const id='news/housing/'+r.id,registry=s.newsEvents ||= {version:1,events:{}};if(registry.events[id])return false;
 const witnesses=Object.values(s.people).filter(p=>{const b=available(s,p)&&localContact(s,p.id,a.id);return b&&physicalDistance(a,b.x,h.x)<=12&&physicalDistance(a,b.x,g.x)<=12;}).sort((x,y)=>Number([host.id,guest.id].includes(y.id))-Number([host.id,guest.id].includes(x.id))||x.id.localeCompare(y.id)).slice(0,32);
 const fact={id,revision:1,status:r.mode==='help'?'helped':r.mode==='lease'?'agreed':'refused',occurred:s.tick,area:a.id,actor:{id:host.id,name:host.name},patient:{id:guest.id,name:guest.name},source:{kind:'housing-action',id:r.id},housing:{mode:r.mode,reason:r.reason,paid:r.paid,form:r.form}};
 registry.events[id]={version:1,id,kind:'housing',source:r.id,versions:{1:{...fact,witnesses:witnesses.map(p=>p.id)}}};for(const p of witnesses)rememberNews(s,p,{...fact,origin:{person:p.id,at:s.tick},heardAt:s.tick,mode:'witness',via:[]});return true;
}
