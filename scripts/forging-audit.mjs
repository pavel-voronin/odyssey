import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {forgingFixture,forgingContext} from './forging-scenarios.mjs';
const dir='artifacts/forge-145',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision);
await fs.mkdir(runtime,{recursive:true});
for(const [file,expected]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);await fs.writeFile(path.join(runtime,file),bytes);}
await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);const bytes=await fs.readFile(path.join(root,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/schema-144/runtime-2121c22814119381'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'2121c22814119381',schema:'click-odyssey/144',checks:0,steps:0,rows:[],scope:'Bounded deterministic continuations and current baseline OFF comparison. Not a lifetime-frequency estimate.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules.forging;for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags.forging;return JSON.stringify(s);};
for(const seed of [0,1,4,5]){
 const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'forging',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;
 for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}
 report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});
}
for(const seed of [0,1,4,5]){
 const s=current.createWorld(seed);let other=current.restore(current.serialize(s));
 for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}
 assert.equal(current.serialize(s),current.serialize(other));report.checks++;
 const orders=Object.values(s.people).flatMap(p=>Object.values(p.forging?.orders||{}));report.rows.push({kind:'natural-prefix',seed,ticks:1200,orders:orders.length,completed:orders.filter(o=>o.status==='completed').length,heroOrder:s.people[s.hero.lineage].forging?.active||null});
}
// Prepared active order keeps the same result across two different reload
// batches and module interruptions at identical actual world ticks.
for(const npc of [false,true]){
 const prepared=forgingFixture({npc,interior:true}),raw=current.serialize(prepared.s),outputs=[];
 for(const batch of [13,17]){let s=current.restore(raw);if(npc){rules.setModule(s,'people',true);s.people[prepared.worker.id].agenda.due=0;s.people[prepared.worker.id].agenda.tools=1;}
  for(let i=0;i<320;i++){if(i===45)rules.setModule(s,'forging',false);if(i===77)rules.setModule(s,'forging',true);current.step(s);report.steps++;if(i%batch===batch-1){const saved=current.serialize(s);s=current.restore(saved);assert.equal(current.serialize(s),saved);report.checks++;}}
  outputs.push(current.serialize(s));}
 assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:npc?'prepared-NPC':'prepared-hero',ticks:320,batches:[13,17],equal:true});
}
await fs.writeFile(path.join(dir,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
