import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {hallFixture} from './hall-scenarios.mjs';import {commonContext} from './common-life-scenarios.mjs';
import {planSongWork} from '../modules/hall-activities.js';import {step,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {YEAR_TICKS} from '../calendar.js';
const report={steps:0,checks:0,cases:[]},start=performance.now();
function physical(s,helper){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;const h=c.actorStates[helper];for(const k of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[k];c.actorStates={[helper]:h};delete c.hero;for(const k of ['generation','observation','journal','observerKnowledge','nextNPCObservation'])delete c[k];for(const p of Object.values(c.people))delete p.actorLink;for(const l of c.lives)for(const k of ['timeline','timelineDropped','milestones'])delete l[k];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}return JSON.stringify(c);}
for(const mode of ['paid','listener-left','off']){
 const f=hallFixture();let a=f.s;assert.ok(planSongWork(a,commonContext,{reason:'Заработать на ближайшие нужды.'}));const helper=f.h.lineage,owner=f.p.id,venue=f.d.id;let b=restore(serialize(a)),c=restore(serialize(a));assert.ok(observeExistingPerson(c,owner));let first=null,captured=false;
 for(let i=0;i<YEAR_TICKS;i++){
  if(i===2&&mode!=='paid')for(const s of [a,b,c]){if(mode==='off')setModule(s,'hall-activities',false);else{const p=s.people[owner];p.area='a1';p.interiorStay=null;}}
  for(const s of [a,b,c]){step(s);report.steps++;}
  const r=a.areas.a1.objects.find(o=>o.id===venue).performance;if(!captured&&mode==='paid'&&r?.status==='active'){await writeFile('artifacts/hall-performance-life.json',serialize(a));captured=true;}
  if(!first&&r&&r.status!=='active')first={tick:a.tick,status:r.status,paid:r.paid||0,refund:r.refunded||0,held:r.held};
  if(i<90||i%307===0){assert.equal(physical(a,helper),physical(b,helper),mode+' repeat '+a.tick);assert.equal(physical(a,helper),physical(c,helper),mode+' observer '+a.tick);const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);report.checks++;}
 }
 assert.ok(first);assert.equal(first.status,mode==='paid'?'done':'cancelled');assert.equal(first.paid,mode==='paid'?9:0);assert.equal(first.refund,mode==='paid'?0:9);assert.equal(first.held,0);assert.equal(a.nextGeneration,1);
 report.cases.push({mode,first,tick:a.tick,heroAlive:a.actorStates[helper].alive,ownerAlive:a.people[owner].alive});console.log(JSON.stringify(report.cases.at(-1)));
}
report.elapsedMs=performance.now()-start;await writeFile('artifacts/hall-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
