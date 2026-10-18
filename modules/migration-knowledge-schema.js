export function validateMigrationKnowledge(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,amount=n=>Number.isFinite(n)&&n>=0&&n<=1000;
 if(s.migrationObservationSerial!==undefined&&(!Number.isSafeInteger(s.migrationObservationSerial)||s.migrationObservationSerial<1))fail('migrationObservationSerial');
 function note(n,owner,key){
  if(!n||!s.areas[n.area]||typeof n.name!=='string'||!tick(n.observed)||!tick(n.received)||n.received<n.observed||!amount(n.food)||!amount(n.safety)||typeof n.work!=='boolean'||typeof n.habitable!=='boolean'||typeof n.damage!=='boolean'||!s.people[n.witness]||!s.people[n.from]||!Number.isSafeInteger(n.serial)||n.serial<1||n.serial>(s.migrationObservationSerial||0)||n.id!==`settlement-note/${n.witness}/${n.area}/${n.observed}/${n.serial}`||!['seen','heard'].includes(n.mode)||!Array.isArray(n.via)||n.via.length>6)fail(key);
  if(n.mode==='seen'&&(n.witness!==owner||n.from!==owner||n.via.length||n.received!==n.observed)||n.mode==='heard'&&(!n.via.length||n.via.at(-1).to!==owner||n.via.at(-1).from!==n.from||n.via.at(-1).tick!==n.received))fail(key+'.source');
  for(const [i,h]of n.via.entries())if(!s.people[h.from]||!s.people[h.to]||h.from===h.to||!s.areas[h.area]||!tick(h.tick)||h.tick<(n.via[i-1]?.tick??n.observed)||h.from!==(n.via[i-1]?.to??n.witness))fail(key+'.contact');
 }
 for(const p of Object.values(s.people)){
  const m=p.migrationKnowledge;if(m===undefined)continue;const key=p.id+'.migrationKnowledge';
  if(m?.version!==1||!m.places||typeof m.places!=='object'||Array.isArray(m.places)||Object.keys(m.places).length>24)fail(key);
  for(const [id,n]of Object.entries(m.places)){if(n?.area!==id)fail(key+'.area');note(n,p.id,key+'.place');}
 }
 for(const g of Object.values(s.migrations)){
  if(g.contactMemory!==undefined){const c=g.contactMemory;if(c?.version!==1||!c.contacts||typeof c.contacts!=='object'||Array.isArray(c.contacts))fail(g.id+'.contactMemory');for(const [id,e]of Object.entries(c.contacts))if(!s.people[id]||!g.members.includes(e?.person)||!s.areas[e.area]||!tick(e.tick)||e.tick<g.started)fail(g.id+'.contactMemory.contact');}
  const k=g.knowledge;if(k===undefined)continue;const key=g.id+'.knowledge';
  if(k?.version!==1||!g.members.includes(k.leader)||!tick(k.decided)||k.decided<g.started||!Array.isArray(k.path)||!k.path.length||k.path.length>9||k.path.at(-1)!==g.target||k.path.some(id=>!s.areas[id])||typeof g.initialTargetName!=='string')fail(key);
  if(k.evidence!==null){const n=k.evidence;if(n.mode==='own-market-note'){if(n.area!==g.target||n.witness!==k.leader||n.from!==k.leader||!tick(n.observed)||n.received!==n.observed||!amount(n.food)||typeof n.work!=='boolean'||n.safety!==null||n.habitable!==null)fail(key+'.market');}else{if(n.area!==g.target)fail(key+'.target');note(n,k.leader,key+'.evidence');}}
  if(k.waiting!==undefined&&(!tick(k.waiting.tick)||!['no-known-refuge','actual-place-unsuitable','need-food','family-separated'].includes(k.waiting.reason)))fail(key+'.waiting');
 }
 for(const a of Object.values(s.areas)){const w=a.exodus?.knowledgeWait;if(w!==undefined&&(!tick(w.tick)||!s.people[w.leader]||!['need-food','no-known-address'].includes(w.reason)))fail(a.id+'.exodus.knowledgeWait');}
}
