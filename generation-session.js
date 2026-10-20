import {createWorld,createWarmPopulation,advancePreparation,observePreparedPopulation,serialize,restore,serializePopulation,restorePopulation} from './engine.js';
import {WARM_TICKS} from './modules/preparation-state.js';
import {MODULES} from './rules.js';

// Transport records are separate from game saves. A checkpoint contains the actual RNG.
export function generationJob(seed,{warm=true,duration=WARM_TICKS,rules={},stocks='seed'}={}){
 return {version:1,kind:'click-odyssey-generation',parameters:{seed:Number(seed)>>>0,warm,duration,rules:{...rules},stocks},checkpoint:null};
}
export function readGenerationJob(raw){const j=JSON.parse(raw),p=j?.parameters;if(j?.version!==1||j.kind!=='click-odyssey-generation'||!p||!Number.isSafeInteger(p.seed)||p.seed<0||p.seed>0xffffffff||typeof p.warm!=='boolean'||!Number.isSafeInteger(p.duration)||p.duration<0||p.duration>WARM_TICKS||!p.rules||typeof p.rules!=='object'||Array.isArray(p.rules)||!['seed','balanced','uneven'].includes(p.stocks)||j.checkpoint!==null&&typeof j.checkpoint!=='string')throw Error('Invalid generation request');return j;}
export function generationProgress(s){const p=s.population.preparation;return {elapsed:p.elapsed,total:p.parameters.duration,ready:p.status==='ready'};}
export async function runGeneration(j,{checkpoint=()=>{},progress=()=>{},yieldFrame=()=>new Promise(r=>setTimeout(r,0)),batch=8,stopped=()=>false}={}){
 readGenerationJob(JSON.stringify(j));if(!Number.isInteger(batch)||batch<1||batch>32)throw Error('Invalid browser generation batch');const p=j.parameters;
 if(!p.warm){if(j.checkpoint!==null)throw Error('Unadvanced start has no preparation checkpoint');const s=createWorld(p.seed,{rules:p.rules});return {ok:true,state:s,raw:serialize(s)};}
 let s=j.checkpoint===null?createWarmPopulation(p.seed,{duration:p.duration,rules:p.rules,stocks:p.stocks}):restorePopulation(j.checkpoint);
 const prepared=s.population.preparation.parameters;if(prepared.seed!==p.seed||prepared.duration!==p.duration||prepared.stocks!==p.stocks||Object.keys(p.rules).some(id=>!MODULES.some(m=>m.id===id))||MODULES.some(m=>s.rules[m.id]!== (p.rules[m.id]??true)))throw Error('Generation parameters differ from checkpoint');
 const save=()=>{j.checkpoint=serializePopulation(s);checkpoint(j);progress(generationProgress(s));};save();
 while(s.population.preparation.status!=='ready'){
  await yieldFrame();if(stopped())return {ok:false,paused:true};
  // Mutate a private copy: even a failed domain action leaves the last complete batch intact.
  const next=restorePopulation(j.checkpoint),deadline=performance.now()+12;for(let i=0;i<batch&&next.population.preparation.status!=='ready';i++){advancePreparation(next,1);if(performance.now()>=deadline)break;}s=next;save();
 }
 if(stopped())return {ok:false,paused:true};const observed=observePreparedPopulation(s);if(!observed.ok)return {...observed,unavailable:true};const raw=serialize(s);restore(raw);return {ok:true,state:s,raw};
}
