import {createYearRun} from './playback.js';
// Pause elapsed wall time, retaining every second already owed before acceleration.
export function beginYearRun(state,clock,now,options){const run=createYearRun(state,options);run.clockAt=now;updateYearClock(clock,run,now);return run;}
export function updateYearClock(clock,run,now){
 if(run.closed)return;
 const elapsed=Math.max(0,now-run.clockAt);clock.anchor+=elapsed;
 if(clock.idleUntil)clock.idleUntil+=elapsed;
 run.clockAt=Math.max(run.clockAt,now);
 clock.yearRun={person:run.person,sequence:run.sequence,startTick:run.startTick,endTick:run.endTick,atTick:run.lastTick,committed:run.committed,remaining:Math.max(0,run.endTick-run.lastTick),status:'paused'};
}
export function endYearRun(clock,run,now){
 if(run.closed)return {ticks:run.committed,remaining:Math.max(0,run.endTick-run.lastTick)};
 updateYearClock(clock,run,now);clock.yearRun.status=run.endedBy==='death'?'death':run.lastTick===run.endTick?'done':'cancelled';run.closed=true;
 return {ticks:run.committed,remaining:Math.max(0,run.endTick-run.lastTick)};
}
