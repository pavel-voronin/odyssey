import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {refitFixture,refitContext} from './knife-refit-scenarios.mjs';
import {acceptRefit} from '../modules/knife-refit.js';
const dir='artifacts/refit-146',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision);await fs.mkdir(runtime,{recursive:true});
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex'),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/forge-145/runtime-f288b824bedd1774'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'f288b824bedd1774',schema:'click-odyssey/144',checks:0,steps:0,rows:[],scope:'Bounded current-schema OFF comparison and deterministic reload, not frequency of full lives.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['knife-refit'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['knife-refit'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'knife-refit',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});}
for(const seed of [0,1,4,5]){const s=current.createWorld(seed);let other=current.restore(current.serialize(s));for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}assert.equal(current.serialize(s),current.serialize(other));report.checks++;const orders=Object.values(s.people).flatMap(p=>Object.values(p.knifeRefit?.orders||{}));report.rows.push({kind:'natural-prefix',seed,ticks:1200,orders:orders.length,completed:orders.filter(o=>o.status==='completed').length});}
for(const mode of ['edge','precision'])for(const observer of ['client','master']){
 const f=refitFixture({interior:true,mode});rules.setModule(f.s,'people',true);rules.setModule(f.s,'npc-control',true);const o=acceptRefit(f.s,f.master,f.item,refitContext);assert.ok(o);f.h.goal={kind:'refitMaterial',area:f.a.id,x:42,property:f.o.id,master:f.master.id,started:f.s.tick};const raw=current.serialize(f.s),outputs=[];
 for(const batch of [13,17]){let s=current.restore(raw);if(observer==='master')assert.ok(current.observeExistingPerson(s,f.master.id));for(let i=0;i<320;i++){if(i===45)rules.setModule(s,'knife-refit',false);if(i===77)rules.setModule(s,'knife-refit',true);current.step(s);report.steps++;if(i%batch===batch-1){const saved=current.serialize(s);s=current.restore(saved);assert.equal(current.serialize(s),saved);report.checks++;}}
  const actor=s.actorStates[f.client.id],items=[...actor.bag,...Object.values(actor.equipment).filter(Boolean)].filter(i=>i.id===f.item.id);assert.equal(items.length,1);assert.equal(items[0].refit?.mode,mode);assert.equal(items[0].creator,f.item.creator);assert.equal(items[0].enchantment.resonance,f.item.enchantment.resonance);outputs.push(current.serialize(s));report.checks+=4;
 }
 assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:'prepared-'+mode+'-'+observer,ticks:320,batches:[13,17],equal:true});
}
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
