import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createWorld,observeExistingPerson,observeDetailedActor,step,serialize,restore} from '../engine.js';
import {observerChoices,observerRequest,commitObserverRequest} from '../observer-choice.js';
import {createClock} from '../clock.js';
const report={seeds:[1,44,68],limit:6000,steps:0,switches:0,checks:0,maxBytes:0,runs:[]},started=performance.now();
function physical(s){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;delete c.hero;for(const key of ['generation','observation','journal','observerKnowledge'])delete c[key];for(const h of Object.values(c.actorStates))for(const key of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[key];for(const l of c.lives)for(const key of ['timeline','timelineDropped','milestones'])delete l[key];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}c.actorStates=Object.fromEntries(Object.entries(c.actorStates).sort(([a],[b])=>a.localeCompare(b)));return JSON.stringify(c);}
for(const seed of report.seeds){
 let a=createWorld(seed);const first=a.hero.lineage,p=Object.values(a.people).find(p=>p.alive&&p.role!=='ребёнок'&&a.areas[p.area]&&p.id!==first);observeExistingPerson(a,p.id);observeDetailedActor(a,first);let b=restore(serialize(a)),changes=0;
 for(let i=0;i<report.limit;i++){
  if(i%97===0){const choice=observerChoices(a).find(c=>[first,p.id].includes(c.id));if(choice){const now=i*1000,clock=createClock(now),request=observerRequest(a,'person',choice.id,now),tick=a.tick;assert.ok(commitObserverRequest(a,clock,request,now));assert.equal(a.tick,tick);assert.equal(commitObserverRequest(a,clock,request,now),false);report.switches++;changes++;}}
  step(a);step(b);report.steps+=2;
  if(i%199===0){assert.ok(physical(a)===physical(b),'observer choice changed physics seed '+seed+' tick '+a.tick);const save=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(save));a=restore(save);assert.equal(serialize(a),save);report.checks++;}
 }
 assert.ok(physical(a)===physical(b));report.runs.push({seed,tick:a.tick,switches:changes,firstAlive:a.actorStates[first].alive,npcAlive:a.people[p.id].alive,birthCounter:a.nextGeneration});console.log(JSON.stringify(report.runs.at(-1)));
}
report.elapsedMs=performance.now()-started;await writeFile('artifacts/observer-choice-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
