import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {actorPalette,buildingPalette,paletteCacheSize} from '../palette.js';
const dir=new URL('../dist/fa4ebdaedb3e2140/',import.meta.url),name=(await readdir(dir)).find(n=>/^engine\.[a-f0-9]+\.js$/.test(n)),old=await import(new URL(name,dir));
const mechanical=s=>JSON.stringify(s,(key,value)=>key==='appearance'||key==='paletteVersion'?undefined:value);
const report={seeds:12,limit:12000,actualSteps:0,mechanicallyDifferent:0,maxBytes:0,colors:1000,cloakColors:0,roofColors:0};
for(let seed=0;seed<report.seeds;seed++){
 let a=createWorld(seed),b=old.createWorld(seed);assert.deepEqual(a.rules,b.rules);assert.equal(mechanical(a),mechanical(b));
 for(let i=0;i<report.limit&&!lifeFinished(a);i++){
  assert.equal(lifeFinished(a),lifeFinished(b));advanceLife(a);old.step(b);report.actualSteps+=2;
  if(i%997===0){assert.equal(mechanical(a),mechanical(b));const before=serialize(a);a=restore(before);assert.equal(serialize(a),before);}
 }
 assert.equal(mechanical(a),mechanical(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));console.log(seed,a.tick);
}
report.cloakColors=new Set(Array.from({length:report.colors},(_,i)=>actorPalette(123,'person-'+i,'culture-'+i%8).cloak)).size;
report.roofColors=new Set(Array.from({length:report.colors},(_,i)=>buildingPalette(123,{id:'a'+i,culture:'culture-'+i%8},i%3).roofColor)).size;report.cacheSize=paletteCacheSize();
await writeFile('artifacts/palette-audit.json',JSON.stringify(report,null,2));console.log(report);
