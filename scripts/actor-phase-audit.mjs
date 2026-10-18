import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore,createNextStory,observeDetailedActor} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
const report={seeds:[1,44],limit:2400,steps:0,checks:0,maxBytes:0,runs:[]},started=performance.now();
function physical(s){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;delete c.hero;delete c.generation;delete c.observation;delete c.journal;for(const h of Object.values(c.actorStates)){delete h.actorJournal;delete h.speech;delete h.timeline;delete h.timelineDropped;delete h.biography;}for(const l of c.lives||[]){delete l.timeline;delete l.timelineDropped;delete l.milestones;}for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}c.actorStates=Object.fromEntries(Object.entries(c.actorStates).sort(([a],[b])=>a<b?-1:1));return JSON.stringify(c);}
function differences(a,b,path='',out=[]){if(out.length>=8)return out;if(typeof a!==typeof b||a===null||b===null||typeof a!=='object'){if(a!==b)out.push({path,a,b});return out;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[key],b[key],path+'.'+key,out);return out;}
for(const seed of report.seeds){
 let a=createWorld(seed);if(seed===44)setModule(a,'npc-control',false);
 const first=a.hero;assert.ok(createNextStory(a,{allowLiving:true}));assert.ok(createNextStory(a,{allowLiving:true}));
 let repeat=restore(serialize(a)),other=restore(serialize(a));assert.ok(observeDetailedActor(other,first.lineage));
 const counts=new Map();for(let i=0;i<report.limit;i++){
  for(const s of [a,repeat,other]){const tick=s.tick;step(s);assert.equal(s.tick,tick+1);report.steps++;}
  for(const h of Object.values(a.actorStates)){const p=a.people[h.lineage];assert.equal(p.actorLink.inventory,h.inventory);assert.equal(h.gold,(p.agenda||p.actorLink).wealth);if(h.actorStep===a.tick)counts.set(h.lineage,(counts.get(h.lineage)||0)+1);}
  if(i%199===0){assert.ok(serialize(a)===serialize(repeat),'repeat diverged');const left=physical(a),right=physical(other);assert.ok(left===right,'observer changed physical simulation at '+a.tick+': '+JSON.stringify(differences(JSON.parse(left),JSON.parse(right))));const save=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(save));a=restore(save);assert.ok(serialize(a)===save,'restore changed');report.checks++;}
 }
 assert.ok(serialize(a)===serialize(repeat));assert.ok(physical(a)===physical(other));
 report.runs.push({seed,tick:a.tick,generation:a.generation,actors:Object.values(a.actorStates).map(h=>({person:h.lineage,alive:h.alive,outcome:h.life.outcome||'active',actions:counts.get(h.lineage)||0,area:h.area,gold:h.gold}))});console.log(JSON.stringify(report.runs.at(-1)));
}
report.elapsedMs=performance.now()-started;await writeFile('artifacts/'+(process.argv[2]||'actor-phase-audit')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
