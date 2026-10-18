import {writeFile} from 'node:fs/promises';import {createWorld,step} from '../engine.js';
const cases=[];
for(let seed=0;seed<16;seed++){
  const s=createWorld(seed);let walks=0;
  for(let i=0;i<3000&&s.hero.alive;i++){step(s);if(s.areas[s.hero.area].roadProfile==='long-tract'&&s.hero.lastAction==='walk')walks++;}
  const row={seed,tick:s.tick,alive:s.hero.alive,longAreas:Object.values(s.areas).filter(a=>a.roadProfile==='long-tract').length,longWalkTicks:walks};cases.push(row);console.log(row);if(walks>0)break;
}
await writeFile('artifacts/long-road-coverage.json',JSON.stringify(cases,null,2));
