import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore} from '../engine.js';import {setModule} from '../rules.js';
import {refugeFixture,surveyPlot,refugeDepart,refugeNearArrival,refugeSave,refugeContext as ctx} from '../scripts/family-refuge-scenarios.mjs';
import {chooseFamilyRefuge,refugePersonalPlan} from '../modules/family-refuge.js';
import {migrationsTick,migrationMeal,migrationArrived} from '../modules/migrations.js';
import {peopleTick} from '../modules/people.js';import {observeNPCPlace} from '../modules/npc-knowledge.js';
const choose=f=>chooseFamilyRefuge(f.s,f.source,f.members,f.source.id);
const noTown=f=>{delete f.leader.migrationKnowledge;delete f.leader.navigation.markets;return f;};
const exact=f=>{const raw=refugeSave(f);assert.equal(serialize(restore(raw)),raw);return raw;};
test('same home loss and world: personal work, surveyed plot or visited camp give three distinct supports',()=>{
 const f=surveyPlot(refugeFixture());assert.equal(choose(f).refuge.mode,'join');assert.equal(choose(f).refuge.knowledge,'work');
 noTown(f);assert.equal(choose(f).refuge.mode,'found');const plotNote=f.leader.refugeKnowledge[f.plot.id];delete f.leader.refugeKnowledge[f.plot.id];assert.equal(choose(f).refuge.mode,'camp');
 f.leader.refugeKnowledge[f.plot.id]=plotNote;f.builder.goodsRawCargo.quantity=3;assert.equal(choose(f).refuge.mode,'camp');f.builder.goodsRawCargo.quantity=4;f.source.civic.food=8;assert.equal(choose(f).refuge.mode,'camp');f.source.goods.ledger.food.initial-=10;
 f.leader.refugeKnowledge={};assert.equal(choose(f),null);assert.equal(refugeDepart(f),undefined);assert.equal(f.source.exodus.knowledgeWait.reason,'no-known-address');exact(f);
});
test('three actual local survey acts create one stable water site, cost energy and replay across a mid-work save',()=>{
 const f=refugeFixture(),{s,leader,plot}=f;leader.area=plot.id;leader.x=plot.forage.x;leader.agenda.due=0;leader.agenda.task={kind:'gather',target:plot.id,x:plot.forage.x,remaining:3,home:f.source.id,foodSource:plot.forage.localFood.id};for(let n=0;n<3;n++){s.tick+=8;peopleTick(s,ctx);}assert.equal(leader.agenda.task.kind,'refugeSurvey');assert.equal(leader.agenda.task.home,f.source.id);
 s.tick+=8;peopleTick(s,ctx);assert.equal(plot.refugeSite,undefined);assert.equal(leader.agenda.task.turns,1);const raw=exact(f),copy=restore(raw),energy=leader.needs.energy;
 for(const w of [s,copy])for(let n=0;n<2;n++){w.tick+=8;peopleTick(w,ctx);}assert.equal(serialize(s),serialize(copy));assert.equal(plot.refugeSite.id,plot.id+'/refuge-site');assert.equal(leader.needs.energy,energy-4);assert.equal(plot.forage.stock,9);assert.equal(plot.civic,undefined);const id=plot.refugeSite.id;observeNPCPlace(s,leader);assert.equal(plot.refugeSite.id,id);exact(f);
});
test('a funded foundation intent uses the ordinary physical family route and retains finite setup supplies, without creating civic',()=>{
 const f=noTown(surveyPlot(refugeFixture())),{s,source,plot,leader,builder,child}=f,before=source.civic.food,g=refugeDepart(f);assert.equal(g.refuge.mode,'found');assert.equal(g.cargo.food,9);assert.equal(source.civic.food,before-9);assert.equal(leader.area,source.id);assert.equal(builder.goodsRawCargo.quantity,4);assert.equal(builder.agenda.tools,1);
 // Prepared final road segment, rather than a long trip prefix. No body is moved by choice.
 for(const p of f.members)p.x=100;let steps=0;while(!g.arrivals[child.id]&&steps++<6){s.tick=Math.floor(s.tick/8)*8+8;peopleTick(s,ctx);const pos=leader.x;peopleTick(s,ctx);assert.equal(leader.x,pos);}assert.ok(steps<=6);assert.equal(leader.area,plot.id);s.tick=Math.ceil(s.tick/16)*16;migrationsTick(s,ctx);assert.equal(g.status,'site-ready');assert.equal(plot.civic,undefined);assert.deepEqual([...plot.population].sort(),f.members.map(p=>p.id).sort());assert.notEqual(leader.home,plot.id);assert.equal(leader.refugeGroup,g.id);assert.equal(builder.goodsRawCargo.quantity,4);const food=g.cargo.food;child.needs.hunger=70;assert.ok(migrationMeal(s,child));assert.equal(g.cargo.food,food-1);exact(f);
});
test('temporary camp shares only carried supplies locally, and carrier death drops a single real group load',()=>{
 const f=noTown(refugeFixture({kit:false})),{s,leader,child,camp}=f,g=refugeDepart(f);assert.equal(g.refuge.mode,'camp');refugeNearArrival(f,g);assert.equal(g.status,'camped');assert.equal(camp.civic,undefined);assert.equal(g.cargo.food,6);assert.equal(leader.roadSupplies?.food||0,0);assert.equal(leader.refugeGroup,g.id);child.x=0;assert.equal(migrationMeal(s,child),false);child.x=leader.x;assert.ok(migrationMeal(s,child));assert.equal(g.cargo.food,5);
 leader.alive=false;leader.health=0;s.tick+=16;migrationsTick(s,ctx);assert.ok(g.cargoLost);assert.equal(migrationMeal(s,child),false);s.tick+=16;migrationsTick(s,ctx);assert.equal(camp.objects.filter(o=>o.id==='lost-'+g.id).length,1);assert.equal(g.cargo.food,5);exact(f);
});
test('arrival discovers an exhausted site, keeps ownership and paid kit, then changes only to a known family refuge',()=>{
 const f=noTown(surveyPlot(refugeFixture())),{s,leader,builder,plot,camp}=f,g=refugeDepart(f);for(const p of f.members){p.area=plot.id;p.x=plot.forage.x;}plot.forage.localFood.harvested+=plot.forage.stock;plot.forage.stock=0;assert.equal(migrationArrived(s,leader),false);assert.equal(g.arrivals[leader.id],undefined);assert.equal(leader.refugeGroup,undefined);assert.equal(builder.goodsRawCargo.quantity,4);s.tick+=16;migrationsTick(s,ctx);assert.equal(g.target,camp.id);assert.equal(g.refuge.mode,'camp');assert.equal(g.cargo.food,9);
 const rest=camp.objects.find(o=>o.kind==='rest');rest.closed=true;leader.area=camp.id;leader.x=rest.x;assert.equal(migrationArrived(s,leader),false);assert.notEqual(leader.home,camp.id);assert.equal(camp.civic,undefined);exact(f);
});
test('OFF pauses current work and journeys; current save rejects forged sources and preserves absent fields without backfill',()=>{
 const f=noTown(surveyPlot(refugeFixture())),{s,leader,plot}=f,g=refugeDepart(f),x=leader.x,food=g.cargo.food;setModule(s,'migration-knowledge',false);s.tick+=16;migrationsTick(s,ctx);peopleTick(s,ctx);assert.equal(leader.x,x);assert.equal(g.cargo.food,food);const raw=exact(f);
 for(const mutate of [w=>w.areas[plot.id].refugeSite.water.by='missing',w=>w.people[leader.id].refugeKnowledge[plot.id].witness='missing',w=>w.migrations[g.id].refuge.kit.raw=0]){const bad=JSON.parse(raw);mutate(bad);assert.throws(()=>restore(JSON.stringify(bad)),/refuge/);}
 const empty=refugeFixture();for(const p of Object.values(empty.s.people))delete p.refugeKnowledge;const before=exact(empty),restored=restore(before);assert.equal(restored.areas[empty.plot.id].refugeSite,undefined);assert.equal(restored.people[empty.leader.id].refugeKnowledge,undefined);assert.equal(serialize(restored),before);
});
