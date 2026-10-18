import {mkdir,writeFile}from'node:fs/promises';
import{createWorld,step,serialize}from'../engine.js';
const wanted=new Set(['sea','dungeon','dream','port','clockwork','epoch']);
await mkdir('artifacts/scenarios',{recursive:true});
for(let seed=1;seed<=24&&wanted.size;seed++){
  const s=createWorld(seed);
  for(let i=0;i<5000&&wanted.size;i++){
    step(s);if(!s.hero.alive)continue;
    const a=s.areas[s.hero.area];const type=s.hero.transit?.mode==='sea'?'sea':a.era!==0?'epoch':a.type;
    if(wanted.has(type)){await writeFile(`artifacts/scenarios/${type}.json`,serialize(s));console.log(`${type}: seed ${seed}, tick ${s.tick}, ${a.name}`);wanted.delete(type);}
  }
}
if(wanted.size)throw new Error('Missing visual scenarios: '+[...wanted].join(','));
