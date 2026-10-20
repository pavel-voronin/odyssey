import {validateClinicalNews} from './clinical-news.js';
import {validateAdministrationNews} from './administration-news.js';
import {validateRoleNews} from './service-masks.js';
import {validateCargoNews} from './cargo-news.js';
import {validateDiplomacyNews} from './diplomacy-news-schema.js';
export function validateNews(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,registry=s.newsEvents;
 if(registry!==undefined){
  if(registry?.version!==1||!registry.events||typeof registry.events!=='object'||Array.isArray(registry.events))fail('newsEvents');
  for(const [id,e]of Object.entries(registry.events)){
   if(e?.kind==='role'){validateRoleNews(s,fail,id,e);continue;}
   if(e?.kind==='cargo'){validateCargoNews(s,fail,id,e);continue;}
   if(e?.kind==='diplomacy'){validateDiplomacyNews(s,fail,id,e);continue;}
   if(e?.kind==='clinical'){validateClinicalNews(s,fail,id,e);continue;}
   if(e?.kind==='administration'){validateAdministrationNews(s,fail,id,e);continue;}
   const housing=e?.kind==='housing';
   if(e?.version!==1||e.id!==id||id!==(housing?'news/housing/':'news/aid/')+e.source||!['aid','housing'].includes(e.kind)||!e.versions||!Object.keys(e.versions).length||Object.keys(e.versions).some(k=>!(housing?['1']:['1','2']).includes(k)))fail('newsEvents.event');
   for(const [revision,f]of Object.entries(e.versions)){
    if(f?.id!==id||f.revision!==Number(revision)||!tick(f.occurred)||!s.areas[f.area]||!s.people[f.actor?.id]||!s.people[f.patient?.id]||f.actor.id===f.patient.id||typeof f.actor.name!=='string'||typeof f.patient.name!=='string'||f.source?.kind!==(housing?'housing-action':'aid-action')||f.source.id!==e.source||!Array.isArray(f.witnesses)||f.witnesses.length>32||new Set(f.witnesses).size!==f.witnesses.length||f.witnesses.some(id=>!s.people[id]))fail('newsEvents.fact');
    if(housing){const h=f.housing;if(!h||!['help','lease','refused','claim'].includes(h.mode)||!['direct','formal'].includes(h.form)||!['space','capacity','closed','poor','word'].includes(h.reason)||h.paid!==(h.mode==='lease'?2:0)||f.status!==(h.mode==='help'?'helped':h.mode==='lease'?'agreed':'refused')||!e.source.startsWith(f.area+'/settlement/')||!e.source.includes('/housing/')||!s.areas[f.area].foundedSettlement?.founders.includes(f.actor.id))fail('newsEvents.housing');}
    else if(f.housing!==undefined||f.status!==(f.revision===1?'agreed':'helped')||!e.source.startsWith(f.patient.id+'/aid/'))fail('newsEvents.aid');
   }
   const a=e.versions[1],b=e.versions[2];if(a&&b&&(b.occurred<a.occurred||a.actor.id!==b.actor.id||a.patient.id!==b.patient.id||a.area!==b.area))fail('newsEvents.revision');
  }
 }
 for(const p of Object.values(s.people)){
  const m=p.news,key=p.id+'.news';if(m===undefined)continue;
  if(m?.version!==1||!m.known||Array.isArray(m.known)||typeof m.known!=='object'||Object.keys(m.known).length>24||!m.effects||typeof m.effects!=='object'||Array.isArray(m.effects)||!Number.isInteger(m.lastExchangeTick)||m.lastExchangeTick< -1||m.lastExchangeTick>s.tick)fail(key);
  for(const [id,r]of Object.entries(m.known)){
   const f=registry?.events[id]?.versions[r?.revision];
   if(!f||r.id!==id||!['witness','reported'].includes(r.mode)||r.status!==f.status||r.occurred!==f.occurred||r.area!==f.area||r.actor?.id!==f.actor.id||r.actor?.name!==f.actor.name||r.patient?.id!==f.patient.id||r.patient?.name!==f.patient.name||r.source?.id!==f.source.id||r.source?.kind!==f.source.kind||!tick(r.heardAt)||r.heardAt<f.occurred||!r.origin||!f.witnesses.includes(r.origin.person)||r.origin.at!==f.occurred||!Array.isArray(r.via)||r.via.length>6)fail(key+'.report');
   if(r.mode==='witness'&&(r.via.length||r.origin.person!==p.id||r.heardAt!==f.occurred)||r.mode==='reported'&&(!r.via.length||r.via.at(-1).to!==p.id||r.heardAt!==r.via.at(-1).tick))fail(key+'.origin');
   for(const [i,hop]of r.via.entries())if(!s.people[hop.from]||!s.people[hop.to]||hop.from===hop.to||!s.areas[hop.area]||!tick(hop.tick)||hop.tick<(r.via[i-1]?.tick??f.occurred)||hop.from!==(r.via[i-1]?.to??r.origin.person))fail(key+'.path');
   if(JSON.stringify(f.clinical)!==JSON.stringify(r.clinical))fail(key+'.clinical');
   if(JSON.stringify(f.administration)!==JSON.stringify(r.administration))fail(key+'.administration');
   if(JSON.stringify(f.diplomacy)!==JSON.stringify(r.diplomacy))fail(key+'.diplomacy');
   if(JSON.stringify(f.housing)!==JSON.stringify(r.housing))fail(key+'.housing');if(JSON.stringify(f.cargo)!==JSON.stringify(r.cargo))fail(key+'.cargo');
   if(m.effects[id]?.revision!==r.revision)fail(key+'.receipt');
  }
  for(const [id,e]of Object.entries(m.effects)){
   const f=registry?.events[id]?.versions[e?.revision];if(!f||e.actor!==f.actor.id||e.amount!==(f.status==='helped'&&![f.actor.id,f.patient.id].includes(p.id)?1:0)||!Number.isFinite(e.applied)||e.applied<0||e.applied>e.amount)fail(key+'.effect');
  }
 }
}
