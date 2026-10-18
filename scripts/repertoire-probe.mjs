import {writeFile} from 'node:fs/promises';import {step} from '../engine.js';import {repertoireFixture} from './repertoire-scenarios.mjs';
const report=[];
for(const kind of['craft','family','explore','peaceful']){const{s,h,q}=repertoireFixture(kind),choices=[];let last=-1;for(let i=0;i<800;i++){step(s);const c=h.repertoire?.choices.at(-1);if(c&&c.tick!==last){choices.push(structuredClone(c));last=c.tick;}}
 report.push({kind,tick:s.tick,alive:h.alive,work:h.counters.peacefulWork,quest:q?.status,profession:h.profession,rank:h.career.rank,places:h.memory.places.length,choices});console.log(JSON.stringify({kind,work:h.counters.peacefulWork,quest:q?.status,sequence:choices.slice(0,10).map(c=>c.line)}));}
await writeFile('artifacts/repertoire-140/probe.json',JSON.stringify(report,null,2));
