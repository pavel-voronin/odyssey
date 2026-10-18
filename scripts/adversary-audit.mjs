import{createWorld,step,serialize,restore}from'../engine.js';
import{setModule}from'../rules.js';
import{writeFileSync}from'node:fs';
import{mkdir,writeFile}from'node:fs/promises';
const seeds=24,ticks=10000,results=[],wanted=new Set(['charged','reinforcement','knowledge','death']),combinations=new Set();
await mkdir('artifacts/scenarios',{recursive:true});
function run(seed,interference=false){
  let s=createWorld(seed),signatures=[];
  for(let i=0;i<ticks;i++){
    if(interference&&i===2000)for(const id of ['elements','tactics','mutations'])setModule(s,id,false);
    step(s);if(i%96===0)signatures.push(JSON.stringify([s.hero.area,s.hero.goal?.kind,s.hero.hp,s.hero.magic.mana,s.hero.kills,s.generation]));
    if(i%751===0){const saved=serialize(s);s=restore(saved);if(serialize(s)!==saved)throw Error(`Save diverged ${seed}/${i}`);}
    if(!interference){
      const local=s.areas[s.hero.area].objects.filter(e=>e.kind==='enemy');
      const cases={charged:local.some(e=>e.alive&&e.battle?.intent==='strike'&&e.tactic==='charged'),reinforcement:local.some(e=>e.originPack&&e.alive),knowledge:Object.keys(s.hero.memory.threats).length>0&&s.hero.lastAction==='spell',death:s.hero.life.outcome==='dead'};
      for(const[key,match]of Object.entries(cases))if(match&&wanted.has(key)){writeFileSync(`artifacts/scenarios/adversary-${key}.json`,serialize(s));wanted.delete(key);}
    }
  }
  return{s,signatures};
}
for(let seed=1;seed<=seeds;seed++){
  const base=run(seed),repeat=run(seed),changed=run(seed,true);if(serialize(base.s)!==serialize(repeat.s))throw Error(`Replay diverged ${seed}`);
  let enemies=0,reinforcements=0;for(const a of Object.values(base.s.areas))for(const e of a.objects)if(e.kind==='enemy'){enemies++;if(e.originPack)reinforcements++;combinations.add([e.species,e.powers?.join(','),e.element,e.tactic,e.mutation].join('/'));}
  results.push({seed,enemies,reinforcements,deaths:base.s.lives.filter(l=>l.outcome==='dead').length,settled:base.s.lives.filter(l=>l.outcome==='settled').length,divergence:base.signatures.filter((sig,i)=>sig!==changed.signatures[i]).length/base.signatures.length});
}
const sum=key=>results.reduce((n,r)=>n+r[key],0),report={seeds,ticks,configurations:3,totalTicks:seeds*ticks*3,distinctCompositions:combinations.size,enemies:sum('enemies'),reinforcements:sum('reinforcements'),deaths:sum('deaths'),settled:sum('settled'),averageDivergence:sum('divergence')/seeds,missingFixtures:[...wanted],results};
await writeFile('artifacts/adversary-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));if(!report.reinforcements||!report.averageDivergence||report.distinctCompositions<100)process.exitCode=1;
