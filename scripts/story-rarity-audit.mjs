import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
await mkdir('artifacts/current/scenarios',{recursive:true});
const report={seeds:32,ticks:8000,configurations:3,totalTicks:768000,lives:0,eligibleLives:0,matureLives:0,matureWithoutLines:0,starts:{pact:0,mystery:0,expedition:0},outcomes:{},divergence:0};
let samples=0,differences=0,saved=false;
const signature=s=>`${s.generation}/${s.hero.area}/${s.hero.goal?.kind}/${s.hero.kills}/${s.storyCases.length}/${s.hero.quests.filter(q=>q.status==='done').length}`;
for(let seed=0;seed<32;seed++){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'story-rarity',false);
 const lifeData=new Map();
 for(let i=0;i<8000;i++){
  step(a);step(b);step(off);const h=a.hero,r=h.storyRarity;
  lifeData.set(h.lineage,{born:h.born,last:a.tick,eligible:Object.values(r.affinity).some(Boolean),budget:r.budget});
  if(i%277===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){samples++;differences+=signature(a)!==signature(off);}
  if(!saved&&a.storyCases.some(c=>c.status==='active')){await writeFile('artifacts/current/scenarios/rare-personal-line.json',serialize(a));saved=true;}
 }
 for(const [person,l]of lifeData){const cases=a.storyCases.filter(c=>c.owner===person);report.lives++;if(l.eligible)report.eligibleLives++;if(l.last-l.born>=1000){report.matureLives++;if(!cases.length)report.matureWithoutLines++;}assert.ok(cases.length<=l.budget);assert.equal(new Set(cases.map(c=>c.kind)).size,cases.length);for(let i=1;i<cases.length;i++)assert.ok(cases[i].started-cases[i-1].started>=2400);}
 for(const c of a.storyCases){report.starts[c.kind]++;report.outcomes[c.kind+'/'+c.status]=(report.outcomes[c.kind+'/'+c.status]||0)+1;}
 assert.equal(serialize(a),serialize(b));console.log('seed',seed,'starts',JSON.stringify(report.starts));
}
report.divergence=differences/samples;assert.ok(report.matureWithoutLines>report.matureLives*.5&&report.eligibleLives<report.lives*.5&&saved);
await writeFile('artifacts/current/story-rarity-audit.json',JSON.stringify(report,null,2));console.log(report);
