import {createLootNotice} from './loot-notice.js';
export const SPEECH_TICKS = 3;
export function lifeTick(state,tick=state.tick,generation=state.generation){
  const born=generation===state.generation?state.hero.born:state.lives.find(l=>l.generation===generation)?.born;
  const ended=generation===state.generation&&!state.hero.alive?state.hero.life.endedAt:state.lives.find(l=>l.generation===generation&&l.outcome==='dead')?.ended;
  return born===undefined?null:Math.max(0,(Number.isFinite(ended)?Math.min(tick,ended):tick)-born);
}
export function createSpeech(){return {identity:null,observed:null,text:'',type:null,meaning:null,until:0,loot:createLootNotice()};}
export function clearSpeech(memory){Object.assign(memory,createSpeech());}
export function visibleSpeech(memory,state,duration=SPEECH_TICKS){
  const key=`${state.seed}/${state.generation}/${state.hero.lineage}/${state.hero.born}`;
  if(memory.identity!==key||memory.observed>state.tick){clearSpeech(memory);memory.identity=key;}
  if(memory.observed!==state.tick){
    memory.observed=state.tick;
    if(state.hero.speech){memory.text=state.hero.speech;const event=state.journal.find(e=>e.tick===state.tick&&e.text===memory.text);memory.type=event?.type||null;memory.meaning=event?.meaning||null;memory.until=state.tick+duration;}
  }
  return state.tick<memory.until?memory.text:'';
}
