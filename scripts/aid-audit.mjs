import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {aidFixture,aidCargoFixture} from './aid-scenarios.mjs';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {YEAR_TICKS} from '../calendar.js';
const report={steps:0,checks:0,runs:[],maxBytes:0},started=performance.now();
const baseline=aidCargoFixture();setModule(baseline.s,'personal-aid',false);while(baseline.c.status!=='done')step(baseline.s);const tight=baseline.s.tick+2;
function physical(s,helper){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;const h=c.actorStates[helper];for(const k of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[k];c.actorStates={[helper]:h};delete c.hero;for(const k of ['generation','observation','journal','observerKnowledge','nextNPCObservation'])delete c[k];for(const p of Object.values(c.people))delete p.actorLink;for(const l of c.lives)for(const k of ['timeline','timelineDropped','milestones'])delete l[k];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}return JSON.stringify(c);}
function diff(a,b,path='',out=[]){if(out.length>=5)return out;if(typeof a!==typeof b||a===null||b===null||typeof a!=='object'){if(a!==b)out.push({path,a,b});return out;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key,out);return out;}
for(const kind of ['care','untrained','cargo','deadline']){
 const f=kind==='cargo'||kind==='deadline'?aidCargoFixture({generosity:1}):aidFixture({trained:kind!=='untrained'});let a=f.s;const helper=f.h.lineage,patient=(f.patient||f.p).id,order=f.c?.id;if(kind==='deadline')f.c.deadline=tight;
 let repeat=restore(serialize(a)),observed=restore(serialize(a));assert.ok(observeExistingPerson(observed,patient));const initial=a.tick,seen=new Set();let first=null,captured=false;
 for(let i=0;i<YEAR_TICKS;i++){
  for(const s of [a,repeat,observed]){step(s);report.steps++;}
  const request=a.people[patient].aidRequest;if(request)seen.add(request.id);
  if(!first&&request&&['helped','declined'].includes(request.status))first={tick:a.tick,status:request.status,health:a.people[patient].health,herbs:a.actorStates[helper].inventory.herbs};
  if(kind==='cargo'&&!captured&&request?.status==='agreed'){await writeFile('artifacts/aid-cargo-life.json',serialize(a));captured=true;}
  if(i<70||i%251===0){const left=physical(a,helper);for(const s of [repeat,observed]){const right=physical(s,helper);assert.ok(left===right,kind+' observer changes physics '+a.tick+': '+JSON.stringify(diff(JSON.parse(left),JSON.parse(right))));}const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(save),Buffer.byteLength(serialize(observed)));report.checks++;}
 }
 assert.equal(physical(a,helper),physical(repeat,helper));assert.equal(physical(a,helper),physical(observed,helper));assert.ok(first);const h=a.actorStates[helper],p=a.people[patient],c=order&&a.workOrders[order];assert.equal(a.nextGeneration,1);assert.equal(h.alive,true);assert.equal(first.status,kind==='untrained'?'declined':'helped');if(c){assert.equal(c.status,kind==='deadline'?'cancelled':'done');assert.equal(c.paid||0,kind==='deadline'?0:6);assert.equal(c.materialsPaid,18);}
 report.runs.push({kind,from:initial,tick:a.tick,first,requests:seen.size,patientAlive:p.alive,health:p.health,helperAlive:h.alive,herbs:h.inventory.herbs,profession:h.profession,order:c&&{status:c.status,paid:c.paid||0,refund:c.refunded||0,materials:c.materialsPaid},cargo:h.workMaterials.cargo.length});console.log(JSON.stringify(report.runs.at(-1)));
}
report.elapsedMs=performance.now()-started;await writeFile('artifacts/aid-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
