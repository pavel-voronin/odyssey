import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
const dir=new URL('../dist/8442788f6addadc3/',import.meta.url),name=(await readdir(dir)).find(n=>/^engine\.[a-f0-9]+\.js$/.test(n)),old=await import(new URL(name,dir));
const mechanical=s=>JSON.stringify(s,(key,value)=>['facades','facadeAreaCount','building'].includes(key)?undefined:value);
const report={seeds:12,limit:12000,actualSteps:0,checks:0,maxBytes:0,buildings:0};
for(let seed=0;seed<report.seeds;seed++){
 let a=createWorld(seed),b=old.createWorld(seed);assert.equal(mechanical(a),mechanical(b));
 for(let i=0;i<report.limit&&!lifeFinished(a);i++){
  assert.equal(lifeFinished(a),lifeFinished(b));advanceLife(a);old.step(b);report.actualSteps+=2;
  if(i%997===0){assert.equal(mechanical(a),mechanical(b));report.checks++;const before=serialize(a);a=restore(before);assert.equal(serialize(a),before);}
 }
 assert.equal(mechanical(a),mechanical(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));report.buildings+=Object.values(a.areas).reduce((n,area)=>n+(area.facades?.profiles.length||0),0);console.log(seed,a.tick);
}
await writeFile('artifacts/facades-audit.json',JSON.stringify(report,null,2));console.log(report);
