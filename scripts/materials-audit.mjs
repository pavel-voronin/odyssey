import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {materialFixture} from './materials-scenarios.mjs';
import {step,serialize,restore,createNextStory,observeDetailedActor} from '../engine.js';
import {YEAR_TICKS} from '../calendar.js';
const report={steps:0,checks:0,runs:[],maxBytes:0},started=performance.now();
function physical(s){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;delete c.hero;for(const key of ['generation','observation','journal','observerKnowledge'])delete c[key];for(const h of Object.values(c.actorStates))for(const key of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[key];for(const l of c.lives)for(const key of ['timeline','timelineDropped','milestones'])delete l[key];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}c.actorStates=Object.fromEntries(Object.entries(c.actorStates).sort(([a],[b])=>a.localeCompare(b)));return JSON.stringify(c);}
function diff(a,b,path='',out=[]){if(out.length>=5)return out;if(typeof a!==typeof b||a===null||b===null||typeof a!=='object'){if(a!==b)out.push({path,a,b});return out;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key,out);return out;}
for(const kind of ['transported','stale','fallback','local']){
 let {s:a,h,source,c}=materialFixture({known:kind!=='local',local:kind==='local'?1:0});const helper=h.lineage,id=c.id;if(['stale','fallback'].includes(kind))source.civic.tools=0;
 if(kind==='stale')for(const area of Object.values(a.areas))if(area.civic)area.civic.tools=0;
 createNextStory(a,{allowLiving:true});const other=a.hero.lineage;a.hero.goal={kind:'routeWait',area:a.hero.area,x:a.hero.x,until:1000000};assert.ok(observeDetailedActor(a,helper));
 let repeat=restore(serialize(a)),background=restore(serialize(a));assert.ok(observeDetailedActor(background,other));let captured=false;
 for(let i=0;i<YEAR_TICKS;i++){
  for(const s of [a,repeat,background]){step(s);report.steps++;}
  if(kind==='transported'&&!captured&&a.actorStates[helper].workMaterials.cargo.length){await writeFile('artifacts/material-cargo-life.json',serialize(a));captured=true;}
  if(i%113===0||i<60){const left=physical(a);for(const s of [repeat,background]){const right=physical(s);assert.ok(left===right,kind+' observer changes physics '+a.tick+': '+JSON.stringify(diff(JSON.parse(left),JSON.parse(right))));}const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(save));report.checks++;}
 }
 assert.equal(physical(a),physical(repeat));assert.equal(physical(a),physical(background));const order=a.workOrders[id],body=a.actorStates[helper];assert.equal(body.alive,true);assert.equal(a.nextGeneration,2);assert.equal(order.escrow,0);
 if(kind==='stale'){assert.equal(order.status,'cancelled');assert.equal(order.refunded,24);assert.equal(order.toolPurchase,undefined);}else{assert.equal(order.status,'done');assert.equal(order.paid,6);assert.equal(order.materialsPaid,18);assert.equal(body.counters.customerWork,1);assert.equal(Boolean(order.toolPurchase),kind!=='local');if(kind==='fallback')assert.notEqual(order.toolPurchase.source,source.id);}
 report.runs.push({kind,tick:a.tick,alive:body.alive,status:order.status,fee:order.paid||0,refund:order.refunded||0,supplier:order.toolPurchase?.source,carried:body.workMaterials.cargo.length,birthCounter:a.nextGeneration});console.log(JSON.stringify(report.runs.at(-1)));
}
report.elapsedMs=performance.now()-started;await writeFile('artifacts/materials-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
