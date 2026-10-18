import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {npcDeedFixture,npcLearningDeedFixture,addWorkerRelative,npcDeedContext as ctx} from './npc-deed-scenarios.mjs';
import {npcDeedsTick} from '../modules/npc-deeds.js';
import {step} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/npc-intentions-149',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision);await fs.mkdir(runtime,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(hash(bytes),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(hash(await fs.readFile(path.join(root,file))),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/biomaterial-148/runtime-18413c510d834312'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'18413c510d834312',schema:'click-odyssey/144',checks:0,steps:0,rows:[],scope:'Bounded OFF baseline equality, natural deterministic prefixes and prepared worker/family/paid learning interruptions. Not a full-life frequency estimate.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['npc-intentions'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['npc-intentions'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'npc-intentions',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});}
for(const seed of [0,1,4,5]){const s=current.createWorld(seed);let other=current.restore(current.serialize(s));for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}assert.equal(current.serialize(s),current.serialize(other));report.checks++;report.rows.push({kind:'natural-prefix',seed,ticks:1200,workers:Object.values(s.people).filter(p=>p.npcIntentions).length,familyEpisodes:Object.values(s.people).reduce((n,p)=>n+(p.familyNeeds?.serial||0),0)});}
for(const observer of ['original','worker'])for(const mode of ['aid','purchase','risk','learning']){
 const f=mode==='learning'?npcLearningDeedFixture():npcDeedFixture({carried:mode!=='purchase'}),{s,p,order}=f;
 if(mode==='learning'){for(let i=0;i<800&&p.personalJourney.lessons.length<1;i++)step(s);assert.equal(p.personalJourney.lessons.length,1);addWorkerRelative(f);s.tick++;}
 if(mode==='risk')s.areas[p.area].objects.push({id:'audit/threat',kind:'enemy',alive:true,resolved:false,x:p.x+4,hp:500,maxHp:500,attack:100});
 npcDeedsTick(s,p,ctx);syncActiveActor(s);const initial=current.serialize(s),outputs=[];
 for(const batch of [13,17]){let w=current.restore(initial);if(observer==='worker')assert.ok(current.observeExistingPerson(w,p.id));for(let i=0;i<320;i++){current.step(w);report.steps++;if(i%batch===batch-1){const raw=current.serialize(w);w=current.restore(raw);assert.equal(current.serialize(w),raw);report.checks++;}}
  const actual=w.people[p.id],caseRecord=Object.values(actual.familyNeeds.cases)[0],actualOrder=actual.forging.orders[order.id];assert.equal(actualOrder.id,order.id);assert.ok(actualOrder.progress>=1&&actualOrder.progress<=6);
  if(mode==='risk'){assert.ok(actual.npcIntentions.history.some(e=>e.kind==='refused'));assert.ok(!caseRecord.receipt);}else{assert.equal(caseRecord.status,'supplied');assert.equal(caseRecord.receipt.medicine,2);if(mode==='purchase'){assert.equal(caseRecord.purchases.length,1);assert.equal(caseRecord.purchases[0].price,8);}if(mode!=='learning')assert.equal(actualOrder.status,'completed');else assert.ok(actual.personalJourney.lessons.length>=1);}
  report.checks+=4;outputs.push(current.serialize(w));
 }
 assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:'prepared-'+observer+'-'+mode,ticks:320,batches:[13,17],equal:true});
}
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
