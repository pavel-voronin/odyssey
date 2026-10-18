import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,serialize} from '../engine.js';
import {setModule} from '../rules.js';
import {lethalViewFixture} from '../scripts/death-view-scenarios.mjs';
import {commonFixture} from '../scripts/common-life-scenarios.mjs';
import {LifeRecorder,lifeContext} from '../scripts/life-causal-model.mjs';
import {auditWindow,assertSameSave} from '../scripts/life-causal-worker.mjs';
function fatalRecord(s){const r=new LifeRecorder(s),before=lifeContext(s),head=s.journal[0];step(s);r.after(s,before,head);assert.equal(s.hero.alive,false);const saved=serialize(s),row=r.finish(s,{limit:19200});assert.equal(serialize(s),saved);return row;}
test('a real boss death is classified from the explicit combat death and matched physical enemy',()=>{
 const {s,enemy}=lethalViewFixture();enemy.boss=true;const row=fatalRecord(s);assert.equal(row.death.classification,'battle-boss');assert.equal(row.death.before.enemy.id,enemy.id);assert.equal(row.death.cause,enemy.name);assert.equal(row.stoppedBy,'death');assert.equal(row.censored,false);
});
test('an actual fatal poison tick remains poison even when the recorded combat context contains a boss',()=>{
 const {s,h,enemy}=lethalViewFixture();enemy.boss=true;setModule(s,'body',true);setModule(s,'lineage',false);s.tick=7;h.hp=1;h.conditions=[{id:'poison',since:0,until:1000}];const row=fatalRecord(s);
 assert.equal(row.death.before.enemy.boss,true);assert.equal(row.death.classification,'poison');assert.equal(row.death.cause,'Отравление');assert.equal(row.death.tick,8);
});
test('an existing owned workshop and residence are living facts, not a death or forty invented completed jobs',()=>{
 const {s,h}=commonFixture(),r=new LifeRecorder(s),saved=serialize(s),row=r.finish(s,{limit:s.tick});assert.equal(serialize(s),saved);assert.equal(row.stoppedBy,'alive-at-limit');assert.equal(row.alive,true);assert.equal(row.death,null);assert.equal(row.end.actualOwnedWorkshops.length,1);assert.equal(row.end.peacefulWork,h.counters.peacefulWork||0);assert.equal(row.end.peacefulWork,0);
});
test('the audit observer and checkpoint reload do not change a real 256-tick world prefix',async()=>{
 const out=await auditWindow({a:createWorld(1),b:createWorld(1),limit:256,checkpointEvery:32}),plain=createWorld(1);for(let i=0;i<256;i++)step(plain);assert.equal(serialize(out.a),serialize(plain));assert.equal(serialize(out.b),serialize(plain));assert.ok(out.row.checks>=8);assert.equal(out.row.worldSteps,512);
});
test('checkpoint comparison tolerates only the journal field position and still detects world, RNG and journal changes',()=>{
 const a={rng:17,areas:{a0:{x:1},a1:{x:2}},actorStates:{p:{alive:false,actorJournal:[{tick:3,text:'saved'}],hp:0}}};
 const b=structuredClone(a),actor=b.actorStates.p,journal=actor.actorJournal;delete actor.actorJournal;actor.actorJournal=journal;
 assert.equal(assertSameSave(JSON.stringify(a),JSON.stringify(b)),1);
 const altered=structuredClone(b);altered.actorStates.p.actorJournal[0].text='changed';assert.throws(()=>assertSameSave(JSON.stringify(a),JSON.stringify(altered)));
 const rng=structuredClone(b);rng.rng++;assert.throws(()=>assertSameSave(JSON.stringify(a),JSON.stringify(rng)));
 const order=structuredClone(b);order.areas={a1:order.areas.a1,a0:order.areas.a0};assert.throws(()=>assertSameSave(JSON.stringify(a),JSON.stringify(order)));
});
