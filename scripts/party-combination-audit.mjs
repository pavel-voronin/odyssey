import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {pairCombatFixture} from './party-combination-scenarios.mjs';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/party-combinations-153',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision),hash=b=>createHash('sha256').update(b).digest('hex');await fs.mkdir(runtime,{recursive:true});
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(hash(bytes),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(hash(await fs.readFile(path.join(root,file))),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/party-actions-152/runtime-7891ea09c68d9849'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'7891ea09c68d9849',steps:0,checks:0,rows:[],scope:'Bounded natural full-state determinism and OFF equality; prepared actual recruitment, camp approach and three engine practice actions before each trained battle. Two-round move, refusal, wound, missing knowledge, unexpected lethal reply and component toggles. No natural lifetime frequency claim.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['party-combinations'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['party-combinations'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){
 const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'party-combinations',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;
 for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}
 report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});
}
for(const seed of [0,1,4,5]){
 const s=current.createWorld(seed);let other=current.restore(current.serialize(s));
 for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}
 assert.equal(current.serialize(s),current.serialize(other));report.checks++;report.rows.push({kind:'natural-prefix',seed,ticks:1200,practicingPeople:Object.values(s.people).filter(p=>p.pairPractice).length});
}
function physical(s,leader,ids,enemy){const h=s.actorStates[leader];return {tick:s.tick,rng:s.rng,enemy:s.areas.a2.objects.find(e=>e.id===enemy),leader:{alive:h.alive,hp:h.hp,energy:h.energy,round:h.partyCombat,pair:h.pairCombat,companions:h.companions},people:ids.map(id=>{const p=s.people[id];return {id,area:p.area,x:p.x,alive:p.alive,health:p.health,needs:p.needs,money:p.agenda.wealth,supplies:p.roadSupplies,action:p.partyCombat,practice:p.pairPractice,control:p.actionControl};}),remains:s.remains};}
const modes=['trained','untrained','wounded','exhausted','refusal','OFF','charged','interrupted','all-on'],signatures=new Set();
for(const mode of modes){
 const f=pairCombatFixture({trained:mode!=='untrained'}),{s,h,e,guard,striker}=f,leader=h.lineage,ids=[guard.person.id,striker.person.id];
 if(mode==='wounded'){striker.person.health=50;striker.companion.hp=15;}
 if(mode==='exhausted'){guard.person.needs.energy=10;guard.person.needs.sleeping=true;}
 if(mode==='refusal')guard.person.partyRelations={[striker.person.id]:{person:striker.person.id,name:striker.person.name,feeling:-4,events:[],last:s.tick}};
 if(mode==='OFF')rules.setModule(s,'party-combinations',false);
 if(mode==='charged'){e.attack=40;e.tactic='charged';e.battle.intent='strike';delete h.defenseMemory;s.rng=1600;}
 if(mode==='all-on')for(const m of rules.MODULES)rules.setModule(s,m.id,true);
 syncActiveActor(s);for(const id of ids)assert.ok(current.observeExistingPerson(s,id));assert.ok(current.observeDetailedActor(s,leader));
 const initial=current.serialize(s),cross=[];let first,second;
 for(const observer of [leader,...ids]){
  const outputs=[];
  for(const batch of [13,17]){
   let w=current.restore(initial);if(observer!==leader)assert.ok(current.observeExistingPerson(w,observer));
   for(let i=0;i<640;i++){
    current.step(w);report.steps++;const actor=w.actorStates[leader],g=w.people[ids[0]],p=w.people[ids[1]];
    if(i===0){
     first={guard:g.partyCombat?.action||null,striker:p.partyCombat?.action||null,pair:actor.pairCombat?.status||null,replies:w.areas.a2.objects.find(o=>o.id===e.id).battle.turns};
     if(['trained','charged','interrupted'].includes(mode)){assert.equal(first.guard,'cover');assert.equal(first.striker,'prepare');}
     if(['untrained','wounded','refusal','OFF'].includes(mode)){assert.notEqual(first.striker,'prepare');assert.equal(first.pair,null);}
     if(mode==='exhausted'){assert.equal(first.guard,null);assert.equal(first.striker,'attack');assert.equal(first.pair,null);}
     if(mode==='charged'){assert.equal(g.alive,false);assert.equal(first.pair,'cancelled');assert.equal(Object.values(w.remains.byId).filter(b=>b.source.id===ids[0]).length,1);}
     if(mode==='interrupted'){p.health--;actor.companions.find(c=>c.person===p.id).hp--;}
     report.checks+=4;
    }
    if(i===1){
     second={striker:p.partyCombat?.action||null,pair:actor.pairCombat?.status||null,replies:w.areas.a2.objects.find(o=>o.id===e.id).battle.turns};
     if(mode==='trained'){assert.equal(second.striker,'paired-attack');assert.equal(second.pair,'released');assert.equal(second.replies,2);}
     if(mode==='interrupted'){assert.notEqual(second.striker,'paired-attack');assert.equal(second.pair,'cancelled');}
     report.checks+=2;
    }
    for(const id of ids){const person=w.people[id],receipt=person.partyCombat;if(receipt?.tick===w.tick){assert.equal(person.actionControl.phases.filter(p=>p==='combat').length,1);assert.ok(receipt.energy>0);report.checks+=2;}}
    if(i%batch===batch-1){const raw=current.serialize(w);w=current.restore(raw);assert.equal(current.serialize(w),raw);report.checks++;}
   }
   outputs.push(current.serialize(w));if(batch===13)cross.push(physical(w,leader,ids,e.id));
  }
  assert.equal(outputs[0],outputs[1]);report.checks++;
 }
 assert.deepEqual(cross[0],cross[1]);assert.deepEqual(cross[0],cross[2]);report.checks+=2;signatures.add(JSON.stringify({first,second}));report.rows.push({kind:'prepared',mode,first,second,ticks:640,observers:3,batches:[13,17],equal:true});await fs.writeFile(dir+'/audit-running.json',JSON.stringify({...report,distinctOutcomes:signatures.size},null,2));
}
report.distinctOutcomes=signatures.size;assert.ok(report.distinctOutcomes>=5);report.publicFiles=Object.keys(r.manifest.files).length;
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({revision:r.revision,steps:report.steps,checks:report.checks,rows:report.rows.length,distinctOutcomes:report.distinctOutcomes,publicFiles:report.publicFiles}));
