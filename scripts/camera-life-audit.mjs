import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
const canonical=s=>JSON.stringify(JSON.parse(serialize(s)),(key,value)=>key==='camera-probe'?undefined:value),report={steps:0,checkpoints:0,cases:[]};
for(const seed of [1,36]){
  const a=createWorld(seed);let b=restore(serialize(a));b.rules['camera-probe']=false;
  let ticks=0;for(;ticks<19200&&a.hero.alive;ticks++){step(a);step(b);report.steps+=2;if(ticks%997===0){assert.equal(canonical(a),canonical(b));b=restore(serialize(b));report.checkpoints++;}}
  assert.equal(canonical(a),canonical(b));const row={seed,ticks:a.tick,alive:a.hero.alive,outcome:a.hero.life.outcome||'continuing',distance:a.hero.distance,areas:a.nextArea};report.cases.push(row);console.log(row);
}
await writeFile('artifacts/camera-life-audit.json',JSON.stringify(report,null,2));console.log(report);
