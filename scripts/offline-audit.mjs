import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {createClock,catchUp,hasDue} from '../clock.js';
import {lifeFinished,advanceLife} from '../playback.js';
let s=createWorld(1);const clock=createClock(0),target=8*60*60*1000,start=performance.now();let maxBatch=0,batches=0;
while(hasDue(clock,target)){
  const before=performance.now();catchUp(clock,target,()=>advanceLife(s),250,()=>false,()=>lifeFinished(s));maxBatch=Math.max(maxBatch,performance.now()-before);batches++;
  if(batches%4===0){const saved=serialize(s);s=restore(saved);assert.equal(serialize(s),saved);}
  assert.ok(Number.isFinite(s.hero.gold)&&s.hero.gold>=0&&s.hero.hp>=0&&s.hero.hp<=s.hero.maxHp);
}
const foreground=createWorld(1);for(let i=0;i<28800&&!lifeFinished(foreground);i++)advanceLife(foreground);assert.equal(serialize(s),serialize(foreground));assert.equal(s.generation,1);assert.equal(clock.stopped,lifeFinished(s));
const report={hours:8,ticks:s.tick,stoppedAtFinal:clock.stopped,generation:s.generation,elapsedMs:Math.round(performance.now()-start),maxBatchMs:Math.round(maxBatch),areas:Object.keys(s.areas).length,people:Object.keys(s.people).length,lives:s.lives.length,deaths:s.lives.filter(l=>l.outcome==='dead').length,saveBytes:Buffer.byteLength(serialize(s))};
await writeFile('artifacts/offline-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
