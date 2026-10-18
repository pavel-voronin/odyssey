import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {runTickBatch} from '../tick-batch.js';
import {createYearRun,runWorldBatch,YEAR_TICKS} from '../playback.js';
import {catchUp,createClock,hasDue} from '../clock.js';
import {yearFixture} from '../scripts/year-scenarios.mjs';
import {commonFixture,commonContext} from '../scripts/common-life-scenarios.mjs';
import {settleLife} from '../modules/lifecycle.js';
import {setModule} from '../rules.js';

test('19200 inert counter steps: exact last remainder, 250 cap, no generation binding or extra tick',()=>{
 const s={tick:137,generation:1,observation:{person:'one'}},run=createYearRun(s);let calls=0,last;
 // Technical stub only: no world, AI, life or gameplay is simulated in this count.
 do{last=runWorldBatch(s,run,{advance:v=>{v.tick++;calls++;v.generation++;},now:()=>0});assert.ok(last.ticks<=250);}while(!last.finished);
 assert.equal(calls,YEAR_TICKS);assert.equal(s.tick,137+YEAR_TICKS);assert.equal(last.ticks,200);assert.equal(last.remaining,0);
 assert.equal(runWorldBatch(s,run,{advance:()=>assert.fail('extra step'),now:()=>0}).ticks,0);
});
test('one shared packet yields after 20ms and keeps the exact unexecuted remainder',()=>{
 let ms=0,n=0;assert.equal(runTickBatch(()=>{n++;ms+=7;},{limit:250,now:()=>ms}),3);assert.equal(n,3);
 ms=0;assert.equal(runTickBatch(()=>ms+=24,{limit:250,now:()=>ms}),1);
 const s={tick:10,observation:{person:'one'}},run=createYearRun(s);ms=0;
 assert.deepEqual(runWorldBatch(s,run,{advance:v=>{v.tick++;ms+=10;},now:()=>ms}),{ticks:2,remaining:19198,finished:false,interrupted:false});
});
test('death on step two freezes only that body: eight real steps equal ordinary world steps, one grave and no heir',()=>{
 const {s,h}=yearFixture({death:true}),slow=restore(serialize(s)),run=createYearRun(s),person=h.lineage,people=s.nextPerson;
 run.endTick=s.tick+8;assert.equal(runWorldBatch(s,run,{now:()=>0}).ticks,8);
 for(let n=0;n<8;n++)step(slow);
 assert.equal(serialize(s),serialize(slow));assert.equal(s.tick,8);assert.equal(s.hero,h);assert.equal(s.observation.person,person);assert.equal(s.nextPerson,people);
 assert.equal(h.alive,false);assert.equal(s.lives.length,1);assert.equal(s.lives[0].ended,2);assert.equal(s.graves.length,1);
 const archive=JSON.stringify(s.lives),hp=h.hp;run.endTick=s.tick+4;runWorldBatch(s,run,{now:()=>0});assert.equal(s.tick,12);assert.equal(h.hp,hp);assert.equal(JSON.stringify(s.lives),archive);
});
test('living ordinary NPC keeps the same body and personal work through eight real accelerated ticks',()=>{
 const {s}=yearFixture(),p=Object.values(s.people).find(p=>p.alive&&p.area==='a1'&&p.role!=='ребёнок');
 p.agenda.job='farmer';p.agenda.due=s.tick;p.x=42;p.agenda.task={kind:'farm',target:p.area,x:42,remaining:1};p.agenda.duty=1;Object.assign(p.needs,{hunger:10,energy:100,sleeping:false});s.areas.a1.civic.food=10;
 assert.equal(observeExistingPerson(s,p.id),true);const raw=serialize(s),slow=restore(raw),run=createYearRun(s),work=p.agenda.work;
 run.endTick=s.tick+8;runWorldBatch(s,run,{now:()=>0});for(let n=0;n<8;n++)step(slow);
 assert.equal(serialize(s),serialize(slow));assert.equal(s.hero.lineage,p.id);assert.equal(p.alive,true);assert.ok(p.agenda.work>work);
});
test('a settled living observer is not a terminal condition, and stale observation/world cannot execute',()=>{
 const {s,h}=commonFixture();setModule(s,'lifecycle',true);delete h.life.residence;settleLife(s,commonContext);assert.equal(h.life.residence.since,0);syncActiveActor(s);const run=createYearRun(s);run.endTick=s.tick+4;
 assert.equal(runWorldBatch(s,run,{now:()=>0}).ticks,4);assert.equal(s.hero,h);assert.equal(s.tick,4);
 const copy=restore(serialize(s));assert.equal(runWorldBatch(copy,run).interrupted,true);assert.equal(copy.tick,4);
 s.observation.person='another';assert.equal(runWorldBatch(s,run).interrupted,true);assert.equal(s.tick,4);
});
test('offline clock uses the same bounded executor and retains each owed second',()=>{
 const clock=createClock(0);let ticks=0;
 assert.equal(catchUp(clock,9000,()=>ticks++,8,()=>ticks===3),3);assert.equal(clock.anchor,3000);assert.equal(hasDue(clock,9000),true);
 assert.equal(catchUp(clock,9000,()=>ticks++,8),6);assert.equal(ticks,9);assert.equal(clock.anchor,9000);assert.equal(hasDue(clock,9000),false);
});
