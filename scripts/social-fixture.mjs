import{createWorld,step,serialize}from'../engine.js';
import{mkdir,writeFile}from'node:fs/promises';
await mkdir('artifacts/scenarios',{recursive:true});
const wanted=new Set(['council','human-party','rescue','guard']);
for(let seed=1;seed<=32&&wanted.size;seed++){
  const s=createWorld(seed);
  for(let i=0;i<6000&&wanted.size;i++){
    step(s);const latest=s.journal[0];
    const cases={council:s.hero.lastAction==='talk'&&s.hero.civic.holdings.length&&s.areas[s.hero.area].civic?.ruler===s.hero.lineage,
      'human-party':s.hero.companions.some(c=>c.role==='person'),rescue:latest?.type==='rescue',guard:s.society.orders.some(o=>o.stage==='fighting'&&o.to===s.hero.area)};
    for(const[key,match]of Object.entries(cases))if(match&&wanted.has(key)){await writeFile(`artifacts/scenarios/${key}.json`,serialize(s));console.log(`${key}: seed ${seed}, tick ${s.tick}`);wanted.delete(key);}
  }
}
if(wanted.size)console.log('Not found in this sample: '+[...wanted].join(', '));
