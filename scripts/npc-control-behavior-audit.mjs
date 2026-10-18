import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize} from '../engine.js';import {setModule} from '../rules.js';import {lifeFinished} from '../playback.js';
// Separate mechanics from the arbiter's bookkeeping. Historical off compatibility is audited without this projection.
function gameplay(s){const c=structuredClone(s);delete c.rules['npc-control'];delete c.hero.ruleFlags['npc-control'];for(const p of Object.values(c.people))delete p.actionControl;return serialize(c);}
const report={seeds:[0,1,44,68],limit:12000,steps:0,checks:0,maxPhases:0,controllerRecords:0,owners:{},runs:[]};
for(const seed of report.seeds){const a=createWorld(seed),b=createWorld(seed);setModule(b,'npc-control',false);let firstDifference=null;
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b])if(!lifeFinished(s)){step(s);report.steps++;}
  if(i%997===0){report.checks++;if(firstDifference===null&&gameplay(a)!==gameplay(b))firstDifference={on:a.tick,off:b.tick};}
  if([a,b].every(lifeFinished))break;
 }
 const equal=gameplay(a)===gameplay(b);if(!equal&&firstDifference===null)firstDifference={on:a.tick,off:b.tick};
 for(const p of Object.values(a.people))if(p.actionControl){const c=p.actionControl;report.controllerRecords++;report.maxPhases=Math.max(report.maxPhases,c.phases.length);report.owners[c.owner]=(report.owners[c.owner]||0)+1;assert.ok(c.tick<=a.tick);}
 report.runs.push({seed,on:a.tick,off:b.tick,equalGameplay:equal,firstDifference});console.log(JSON.stringify(report.runs.at(-1)));
}
assert.ok(report.maxPhases<=4);await writeFile('artifacts/npc-control-behavior-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
