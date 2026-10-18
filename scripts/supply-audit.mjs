import{createWorld,step,serialize}from'../engine.js';
import{mkdir,writeFile}from'node:fs/promises';
const seeds=24,ticks=10000,results=[],wanted=new Set(['forage','caravan','captured','clinic']);
await mkdir('artifacts/scenarios',{recursive:true});
for(let seed=1;seed<=seeds;seed++){
  const s=createWorld(seed);let forage=0,meals=0;
  for(let i=0;i<ticks;i++){
    const before=s.hero.counters.forage,previousMeals=s.hero.counters.meals;step(s);if(s.hero.counters.forage>before)forage++;if(s.hero.counters.meals>previousMeals)meals++;
    for(const a of Object.values(s.areas)){if(a.civic&&(a.civic.food<0||a.civic.food>100||a.civic.medicine<0||a.civic.medicine>100)||a.forage.stock<0||a.forage.stock>a.forage.max)throw Error(`Invalid stock: ${seed}/${s.tick}/${a.id}`);}
    const a=s.areas[s.hero.area];const cases={forage:s.hero.lastAction==='collect'&&s.hero.counters.forage>before,caravan:s.logistics.convoys.length>0,captured:a.objects.some(o=>o.kind==='supplyCache'&&!o.taken),clinic:s.hero.speech.includes('Лекарь остался без средств')};
    for(const[name,match]of Object.entries(cases))if(match&&wanted.has(name)){await writeFile(`artifacts/scenarios/supply-${name}.json`,serialize(s));wanted.delete(name);}
  }
  results.push({seed,forage,meals,deliveries:s.logistics.deliveries,losses:s.logistics.losses,deaths:s.lives.filter(l=>l.outcome==='dead').length,quests:s.hero.quests.filter(q=>q.status==='done').length});
}
const total=key=>results.reduce((sum,r)=>sum+r[key],0),report={seeds,ticks,totalTicks:seeds*ticks,forage:total('forage'),meals:total('meals'),deliveries:total('deliveries'),losses:total('losses'),deaths:total('deaths'),missingFixtures:[...wanted],results};
await writeFile('artifacts/supply-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));
if(!report.forage||!report.deliveries||!report.losses)process.exitCode=1;
