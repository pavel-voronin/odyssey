import {quadrupedPose} from './motion.js';
// Presentation of an already resolved world displacement; never a movement order.
export function petMotion(kind,track,progress,{pixelsPerUnit=1,animate=true,facing=1,rest=false}={}){
  const direction=Math.sign(track?.direction)||Math.sign(facing)||1;
  const t=animate?Math.round(Math.max(0,Math.min(1,progress))*30)/30:1;
  const distance=animate&&Number.isFinite(track?.from)&&Number.isFinite(track?.to)?Math.abs(track.to-track.from)*pixelsPerUnit:0;
  const q=quadrupedPose({...track,direction,rest:rest||track?.rest},t,distance);
  const stride=kind==='cat'?.65:kind==='owl'?.4:.95,lift=kind==='owl'?.55:.8;
  return {direction,rest:q.resting,hurt:q.hurt,walking:q.walking,bodyY:q.walking?q.bodyY*.6:0,reach:q.reach*.6,
    feet:q.feet.map((f,i)=>({x:(f.x-[-10,-6,8,12][i])*stride,y:f.y*lift})),
    wing:kind==='owl'&&!q.resting&&animate&&track?.attack&&t<1?Math.sin(Math.PI*t)*4:0};
}
