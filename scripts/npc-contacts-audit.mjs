import assert from 'node:assert/strict';import{readdir,writeFile}from'node:fs/promises';
import{createWorld,step,serialize,restore}from'../engine.js';import{lifeFinished}from'../playback.js';import{setModule}from'../rules.js';
const baseline='8281a0b21b19d9e6',dir=`../dist/${baseline}/`,files=await readdir(new URL(dir,import.meta.url)),old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxBytes:0,maxContacts:0,visitPlans:0,companionPurposes:0,runs:[]};
function project(s){const c=structuredClone(s);delete c.rules['npc-contacts'];delete c.hero.ruleFlags['npc-contacts'];for(const p of Object.values(c.people))if(p.navigation)delete p.navigation.contacts;return serialize(c);}
for(const seed of report.seeds){let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);setModule(off,'npc-contacts',false);let divergent=false;const plans=new Map(),purposes=new Set();
 for(let i=0;i<report.limit;i++){
  for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}if(!lifeFinished(before)){old.step(before);report.steps++;}
  for(const p of Object.values(a.people)){const t=p.agenda?.task,key=t?.kind==='visit'&&t.contactMemory?t.person:null;if(key&&plans.get(p.id)!==key)report.visitPlans++;plans.set(p.id,key);report.maxContacts=Math.max(report.maxContacts,p.navigation?.contacts?.length||0);if(p.personalJourney?.contactMemory)purposes.add(p.id);}
  if(i%997===0){assert.ok(serialize(a)===serialize(repeat),'save replay diverged');assert.ok(project(off)===project(before),'disabled contacts changed previous world');report.checks++;divergent ||= project(a)!==project(off);const text=serialize(a);a=restore(text);assert.ok(serialize(a)===text);}
  if([a,repeat,off,before].every(lifeFinished))break;
 }
 assert.ok(serialize(a)===serialize(repeat));assert.ok(project(off)===project(before));report.companionPurposes+=purposes.size;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive',people:Object.keys(a.people).length},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive',people:Object.keys(off.people).length},divergent});console.log(seed,report.runs.at(-1));
}
assert.ok(report.maxContacts<=32);await writeFile('artifacts/npc-contacts-audit.json',JSON.stringify(report,null,2));console.log(report);
