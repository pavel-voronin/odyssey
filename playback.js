import {step,createNextStory} from './engine.js';
import {runTickBatch} from './tick-batch.js';
export const YEAR_TICKS=19200;
export function lifeFinished(state){return !state.hero.alive||state.hero.life.ended;}
export function advanceLife(state){step(state);return true;}
export function startNextLife(state){return lifeFinished(state)&&createNextStory(state);}
export function runLifeBatch(state,limit=250,shouldYield=()=>false){
  const ticks=runTickBatch(()=>advanceLife(state),{limit,shouldYield,finished:()=>lifeFinished(state)});
  return{ticks,finished:lifeFinished(state)};
}
export function createYearRun(state){return {world:state,person:state.observation.person,startTick:state.tick,endTick:state.tick+YEAR_TICKS};}
export function runWorldBatch(state,run,{advance=advanceLife,now=()=>performance.now()}={}){
 const valid=run.world===state&&run.person===state.observation.person;
 if(!valid)return {ticks:0,remaining:Math.max(0,run.endTick-state.tick),finished:false,interrupted:true};
 const ticks=runTickBatch(()=>advance(state),{limit:run.endTick-state.tick,now});
 const remaining=Math.max(0,run.endTick-state.tick);
 return {ticks,remaining,finished:remaining===0,interrupted:false};
}
