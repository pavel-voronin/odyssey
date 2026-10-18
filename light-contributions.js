const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function contourBounds(polygons,anchor){
 const points=polygons.flat();return {x:anchor.x,y:anchor.y,left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))};
}
export function insidePolygon([x,y],p){
 let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;
}
function crosses(a,b,c,d){
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
 return abC*abD<0&&cdA*cdB<0;
}
export function lightVisibility(caster,source,occluders=[],self,surface){
 const height=Math.max(1,caster.y-caster.top),targets=[.15,.5,.85].map(h=>height*h),sky=['sun','moon'].includes(source.kind),back=surface?.back??caster.y;
 const foot=sky?back-Math.max(16,(back-source.y)*.3):(source.baseY??back),sourceHeight=foot-source.y;let visible=0;
 for(const targetHeight of targets){
  const blocked=occluders.some(blocker=>{
   if(blocker.contour===self||!blocker.contour)return false;
   const plane=blocker.y??caster.y,half=(blocker.depth??5)/2,delta=caster.y-foot;let from=0,to=1;
   // A rear facade cannot block a ray travelling wholly along the foreground.
   if(Math.abs(delta)<1e-8){if(Math.abs(plane-foot)>half)return false;}
   else{const a=(plane-half-foot)/delta,b=(plane+half-foot)/delta;from=Math.max(0,Math.min(a,b));to=Math.min(1,Math.max(a,b));if(from>to)return false;}
   const at=t=>[source.x+(caster.x-source.x)*t,plane-(sourceHeight+(targetHeight-sourceHeight)*t)],a=at(from),b=at(to);
   return blocker.contour.some(p=>{
    if(Math.abs(plane-foot)<=half&&insidePolygon([source.x,plane-sourceHeight],p))return false;
    if(insidePolygon(a,p)||insidePolygon(b,p)||insidePolygon(at((from+to)/2),p))return true;
    return p.some((point,i)=>crosses(a,b,point,p[(i+1)%p.length]));
   });
  });
  if(!blocked)visible++;
 }
 return visible/targets.length;
}
export function lightContributions(caster,lights,{occluders=[],self,owner=null,surface}={}){
 const candidates=[...(lights.sky?[{...lights.sky,id:lights.sky.id||lights.sky.kind}]:[]),...lights.local];
 const evaluated=candidates.map(source=>{
  const sky=['sun','moon'].includes(source.kind),dx=Math.max(0,caster.left-source.x,source.x-caster.right),dy=Math.max(0,caster.top-source.y,source.y-caster.y);
  const coverage=sky?1:clamp(1-Math.hypot(dx,dy)/source.range,0,1);
  const reach=sky?null:groundLightReach(source,surface||{back:caster.y});
  const reason=source.active===false?'inactive':coverage===0?'outside-range':!sky&&reach.radius<=0?'no-ground-reach':!sky&&source.owner&&source.owner===owner?'own-emitter':null;
  const visibility=reason==='own-emitter'?1:reason?0:lightVisibility(caster,source,occluders,self,surface);
  const intensity=(source.kind==='sun'?1:source.kind==='moon'?.3:coverage)*visibility;
  return {source,coverage,visibility,intensity,reach,reason:reason||(visibility===0?'occluded':null)};
 });
 const total=Math.max(.45,evaluated.reduce((n,c)=>n+c.intensity,0));
 return evaluated.map(c=>({...c,alpha:c.reason==='own-emitter'?0:(c.source.kind==='sun'?.15:c.source.kind==='moon'?.28:.4)*c.intensity/total,blur:c.source.kind==='sun'?3.5:c.source.kind==='moon'?0:['fire','magic','rift'].includes(c.source.kind)?1.5:.5}));
}
export function groundLightReach(source,surface){const y=source.baseY??surface.back,height=y-source.y;return {x:source.x,y,radius:height<0?0:Math.sqrt(Math.max(0,source.range*source.range-height*height))};}
export function lightInViewport(light,camera,height){return light.x+light.range>=camera.scroll&&light.x-light.range<=camera.scroll+camera.viewportWidth&&light.y+light.range>=0&&light.y-light.range<=height;}
export function contactContour(polygons,ground){
 const cut=(polygon,bound,above)=>{
  const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],ain=above?a[1]>=bound:a[1]<=bound,bin=above?b[1]>=bound:b[1]<=bound;if(ain)out.push(a);if(ain!==bin){const t=(bound-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*t,bound]);}}return out;
 };
 return polygons.map(p=>cut(cut(p,ground-2,true),ground+1,false)).filter(p=>p.length>=3).map(p=>p.map(([x,y])=>[x,ground+(y-ground)*.3]));
}
