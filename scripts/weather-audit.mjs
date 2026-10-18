import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {weatherAt} from '../modules/weather.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:6000,configurations:4,totalTicks:576000,conditions:{},preparations:0,weatherWaits:0,camps:0,deaths:0,weatherDivergence:0,preparationDivergence:0};
let weatherDiff=0,planDiff=0,count=0,savedWeather=false,savedPlan=false;
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.generation}/${Math.round(s.hero.energy)}/${s.hero.kills}`;
for(let seed=1;seed<=24;seed++){
  const base=createWorld(seed),repeat=createWorld(seed),dry=createWorld(seed),unprepared=createWorld(seed);
  for(let tick=0;tick<6000;tick++){
    if(tick===2000){setModule(dry,'weather',false);setModule(unprepared,'preparation',false);}
    const before=base.hero.planning.preparations,oldLife=base.generation;
    step(base);step(repeat);step(dry);step(unprepared);
    if(base.generation===oldLife)report.preparations+=base.hero.planning.preparations-before;
    const a=base.areas[base.hero.area],w=weatherAt(base,a);report.conditions[w.id]=(report.conditions[w.id]||0)+1;
    if(base.hero.goal?.kind==='weatherWait')report.weatherWaits++;
    if(tick%233===0){assert.equal(serialize(base),serialize(repeat));assert.equal(serialize(restore(serialize(base))),serialize(base));}
    if(tick>=2000&&tick%40===0){count++;weatherDiff+=signature(base)!==signature(dry);planDiff+=signature(base)!==signature(unprepared);}
    if(!savedWeather&&w.id==='storm'&&!a.temporaryCamp&&a.type!=='sea'){
      await writeFile('artifacts/current/scenarios/weather-storm.json',serialize(base));savedWeather=true;
    }
    if(!savedPlan&&base.hero.goal?.kind==='campPitch'&&base.hero.goal.preparation){await writeFile('artifacts/current/scenarios/journey-preparation.json',serialize(base));savedPlan=true;}
    assert.ok(base.hero.energy>=0&&base.hero.energy<=100&&base.hero.hp>=0&&base.hero.hp<=base.hero.maxHp);
  }
  assert.equal(serialize(base),serialize(repeat));report.camps+=Object.values(base.areas).filter(a=>a.temporaryCamp).length;report.deaths+=base.lives.filter(l=>l.outcome==='dead').length;
}
report.weatherDivergence=weatherDiff/count;report.preparationDivergence=planDiff/count;
assert.ok(report.preparations>0&&savedPlan&&savedWeather);assert.ok(report.weatherDivergence>0&&report.preparationDivergence>0);
await writeFile('artifacts/current/weather-audit.json',JSON.stringify(report,null,2));console.log(report);
