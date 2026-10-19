import {actionKey} from '../modules/action-selection.js';
import {acyclicSkillTree,SKILL_TREE} from '../modules/skill-tree-data.js';
import {fieldCraftNodes} from '../modules/field-craft-state.js';
import {createPerson} from '../modules/lineage.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {trackingFixture,crossTraveller,trainedTracker,teacherFixture,studyGoal,trackingContext} from '../scripts/tracking-scenarios.mjs';
import {recordCrossingTrace,localEdgeTraces,trailClarity} from '../modules/edge-traces.js';
import {trackingAction,localTrails,trackingHTML,confirmTracking} from '../modules/tracking.js';
import {step,serialize,restore,createEnemy,observeExistingPerson} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';
import {setModule} from '../rules.js';import {knowsPracticalMethod,rememberPracticalRole} from '../modules/skill-branches.js';
import {npcAction} from '../modules/npc-control.js';import {creatureTrace} from '../modules/bestiary.js';
import {packPetFixture} from '../scripts/pack-pet-scenarios.mjs';import {addRoute} from '../modules/travel.js';import {startMetricTravel,advanceMetricTravel} from '../modules/metric-route.js';
const exact=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);return raw;};
let practiceRaw,teacherRaw;
test('real crossings create finite source-owned edge traces; repeats refresh one source and writers bound an edge at eight',()=>{
 const f=trackingFixture(),{s,h,a}=f;h.goal={kind:'explore',area:'a2',x:5,started:0};const count=s.nextPerson;step(s);assert.equal(h.area,'a2');assert.equal(s.edges['a1|a2'].traces[0].source.id,h.lineage);assert.equal(s.nextPerson,count);
 const people=Array.from({length:9},()=>s.people[createPerson(s,{role:'житель',race:'human',area:a.id,x:100,alive:true},{initialJob:'farmer'})]);for(const p of people){recordCrossingTrace(s,{kind:'person',id:p.id},a.id,'a2');p.area='a2';p.x=5;}assert.equal(s.edges['a1|a2'].traces.length,8);
 const p=people.at(-1);s.tick++;p.x=0;recordCrossingTrace(s,{kind:'person',id:p.id},'a2',a.id);p.area=a.id;p.x=95;assert.equal(s.edges['a1|a2'].traces.length,8);assert.equal(s.edges['a1|a2'].traces.at(-1).at,s.tick);
 assert.equal(recordCrossingTrace(s,{kind:'person',id:p.id},'a3','a2'),null);const raw=exact(s);localEdgeTraces(s);assert.equal(serialize(s),raw);
});
test('a real owned dog crosses one finite metric leg with the same body and one source imprint, without spawning an animal',()=>{
 const {s,h,a,c}=packPetFixture();for(const flag of ['identity','skill-branches','travel','geography-frame'])setModule(s,flag,true);const to=a.links.find(id=>s.areas[id]&&!s.areas[id].interior);h.x=c.packCargo.body.x=100;addRoute(s,a.id,to,{mode:'road',duration:0,cost:0,metric:{version:1,unit:'world',distance:1,terrain:'road',speed:6}});
 const count=s.nextPerson,t=startMetricTravel(s,h,to,5);assert.ok(t);h.transit=t;s.tick++;assert.equal(advanceMetricTravel(s,h,t),true);const traces=s.edges[[a.id,to].sort().join('|')].traces;assert.ok(traces.some(t=>t.source.kind==='pet'&&t.source.id===c.uid));assert.equal(c.packCargo.body.area,to);const n=traces.length;assert.equal(advanceMetricTravel(s,h,t),false);assert.equal(traces.length,n);assert.equal(s.nextPerson,count);assert.equal(recordCrossingTrace(s,{kind:'pet',id:'invented'},a.id,to),null);exact(s);
});
test('two distinct study-then-meeting chains earn the method once; unencountered sources and profession alone do not grant it',()=>{
 const f=trainedTracker(),{s,h}=f,p=s.people[h.lineage];assert.equal(p.skillPractice.tracking.total,2);assert.equal(p.skillPractice.tracking.method.origin,'practice');assert.equal(new Set(p.skillPractice.tracking.operations.map(r=>r.source)).size,2);assert.equal(h.level,1);assert.equal(h.career.rank,1);
 const unknown=restore(f.unknownRaw),u=unknown.people[unknown.hero.lineage];assert.equal(u.tracking.notes[0].direction,null);assert.equal(u.skillPractice?.tracking,undefined);rememberPracticalRole(unknown,u,unknown.hero);assert.equal(u.skillPractice?.tracking,undefined);confirmTracking(unknown);assert.equal(u.skillPractice?.tracking,undefined);
 const total=p.skillPractice.tracking.total;s.tick++;confirmTracking(s);assert.equal(p.skillPractice.tracking.total,total);practiceRaw=exact(s);assert.ok(knowsPracticalMethod(s,p.id,'tracking'));
 // A new, unassociated footprint must not identify a quest recipient by private ID.
 const stranger=f.a.population.map(id=>s.people[id]).find(q=>q.alive&&q.id!==h.lineage&&!f.sources.includes(q)&&q.role!=='ребёнок');crossTraveller(f,stranger);const fresh=s.edges['a1|a2'].traces.find(t=>t.source.id===stranger.id);
 h.goal={kind:'explore',area:'a1',x:100,started:s.tick};step(s);step(s);assert.equal(h.area,'a1');
 h.quests=[{id:'unknown-footprint-letter',kind:'delivery',title:'Передать принятое письмо',source:'a1',target:'a2',giver:stranger.id,recipient:stranger.id,required:1,reward:0,status:'active',accepted:0,deadline:10000,cargo:true,visited:false,delivered:false,cause:'Подготовленное поручение для проверки лично неизвестного следа'}];studyGoal(f,fresh);step(s);assert.equal(h.goal,null);assert.equal(h.quests[0].status,'active');assert.equal(h.quests[0].cargo,true);exact(s);

});
test('an NPC earns the same method in personal phases; a voluntary real-trace lesson consumes both actions and a refusal teaches nothing',()=>{
 const f=teacherFixture(),{s,h,teacher}=f;teacherRaw=exact(s);assert.equal(teacher.skillPractice.tracking.total,2);assert.ok(teacher.tracking.notes.every(n=>n.confirmedAt>n.studiedAt));
 const refused=restore(teacherRaw),q=refused.people[teacher.id];q.needs.sleeping=true;refused.hero.goal={kind:'trackLesson',area:h.area,x:h.x,trace:f.lessonTrace.id,traceAt:f.lessonTrace.trace.created,teacher:teacher.id};const energy=refused.hero.energy;assert.equal(trackingAction(refused,trackingContext),false);assert.equal(refused.hero.energy,energy);assert.equal(refused.people[h.lineage].skillPractice?.tracking,undefined);
 const own=h.energy,theirs=teacher.needs.energy;step(s);assert.equal(s.people[h.lineage].skillPractice.tracking.method.origin,'lesson');assert.equal(h.energy,own-2);assert.equal(teacher.needs.energy,theirs-1);assert.equal(npcAction(s,teacher,'personal'),false);exact(s);
});
test('fresh predator direction changes a real route at the same combat level; faded or washed traces report uncertainty',()=>{
 for(const trained of [true,false]){const s=restore(practiceRaw),h=s.hero,p=s.people[h.lineage],a=s.areas[h.area];if(!trained){p.skillPractice.tracking.operations=p.skillPractice.tracking.operations.slice(0,1);p.skillPractice.tracking.total=1;delete p.skillPractice.tracking.method;}setModule(s,'bestiary',true);s.tick=24;h.x=42;const e=createEnemy(s,a,{requestedSpecies:'wolf',x:42});e.hidden=false;e.x=43;e.patrol=0;const t=creatureTrace(s,a,e,42);s.tick=48;e.x=70;h.goal={kind:'trackStudy',area:a.id,x:42,trace:t.id,traceAt:24,started:48};syncActiveActor(s);step(s);assert.equal(h.lastAction,'study');assert.equal(h.level,1);assert.equal(h.goal?.area,trained?'a1':undefined);if(trained){step(s);assert.ok(h.x<42);}exact(s);}
 const s=restore(practiceRaw),h=s.hero,area=s.areas[h.area];setModule(s,'bestiary',true);s.tick=24;const e=createEnemy(s,area,{requestedSpecies:'wolf',x:h.x});e.hidden=false;e.x+=1;const o=creatureTrace(s,area,e,h.x);s.tick=105;e.x=30;const t=localTrails(s).find(t=>t.id===o.id),wet=restore(exact(s));studyGoal({s,h},t);assert.equal(trackingAction(s,trackingContext),true);assert.equal(s.people[h.lineage].tracking.notes.at(-1).direction,null);assert.equal(trailClarity(s,{...t,wet:true}),'washed');
 wet.areas[h.area].objects.find(o=>o.id===t.id).trace.wet=true;const w=localTrails(wet).find(n=>n.id===t.id);studyGoal({s:wet,h:wet.hero},w);assert.equal(trackingAction(wet,trackingContext),true);assert.equal(wet.people[h.lineage].tracking.notes.at(-1).quality,'washed');
});
test('current optional records survive OFF, restore and observer changes; expired/unknown data never reveals a current address',()=>{
 const s=restore(practiceRaw),h=s.hero,p=s.people[h.lineage],memory=JSON.stringify(p.tracking),raw=exact(s);assert.ok(trackingHTML(s,x=>String(x)).includes('запись'));setModule(s,'skill-branches',false);assert.deepEqual(localTrails(s),[]);assert.equal(JSON.stringify(p.tracking),memory);const off=exact(s);const loaded=restore(off);assert.equal(serialize(loaded),off);setModule(s,'skill-branches',true);assert.equal(JSON.stringify(p.tracking),memory);
 const one={kind:'trackStudy',area:h.area,x:h.x,trace:'same-imprint',traceAt:1},two={...one,traceAt:2};assert.notEqual(actionKey(one),actionKey(two));assert.equal(actionKey(one),actionKey({...one,started:999}));
 assert.equal(acyclicSkillTree(),true);assert.equal(SKILL_TREE.length,7);assert.ok(fieldCraftNodes(s,h.lineage).some(n=>n.id==='read-trail-direction'&&n.known));
 const other=Object.values(s.people).find(p=>p.id!==h.lineage&&p.alive&&p.status==='resident'&&p.role!=='ребёнок');assert.ok(observeExistingPerson(s,other.id));assert.ok(observeExistingPerson(s,h.lineage));assert.equal(JSON.stringify(s.people[h.lineage].tracking),memory);exact(s);
 const stale=restore(raw);stale.tick+=241;assert.equal(localTrails(stale).length,0);assert.equal(JSON.stringify(stale.people[h.lineage].tracking),memory);const bad=JSON.parse(raw);bad.edges['a1|a2'].traces[0].expires++;assert.throws(()=>restore(JSON.stringify(bad)),/trace/);
});
