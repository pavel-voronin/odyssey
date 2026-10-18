import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';

const baseline='92c42e505e88d692',dir=`../dist/${baseline}/`;
const files=await readdir(new URL(dir,import.meta.url));
const old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxBytes:0,maxMarkets:0,maxSightings:0,freightStarts:0,freightOutcomes:0,privateEvents:0,journalLeaks:0,runs:[]};
function project(s){const c=structuredClone(s);delete c.rules['npc-logistics'];delete c.hero.ruleFlags['npc-logistics'];return serialize(c);}
for(const seed of report.seeds){
  let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);
  setModule(off,'npc-logistics',false);
  const starts=new Set(),ends=new Set(),events=new Set();let divergent=false;
  for(let i=0;i<report.limit;i++){
    for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}
    if(!lifeFinished(before)){old.step(before);report.steps++;}
    for(const c of a.logistics.convoys)if(c.movement==='physical'){starts.add(c.id);report.maxSightings=Math.max(report.maxSightings,Object.keys(c.sightings||{}).length);assert.ok(a.people[c.person],'carrier must be a canonical person');}
    for(const h of a.logistics.history)if(h.eventId?.startsWith('freight'))ends.add(h.id);
    for(const p of Object.values(a.people))report.maxMarkets=Math.max(report.maxMarkets,p.navigation?.markets?.length||0);
    for(const e of a.logistics.events||[])if(!events.has(e.id)){
      events.add(e.id);if(!e.knownBy.includes(a.hero.lineage)){report.privateEvents++;if(a.journal.some(j=>j.tick===e.tick&&j.text===e.text))report.journalLeaks++;}
    }
    assert.ok((a.logistics.events?.length||0)<=80);
    if(i%997===0){
      assert.ok(serialize(a)===serialize(repeat),'save replay diverged');
      assert.ok(project(off)===project(before),'disabled freight changed the published world');
      report.checks++;divergent ||= project(a)!==project(off);
      const saved=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(saved));a=restore(saved);assert.ok(serialize(a)===saved);
    }
    if([a,repeat,off,before].every(lifeFinished))break;
  }
  assert.ok(serialize(a)===serialize(repeat),'final replay diverged');
  assert.ok(project(off)===project(before),'final disabled world differs from baseline');
  report.freightStarts+=starts.size;report.freightOutcomes+=ends.size;
  report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
  report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive'},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive'},starts:starts.size,outcomes:ends.size,divergent});
  console.log(JSON.stringify(report.runs.at(-1)));
}
assert.ok(report.maxMarkets<=24);assert.ok(report.maxSightings<=6);assert.equal(report.journalLeaks,0);
await writeFile('artifacts/freight-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
