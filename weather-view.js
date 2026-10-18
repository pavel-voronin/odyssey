export const precipitationWeather=id=>['rain','storm','snow'].includes(id);
const wrap=(value,size)=>((value%size)+size)%size;

// Stateless decorative positions. The world clock and RNG are never inputs.
export function weatherParticles(id,view,width,ground,timeMs){
  if(!precipitationWeather(id)||width<=0||ground<=0)return [];
  const snow=id==='snow',count=Math.min(id==='storm'?48:32,Math.max(12,Math.ceil(width/12)));
  const seconds=timeMs/1000,fall=snow?22:id==='storm'?190:140;
  return Array.from({length:count},(_,i)=>{
    const drift=snow?Math.sin(seconds*.7+i)*8:-seconds*28;
    return {x:wrap(view.values[i%48]*width+i*11+drift,width),y:wrap(view.values[(i+9)%48]*ground+seconds*fall,ground+12)-12,dx:snow?1:-3,dy:snow?2:id==='storm'?12:9};
  });
}
