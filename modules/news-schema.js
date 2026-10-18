export function validateNews(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,registry=s.newsEvents;
 if(registry!==undefined){
  if(registry?.version!==1||!registry.events||typeof registry.events!=='object'||Array.isArray(registry.events))fail('newsEvents');
  for(const [id,e]of Object.entries(registry.events)){
   if(e?.version!==1||e.id!==id||id!=='news/aid/'+e.source||e.kind!=='aid'||!e.versions||!Object.keys(e.versions).length||Object.keys(e.versions).some(k=>!['1','2'].includes(k)))fail('newsEvents.event');
   for(const [revision,f]of Object.entries(e.versions))if(f?.id!==id||f.revision!==Number(revision)||f.status!==(f.revision===1?'agreed':'helped')||!tick(f.occurred)||!s.areas[f.area]||!s.people[f.actor?.id]||!s.people[f.patient?.id]||f.actor.id===f.patient.id||typeof f.actor.name!=='string'||typeof f.patient.name!=='string'||f.source?.kind!=='aid-action'||f.source.id!==e.source||!e.source.startsWith(f.patient.id+'/aid/')||!Array.isArray(f.witnesses)||f.witnesses.length>32||new Set(f.witnesses).size!==f.witnesses.length||f.witnesses.some(id=>!s.people[id]))fail('newsEvents.fact');
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
   if(m.effects[id]?.revision!==r.revision)fail(key+'.receipt');
  }
  for(const [id,e]of Object.entries(m.effects)){
   const f=registry?.events[id]?.versions[e?.revision];if(!f||e.actor!==f.actor.id||e.amount!==(f.status==='helped'&&![f.actor.id,f.patient.id].includes(p.id)?1:0)||!Number.isFinite(e.applied)||e.applied<0||e.applied>e.amount)fail(key+'.effect');
  }
 }
}
