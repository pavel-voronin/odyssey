import {parentPort,workerData} from 'node:worker_threads';
import {readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as game from '../engine.js';
import {setModule} from '../rules.js';
import {LifeRecorder,lifeContext} from './life-causal-model.mjs';
import {assertSameSave} from './life-save-compare.mjs';
const {directory,referenceRevision,candidateRevision,studyVersion,limit}=workerData;
const dir=path.resolve('dist',referenceRevision),file=(await readdir(dir)).find(f=>/^engine\.[a-f0-9]+\.js$/.test(f));assert.ok(file);const old=await import(pathToFileURL(path.join(dir,file)).href);
const legacy=s=>JSON.stringify(JSON.parse(game.serialize(s)),(key,value)=>key==='intention-balance'?undefined:value);
parentPort.on('message',async job=>{try{
 let a=game.createWorld(job.seed),b=game.restore(game.serialize(a)),off=game.createWorld(job.seed),reference=old.createWorld(job.seed);setModule(off,'intention-balance',false);
 const recorder=new LifeRecorder(a),baseline=new LifeRecorder(off),person=a.hero.lineage,events={},examples=[],seen=new Set();let steps=0,checks=0,checkpoint=game.serialize(a),checkpointTick=a.tick;
 for(let i=0;i<limit&&(a.hero.alive||off.hero.alive);i++){
  if(a.hero.alive){const before=lifeContext(a),head=a.journal[0];game.step(a);game.step(b);steps+=2;recorder.after(a,before,head);assert.equal(a.hero.lineage,person);
   const last=a.hero.intentions?.balance?.last,key=last?`${last.tick}/${last.kind}/${last.from}/${last.to}`:null;
   if(key&&!seen.has(key)){seen.add(key);events[last.kind]=(events[last.kind]||0)+1;if(examples.length<3){const index=examples.length+1,prefixFile=`${job.id}.event-${index}.checkpoint.json`,afterFile=`${job.id}.event-${index}.after.json`,after=game.serialize(a);await writeFile(path.join(directory,prefixFile),checkpoint);await writeFile(path.join(directory,afterFile),after);const replay=game.restore(checkpoint);while(replay.tick<a.tick){game.step(replay);steps++;}assertSameSave(after,game.serialize(replay));examples.push({tick:a.tick,kind:last.kind,index,prefixFile,checkpointTick,replayDistance:a.tick-checkpointTick,afterFile,replayed:true});}}
  }
  if(off.hero.alive){const before=lifeContext(off),head=off.journal[0];game.step(off);old.step(reference);steps+=2;baseline.after(off,before,head);}
  if(i%997===0){const saved=game.serialize(a);assertSameSave(saved,game.serialize(b));assertSameSave(legacy(off),old.serialize(reference));b=game.restore(game.serialize(b));off=game.restore(game.serialize(off));checkpoint=saved;checkpointTick=a.tick;checks+=2;}
  if((i+1)%4800===0)parentPort.postMessage({type:'progress',id:job.id,window:i+1});
 }
 assertSameSave(game.serialize(a),game.serialize(b));assertSameSave(legacy(off),old.serialize(reference));checks+=2;
 const row={id:job.id,seed:job.seed,studyVersion,candidateRevision,referenceRevision,worldSteps:steps,checks,on:recorder.finish(a,{limit}),off:baseline.finish(off,{limit}),offMatchesPublished:true,events,examples,files:{on:job.id+'.on.state.json',off:job.id+'.off.state.json'}};
 await writeFile(path.join(directory,row.files.on),game.serialize(a));await writeFile(path.join(directory,row.files.off),game.serialize(off));await writeFile(path.join(directory,job.id+'.json'),JSON.stringify(row));parentPort.postMessage({type:'done',row});
}catch(error){parentPort.postMessage({type:'error',id:job.id,error:String(error.stack||error).slice(0,6000)});}});
