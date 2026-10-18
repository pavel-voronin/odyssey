import assert from 'node:assert/strict';import {readdir,writeFile} from 'node:fs/promises';import {createWorld,step} from '../engine.js';
const baseline='55eff80f47a96005',dir='../dist/'+baseline+'/',files=await readdir(new URL(dir,import.meta.url)),old=await import(new URL(dir+files.find(f=>f.startsWith('engine.')),import.meta.url));
const report={baseline,seeds:[0,1,44,68],limit:6000,steps:0,heroChecks:0,runs:[]};
function hero(h){const c=structuredClone(h);delete c.actorJournal;delete c.actorStep;return JSON.stringify(c);}
for(const seed of report.seeds){const a=createWorld(seed),b=old.createWorld(seed);for(let i=0;i<report.limit;i++){step(a);old.step(b);report.steps+=2;assert.ok(hero(a.hero)===hero(b.hero),'single actor changed: '+seed+' tick '+a.tick);report.heroChecks++;if(!a.hero.alive||a.hero.life.ended)break;}report.runs.push({seed,tick:a.tick,outcome:a.hero.life.outcome||'active'});console.log(JSON.stringify(report.runs.at(-1)));}
await writeFile('artifacts/actor-phase-baseline.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
