import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:8000,configurations:4,totalTicks:768000,natural:{groups:0,members:0,settled:0,abandoned:0,lost:0,rerouted:0},shortageIntervention:{groups:0,members:0,settled:0,abandoned:0,lost:0,rerouted:0},divergence:0};
let differences=0,samples=0,saved=false;
const signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${Object.values(s.migrations).map(g=>g.status+':'+g.target).join(',')}/${Math.round(s.hero.gold)}`;
function totals(s,result){for(const g of Object.values(s.migrations)){result.groups++;result.members+=g.members.length;if(g.status==='settled')result.settled++;if(['abandoned','separated'].includes(g.status))result.abandoned++;if(g.status==='lost')result.lost++;result.rerouted+=g.history.filter(e=>e.text.includes('меняет направление')).length;}}
for(let seed=0;seed<24;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed),short=createWorld(seed);setModule(off,'migrations',false);
 for(let i=0;i<8000;i++){
  if(i===1000){const town=Object.values(short.areas).find(t=>t.visited&&t.civic&&t.population?.some(id=>short.people[id]?.alive&&short.people[id].status==='resident'));if(town){town.civic.food=0;town.civic.medicine=0;town.civic.crisis={kind:'hunger',since:short.tick,until:short.tick+600};}}
  step(a);step(b);step(off);step(short);
  if(i%277===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));assert.equal(serialize(restore(serialize(short))),serialize(short));}
  if(i%80===0){samples++;differences+=signature(a)!==signature(off);for(const world of [a,short])for(const g of Object.values(world.migrations)){assert.equal(g.members.length,new Set(g.members).size);assert.ok(g.cargo.food>=0&&g.cargo.medicine>=0);for(const id of g.members)assert.ok(world.people[id]);}}
  for(const world of saved?[]:[a,short])if(Object.values(world.migrations).some(g=>g.status==='active')){await writeFile('artifacts/current/scenarios/family-migration.json',serialize(world));saved=true;}
  assert.ok(a.hero.gold>=0&&a.hero.hp>=0&&a.hero.energy>=0&&a.hero.energy<=100);
 }
 assert.equal(serialize(a),serialize(b));totals(a,report.natural);totals(short,report.shortageIntervention);console.log('seed',seed,'natural',report.natural.groups,'intervention',report.shortageIntervention.groups);
}
report.divergence=differences/samples;await writeFile('artifacts/current/migrations-audit.json',JSON.stringify(report,null,2));console.log(report);assert.ok(saved&&report.natural.groups+report.shortageIntervention.groups>0);
