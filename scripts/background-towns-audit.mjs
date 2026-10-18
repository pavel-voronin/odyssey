import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const baseline='de109e22ee9b8a0e',dir=`../dist/${baseline}/`,files=await readdir(new URL(dir,import.meta.url)),old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,privateEvents:0,leaks:0,maxBytes:0,runs:[]};
function project(s){const c=structuredClone(s);delete c.rules['background-towns'];delete c.hero.ruleFlags['background-towns'];return serialize(c);}
for(const seed of report.seeds){let a=createWorld(seed),repeat=createWorld(seed),off=createWorld(seed),before=old.createWorld(seed);setModule(off,'background-towns',false);let divergent=false;
 for(let i=0;i<report.limit;i++){
  for(const s of [a,repeat,off])if(!lifeFinished(s)){step(s);report.steps++;}
  if(!lifeFinished(before)){old.step(before);report.steps++;}
  for(const event of a.society.events.filter(e=>e.tick===a.tick&&e.knownBy&&!e.knownBy.length)){
   report.privateEvents++;if(a.journal.some(entry=>entry.tick===event.tick&&entry.text===event.text))report.leaks++;
  }
  if(i%997===0){assert.equal(serialize(a),serialize(repeat));assert.equal(project(off),project(before));report.checks++;divergent ||= project(a)!==project(off);const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);}
  if([a,repeat,off,before].every(lifeFinished))break;
 }
 assert.equal(serialize(a),serialize(repeat));assert.equal(project(off),project(before));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 report.runs.push({seed,on:{ticks:a.tick,outcome:a.hero.life.outcome||'alive',people:Object.keys(a.people).length,areas:Object.keys(a.areas).length},off:{ticks:off.tick,outcome:off.hero.life.outcome||'alive',people:Object.keys(off.people).length,areas:Object.keys(off.areas).length},divergent});console.log(seed,report.runs.at(-1));
}
assert.equal(report.leaks,0);assert.ok(report.privateEvents>0);await writeFile('artifacts/background-towns-audit.json',JSON.stringify(report,null,2));console.log(report);
