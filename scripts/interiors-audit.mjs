import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {interiorFixture} from './interiors-scenarios.mjs';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {YEAR_TICKS} from '../calendar.js';
const result={steps:0,checks:0,cases:[]},start=performance.now();
function physical(s,helper){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;const h=c.actorStates[helper];for(const k of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[k];c.actorStates={[helper]:h};delete c.hero;for(const k of ['generation','observation','journal','observerKnowledge','nextNPCObservation'])delete c[k];for(const p of Object.values(c.people))delete p.actorLink;for(const l of c.lives)for(const k of ['timeline','timelineDropped','milestones'])delete l[k];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}return JSON.stringify(c);}
for(const mode of ['open','closed-after-entry','off-after-entry']){
 const f=interiorFixture(),id=f.h.lineage;let a=f.s,b=restore(serialize(a)),c=restore(serialize(a));assert.ok(observeExistingPerson(c,f.p.id));let entered=false,exited=false,native=false;const ids=Object.keys(a.people).length;
 for(let i=0;i<YEAR_TICKS;i++){
  if(i===20&&mode!=='open')for(const s of [a,b,c]){if(mode==='off-after-entry')setModule(s,'interiors',false);else s.areas.a1.objects.find(o=>o.kind==='tavern').closed=true;}
  for(const s of [a,b,c]){step(s);result.steps++;}
  const h=a.actorStates[id];if(h.area===f.hall.id){entered=true;if(mode==='open'&&!native){await writeFile('artifacts/interior-mobile-life.json',serialize(a));native=true;}}else if(entered)exited=true;
  if(i<120||i%307===0){assert.equal(physical(a,id),physical(b,id),mode+' repeat '+a.tick);assert.equal(physical(a,id),physical(c,id),mode+' observer '+a.tick);const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);for(const person of Object.keys(f.s.people))assert.ok(a.people[person]);for(const p of Object.values(a.people))if(p.alive&&p.area){const places=Object.values(a.areas).filter(ar=>(ar.population||[]).includes(p.id));assert.ok(places.length<=1,p.id+' duplicate presence');}result.checks++;}
 }
 assert.ok(entered&&exited);assert.equal(a.nextGeneration,1);assert.equal(Object.values(a.areas).filter(ar=>ar.interior?.building===f.d.id&&ar.interior.kind==='tavern').length,1);
 result.cases.push({mode,tick:a.tick,entered,exited,hostAlive:a.people[f.p.id].alive,hostArea:a.people[f.p.id].area,heroAlive:a.actorStates[id].alive,rooms:Object.values(a.areas).filter(ar=>ar.interior).length,people:ids});console.log(JSON.stringify(result.cases.at(-1)));
}
result.elapsedMs=performance.now()-start;await writeFile('artifacts/interiors-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
