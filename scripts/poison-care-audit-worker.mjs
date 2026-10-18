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
const legacy=s=>JSON.stringify(JSON.parse(game.serialize(s)),(key,value)=>key==='poison-care'?undefined:value);
parentPort.on('message',async job=>{try{
 let a=game.createWorld(job.seed),b=game.restore(game.serialize(a)),off=game.createWorld(job.seed),reference=old.createWorld(job.seed);setModule(off,'poison-care',false);
 const recorder=new LifeRecorder(a),baseline=new LifeRecorder(off),person=a.hero.lineage,methods={},outcomes={},examples=[],seen=new Set();let steps=0,checks=0;
 for(let i=0;i<limit&&(a.hero.alive||off.hero.alive);i++){
  if(a.hero.alive){const before=lifeContext(a),head=a.journal[0],prefix=examples.length<3&&a.hero.conditions.some(c=>c.id==='poison')?game.serialize(a):null;
   game.step(a);game.step(b);steps+=2;recorder.after(a,before,head);assert.equal(a.hero.lineage,person);
   const state=a.hero.poisonCare,active=state?.active,key=active?`${active.started}/${active.method}`:null;
   if(key&&!seen.has(key)){seen.add(key);methods[active.method]=(methods[active.method]||0)+1;if(examples.length<3&&prefix){const id=examples.length+1;await writeFile(path.join(directory,`${job.id}.event-${id}.before.json`),prefix);await writeFile(path.join(directory,`${job.id}.event-${id}.after.json`),game.serialize(a));examples.push({tick:a.tick,method:active.method,index:id});}}
   const last=state?.last,outcome=last?.ended?`${last.started}/${last.ended}/${last.status}`:null;if(outcome&&!seen.has(outcome)){seen.add(outcome);outcomes[last.status]=(outcomes[last.status]||0)+1;}
  }
  if(off.hero.alive){const before=lifeContext(off),head=off.journal[0];game.step(off);old.step(reference);steps+=2;baseline.after(off,before,head);}
  if(i%997===0){assertSameSave(game.serialize(a),game.serialize(b));assertSameSave(legacy(off),old.serialize(reference));b=game.restore(game.serialize(b));off=game.restore(game.serialize(off));checks+=2;}
  if((i+1)%4800===0)parentPort.postMessage({type:'progress',id:job.id,window:i+1});
 }
 assertSameSave(game.serialize(a),game.serialize(b));assertSameSave(legacy(off),old.serialize(reference));checks+=2;
 const row={id:job.id,seed:job.seed,studyVersion,candidateRevision,referenceRevision,worldSteps:steps,checks,on:recorder.finish(a,{limit}),off:baseline.finish(off,{limit}),offMatchesPublished:true,methods,outcomes,examples,files:{on:job.id+'.on.state.json',off:job.id+'.off.state.json'}};
 await writeFile(path.join(directory,row.files.on),game.serialize(a));await writeFile(path.join(directory,row.files.off),game.serialize(off));await writeFile(path.join(directory,job.id+'.json'),JSON.stringify(row));parentPort.postMessage({type:'done',row});
}catch(error){parentPort.postMessage({type:'error',id:job.id,error:String(error.stack||error).slice(0,6000)});}});
