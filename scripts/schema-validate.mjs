import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {restore,serialize,step} from '../engine.js';
import {rememberObservers} from '../observer-choice.js';
const dir='artifacts/schema-144',json=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const f=await json(dir+'/source-freeze.json'),a=await json(dir+'/audit.json'),n=await json(dir+'/native.json');
for(const [p,h]of Object.entries(f.files))assert.equal(hash(await fs.readFile(p)),h,p);
assert.equal(a.revision,f.revision);assert.equal(n.revision,f.revision);assert.equal(a.rows.length,30);assert.equal(a.steps,11904);assert.equal(a.checks,882);
const manifest=await json(dir+'/runtime-'+f.revision+'/release.json');assert.equal(manifest.revision,f.revision);
for(const [p,h]of Object.entries(manifest.files))assert.equal(hash(await fs.readFile(dir+'/runtime-'+f.revision+'/'+p)),h,p);
assert.deepEqual(n.frames.map(v=>v.width).sort((a,b)=>a-b),[320,390]);assert.deepEqual(n.console,[]);assert.ok(n.closed&&n.viewportReset);
assert.match(n.errorText,/magic\.mana/);assert.match(n.oldErrorText,/другой формат/);
for(const frame of n.frames){assert.equal(frame.build,f.revision);assert.equal(frame.documentWidth,frame.width);assert.equal(frame.documentHeight,frame.height);assert.equal(frame.reason.height,frame.reason.scrollHeight);assert.ok((await fs.stat(dir+'/'+frame.file)).size>1000);}
const old=await json(dir+'/native-oldkeys-proof.json');assert.equal(old.old.tick,123456789);assert.equal(old.old.seed,1999);assert.notEqual(old.state.seed,old.old.seed);assert.ok(old.state.tick<1000);assert.equal(old.state.schema,'click-odyssey/144');assert.equal(old.clock.schema,old.state.schema);assert.equal(old.clock.seed,old.state.seed);assert.equal(old.tutorial.stage,1);assert.equal(old.tutorial.done,false);
const before=await json(dir+'/native-before-error.json'),after=await json(dir+'/native-after-error.json');assert.equal(before.state.seed,1441);assert.equal(after.state.seed,1441);assert.deepEqual(before.backup,after.backup);assert.equal(after.clock.idleUntil,before.clock.idleUntil);assert.equal(after.clock.anchor-before.clock.anchor,(after.state.tick-before.state.tick)*1000);
let direct=restore(JSON.stringify(before.state));for(let t=before.state.tick;t<after.state.tick;t++){rememberObservers(direct);step(direct);}assert.equal(serialize(direct),JSON.stringify(after.state));
const exported=await fs.readFile(dir+'/native-export.json','utf8');assert.equal(serialize(restore(exported)),exported);
const historical=await json(dir+'/historical-scripts/index.json');for(const row of historical){assert.equal(hash(await fs.readFile(row.archive)),row.sha256);assert.match(await fs.readFile(row.path,'utf8'),/Historical verification retired at schema 144/);}
assert.equal(historical.length,(await json(dir+'/script-plan.json')).retire.length);
let tests=null;
if(!process.argv.includes('--preflight')){
 const full=await fs.readFile(dir+'/deploy.log','utf8');const total=full.match(/(?:ℹ|#) tests\s+(\d+)/),passed=full.match(/(?:ℹ|#) pass\s+(\d+)/);assert.ok(total&&passed);assert.equal(total[1],passed[1]);assert.match(full,/(?:ℹ|#) fail\s+0\b/);tests=Number(total[1]);
 const active=await json(dir+'/active-run.json');assert.equal(active.fullTerminalExit,0);assert.equal(active.deployComplete,true);
}
if(process.argv.includes('--published')){
 const release=await(await fetch('https://odyssey.kolpaque.dev/release.json',{cache:'no-store'})).json();assert.equal(release.revision,f.revision);
 for(const [file,h]of Object.entries(f.publicFiles)){const response=await fetch('https://odyssey.kolpaque.dev/'+file,{cache:'no-store'});assert.ok(response.ok,file);assert.equal(hash(Buffer.from(await response.arrayBuffer())),h,file);}
}
console.log(JSON.stringify({revision:f.revision,tests,preflight:process.argv.includes('--preflight'),steps:a.steps,checks:a.checks,nativeWidths:n.frames.map(v=>v.width),historical:historical.length,published:process.argv.includes('--published')}));
