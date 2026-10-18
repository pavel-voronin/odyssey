import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
const report={seeds:[0,1,44,56,68,91],limit:16000,actualSteps:0,maxBytes:0,checks:0,lives:[]};
function mechanical(s){const copy=structuredClone(s);delete copy.rules['color-profile'];delete copy.hero.ruleFlags['color-profile'];return serialize(copy);}
for(const seed of report.seeds){let a=createWorld(seed),b=createWorld(seed);setModule(b,'color-profile',false);assert.equal(mechanical(a),mechanical(b));
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(mechanical(a),mechanical(b));report.checks++;const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);}
  if(lifeFinished(a)&&lifeFinished(b))break;
 }
 assert.equal(mechanical(a),mechanical(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome});console.log(seed,a.tick,a.hero.life.outcome);
}
await writeFile('artifacts/color-profile-audit.json',JSON.stringify(report,null,2));console.log(report);
