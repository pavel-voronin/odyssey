// Wall time is an input adapter. The simulation itself remains one deterministic step.
import {runTickBatch} from './tick-batch.js';
export function createClock(anchor = Date.now(), idleUntil = 0,stopped=false,yearRun) {
  return { anchor: Number.isFinite(anchor) ? anchor : Date.now(), idleUntil:Number.isFinite(idleUntil)?idleUntil:0,stopped:Boolean(stopped),...(yearRun?{yearRun:{...yearRun}}:{}) };
}
export function resumeClock(clock){clock.stopped=false;}
export function registerInput(clock,now){if(clock.stopped)return false;clock.anchor=now;clock.idleUntil=now+5000;return true;}
export function stopClock(clock,now){clock.stopped=true;clock.anchor=now;clock.idleUntil=0;}
export function restartClock(clock,now){clock.stopped=false;delete clock.yearRun;registerInput(clock,now);}
export function hasDue(clock,now){return !clock.stopped&&now>=(clock.idleUntil||clock.anchor+1000);}
export function catchUp(clock, now, advance, limit = 250, shouldYield=()=>false,finished=()=>false) {
  if(clock.stopped)return 0;
  if(finished()){stopClock(clock,now);return 0;}
  if (now < clock.anchor) { clock.anchor = now;clock.idleUntil=0; return 0; }
  if(clock.idleUntil){if(now<clock.idleUntil)return 0;clock.anchor=Math.max(clock.anchor,clock.idleUntil-1000);clock.idleUntil=0;}
  const ticks = Math.min(limit, Math.floor((now - clock.anchor) / 1000));
  const completed=runTickBatch(()=>{advance();clock.anchor+=1000;},{limit:ticks,shouldYield,finished});
  if(finished())stopClock(clock,now);
  return completed;
}
