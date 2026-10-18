import assert from 'node:assert/strict';import {readdir,writeFile} from 'node:fs/promises';import {createWorld,step,serialize,restore} from '../engine.js';
const baseline='a76a385f83092254',dir='../dist/'+baseline+'/',files=await readdir(new URL(dir,import.meta.url)),old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:12000,steps:0,checks:0,heroChecks:0,maxBytes:0,linkedActors:0,runs:[]};
function hero(h){const copy=structuredClone(h);delete copy.actorGeneration;delete copy.personPosition;return JSON.stringify(copy);}
for(const seed of report.seeds){let a=createWorld(seed),b=createWorld(seed),before=old.createWorld(seed),prefix=true,endedAt=null;
 for(let i=0;i<report.limit;i++){step(a);step(b);report.steps+=2;if(prefix){old.step(before);report.steps++;assert.ok(hero(a.hero)===hero(before.hero),'living prefix changed at seed '+seed+' tick '+a.tick);report.heroChecks++;if(!a.hero.alive||a.hero.life.ended){prefix=false;endedAt=a.tick;}}
  for(const [id,h]of Object.entries(a.actorStates)){const p=a.people[id];assert.ok(p?.actorLink);assert.equal(p.actorLink.inventory,h.inventory);if(h!==a.hero||!h.alive||h.life.ended){assert.equal(h.gold,(p.agenda||p.actorLink).wealth);if(p.legacy){assert.equal(p.legacy.wealth,h.gold);for(const item of p.legacy.keepsakes)assert.ok([...h.bag,...Object.values(h.equipment).filter(Boolean)].includes(item));}}}
  if(i%997===0){assert.ok(serialize(a)===serialize(b),'repeat changed');const saved=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(saved));a=restore(saved);assert.ok(serialize(a)===saved,'restore changed');report.checks++;}
 }
 assert.ok(serialize(a)===serialize(b));report.linkedActors+=Object.keys(a.actorStates).length;report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));report.runs.push({seed,tick:a.tick,firstEnd:endedAt,outcome:a.hero.life.outcome||'active',alive:a.hero.alive,wallet:a.hero.gold,npcWallet:a.people[a.hero.lineage].agenda?.wealth,people:Object.keys(a.people).length});console.log(JSON.stringify(report.runs.at(-1)));
}
await writeFile('artifacts/actor-projection-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
