import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {campEnvironmentFixture} from './camp-environment-scenarios.mjs';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {weatherAt} from '../modules/weather.js';
const report={steps:0,checkpoints:0,cases:[],intervention:'weather disabled after tick 4000'};
for(const type of ['forest','desert','mountain','cave']){
  const {s:a}=campEnvironmentFixture(type);let b=restore(serialize(a)),c=restore(serialize(a));let comparisons=0,different=0,camps=0;
  for(let i=0;i<19200;i++){
    if(i===4000)setModule(c,'weather',false);
    step(a);step(b);step(c);report.steps+=3;
    const camp=a.areas[a.hero.area];if(camp.temporaryCamp){camps++;assert.deepEqual(weatherAt(a,camp),weatherAt(a,a.areas[camp.temporaryCamp.parent]));assert.equal(camp.type,'camp');assert.equal(camp.forage.stock,0);assert.equal(camp.population,undefined);}
    if(i%997===0){assert.equal(serialize(a),serialize(b));b=restore(serialize(b));assert.equal(serialize(b),serialize(a));report.checkpoints++;}
    if(i>=4000&&i%40===0){comparisons++;const key=s=>`${s.hero.alive}/${s.hero.area}/${s.hero.x}/${s.hero.energy}/${s.hero.gold}/${s.hero.goal?.kind}`;if(key(a)!==key(c))different++;}
  }
  assert.equal(serialize(a),serialize(b));report.cases.push({type,campTicks:camps,comparisons,different,divergence:comparisons?different/comparisons:0,alive:a.hero.alive,worldTick:a.tick,interferedAlive:c.hero.alive});
}
await writeFile('artifacts/camp-environment-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
