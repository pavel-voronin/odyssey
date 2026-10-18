import {step,createNextStory} from './engine.js';
export function lifeFinished(state){return !state.hero.alive||state.hero.life.ended;}
export function advanceLife(state){step(state);return true;}
export function startNextLife(state){return lifeFinished(state)&&createNextStory(state);}
export function runLifeBatch(state,limit=250,shouldYield=()=>false){
  let ticks=0;
  while(ticks<limit&&!lifeFinished(state)){advanceLife(state);ticks++;if(shouldYield())break;}
  return{ticks,finished:lifeFinished(state)};
}
