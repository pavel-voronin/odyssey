import{createWorld,step,serialize}from'../engine.js';
import{mkdir,writeFile}from'node:fs/promises';
import{setModule}from'../rules.js';
const seeds=24,ticks=10000,results=[],wanted=new Set(['working','gathering','family']);
await mkdir('artifacts/scenarios',{recursive:true});
for(let seed=1;seed<=seeds;seed++){
  const s=createWorld(seed),signatures=[];
  for(let i=0;i<ticks;i++){
    step(s);
    if(i%96===0)signatures.push(JSON.stringify([s.hero.area,s.hero.goal?.kind,s.hero.gold,s.hero.quests.filter(q=>q.status==='done').length,s.generation]));
    for(const p of Object.values(s.people))if(p.agenda){if(p.agenda.wealth<0||p.x<0||p.x>100)throw Error(`Invalid NPC: ${seed}/${s.tick}/${p.id}`);}
    const near=Object.values(s.people).filter(p=>p.alive&&p.area===s.hero.area&&p.id!==s.hero.lineage);
    const cases={working:near.some(p=>p.agenda?.task?.kind==='work'),gathering:near.some(p=>p.agenda?.task?.kind==='gather'),family:near.some(p=>p.agenda?.visits>0)};
    for(const[key,match]of Object.entries(cases))if(match&&wanted.has(key)){await writeFile(`artifacts/scenarios/people-${key}.json`,serialize(s));wanted.delete(key);}
  }
  const changed=createWorld(seed);setModule(changed,'people',false);let different=0;
  for(let i=0;i<ticks;i++){step(changed);if(i%96===0&&signatures[Math.floor(i/96)]!==JSON.stringify([changed.hero.area,changed.hero.goal?.kind,changed.hero.gold,changed.hero.quests.filter(q=>q.status==='done').length,changed.generation]))different++;}
  const agendas=Object.values(s.people).map(p=>p.agenda).filter(Boolean);results.push({seed,people:agendas.length,work:agendas.reduce((n,m)=>n+m.work,0),income:agendas.reduce((n,m)=>n+m.wealth,0),tools:agendas.filter(m=>m.tools).length,visits:agendas.reduce((n,m)=>n+m.visits,0),deaths:s.lives.filter(l=>l.outcome==='dead').length,divergence:different/signatures.length});
}
const total=key=>results.reduce((n,r)=>n+r[key],0),report={seeds,ticks,configurations:2,totalTicks:seeds*ticks*2,work:total('work'),income:total('income'),tools:total('tools'),visits:total('visits'),deaths:total('deaths'),averageDivergence:total('divergence')/seeds,missingFixtures:[...wanted],results};
await writeFile('artifacts/people-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));if(!report.work||!report.visits)process.exitCode=1;
