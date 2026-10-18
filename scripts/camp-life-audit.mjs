import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {createWorld,serialize,restore} from '../engine.js';import {advanceLife,lifeFinished} from '../playback.js';import {setModule} from '../rules.js';
const report={seeds:24,actualSteps:0,conversations:0,outcomes:{},livesWithConversation:0,rescues:0,camps:0,exact:true,samples:0,different:0,maxBytes:0};let saved=false;
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.gold}/${s.hero.life.outcome}`;
for(let seed=0;seed<24;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'camp-life',false);const seen=new Set();
 for(let i=0;i<12000;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  for(const e of a.hero.campLife.history){const key=e.quest+'/'+e.person;if(seen.has(key))continue;seen.add(key);report.conversations++;report.outcomes[e.outcome]=(report.outcomes[e.outcome]||0)+1;if(!saved){await writeFile('artifacts/current/scenarios/camp-rescue-conversation.json',serialize(a));saved=true;}}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.rescues+=a.hero.quests.filter(q=>q.rescued).length;report.camps+=a.hero.counters.camps||0;report.livesWithConversation+=seen.size>0;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));console.log(seed,seen.size,a.tick);
}
report.divergence=report.different/report.samples;await writeFile('artifacts/current/camp-life-audit.json',JSON.stringify(report,null,2));console.log(report);
