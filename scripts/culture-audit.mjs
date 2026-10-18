import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {CULTURES} from '../modules/cultures.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:5000,totalTicks:240000,people:0,uniqueNamesWithinWorlds:0,cultures:{},mixedTowns:0,towns:0,preservedLoadedNames:0};
let saved=false;
for(let seed=0;seed<24;seed++){
  const a=createWorld(seed),b=createWorld(seed);
  for(let tick=0;tick<5000;tick++){
    step(a);step(b);
    if(tick%997===0){assert.equal(serialize(a),serialize(b));assert.equal(serialize(restore(serialize(a))),serialize(a));}
    if(!saved&&Object.values(a.areas).some(r=>r.city&&new Set(r.population.map(id=>a.people[id].culture)).size>=3)){
      await writeFile('artifacts/current/scenarios/cultural-town.json',serialize(a));saved=true;
    }
  }
  assert.equal(serialize(a),serialize(b));
  const people=Object.values(a.people);report.people+=people.length;report.uniqueNamesWithinWorlds+=new Set(people.map(p=>p.name)).size;
  for(const p of people){assert.ok(p.culture);report.cultures[p.culture]=(report.cultures[p.culture]||0)+1;if(p.naming)assert.ok(!/\d/.test(p.name));}
  for(const town of Object.values(a.areas).filter(r=>r.city===r.id)){
    report.towns++;const mix=new Set(town.districts.flatMap(id=>a.areas[id].population.map(p=>a.people[p].culture)));if(mix.size>1)report.mixedTowns++;
  }
  const names=people.map(p=>p.name);delete a.cultureVersion;delete a.hero.culture;for(const p of people)delete p.culture;
  const loaded=restore(serialize(a));assert.deepEqual(Object.values(loaded.people).map(p=>p.name),names);report.preservedLoadedNames+=names.length;
}
report.uniqueNameRatio=report.uniqueNamesWithinWorlds/report.people;
assert.equal(Object.keys(report.cultures).length,CULTURES.length);assert.ok(report.uniqueNameRatio>.9&&report.mixedTowns>0&&saved);
await writeFile('artifacts/current/culture-audit.json',JSON.stringify(report,null,2));console.log(report);
