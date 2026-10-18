import assert from 'node:assert/strict';import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';import {lifeFinished} from '../playback.js';import {setModule} from '../rules.js';
const baseline='2df3f3f1f5dfe725',dir='../dist/'+baseline+'/',files=await readdir(new URL(dir,import.meta.url)),old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxBytes:0,careActors:0,careDeaths:0,ownMeals:0,ownMedicine:0,restRecords:0,maxFields:0,runs:[]};
function project(s,strip=false){const c=structuredClone(s);delete c.rules['npc-party-needs'];delete c.hero.ruleFlags['npc-party-needs'];if(strip)for(const p of Object.values(c.people))delete p.partyNeeds;return serialize(c);}
for(const seed of report.seeds){let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);setModule(off,'npc-party-needs',false);const actors=new Set(),dead=new Set(),seen=new Map();let gameplayDiverged=false;
 for(let i=0;i<report.limit;i++){
  for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}if(!lifeFinished(before)){old.step(before);report.steps++;}
  for(const p of Object.values(a.people))if(p.partyNeeds){actors.add(p.id);report.maxFields=Math.max(report.maxFields,Object.keys(p.partyNeeds).length);assert.ok(p.partyNeeds.tick<=a.tick);if(!p.alive)dead.add(p.id);if(seen.get(p.id)!==p.partyNeeds.tick){seen.set(p.id,p.partyNeeds.tick);if(p.partyNeeds.activity==='eat')report.ownMeals++;if(p.partyNeeds.activity==='medicine')report.ownMedicine++;if(p.partyNeeds.activity==='rest')report.restRecords++;}}
  if(i%997===0){assert.ok(serialize(a)===serialize(repeat),'repeat differs');assert.ok(project(off)===project(before),'off differs from published65');report.checks++;gameplayDiverged ||=project(a,true)!==project(off,true);const saved=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(saved));a=restore(saved);assert.equal(serialize(a),saved);}
  if([a,repeat,off,before].every(lifeFinished))break;
 }
 assert.equal(serialize(a),serialize(repeat));assert.equal(project(off),project(before));gameplayDiverged ||=project(a,true)!==project(off,true);report.careActors+=actors.size;report.careDeaths+=dead.size;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive'},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive'},careActors:actors.size,careDeaths:dead.size,gameplayDiverged});console.log(JSON.stringify(report.runs.at(-1)));
}
assert.ok(report.maxFields<=2);await writeFile('artifacts/party-needs-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
