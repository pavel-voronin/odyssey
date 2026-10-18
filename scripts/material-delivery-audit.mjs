import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {materialDeliveryFixture} from './material-delivery-scenarios.mjs';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/material-delegation-151',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision),hash=b=>createHash('sha256').update(b).digest('hex');await fs.mkdir(runtime,{recursive:true});
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(hash(bytes),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(hash(await fs.readFile(path.join(root,file))),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/companion-affairs-150/runtime-ef2680413e6a65ef'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'ef2680413e6a65ef',schema:'click-odyssey/144',checks:0,steps:0,rows:[],scope:'Bounded OFF equality, exact natural prefixes and actual controller deliveries. Prepared prior visits, wound/shortage/safe roads; interventions alter finite stock, known risk, a new physical journey or OFF, never teleport bodies. Per-observer whole-state replay; cross-observer delivery/physical body/resource comparisons. Not a whole-life frequency estimate.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['material-delivery'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['material-delivery'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'material-delivery',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});}
for(const seed of [0,1,4,5]){const s=current.createWorld(seed);let other=current.restore(current.serialize(s));for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}assert.equal(current.serialize(s),current.serialize(other));report.checks++;report.rows.push({kind:'natural-prefix',seed,ticks:1200,orders:Object.values(s.materialDeliveries?.orders||{}).length});}
function physical(s,id){const p=s.people[id];return {area:p.area,x:p.x,alive:p.alive,health:p.health,needs:p.needs,wealth:p.agenda.wealth,memory:p.materialMemory,cargo:p.materialCargo};}
const modes=['full','partial','empty','buyer','negotiated','OFF','risk'];
for(const ownerMode of ['npc','actor'])for(const mode of modes){
 const f=materialDeliveryFixture({ownerMode,carrierMode:'npc'}),{s,h,client,carrier,source,a}=f;rules.setModule(s,'npc-needs',false);client.agenda.due=1000000000;
 for(const area of Object.values(s.areas))for(const o of area.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 if(mode==='partial'||mode==='empty'){const remaining=mode==='partial'?1:0;source.goodsRaw.extracted+=source.goodsRaw.remaining-remaining;source.goodsRaw.remaining=remaining;}
 if(mode==='negotiated')carrier.agenda.duty=.1;
 if(mode==='risk')carrier.navigation.places.find(k=>k.area===source.id).hazardUntil=s.tick+960;
 syncActiveActor(s);const original=h.lineage;for(const id of new Set([client.id,carrier.id]))if(id!==original)assert.ok(current.observeExistingPerson(s,id));assert.ok(current.observeDetailedActor(s,original));
 const initial=current.serialize(s),observers=[...new Set([original,client.id,carrier.id])],cross=[];
 for(const observer of observers){const outputs=[];
  for(const batch of [13,17]){let w=current.restore(initial);if(observer!==original)assert.ok(current.observeExistingPerson(w,observer));
   for(let i=0;i<640;i++){
    if(i===320&&mode==='OFF')rules.setModule(w,'material-delivery',false);
    if(i===320&&mode==='buyer'){
     const p=w.people[client.id],actor=w.actorStates[p.id];
     if(ownerMode==='actor'){actor.goal={kind:'leisure',area:'a1',x:42,remaining:1000,started:w.tick};actor.intent='Другое продолжительное занятие в знакомом месте';actor.reason='Prepared interference: a new physical journey supersedes the pickup agreement.';}
     else {p.agenda.task={kind:'visit',target:'a1',x:42,remaining:1,person:original,home:a.id,knownNavigation:true};p.agenda.due=w.tick;p.status='wandering';}
    }
    current.step(w);report.steps++;
    if(i%batch===batch-1){const raw=current.serialize(w);w=current.restore(raw);assert.equal(current.serialize(w),raw);report.checks++;}
   }
   const orders=Object.values(w.materialDeliveries?.orders||{}),o=orders.find(o=>o.client===client.id&&o.carrier===carrier.id);assert.ok(o);
   const expected=['partial','empty','buyer','OFF','risk'].includes(mode)?{partial:'partial',empty:'failed',buyer:'unresolved',OFF:'unresolved',risk:'declined'}[mode]:'completed';assert.equal(o.status,expected,ownerMode+'/'+mode+'/'+observer);
   assert.equal(o.budget,o.paid+o.escrow+(o.refunded||0));assert.equal(o.quantity,2);assert.equal(o.work,mode==='risk'?0:3);assert.equal(o.paid,mode==='risk'?0:mode==='partial'?3:['empty','buyer','OFF'].includes(mode)?2:mode==='negotiated'?8:6);
   if(['full','negotiated','partial'].includes(mode)){assert.equal(o.receipt.from,carrier.id);assert.equal(o.receipt.to,client.id);assert.equal(o.receipt.quantity,mode==='partial'?1:2);assert.equal(w.people[carrier.id].materialCargo,undefined);}else if(['buyer','OFF'].includes(mode)){assert.equal(w.people[carrier.id].materialCargo.quantity,2);assert.equal(o.delivered,0);}
   const raw=w.areas[source.id].goodsRaw;assert.equal(raw.initial-raw.extracted,raw.remaining);report.checks+=10;outputs.push(current.serialize(w));
   if(ownerMode==='actor'&&['full','negotiated'].includes(mode)){const made=Object.values(w.people[client.id].forging?.orders||{}).find(q=>q.status==='completed'&&q.started>o.receipt.tick);assert.ok(made);assert.ok(made.materials.every(m=>m.source===o.receipt.store&&m.state==='consumed'));report.checks+=2;}
   if(batch===13){const materials=w.areas[w.areas[a.id].city||a.id].goods.sources.materials;cross.push({orders:w.materialDeliveries,client:physical(w,client.id),carrier:physical(w,carrier.id),source:raw,materials});}
  }
  assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:'prepared',ownerMode,mode,observer:observer===original?'original':observer===client.id?'client':'carrier',ticks:640,batches:[13,17],equal:true});
 }
 for(const outcome of cross.slice(1)){assert.deepEqual(outcome,cross[0],ownerMode+'/'+mode+' observation interference');report.checks++;}
}
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({revision:report.revision,steps:report.steps,checks:report.checks,rows:report.rows.length,publicFiles:Object.keys(r.manifest.files).length,natural:report.rows.filter(r=>r.kind==='natural-prefix')}));
