import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize} from '../engine.js';
import assert from 'node:assert/strict';
await mkdir('artifacts/current/scenarios',{recursive:true});
const r={seeds:12,totalTicks:60000,regions:0,cityScenes:0,people:0,living:0,meals:0,sleeps:0,conversations:0,dangerousZones:0,deaths:0,birthplaces:[],continents:[]};
let saved=false;
for(let seed=1;seed<=12;seed++){
  const s=createWorld(seed);r.birthplaces.push(s.areas[s.hero.area].name);r.continents.push(s.continents.c0.name);
  for(let i=0;i<5000;i++){
    step(s);
    if(!saved&&s.areas[s.hero.area].city&&s.tick>100){await writeFile('artifacts/current/scenarios/settlement-districts.json',serialize(s));saved=true;}
  }
  const areas=Object.values(s.areas),people=Object.values(s.people);
  r.regions+=areas.length;r.cityScenes+=areas.filter(a=>a.city).length;r.people+=people.length;r.living+=people.filter(p=>p.alive).length;
  for(const p of people){r.meals+=p.needs?.meals||0;r.sleeps+=p.needs?.sleeps||0;r.conversations+=p.needs?.conversations||0;}
  r.dangerousZones+=areas.filter(a=>a.danger>=8).length;r.deaths+=s.lives.filter(l=>l.outcome==='dead').length;
}
assert.equal(new Set(r.continents).size,12);assert.ok(r.cityScenes>=48);assert.ok(r.meals>0&&r.sleeps>0&&r.conversations>0);assert.ok(r.dangerousZones>0);
await writeFile('artifacts/current/region-audit.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));
