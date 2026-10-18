import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {lifeFinished,advanceLife,startNextLife} from '../playback.js';
import {weatherAt} from '../modules/weather.js';
import {worldDate,YEAR_TICKS} from '../calendar.js';
import {setModule} from '../rules.js';
const report={seeds:8,ticks:YEAR_TICKS,configurations:3,totalTicks:8*YEAR_TICKS*3,explicitSuccessions:0,weather:{},observedSeasons:{},migrations:0,maxSaveBytes:0,divergence:0};
const advance=s=>lifeFinished(s)?startNextLife(s):advanceLife(s),signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${Math.round(s.hero.gold)}/${Math.round(s.hero.energy)}`;
let samples=0,diff=0;
for(let seed=0;seed<8;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'climate',false);
 for(let i=0;i<YEAR_TICKS;i++){
  if(lifeFinished(a))report.explicitSuccessions++;
  advance(a);advance(b);advance(off);
  const area=a.areas[a.hero.area],w=weatherAt(a,area),d=worldDate(a);report.weather[w.id]=(report.weather[w.id]||0)+1;const key=d.climate+'/'+d.season;report.observedSeasons[key]=(report.observedSeasons[key]||0)+1;
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){samples++;diff+=signature(a)!==signature(off);for(const t of Object.values(a.areas))if(t.civic)assert.ok(t.civic.food>=0&&t.civic.food<=100&&t.civic.medicine>=0&&t.civic.medicine<=100);}
  assert.ok(a.hero.hp>=0&&a.hero.energy>=0&&a.hero.energy<=100);
 }
 assert.equal(a.tick,YEAR_TICKS);assert.equal(serialize(a),serialize(b));report.maxSaveBytes=Math.max(report.maxSaveBytes,Buffer.byteLength(serialize(a)));report.migrations+=Object.keys(a.migrations).length;console.log('year',seed,'generation',a.generation,'bytes',Buffer.byteLength(serialize(a)));
}
report.divergence=diff/samples;await writeFile('artifacts/climate-year-audit.json',JSON.stringify(report,null,2));console.log(report);
