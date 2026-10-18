import {step,createNextStory} from './engine.js';
import {runTickBatch} from './tick-batch.js';
export const YEAR_TICKS=19200;
export const LIFE_VIEW_TICKS=10*YEAR_TICKS;
export function lifeFinished(state){return !state.hero.alive||state.hero.life.ended;}
export function advanceLife(state){step(state);return true;}
export function startNextLife(state){return lifeFinished(state)&&createNextStory(state);}
export function runLifeBatch(state,limit=250,shouldYield=()=>false){
  const ticks=runTickBatch(()=>advanceLife(state),{limit,shouldYield,finished:()=>lifeFinished(state)});
  return{ticks,finished:lifeFinished(state)};
}
let nextRun=0;
export function createYearRun(state,{untilDeath=false}={}){return {id:++nextRun,world:state,person:state.observation.person,sequence:state.observation.sequence,startTick:state.tick,endTick:state.tick+(untilDeath?LIFE_VIEW_TICKS:YEAR_TICKS),lastTick:state.tick,committed:0,closed:false,cancelRequested:false,untilDeath,endedBy:null};}
export function requestYearCancel(run){if(run.closed)return false;run.cancelRequested=true;return true;}
export function runWorldBatch(state,run,{advance=advanceLife,now=()=>performance.now()}={}){
 const valid=!run.closed&&!run.cancelRequested&&run.world===state&&run.person===state.observation.person&&run.sequence===state.observation.sequence&&run.lastTick===state.tick;
 if(!valid)return {ticks:0,remaining:Math.max(0,run.endTick-run.lastTick),finished:false,interrupted:true};
 const ticks=runTickBatch(()=>{advance(state);run.lastTick=state.tick;run.committed++;},{limit:run.endTick-state.tick,now,finished:()=>run.cancelRequested||run.untilDeath&&!state.hero.alive});
 const remaining=Math.max(0,run.endTick-state.tick);
 run.endedBy=run.untilDeath&&!state.hero.alive?'death':remaining===0?'limit':null;
 return {ticks,remaining,finished:run.endedBy!==null,interrupted:run.cancelRequested};
}
