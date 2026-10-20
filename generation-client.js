import {historyInterval} from './modules/preparation-state.js';
import {restore} from './engine.js';
import {SAVE_KEY,clockRecord} from './save-schema.js';
import {createClock,restartClock} from './clock.js';
import {generationJob,readGenerationJob,runGeneration} from './generation-session.js';
export const GENERATION_KEY=SAVE_KEY+'-generation';
const signature=raw=>{if(raw===null)return null;let n=2166136261;for(let i=0;i<raw.length;i++)n=Math.imul(n^raw.charCodeAt(i),16777619);return (n>>>0).toString(16);};
export function pendingGeneration(storage){const raw=storage.getItem(GENERATION_KEY);if(!raw)return null;const j=readGenerationJob(raw);return j.base===signature(storage.getItem(SAVE_KEY))?j:null;}
export function requestGeneration(storage,seed,options){const j=generationJob(seed,options);j.base=signature(storage.getItem(SAVE_KEY));storage.setItem(GENERATION_KEY,JSON.stringify(j));return j;}
export function commitGeneration(storage,j,result,now){if(!result.ok)throw Error('Generation is not ready');if(j.base!==signature(storage.getItem(SAVE_KEY)))throw Error('Сохранение изменилось в другой вкладке. Оно сохранено; перезагрузите страницу.');const clock=createClock(now);restartClock(clock,now);storage.setItem(SAVE_KEY+'-clock',JSON.stringify(clockRecord(result.state,clock)));storage.setItem(SAVE_KEY,result.raw);storage.removeItem(GENERATION_KEY);return {state:result.state,fresh:true};}
export async function generateInBrowser(j,storage=localStorage){
 const panel=document.getElementById('preparation-panel'),game=document.getElementById('game-shell'),label=document.getElementById('preparation-label'),meter=document.getElementById('preparation-progress'),pause=document.getElementById('preparation-pause'),retry=document.getElementById('preparation-resume'),plain=document.getElementById('preparation-plain'),observe=document.getElementById('preparation-observe'),arrival=document.getElementById('preparation-arrival');game.hidden=true;panel.hidden=false;let paused=false;
 pause.onclick=()=>{paused=true;};
 try{for(;;){pause.hidden=false;retry.hidden=true;plain.hidden=true;observe.hidden=true;arrival.hidden=true;paused=false;label.textContent='Мир живёт до начала наблюдения…';
  let result;try{result=await runGeneration(j,{stopped:()=>paused,checkpoint:job=>storage.setItem(GENERATION_KEY,JSON.stringify(job)),progress:p=>{meter.max=p.total||1;meter.value=p.elapsed;label.textContent=(p.ready?(p.complete?'Подготовка завершена · ':'Наблюдение досрочно · '):'Подготовка · ')+historyInterval(p.elapsed)+' из '+historyInterval(p.total);}});}catch(e){result={ok:false,reason:'Подготовка приостановлена. Последний завершённый пакет сохранён. '+e.message};}
  if(result.ok)return commitGeneration(storage,j,result,Date.now());
  pause.hidden=true;retry.hidden=Boolean(result.unavailable);plain.hidden=false;observe.hidden=!result.paused;arrival.hidden=!result.unavailable;label.textContent=result.paused?'Подготовка на паузе. Её можно продолжить после перезагрузки.':result.reason;
  const action=await new Promise(resolve=>{retry.onclick=()=>resolve('resume');plain.onclick=()=>resolve('plain');observe.onclick=()=>resolve('observe');arrival.onclick=()=>resolve('arrival');});
  if(action==='observe'||action==='arrival'){j[action==='observe'?'observeNow':'arrival']=true;storage.setItem(GENERATION_KEY,JSON.stringify(j));}
  if(action==='plain'){// A separate, explicit new-world choice; never disguise a rollback as continuation.
   if(j.checkpoint)storage.setItem(GENERATION_KEY+'-paused',JSON.stringify(j));j=requestGeneration(storage,j.parameters.seed,{warm:false,rules:j.parameters.rules});
  }
 }}finally{panel.hidden=true;game.hidden=false;pause.onclick=retry.onclick=plain.onclick=observe.onclick=arrival.onclick=null;}
}
export async function startBrowserWorld(storage=localStorage){
 const saved=storage.getItem(SAVE_KEY);let job;
 try{job=pendingGeneration(storage);}catch{if(!saved)throw Error('Повреждено промежуточное сохранение подготовки. Оно не удалено.');}
 if(job)return generateInBrowser(job,storage);
 if(saved)return {state:restore(saved),fresh:false};
 return generateInBrowser(requestGeneration(storage,Date.now(),{warm:true}),storage);
}
