import test from 'node:test';import assert from 'node:assert/strict';import {readPublishedTarget} from '../scripts/deploy-network.mjs';
test('a transient SSH probe retries the identical read-only script, waits and returns the real existing target',async()=>{
 let calls=0,waits=0;const scripts=[],value=await readPublishedTarget(script=>{scripts.push(script);if(++calls<3)throw Object.assign(Error('SSH'),{status:255,stderr:'Connection timed out during banner exchange'});return '/srv/kolpaque/releases/odyssey/aa459c2b80efd0b1\n';},{wait:async()=>{waits++;},warn:()=>{}});assert.equal(value,'/srv/kolpaque/releases/odyssey/aa459c2b80efd0b1');assert.equal(calls,3);assert.equal(waits,2);assert.equal(new Set(scripts).size,1);assert.ok(!/\b(mv|ln|mkdir|chmod|scp)\b/.test(scripts[0]));
});
test('an unmanaged path or authentication failure is not hidden by a retry',async()=>{
 for(const error of [Object.assign(Error('unmanaged'),{status:1}),Object.assign(Error('permission'),{status:255,stderr:'Permission denied (publickey).'})]){let calls=0;await assert.rejects(readPublishedTarget(()=>{calls++;throw error;},{wait:()=>{throw Error('Must not wait');},warn:()=>{}}),e=>e===error);assert.equal(calls,1);}
});
test('three transient failures stop with the actual SSH error and never perform a fourth probe',async()=>{
 let calls=0;const error=Object.assign(Error('network'),{status:255,stderr:'Connection timed out'});await assert.rejects(readPublishedTarget(()=>{calls++;throw error;},{wait:async()=>{},warn:()=>{}}),e=>e===error);assert.equal(calls,3);
});
