import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const baseline='237d7c2409f6c590',dir=`../dist/${baseline}/`,files=await readdir(new URL(dir,import.meta.url));
const old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxBytes:0,starts:0,ends:0,maxActive:0,privateEvents:0,leaks:0,runs:[]};
function project(s){const c=structuredClone(s);delete c.rules['npc-travel'];delete c.hero.ruleFlags['npc-travel'];return serialize(c);}
for(const seed of report.seeds){
  let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);setModule(off,'npc-travel',false);
  const starts=new Set(),ends=new Set(),events=new Set();let active=new Set(),divergent=false;
  for(let i=0;i<report.limit;i++){
    for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}if(!lifeFinished(before)){old.step(before);report.steps++;}
    const journeys=a.society.journeys.filter(j=>j.movement==='physical'),current=new Set();report.maxActive=Math.max(report.maxActive,journeys.length);
    assert.equal(new Set(journeys.map(j=>j.person)).size,journeys.length,'two journeys claim one person');
    for(const j of journeys){const key=`${j.person}:${j.started}`;starts.add(key);current.add(key);const p=a.people[j.person];assert.ok(p&&p.area===j.path[j.index]);assert.ok(p.x>=0&&p.x<=100);assert.ok(j.elapsed<=720);}
    for(const key of active)if(!current.has(key))ends.add(key);active=current;
    for(const e of a.society.events)if(e.id?.startsWith('journey-')&&!events.has(e.id)){events.add(e.id);if(!e.knownBy.includes(a.hero.lineage)){report.privateEvents++;if(a.journal.some(j=>j.tick===e.tick&&j.text===e.text))report.leaks++;}}
    if(i%997===0){assert.ok(serialize(a)===serialize(repeat),'replay differs');assert.ok(project(off)===project(before),'disabled new travel differs from published60');report.checks++;divergent ||= project(a)!==project(off);const saved=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(saved));a=restore(saved);assert.ok(serialize(a)===saved);}
    if([a,repeat,off,before].every(lifeFinished))break;
  }
  assert.ok(serialize(a)===serialize(repeat));assert.ok(project(off)===project(before));report.starts+=starts.size;report.ends+=ends.size;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
  report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive'},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive'},starts:starts.size,ends:ends.size,divergent});console.log(JSON.stringify(report.runs.at(-1)));
}
assert.equal(report.leaks,0);await writeFile('artifacts/public-journey-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
