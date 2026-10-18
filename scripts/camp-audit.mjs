import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:6000,totalTicks:432000,camps:0,returns:0,maxCamps:0,interventionDivergence:0,deadLives:0};
let comparisons=0,differences=0,saved=false;
for(let seed=1;seed<=24;seed++){
  const a=createWorld(seed),b=createWorld(seed),c=createWorld(seed);
  for(let tick=0;tick<6000;tick++){
    if(tick===2000)setModule(c,'fieldcamp',false);
    const previous=a.journal[0];step(a);step(b);step(c);
    if(tick%997===0){assert.equal(serialize(a),serialize(b));assert.equal(serialize(restore(serialize(a))),serialize(a));}
    if(tick>=2000&&tick%40===0){comparisons++;if(`${a.hero.area}/${a.hero.goal?.kind}/${a.generation}`!==`${c.hero.area}/${c.hero.goal?.kind}/${c.generation}`)differences++;}
    if(a.journal[0]!==previous&&a.journal[0].text.startsWith('Походный лагерь свёрнут'))report.returns++;
    if(!saved&&a.areas[a.hero.area].temporaryCamp){await writeFile('artifacts/current/scenarios/field-camp.json',serialize(a));saved=true;}
    assert.ok(a.hero.energy>=0&&a.hero.energy<=100);
  }
  const camps=Object.values(a.areas).filter(r=>r.temporaryCamp);report.camps+=camps.length;report.maxCamps=Math.max(report.maxCamps,camps.length);
  for(const camp of camps){assert.equal(camp.forage.stock,0);assert.equal(camp.forage.max,0);assert.equal(camp.expanded,true);assert.ok(a.areas[camp.temporaryCamp.parent]);assert.ok(!camp.population);assert.ok(!camp.delveGate);}
  report.deadLives+=a.lives.filter(l=>l.outcome==='dead').length;
  assert.equal(serialize(a),serialize(b));
}
report.interventionDivergence=differences/comparisons;assert.ok(saved&&report.camps>0&&report.returns>0);
await writeFile('artifacts/current/camp-audit.json',JSON.stringify(report,null,2));console.log(report);
