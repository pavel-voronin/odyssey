import test from 'node:test';import assert from 'node:assert/strict';
import {generationJob,runGeneration} from '../generation-session.js';
test('yield failure discards the unsaved live world, then resumes to exactly the same four native ticks',async()=>{
 const job=generationJob(4,{duration:4});let yields=0;
 await assert.rejects(runGeneration(job,{batch:1,checkpointInterval:60000,yieldFrame:async()=>{if(++yields===3)throw Error('Interrupted');}}),/Interrupted/);
 assert.equal(JSON.parse(job.checkpoint).tick,0);
 const resumed=await runGeneration(job,{batch:2,checkpointInterval:60000,yieldFrame:async()=>{}}),direct=await runGeneration(generationJob(4,{duration:4}),{batch:4,yieldFrame:async()=>{}});
 assert.equal(resumed.ok,true);assert.equal(resumed.raw,direct.raw);
});
test('explicit pause flushes completed but unsaved ticks before returning and storage rejection preserves the previous checkpoint',async()=>{
 const job=generationJob(4,{duration:4});let yields=0;
 const paused=await runGeneration(job,{batch:1,checkpointInterval:60000,yieldFrame:async()=>{yields++;},stopped:()=>yields===3});
 assert.equal(paused.paused,true);assert.equal(JSON.parse(job.checkpoint).tick,2);
 const before=job.checkpoint;await assert.rejects(runGeneration(job,{batch:1,yieldFrame:async()=>{},checkpoint:j=>{if(JSON.parse(j.checkpoint).tick===3)throw Error('Quota');}}),/Quota/);assert.equal(job.checkpoint,before);
 const resumed=await runGeneration(job,{yieldFrame:async()=>{}});assert.equal(resumed.ok,true);assert.equal(resumed.state.tick,4);
});
