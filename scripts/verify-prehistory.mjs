import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {createWarmPopulation,advancePreparation,serializePopulation,restorePopulation,observePreparedPopulation,serialize,restore} from '../engine.js';
import {LONG_HISTORY_TICKS} from '../modules/preparation-state.js';

// Explicit, manual full-history diagnostic. Never included in deployment tests.
const args=process.argv.slice(2),seedAt=args.indexOf('--seed');
const seed=seedAt<0?4:Number(args[seedAt+1]),resume=args.includes('--resume');
if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||args.some((a,i)=>a!=='--resume'&&a!=='--seed'&&!(seedAt>=0&&i===seedAt+1)))throw Error('Usage: node scripts/verify-prehistory.mjs [--seed 4] [--resume]');
const dir=path.resolve('artifacts/prehistory-'+seed);fs.mkdirSync(dir,{recursive:true});
const checkpoint=path.join(dir,'checkpoint.json');
const write=(name,data)=>fs.writeFileSync(path.join(dir,name),typeof data==='string'?data:JSON.stringify(data,null,2));
const record=data=>{fs.appendFileSync(path.join(dir,'runs.jsonl'),JSON.stringify(data)+'\n');console.log(JSON.stringify(data));};
const s=resume?restorePopulation(fs.readFileSync(checkpoint,'utf8')):createWarmPopulation(seed,{duration:LONG_HISTORY_TICKS});
if(s.seed!==seed||s.population.preparation.parameters.duration!==LONG_HISTORY_TICKS||Object.values(s.rules).some(v=>v!==true))throw Error('Expected all-default full forty-year population');
let last=performance.now(),started=last,lastAt=s.tick,before=serializePopulation(s);
write('checkpoint.json',before);record({event:'start',seed,tick:s.tick,target:s.population.preparation.target,allDefault:true,resume});
while(s.population.preparation.status!=='ready'){
 before=serializePopulation(s);
 try{advancePreparation(s,32);}
 catch(e){
  write('checkpoint.json',before);
  const failure={event:'failure',tick:s.tick,checkpointTick:JSON.parse(before).tick,error:e.stack,elapsedMs:Math.round(performance.now()-started)};
  write('failure.json',failure);record(failure);process.exitCode=1;break;
 }
 const now=performance.now();
 if(now-last>=5000){
  write('checkpoint.json',serializePopulation(s));
  record({event:'progress',tick:s.tick,target:s.population.preparation.target,years:+(s.population.preparation.elapsed/19200).toFixed(3),percent:+(100*s.population.preparation.elapsed/LONG_HISTORY_TICKS).toFixed(2),ticksPerSecond:Math.round((s.tick-lastAt)*1000/(now-last)),people:Object.keys(s.people).length});
  last=now;lastAt=s.tick;
 }
}
if(!process.exitCode){
 const raw=serializePopulation(s);write('checkpoint.json',raw);
 if(serializePopulation(restorePopulation(raw))!==raw)throw Error('Final population roundtrip differs');
 const result=observePreparedPopulation(s);
 if(!result.ok)throw Error('Final first observation unavailable: '+result.reason);
 const game=serialize(s);
 if(serialize(restore(game))!==game)throw Error('Final game roundtrip differs');
 write('game.json',game);
 const success={seed,ticks:s.tick,elapsed:s.population.preparation.elapsed,target:LONG_HISTORY_TICKS,worldYears:s.population.preparation.elapsed/19200,person:result.person,durationMs:Math.round(performance.now()-started)};
 write('success.json',success);record({event:'success',...success});
}
