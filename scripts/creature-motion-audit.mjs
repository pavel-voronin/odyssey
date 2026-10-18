import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
import {ActorTracks} from '../actor-facts.js';
import {quadrupedPose} from '../motion.js';
const report={seeds:[0,1,44,56,68,91],limit:16000,actualSteps:0,checks:0,maxBytes:0,facts:0,lives:[]};
function mechanical(s){const c=structuredClone(s);delete c.rules['creature-motion'];delete c.hero.ruleFlags['creature-motion'];return serialize(c);}
for(const seed of report.seeds){let a=createWorld(seed),b=createWorld(seed);setModule(b,'creature-motion',false);const tracks=new ActorTracks();
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  const before=i%997===0?serialize(a):null;tracks.update(a,`${a.seed}/${a.generation}/${a.hero.area}`);
  for(const track of tracks.tracks.values())for(const phase of [0,.3,.7,1])quadrupedPose(track,phase,Math.abs(track.to-track.from));
  if(before!==null)assert.equal(serialize(a),before);report.facts+=a.actorFacts.events.length;
  if(i%997===0){assert.equal(mechanical(a),mechanical(b));report.checks++;const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);}
  if(lifeFinished(a)&&lifeFinished(b))break;
 }
 assert.equal(mechanical(a),mechanical(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome});console.log(seed,a.tick,a.hero.life.outcome);
}
await writeFile(`artifacts/${process.argv[2]||'creature-motion-audit'}.json`,JSON.stringify(report,null,2));console.log(report);
