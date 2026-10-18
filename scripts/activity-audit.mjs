import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import assert from 'node:assert/strict';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:24,ticks:5000,totalTicks:120000,gates:0,rooms:0,cleared:0,maxActiveQuests:0,deaths:0,abandoned:0,questKinds:[]};
const kinds=new Set();let saved=false;
for(let seed=1;seed<=24;seed++){
  const s=createWorld(seed);
  for(let i=0;i<5000;i++){
    step(s);report.maxActiveQuests=Math.max(report.maxActiveQuests,s.hero.quests.filter(q=>q.status==='active').length);
    if(i%997===0)assert.equal(serialize(restore(serialize(s))),serialize(s));
    if(!saved&&s.hero.delve&&s.areas[s.hero.area].dungeon?.floor>1){
      await writeFile('artifacts/current/scenarios/dungeon-run.json',serialize(s));saved=true;
    }
  }
  const areas=Object.values(s.areas);report.gates+=areas.filter(a=>a.delveGate).length;report.rooms+=areas.filter(a=>a.dungeon).length;report.cleared+=areas.filter(a=>a.dungeon?.cleared).length;
  report.deaths+=s.lives.filter(l=>l.outcome==='dead').length;report.abandoned+=s.hero.quests.filter(q=>q.status==='abandoned').length;
  for(const q of s.hero.quests)kinds.add(q.kind);
}
report.questKinds=[...kinds];
assert.ok(report.maxActiveQuests>1);assert.ok(report.cleared>0);assert.ok(kinds.size>=6);assert.ok(saved);
await writeFile('artifacts/current/activity-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
