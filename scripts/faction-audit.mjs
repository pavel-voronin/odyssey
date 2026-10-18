import {mkdir,writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import assert from 'node:assert/strict';
await mkdir('artifacts/current/scenarios',{recursive:true});
const r={seeds:24,ticks:8000,configurations:3,totalTicks:576000,memberships:0,offices:0,duties:0,professionChanges:0,lead:0,escort:0,raids:0,averageDivergence:0};
const saved=new Set(),paths=new Map(),careers=new Map(),roles=new Map(),raids=new Map();
async function run(seed,intervene=false,observe=false){
  let s=createWorld(seed);const signatures=[];
  for(let i=0;i<8000;i++){
    if(intervene&&i===2000)setModule(s,'faction-paths',false);
    step(s);
    if(i%997===0){const text=serialize(s);s=restore(text);assert.equal(serialize(s),text);}
    if(i%80===0)signatures.push(`${s.hero.area}/${s.hero.profession}/${s.hero.affiliation.primary}/${s.hero.gold}/${s.hero.alive}`);
    if(!observe)continue;
    const h=s.hero,key=seed+':'+h.lineage;
    for(const [id,p] of Object.entries(h.affiliation.paths))paths.set(key+':'+id,{rank:p.rank,duties:p.duties});
    careers.set(key,h.career.history.length);raids.set(key,h.counters.caravanRaids||0);
    if(h.caravanJob)roles.set(key+':'+h.caravanJob.id,h.caravanJob.role);
    const kinds=[h.caravanJob?.role,h.goal?.kind==='caravanRaid'&&'raid',Object.values(h.affiliation.paths).some(p=>p.rank>=2)&&'office',h.career.history.length&&'career'].filter(Boolean);
    for(const kind of kinds)if(!saved.has(kind)){await writeFile(`artifacts/scenarios/faction-${kind}.json`,serialize(s));saved.add(kind);}
  }
  return signatures;
}
for(let seed=1;seed<=24;seed++){
  const a=await run(seed,false,true),b=await run(seed),c=await run(seed,true);assert.deepEqual(a,b);
  r.averageDivergence+=a.reduce((n,value,i)=>n+(value!==c[i]),0)/a.length/24;
}
r.memberships=paths.size;r.offices=[...paths.values()].filter(p=>p.rank>=2).length;r.duties=[...paths.values()].reduce((n,p)=>n+p.duties,0);r.professionChanges=[...careers.values()].reduce((a,b)=>a+b,0);
r.lead=[...roles.values()].filter(x=>x==='lead').length;r.escort=[...roles.values()].filter(x=>x==='escort').length;r.raids=[...raids.values()].reduce((a,b)=>a+b,0);
assert.ok(r.memberships>10&&r.offices>5&&r.professionChanges>0);r.missingFixtures=['lead','escort','raid','office','career'].filter(x=>!saved.has(x));
await writeFile('artifacts/current/faction-audit.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));
