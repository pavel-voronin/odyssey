import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';import {lifeFinished} from '../playback.js';import {setModule} from '../rules.js';
const report={seeds:[1,44],limit:12000,steps:0,checks:0,runs:[]};
for(const seed of report.seeds)for(const [watch,personal]of[[true,false],[false,true]]){
 let a=createWorld(seed),b=createWorld(seed);for(const s of[a,b]){setModule(s,'npc-watch-needs',watch);setModule(s,'npc-personal-supplies',personal);}
 for(let i=0;i<report.limit;i++){
  for(const s of[a,b])if(!lifeFinished(s)){step(s);report.steps++;}
  if(i%997===0){const saved=serialize(a);assert.ok(saved===serialize(b),'mixed modules diverged on replay');a=restore(saved);assert.ok(serialize(a)===saved);report.checks++;}
  if([a,b].every(lifeFinished))break;
 }
 assert.ok(serialize(a)===serialize(b));report.runs.push({seed,watch,personal,tick:a.tick,outcome:a.hero.life.outcome||'alive',people:Object.keys(a.people).length,deliveries:a.logistics.deliveries,bytes:Buffer.byteLength(serialize(a))});console.log(JSON.stringify(report.runs.at(-1)));
}
await writeFile('artifacts/watch-needs-interference.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
