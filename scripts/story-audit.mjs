import {createWorld,step,serialize} from '../engine.js';
import {mkdir,writeFile} from 'node:fs/promises';
const seeds=Number(process.env.STORY_SEEDS||48),ticks=Number(process.env.STORY_TICKS||12000),counts={},variants={},decisions={},deathCauses=[],fixtures=new Set(['pact','mystery','expedition','collector','echo','island','death']);
let deaths=0;
await mkdir('artifacts/scenarios',{recursive:true});
for(let seed=1;seed<=seeds;seed++){
  const s=createWorld(seed);
  for(let i=0;i<ticks;i++){
    step(s);
    if(s.hero.life.outcome==='dead'&&fixtures.has('death')){await writeFile('artifacts/scenarios/story-death.json',serialize(s));fixtures.delete('death');}
    for(const c of s.storyCases){
      const matches={pact:c.kind==='pact'&&c.status==='done',mystery:c.kind==='mystery'&&c.status!=='active',expedition:c.kind==='expedition'&&c.status==='done',collector:c.stage==='collection',echo:Boolean(c.echo),island:c.effects.some(e=>e.text.includes('постоянный проход'))};
      for(const[key,value]of Object.entries(matches))if(value&&fixtures.has(key)){await writeFile(`artifacts/scenarios/story-${key}.json`,serialize(s));fixtures.delete(key);}
    }
  }
  deaths+=s.lives.filter(l=>l.outcome==='dead').length;
  deathCauses.push(...s.lives.filter(l=>l.outcome==='dead').map(l=>({seed,tick:l.ended,cause:l.cause})));
  for(const c of s.storyCases){const key=c.kind+'/'+c.status;counts[key]=(counts[key]||0)+1;if(c.variant){const k=c.kind+'/'+c.variant;variants[k]=(variants[k]||0)+1;}for(const d of c.choices)decisions[d.text]=(decisions[d.text]||0)+1;}
}
const report={seeds,ticks,totalTicks:seeds*ticks,naturalDeaths:deaths,deathCauses,counts,variants,decisions,missingFixtures:[...fixtures]};
await writeFile('artifacts/story-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,decisions:undefined},null,2));
if(['pact','mystery','expedition'].some(kind=>!Object.keys(counts).some(k=>k.startsWith(kind+'/')&&!k.endsWith('/active'))))process.exitCode=1;
