import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {checkSignature,checkOptions} from '../scripts/check.mjs';
import {verifyPublishedAssets} from '../scripts/deploy-network.mjs';

test('check profiles require explicit options and reject a misspelled bypass',()=>{
 assert.deepEqual(checkOptions(['--tests','test/a.test.js']),{full:false,force:false,files:['test/a.test.js']});assert.equal(checkOptions(['--full']).full,true);assert.throws(()=>checkOptions(['--skip-tests']),/Unknown option/);
});

test('check reuse follows transitive code and public inputs, while a report edit leaves it valid',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'odyssey-check-'));
 try{
  await fs.mkdir(path.join(dir,'test'));await fs.mkdir(path.join(dir,'scripts'));
  for(const [file,text]of Object.entries({'test/a.test.js':"import '../b.js';",'b.js':"export {n} from './c.js';",'c.js':'export const n=1;','index.html':'html','style.css':'css','viewport.css':'viewport','scripts/check.mjs':'runner'}))await fs.writeFile(path.join(dir,file),text);
  const first=await checkSignature(['test/a.test.js'],{cwd:dir});await fs.writeFile(path.join(dir,'report.md'),'report change');assert.equal(await checkSignature(['test/a.test.js'],{cwd:dir}),first);
  assert.notEqual(await checkSignature(['test/a.test.js'],{cwd:dir,revision:'changed-public-inputs'}),first,'directly loaded UI/build inputs also invalidate reuse');
  await fs.writeFile(path.join(dir,'c.js'),'export const n=2;');assert.notEqual(await checkSignature(['test/a.test.js'],{cwd:dir}),first);
  const next=await checkSignature(['test/a.test.js'],{cwd:dir});await fs.writeFile(path.join(dir,'style.css'),'changed');assert.notEqual(await checkSignature(['test/a.test.js'],{cwd:dir}),next);
 }finally{assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('odyssey-check-'));await fs.rm(dir,{recursive:true,force:true});}
});
test('parallel public verification still checks every file with bounded concurrency',async()=>{
 const files=Array.from({length:25},(_,i)=>['file'+i,'hash'+i]),seen=new Map();let running=0,max=0;
 const count=await verifyPublishedAssets([['index.html','html'],...files],async (file,hash)=>{running++;max=Math.max(max,running);await new Promise(resolve=>setImmediate(resolve));seen.set(file,hash);running--;});
 assert.equal(count,25);assert.deepEqual([...seen],files);assert.equal(max,8);
});
test('a bad public checksum remains a deployment failure and no file is silently accepted',async()=>{
 await assert.rejects(verifyPublishedAssets([['a','good'],['b','wrong']],async (file,hash)=>{assert.equal(hash,'good','checksum '+file);}),/checksum b/);
});
