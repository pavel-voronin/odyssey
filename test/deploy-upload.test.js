import test from 'node:test';import assert from 'node:assert/strict';
import {uploadRelease} from '../scripts/deploy-upload.mjs';
test('a growing Windows release sends every exact relative payload once with bounded command lines',()=>{
 const files=Array.from({length:500},(_,i)=>'module-'+i+'-'+('a'.repeat(60))+'.123456789abc.js'),release={dir:'C:/a workspace with spaces/'+('x'.repeat(160)),files},calls=[];
 uploadRelease((program,args,options)=>calls.push({program,args,options}),release,'agent:/srv/kolpaque/releases/odyssey/0123456789abcdef/');
 assert.ok(calls.length>1);assert.deepEqual(calls.flatMap(c=>c.args.slice(9,-1)),files);
 for(const c of calls){assert.equal(c.program,'scp');assert.equal(c.options.cwd,release.dir);assert.ok(c.args.join(' ').length<12000);assert.ok(c.args.includes('BatchMode=yes'));assert.equal(c.args.at(-1),'agent:/srv/kolpaque/releases/odyssey/0123456789abcdef/');}
});
test('payload names cannot turn into an option, parent path or shell expression',()=>{
 for(const file of ['../outside','-r','name with space','$(bad)','a/b'])assert.throws(()=>uploadRelease(()=>assert.fail('Must not upload'),{dir:'dist',files:[file]},'agent:/release/'),/payload/);
});
