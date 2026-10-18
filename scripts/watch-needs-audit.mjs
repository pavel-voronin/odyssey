import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const baseline='4df36cb7e686b12a',dir=`../dist/${baseline}/`,files=await readdir(new URL(dir,import.meta.url));
const old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxBytes:0,starts:0,ends:0,maxActive:0,privateEvents:0,leaks:0,watchActors:0,watchMeals:0,watchMedicine:0,watchRetreats:0,watchSleepSegments:0,guardRecords:0,maxWatchFields:0,runs:[]};
function project(s){const c=structuredClone(s);for(const id of ['npc-watch-needs','npc-personal-supplies']){delete c.rules[id];delete c.hero.ruleFlags[id];}return serialize(c);}
for(const seed of report.seeds){
  let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);setModule(off,'npc-watch-needs',false);setModule(off,'npc-personal-supplies',false);
  const starts=new Set(),ends=new Set(),events=new Set(),watchers=new Set(),upkeep=new Map(),lastRetreat=new Map();let active=new Set(),divergent=false;
  for(let i=0;i<report.limit;i++){
    for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}if(!lifeFinished(before)){old.step(before);report.steps++;}
    const journeys=a.society.journeys.filter(j=>j.movement==='physical'),current=new Set();report.maxActive=Math.max(report.maxActive,journeys.length);
    assert.equal(new Set(journeys.map(j=>j.person)).size,journeys.length,'two journeys claim one person');
    for(const j of journeys){const key=`${j.person}:${j.started}`;starts.add(key);current.add(key);const p=a.people[j.person];assert.ok(p&&p.area===j.path[j.index]);assert.ok(p.x>=0&&p.x<=100);assert.ok(j.elapsed<=720);}
    for(const key of active)if(!current.has(key))ends.add(key);active=current;
    for(const e of a.society.events)if(e.id?.startsWith('journey-')&&!events.has(e.id)){events.add(e.id);if(!e.knownBy.includes(a.hero.lineage)){report.privateEvents++;if(a.journal.some(j=>j.tick===e.tick&&j.text===e.text))report.leaks++;}}
    for(const p of Object.values(a.people))if(p.watchNeeds){watchers.add(p.id);const n=p.watchNeeds;report.maxWatchFields=Math.max(report.maxWatchFields,Object.keys(n).length);assert.ok(n.tick<=a.tick);if(upkeep.get(p.id)!==n.tick){upkeep.set(p.id,n.tick);if(n.activity==='eat')report.watchMeals++;if(n.activity==='medicine')report.watchMedicine++;if(n.retreat&&!lastRetreat.get(p.id))report.watchRetreats++;if(n.activity==='sleep')report.watchSleepSegments++;lastRetreat.set(p.id,n.retreat);}}
    for(const e of a.society.events)if(e.id?.startsWith('guard-')&&!events.has(e.id)){events.add(e.id);report.guardRecords++;if(!e.knownBy.includes(a.hero.lineage)&&a.journal.some(j=>j.tick===e.tick&&j.text===e.text))report.leaks++;}
    if(i%997===0){assert.ok(serialize(a)===serialize(repeat),'replay differs');assert.ok(project(off)===project(before),'disabled new travel differs from published63');report.checks++;divergent ||= project(a)!==project(off);const saved=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(saved));a=restore(saved);assert.ok(serialize(a)===saved);}
    if([a,repeat,off,before].every(lifeFinished))break;
  }
  assert.ok(serialize(a)===serialize(repeat));assert.ok(project(off)===project(before));report.starts+=starts.size;report.ends+=ends.size;report.watchActors+=watchers.size;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
  report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive'},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive'},starts:starts.size,ends:ends.size,divergent});console.log(JSON.stringify(report.runs.at(-1)));
}
assert.equal(report.leaks,0);assert.ok(report.maxWatchFields<=4);await writeFile('artifacts/watch-needs-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
