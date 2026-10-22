import test from 'node:test';import assert from 'node:assert/strict';
import {packJSON,unpackJSON,jsonStorage} from '../save-storage.js';
import {requestGeneration,pendingGeneration,commitGeneration,GENERATION_KEY} from '../generation-client.js';
import {SAVE_KEY} from '../save-schema.js';
import {createWorld,serialize} from '../engine.js';
const store=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('large JSON roundtrips exactly through dictionary resets, Cyrillic, emoji and escaped lone surrogates',()=>{
 let x=7;const values=Array.from({length:10000},()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return {id:x,name:'Родня 🧭',text:'\ud800',at:x%768000};});
 const raw=JSON.stringify(values),packed=packJSON(raw);assert.ok(packed.length<raw.length);assert.equal(unpackJSON(packed),raw);
 const again=packJSON(JSON.stringify({text:'я'.repeat(80000)}));assert.equal(unpackJSON(again),JSON.stringify({text:'я'.repeat(80000)}));
 const literalSurrogate='{"x":"'+String.fromCharCode(0xd800)+'x'.repeat(70000)+'"}';assert.equal(packJSON(literalSurrogate),literalSurrogate);
 assert.equal(unpackJSON(null),null);assert.equal(packJSON('{"small":1}'),'{"small":1}');assert.throws(()=>unpackJSON('odyssey-json-lzw1:'),/Empty/);
});
test('existing plaintext stays readable; new transport changes neither generation signature nor committed game JSON',()=>{
 const physical=store(),storage=jsonStorage(physical),s=createWorld(4),raw=serialize(s);physical.setItem(SAVE_KEY,raw);
 assert.equal(storage.getItem(SAVE_KEY),raw);const j=requestGeneration(storage,4,{warm:false});assert.deepEqual(pendingGeneration(storage),j);
 const r=commitGeneration(storage,j,{ok:true,state:s,raw},1000);assert.equal(r.state,s);assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.getItem(GENERATION_KEY),null);assert.ok(physical.getItem(SAVE_KEY).length<raw.length);
 storage.setItem(SAVE_KEY+'-before-import',raw);assert.equal(storage.getItem(SAVE_KEY+'-before-import'),raw);
});
