import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {companionAffairFixture,relativeArrivesAtCamp} from './companion-affair-scenarios.mjs';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/companion-affairs-150',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision);await fs.mkdir(runtime,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(hash(bytes),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(hash(await fs.readFile(path.join(root,file))),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/npc-intentions-149/runtime-fd27c3aa734db702'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'fd27c3aa734db702',schema:'click-odyssey/144',checks:0,steps:0,preparationActorTurns:0,rows:[],scope:'Bounded OFF baseline equality, natural deterministic prefixes and prepared two-affair camp choices with actual paid lessons, actual witnessed news and two observers. Not a whole-life frequency estimate.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['companion-affairs'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['companion-affairs'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'companion-affairs',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});}
for(const seed of [0,1,4,5]){const s=current.createWorld(seed);let other=current.restore(current.serialize(s));for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}assert.equal(current.serialize(s),current.serialize(other));report.checks++;report.rows.push({kind:'natural-prefix',seed,ticks:1200,companionsWithConflict:Object.values(s.people).filter(p=>p.companionAffairs).length});}
const modes=['part','shared','study','postpone','deadline','hidden','news'];
for(const observer of ['original','companion'])for(const mode of modes){
 const opts=mode==='shared'?{shared:true}:['study','hidden','news'].includes(mode)?{health:65,paid:2}:mode==='deadline'?{health:65}:mode==='postpone'?{carried:false}:{};
 const f=companionAffairFixture(opts),{s,p,parent,teacher,order}=f,first=structuredClone(p.personalJourney.lessons[0]),deadline=p.personalJourney.due,hard=p.personalJourney.abandonAfter;
 if(mode==='postpone')p.agenda.wealth=0;if(mode==='deadline')s.tick=deadline-8;if(mode==='hidden')parent.health=15;if(mode==='news')report.preparationActorTurns+=relativeArrivesAtCamp(f);
 syncActiveActor(s);const initial=current.serialize(s),outputs=[],leader=s.hero.lineage;
 for(const batch of [13,17]){let w=current.restore(initial);if(observer==='companion')assert.ok(current.observeExistingPerson(w,p.id));for(let i=0;i<640;i++){current.step(w);report.steps++;if(mode==='shared'&&i<5){assert.ok(w.actorStates[leader].companions.some(c=>c.person===p.id));assert.ok(w.people[p.id].companionAffairs.agreement.until>w.tick);report.checks+=2;}if(i%batch===batch-1){const raw=current.serialize(w);w=current.restore(raw);assert.equal(current.serialize(w),raw);report.checks++;}}
  const actual=w.people[p.id],history=actual.companionAffairs?.history,firstDecision=history?.[0],need=actual.familyNeeds.cases[parent.id];assert.ok(firstDecision);assert.equal(firstDecision.outcome,mode==='shared'?'shared':mode==='postpone'?'postponed':'parted');
  if(mode!=='postpone'){const domain=['study','deadline','hidden'].includes(mode)?'learning':'family';assert.ok(firstDecision.selected.startsWith(domain==='family'?p.id+'/family/':'learning/'));}
  assert.equal(actual.personalJourney.due,deadline);assert.equal(actual.personalJourney.abandonAfter,hard);assert.deepEqual(actual.personalJourney.lessons[0],first);assert.equal(actual.forging.orders[order.id].id,order.id);assert.ok(actual.forging.orders[order.id].progress>=1);assert.equal(w.hero.quests.some(q=>q.id===firstDecision.selected),false);
  if(mode==='part'){assert.equal(need.status,'supplied');assert.equal(need.receipt.medicine,2);}if(mode==='postpone'){assert.ok(history.some(e=>e.outcome==='parted'));assert.ok(!need.receipt);}report.checks+=8;outputs.push(current.serialize(w));
 }
 assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:'prepared-'+observer+'-'+mode,ticks:640,batches:[13,17],equal:true});
}
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
