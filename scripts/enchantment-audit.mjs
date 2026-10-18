import{createWorld,step,serialize,restore}from'../engine.js';
import{setModule}from'../rules.js';
import{mkdir,writeFile}from'node:fs/promises';
import{writeFileSync}from'node:fs';
const seeds=24,ticks=8000,results=[],wanted=new Set(['memory','awakening']);
await mkdir('artifacts/scenarios',{recursive:true});
function items(s){const all=[...s.hero.bag,...Object.values(s.hero.equipment).filter(Boolean),...(s.merchant.items||[]),...Object.values(s.itemArchive||{})];for(const a of Object.values(s.areas))for(const o of a.objects)all.push(...(o.items||[]),...(o.paymentItems||[]));for(const p of Object.values(s.people))all.push(...(p.legacy?.keepsakes||[]));const unique=new Map();for(const item of all)if(!unique.has(item.id)||(item.enchantment?.uses||0)>(unique.get(item.id).enchantment?.uses||0))unique.set(item.id,item);return[...unique.values()];}
function run(seed,change=false){
  let s=createWorld(seed),signatures=[];
  for(let i=0;i<ticks;i++){
    if(change&&i===2000)setModule(s,'enchantments',false);step(s);
    if(i%96===0)signatures.push(JSON.stringify([s.hero.area,s.hero.goal?.kind,s.hero.gold,s.hero.hp,s.hero.magic.mana,s.hero.kills,s.generation]));
    if(i%733===0){const save=serialize(s);s=restore(save);if(serialize(s)!==save)throw Error(`Save diverged: ${seed}/${i}`);}
    if(!change&&wanted.size){const gear=Object.values(s.hero.equipment).filter(Boolean);for(const[key,match]of Object.entries({memory:gear.some(item=>item.enchantment?.uses>=5),awakening:gear.some(item=>item.enchantment?.resonance>=2)}))if(match&&wanted.has(key)){writeFileSync(`artifacts/scenarios/enchantment-${key}.json`,serialize(s));wanted.delete(key);}}
  }
  return{s,signatures};
}
for(let seed=1;seed<=seeds;seed++){
  const base=run(seed),repeat=run(seed),changed=run(seed,true);if(serialize(base.s)!==serialize(repeat.s))throw Error(`Replay diverged: ${seed}`);
  const all=items(base.s),effects={};for(const item of all)for(const[key,count]of Object.entries(item.enchantment?.counts||{}))effects[key]=(effects[key]||0)+count;
  results.push({seed,uses:all.reduce((n,i)=>n+(i.enchantment?.uses||0),0),awakened:all.filter(i=>i.enchantment?.resonance>=2).length,effects,divergence:base.signatures.filter((sig,i)=>sig!==changed.signatures[i]).length/base.signatures.length});
}
const effects={};for(const r of results)for(const[k,n]of Object.entries(r.effects))effects[k]=(effects[k]||0)+n;
const report={seeds,ticks,configurations:3,totalTicks:seeds*ticks*3,uses:results.reduce((n,r)=>n+r.uses,0),awakened:results.reduce((n,r)=>n+r.awakened,0),averageDivergence:results.reduce((n,r)=>n+r.divergence,0)/seeds,effects,missingFixtures:[...wanted],results};await writeFile('artifacts/enchantment-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));if(!report.uses||!report.awakened||!report.averageDivergence)process.exitCode=1;
