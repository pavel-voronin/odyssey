import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const baseline='8d0e83d4707da359',dir=`../dist/${baseline}/`,files=await readdir(new URL(dir,import.meta.url)),old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxBytes:0,workPlans:0,maxPlaces:0,maxRoads:0,runs:[]};
function project(s){const c=structuredClone(s);delete c.rules['npc-knowledge'];delete c.hero.ruleFlags['npc-knowledge'];for(const p of Object.values(c.people))delete p.navigation;return serialize(c);}
for(const seed of report.seeds){let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);setModule(off,'npc-knowledge',false);let divergent=false;const plans=new Map();
 for(let i=0;i<report.limit;i++){
  for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}if(!lifeFinished(before)){old.step(before);report.steps++;}
  for(const p of Object.values(a.people)){const task=p.agenda?.task,key=task?.kind==='relocate'&&task.knownNavigation?task.target:null;
   if(key&&plans.get(p.id)!==key)report.workPlans++;plans.set(p.id,key);report.maxPlaces=Math.max(report.maxPlaces,p.navigation?.places.length||0);report.maxRoads=Math.max(report.maxRoads,p.navigation?.roads.length||0);
  }
  if(i%997===0){assert.ok(serialize(a)===serialize(repeat),'save replay diverged');assert.ok(project(off)===project(before),'disabled knowledge changed old simulation');report.checks++;divergent ||= project(a)!==project(off);const saved=serialize(a);a=restore(saved);assert.ok(serialize(a)===saved);}
  if([a,repeat,off,before].every(lifeFinished))break;
 }
 assert.ok(serialize(a)===serialize(repeat));assert.ok(project(off)===project(before));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive',people:Object.keys(a.people).length},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive',people:Object.keys(off.people).length},divergent});console.log(seed,report.runs.at(-1));
}
assert.ok(report.maxPlaces<=64&&report.maxRoads<=96);await writeFile('artifacts/npc-knowledge-audit.json',JSON.stringify(report,null,2));console.log(report);
