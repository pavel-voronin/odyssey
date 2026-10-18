import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {biomaterialFixture,biomaterialContext as ctx} from './biomaterial-scenarios.mjs';
import {extractBodyMaterial} from '../modules/biomaterials.js';
import {startKnife} from '../modules/forging.js';
import {changeProfession} from '../modules/identity.js';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/biomaterial-148',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision);await fs.mkdir(runtime,{recursive:true});
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex'),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/item-wear-147/runtime-3220bef5a622c32b'),'engine'),rules=await load(runtime,'rules'),originals=await load(runtime,'modules-item-originals');
const report={revision:r.revision,baseline:'3220bef5a622c32b',schema:'click-odyssey/144',checks:0,steps:0,rows:[],scope:'Bounded OFF comparison, natural prefixes and causal extraction/sale/recipe/decay with two observers. Not a full-life frequency estimate.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['animal-materials'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['animal-materials'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'animal-materials',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});}
for(const seed of [0,1,4,5]){const s=current.createWorld(seed);let other=current.restore(current.serialize(s));for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}assert.equal(current.serialize(s),current.serialize(other));report.checks++;const parts=Object.values(s.remains?.byId||{}).filter(b=>b.material);report.rows.push({kind:'natural-prefix',seed,ticks:1200,parts:parts.length,extracted:parts.filter(b=>b.material.state==='extracted').length});}
for(const observer of ['collector','master'])for(const mode of ['extract','sale','forge','decay']){
 const f=biomaterialFixture({interior:true}),{s,h}=f,bodyId=f.remains.id,itemId=f.remains.material.id;let order=null;
 if(['sale','forge'].includes(mode)){for(let i=0;i<3;i++){s.tick++;assert.ok(extractBodyMaterial(s,f.collector,f.remains,ctx));}}
 if(mode==='extract')h.goal={kind:'bodyMaterial',area:h.area,x:f.remains.position.x,body:bodyId,started:s.tick};
 if(mode==='sale'){Object.assign(f.p,{area:h.area,x:h.x,status:'resident'});Object.assign(f.p.agenda,{job:'artisan',task:null,wealth:40});h.memory.people=[f.p.id];h.relations={};h.goal={kind:'bodyMaterialSale',area:h.area,x:h.x,person:f.p.id,item:itemId,started:s.tick};}
 if(mode==='forge'){changeProfession(s,'smith',ctx,'Вернулся к известному ремеслу.');Object.assign(h,{area:f.a.id,x:42,energy:100});order=startKnife(s,f.collector,f.site,ctx);assert.ok(order);h.goal={kind:'forgeWork',area:f.a.id,x:42,property:f.o.id,started:s.tick};}
 if(mode==='decay'){Object.assign(h,{area:f.a.id,x:68,goal:{kind:'rest',area:f.a.id,x:68,started:s.tick}});}
 syncActiveActor(s);const raw=current.serialize(s),outputs=[];
 for(const batch of [13,17]){let w=current.restore(raw);if(observer==='master')assert.ok(current.observeExistingPerson(w,f.p.id));for(let i=0;i<320;i++){if(mode==='decay'&&i===5)w.tick+=721;current.step(w);report.steps++;if(i%batch===batch-1){const saved=current.serialize(w);w=current.restore(saved);assert.equal(current.serialize(w),saved);report.checks++;}}
  const b=w.remains.byId[bodyId],actual=originals.presentItem(w,itemId);assert.equal(b.source.id,f.enemy.id);assert.equal(b.material.remaining,0);if(mode==='decay'){assert.equal(b.material.state,'spoiled');assert.equal(b.material.lost,1);assert.equal(actual,null);}else{assert.equal(b.material.extracted.item,itemId);assert.equal(b.material.extracted.actions,3);if(mode==='forge'){assert.equal(actual,null);assert.ok(w.itemDisposals[itemId]);const knife=originals.presentItem(w,order.id+'/knife')?.item;assert.ok(knife);assert.equal(knife.manufacture.materials[0].provenance.animal,f.enemy.id);}else{assert.ok(actual?.item);assert.equal(actual.item.bioMaterial.animal,f.enemy.id);assert.equal(actual.item.bioMaterial.body,bodyId);if(mode==='sale')assert.equal(actual.id,f.p.id);}}
  report.checks+=5;outputs.push(current.serialize(w));
 }
 assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:'prepared-'+observer+'-'+mode,ticks:320,batches:[13,17],equal:true});
}
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
