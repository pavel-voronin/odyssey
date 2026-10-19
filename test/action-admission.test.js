import {observeLocalRoutes} from '../actor-atlas.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';
import {step,serialize,restore,knownRoute,observeExistingPerson} from '../engine.js';
import {selectionFixture,selectionContext} from '../scripts/action-selection-scenarios.mjs';
import {admitAction,dependency} from '../modules/action-admission.js';
import {actionKey,deferMethod,deferredMethod} from '../modules/action-selection.js';
import {goalReadiness,methodRevision,actionProgress} from '../modules/goal-readiness.js';
import {preparePlan} from '../modules/preparation.js';
import {syncActiveActor} from '../actor-projection.js';
const exact=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
function weak({stock=0,rations=0}={}){const f=selectionFixture(['body','supply','preparation']);Object.assign(f.h,{energy:0,hp:20,hunger:94});f.h.inventory.rations=rations;f.a.forage.stock=0;f.a.civic.food=stock;f.h.goal={kind:'work',area:f.a.id,x:42,job:'harvest',remaining:7,started:0};return f;}
const policy={assess:(s,g)=>goalReadiness(s,g,{knownRoute}),revision:methodRevision,progress:actionProgress};

test('prepared weak body uses one own ration or finite local stock before optional work, with one action',()=>{
 for(const options of [{rations:1},{stock:4}]){const {s,h,a}=weak(options),food=a.civic.food;step(s);assert.equal(h.lastAction,'eat');assert.ok(h.hunger<40);assert.equal(h.inventory.rations,0);assert.equal(a.civic.food,options.stock?food-4:food);assert.equal(h.energy,0);assert.equal(h.counters.meals,1);assert.equal(h.planning.preparations,0);exact(s);}
});
test('no food gives real local energy recovery without creating food or healing starvation; a prepared fatal boundary stays fatal',()=>{
 const {s,h,a}=weak();const hp=h.hp;step(s);assert.equal(h.lastAction,'rest');assert.equal(h.energy,4);assert.equal(h.hp,hp);assert.equal(h.inventory.rations,0);assert.equal(a.civic.food,0);assert.equal(a.forage.stock,0);assert.ok(h.hunger>94);assert.ok(h.actionSelection.deferred.some(e=>e.kind==='rest'));assert.equal(h.planning.preparations,0);exact(s);
 // Explicit starvation checkpoint, not a simulated life.
 s.tick=15;h.hp=1;h.hunger=100;step(s);assert.equal(h.alive,false);assert.equal(h.life.endedAt,16);assert.equal(h.hp,0);exact(s);
});
test('a genuinely late preparation cannot dispatch a deferred rest; cosmetic reassignment does not wake it',()=>{
 const {s,h,a}=selectionFixture(['preparation']);observeLocalRoutes(s);h.energy=24;h.x=42;const parent={kind:'work',area:a.id,x:42,job:'harvest',remaining:7,started:0},rest={kind:'rest',area:a.id,x:68,started:0};h.goal=parent;
 deferMethod(h,rest,{status:'blocked',reason:'Подтверждённый неизменный отказ отдыха.',retryOn:'test-access'},methodRevision(s,rest),s.tick);
 step(s);assert.notEqual(h.goal?.kind,'rest');assert.ok(h.actionSelection.deferred.some(e=>e.key===actionKey(parent)));assert.ok(h.actionSelection.dependencies.some(e=>e.key===actionKey(parent)&&e.child===actionKey(rest)));assert.equal(h.planning.last.prepared,false);assert.equal(h.planning.preparations,0);
 const sig=methodRevision(s,parent),copy={...parent,started:999};assert.equal(methodRevision(s,copy),sig);assert.ok(deferredMethod(h,copy,sig));h.energy=100;assert.notEqual(methodRevision(s,parent),sig);assert.equal(goalReadiness(s,parent,{knownRoute}).status,'ready');exact(s);
});
test('cross-domain cycle and fifth replacement share bounded admission, preserve partial work and select a real alternative',()=>{
 for(const chain of ['cycle','limit']){const {s,h,a}=selectionFixture(['preparation']);observeLocalRoutes(s);h.energy=75;const root={kind:'work',area:a.id,x:h.x,job:'harvest',remaining:7,started:0};h.goal=root;let transforms=0,selected=0;
 const admitted=admitAction(s,{...policy,select(world){selected++;world.hero.goal={kind:'localRecovery',area:a.id,x:h.x,started:s.tick};return false;},transform(world){transforms++;world.hero.goal=chain==='cycle'?(world.hero.goal.kind==='work'?{kind:'forgeWork',area:a.id,x:h.x,started:2}:{...root,started:3}):{...root,job:'stage-'+transforms,started:transforms};}});
 assert.equal(admitted,false);assert.equal(selected,1);assert.ok(transforms<=4);assert.equal(h.goal.kind,'localRecovery');assert.equal(h.actionSelection.deferred.find(e=>e.key===actionKey(root)).step.remaining,7);const before=h.energy;step(s);assert.equal(h.lastAction,'rest');assert.equal(h.energy,before+4);assert.equal(h.counters.peacefulWork||0,0);exact(s);}
});
test('finite reachable preparation is accepted before success; actual recovery earns one completion, and physical owners are preserved',()=>{
 const {s,h,a}=selectionFixture(['preparation']);h.x=68;h.energy=24;h.goal={kind:'work',area:a.id,x:68,job:'harvest',remaining:7,started:0};const parent={...h.goal};step(s);assert.equal(h.lastAction,'rest');assert.equal(h.energy,36);assert.equal(h.planning.last.prepared,false);assert.equal(h.planning.preparations,0);assert.ok(h.planning.last.accepted);step(s);assert.equal(h.energy,48);assert.equal(h.planning.last.prepared,true);assert.equal(h.planning.preparations,1);step(s);assert.equal(h.planning.preparations,1);assert.ok(h.actionSelection.paused.some(g=>actionKey(g)===actionKey(parent)&&g.remaining===7));exact(s);
 h.transit={from:a.id,to:'a0',mode:'road',total:3,remaining:2};const before=JSON.stringify(h.transit);let touched=false;assert.equal(admitAction(s,{...policy,select(){throw Error('Second controller');},transform(){touched=true;}}),true);assert.equal(touched,false);assert.equal(JSON.stringify(h.transit),before);
});
test('original exported dead history is read only; current optional dependency memory round trips without a migration',()=>{
 const source=new URL('../artifacts/inbox/2026-10-19-preparation-stall-1398493894-tick-13552.json',import.meta.url);
 // Optional private source remains outside Git; when present, verify it read only.
 if(existsSync(source)){const bytes=readFileSync(source);assert.equal(createHash('sha256').update(bytes).digest('hex'),'052e66fda56f6c63fe6ece1f087cf99683534f31f5510522649dc1ffd732d0e4');const original=restore(bytes.toString());assert.equal(original.hero.alive,false);assert.equal(original.hero.lineage,'person-128');assert.equal(original.tick,13552);assert.equal(original.hero.life.endedAt,8288);const raw=serialize(original);assert.equal(serialize(restore(raw)),raw);}
 const {s,h,a}=selectionFixture(['preparation']),parent={kind:'work',area:a.id,x:42,job:'harvest',remaining:2},child={kind:'rest',area:a.id,x:68};dependency(s,parent,child,methodRevision,{energy:40,health:20,mana:0});exact(s);const bad=JSON.parse(serialize(s));bad.hero.actionSelection.dependencies[0].key='invented';assert.throws(()=>restore(JSON.stringify(bad)),/dependency/);assert.equal(h.actionSelection.dependencies[0].parent.remaining,2);const memory=JSON.stringify(h.actionSelection),other=a.population.find(id=>id!==h.lineage&&s.people[id].alive&&s.people[id].role!=='ребёнок');assert.ok(observeExistingPerson(s,other));assert.ok(observeExistingPerson(s,h.lineage));assert.equal(JSON.stringify(s.hero.actionSelection),memory);exact(s);
});
