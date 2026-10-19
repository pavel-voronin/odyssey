import test from 'node:test';import assert from 'node:assert/strict';
import {postedStealth,approachPost,quietPass,trainedStealth,exactStealth,stealthContext as ctx} from '../scripts/stealth-scenarios.mjs';
import {guardSense,stealthWalkQuote,sightBarrier,walkNoise} from '../modules/stealth-state.js';
import {peopleTick} from '../modules/people.js';
import {stealthLesson,stealthLessonTask} from '../modules/stealth-lessons.js';
import {positionFixture} from '../scripts/position-scenarios.mjs';
import {step,serialize,restore,observeExistingPerson} from '../engine.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {areaScale} from '../geometry.js';import {setModule} from '../rules.js';
import {catchUp,createClock} from '../clock.js';import {stealthHTML} from '../stealth-sheet.js';
// PARTIAL: six selected groups, <=16 actual actions/native phases per case
// after bounded current source constructors; <=30s suite. No lives/matrix.
test('one actual patrol post: direction, logical daylight/night, physical range, foot noise and an actual low stone barrier',()=>{
 const f=postedStealth(),{s,h,guards:[g],areas:[a]}=f;s.tick=40;g.agenda.task={kind:'patrol',target:g.area,x:g.x,remaining:3};peopleTick(s,ctx);s.tick=48;peopleTick(s,ctx);approachPost(f);const at=d=>g.x+d/areaScale(a);
 assert.equal(guardSense(s,g,h.lineage,at(15)).seen,true);assert.equal(guardSense(s,g,h.lineage,at(-5)).seen,false);assert.equal(guardSense(s,g,h.lineage,at(25)).seen,false);assert.equal(guardSense(s,g,h.lineage,at(15),{quiet:true}).seen,false);
 s.tick=200;assert.equal(guardSense(s,g,h.lineage,at(15)).seen,false);assert.equal(guardSense(s,g,h.lineage,at(5)).seen,true);assert.equal(guardSense(s,g,h.lineage,at(5),{noise:walkNoise(s,h.lineage,6)}).heard,true);
 const pos=positionFixture();assert.equal(sightBarrier(pos.room,50,34,{quiet:true}),pos.cover);assert.equal(sightBarrier(pos.room,50,34),null);assert.equal(sightBarrier(pos.room,50,46,{quiet:true}),null);exactStealth(s);
});
test('two different real posts teach a method; replaying one post grants no duplicate practice and unchanged guile is insufficient',()=>{
 const f=trainedStealth();assert.equal(f.p.skillPractice.stealth.total,2);assert.equal(new Set(f.p.skillPractice.stealth.operations.map(r=>r.guard)).size,2);assert.equal(f.h.stats.guile,4);exactStealth(f.s);
 const q=postedStealth();quietPass(q);quietPass(q);assert.equal(q.p.stealth.passes.length,2);assert.equal(q.p.skillPractice.stealth.total,1);assert.equal(q.p.skillPractice.stealth.method,undefined);exactStealth(q.s);
});
test('the learned method waits only for a personally observed turn; equal-guile novice/bold choices differ and no wait creates practice',()=>{
 const f=trainedStealth(),n=postedStealth();approachPost(n);step(n.s);
 for(const q of [f,n]){const {s,h,guards:[g],areas:[a]}=q;for(const at of [40,48]){s.tick=at;g.agenda.task={kind:'patrol',target:g.area,x:g.x,remaining:3};peopleTick(s,ctx);}s.tick=54;approachPost(q);h.x=g.x+16/areaScale(a);syncActiveActor(s);}
 assert.equal(stealthWalkQuote(f.s,f.p.id,f.h.goal.x).mode,'wait');assert.equal(stealthWalkQuote(n.s,n.p.id,n.h.goal.x).mode,'quiet');n.h.personality.courage=.9;assert.equal(stealthWalkQuote(n.s,n.p.id,n.h.goal.x).mode,'normal');
 step(f.s);assert.equal(f.p.stealth.active.waits,1);assert.equal(f.p.skillPractice.stealth.total,2);step(f.s);assert.equal(f.p.stealth.lastMode,'quiet');assert.equal(f.p.stealth.active.detected,false);exactStealth(f.s);
});
test('heard footsteps have no identity; a real native guard searches only the last perceived coordinate and stops locally',()=>{
 const f=postedStealth(),{s,h,p,guards:[g],areas:[a]}=f;approachPost(f);h.x=g.x+4/areaScale(a);h.inventory.rations=22;syncActiveActor(s);step(s);assert.equal(g.guardWatch.search?.kind,'heard');assert.equal(g.guardWatch.search.actor,null);assert.equal(g.guardWatch.notices.length,0);const last=g.guardWatch.search.x;
 // Prepared departure boundary, followed by actual ordinary movement through
 // the adjacent area edge; search never reads that actor's new coordinate.
 h.x=1;h.goal={kind:'explore',area:'a0',x:50,started:s.tick};syncActiveActor(s);step(s);step(s);assert.equal(h.area,'a0');
 const walker=Object.values(s.people).find(q=>q.alive&&q.agenda&&!f.guards.includes(q)&&q!==p);Object.assign(walker,{area:a.id,x:g.guardWatch.post.x+19/areaScale(a),status:'resident',health:walker.maxHealth||100,ailment:null});Object.assign(walker.needs,{energy:100,hunger:0,sleeping:false});Object.assign(walker.agenda,{duty:.9,task:{kind:'work',target:a.id,x:g.guardWatch.post.x-12/areaScale(a),remaining:3},due:0});
 for(const at of [32,40,48]){s.tick=at;peopleTick(s,ctx);if(at===32){assert.equal(walker.stealth?.lastMode,'quiet');walker.status='absent';}assert.equal(g.area,a.id);if(g.guardWatch.search)assert.equal(g.guardWatch.search.x,last);}s.tick=56;peopleTick(s,ctx);assert.equal(g.guardWatch.search,null);assert.ok(g.guardWatch.history.some(e=>e.kind==='search'&&e.actor===null));exactStealth(s);
});
test('a genuine practitioner voluntarily teaches an ordinary NPC at a safe actual rest, once, for one coin and one body action each',()=>{
 const f=trainedStealth(),{s,h,p}=f,a=Object.values(s.areas).find(a=>!a.interior&&!f.areas.includes(a)&&a.objects.some(o=>o.kind==='rest')),rest=a.objects.find(o=>o.kind==='rest'),q=Object.values(s.people).find(q=>q.id!==p.id&&!f.guards.includes(q)&&q.alive&&q.agenda);Object.assign(h,{area:a.id,x:rest.x});h.personality.generosity=.9;Object.assign(q,{area:a.id,x:rest.x,status:'resident',health:q.maxHealth||100,ailment:null});Object.assign(q.needs,{energy:100,hunger:0,sleeping:false});Object.assign(q.agenda,{task:null,due:0,duty:.8,sociability:.8,curiosity:.8});setActorMoney(s,q,2);syncActiveActor(s);s.tick++;assert.equal(stealthLessonTask(s,p).pupil,q.id);const before=h.gold,energy=q.needs.energy;
 h.goal={kind:'stealthLesson',area:a.id,x:rest.x,pupil:q.id,teacher:p.id,person:q.id,started:s.tick};step(s);assert.equal(h.goal,null);assert.equal(q.skillPractice.stealth.method.origin,'lesson');assert.equal(q.skillPractice.stealth.total,0);assert.equal(q.agenda.wealth,1);assert.equal(h.gold,before+1);assert.equal(q.needs.energy,energy-1);assert.equal(q.actionControl.tick,s.tick);assert.equal(stealthLesson(s,q,p),false);s.tick++;assert.equal(stealthLesson(s,q,p),false);assert.equal(observeExistingPerson(s,q.id),true);const raw=serialize(s);assert.match(stealthHTML(s,String),/Добровольный урок/);assert.equal(serialize(s),raw);exactStealth(s);
});
test('six ticks match short offline catch-up; OFF preserves evidence, rendering is pure, forged practice/search and outcomes are rejected',()=>{
 const f=postedStealth();approachPost(f);syncActiveActor(f.s);const raw=serialize(f.s),a=restore(raw),b=restore(raw);for(let i=0;i<6;i++)step(a);assert.equal(catchUp(createClock(0),6000,()=>step(b),6),6);assert.equal(serialize(a),serialize(b));const saved=serialize(a);assert.match(stealthHTML(a,String),/Тихий проход завершён/);assert.equal(serialize(a),saved);exactStealth(a);
 const bad=restore(saved);bad.people[a.hero.lineage].stealth.passes[0].quietSteps++;assert.throws(()=>restore(serialize(bad)),/stealth/);const fake=restore(saved);fake.people[a.hero.lineage].skillPractice.stealth.operations[0].guard=f.guards[1].id;assert.throws(()=>restore(serialize(fake)),/stealth/);
 const off=restore(raw);step(off);setModule(off,'stealth',false);const p=off.people[off.hero.lineage],before=JSON.stringify(p.stealth);step(off);assert.equal(JSON.stringify(p.stealth),before);exactStealth(off);setModule(off,'stealth',true);step(off);assert.ok(p.stealth.passes.some(r=>r.status==='interrupted'));exactStealth(off);
});
