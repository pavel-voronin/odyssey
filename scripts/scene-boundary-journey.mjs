import {writeFile} from 'node:fs/promises';import {createWorld,step,serialize,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {transitLandscape,transitProgress} from '../scene-boundary.js';
const dir='artifacts/scene-boundary-132';let found;
for(let seed=1;seed<=16&&!found;seed++){
 const s=createWorld(seed);setModule(s,'npc-travel',false);
 for(let n=0;n<480;n++){
  step(s);const j=s.society.journeys.find(j=>j.movement==='timed'&&Number.isFinite(j.departedAt)&&j.duration>0);if(!j)continue;
  const raw=serialize(s);if(!observeExistingPerson(s,j.person))continue;const start={tick:s.tick,departedAt:j.departedAt,duration:j.duration,arrival:j.arrival,from:j.from,to:j.to,person:j.person,progress:transitProgress(s),blend:Boolean(transitLandscape(s)?.mix)};await writeFile(dir+'/journey-start.json',serialize(s));
  for(let i=0;i<Math.floor(j.duration/2);i++)step(s);const middle={tick:s.tick,progress:transitProgress(s),blend:Boolean(transitLandscape(s)?.mix),from:s.hero.transit?.from,to:s.hero.transit?.to};await writeFile(dir+'/journey-middle.json',serialize(s));await writeFile(dir+'/journey-before-observation.json',raw);
  found={seed,start,middle,scope:'Actual new timed legacy NPC departure from the existing society event/controller with npc-travel OFF; no injected quest/event roll or invented historical start. This is coverage selection, not natural frequency; granular public travellers normally retain their physical scene.'};await writeFile(dir+'/journey-coverage.json',JSON.stringify(found,null,2));console.log(JSON.stringify(found));break;
 }
}
if(!found)throw Error('No actual timed neighbouring departure in the bounded search; do not claim coverage');
