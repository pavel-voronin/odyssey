const identity={a:1,b:0,c:0,d:1,e:0,f:0};
export function multiplyMatrix(m,n){return {a:m.a*n.a+m.c*n.b,b:m.b*n.a+m.d*n.b,c:m.a*n.c+m.c*n.d,d:m.b*n.c+m.d*n.d,e:m.a*n.e+m.c*n.f+m.e,f:m.b*n.e+m.d*n.f+m.f};}
export function inverseMatrix(m){const z=m.a*m.d-m.b*m.c;return {a:m.d/z,b:-m.b/z,c:-m.c/z,d:m.a/z,e:(m.c*m.f-m.d*m.e)/z,f:(m.b*m.e-m.a*m.f)/z};}
export function planePoint(camera,x,y){
 if(!camera.perspectiveDegrees)return {x,y,scale:1};
 const center=camera.scroll+camera.viewportWidth/2,u=x-center,z=(camera.ground-y)*6,t=camera.perspectiveDegrees*Math.PI/180;
 const scale=1/Math.max(.55,Math.min(1.65,1+Math.tan(t)*(u+z)/camera.focal));
 return {x:center+(u*Math.cos(t)+z*Math.sin(t))*scale,y:camera.ground+(y-camera.ground)*scale,scale};
}
export function billboardPoint(camera,x,y,ground=camera.ground){const p=planePoint(camera,x,ground);return {...p,y:p.y+(y-ground)*p.scale};}
// Sprite-local affine frames are known explicitly. They are not an inverse of perspective.
export function billboardFrame(context,camera,x,y,dpr=1){
 if(!camera?.perspectiveDegrees||!context.getTransform||!Number.isFinite(x)||!Number.isFinite(y))return ()=>{};
 const actual=context.getTransform(),old={a:camera.a*dpr,b:camera.b*dpr,c:camera.c*dpr,d:camera.d*dpr,e:camera.e*dpr,f:camera.f*dpr};
 const saved=camera.billboardFrame,previous=saved||identity,physical=multiplyMatrix(inverseMatrix(previous),multiplyMatrix(inverseMatrix(old),actual));
 const anchor={x:physical.a*x+physical.c*y+physical.e,y:physical.b*x+physical.d*y+physical.f},p=planePoint(camera,anchor.x,anchor.y);
 const frame={a:p.scale,b:0,c:0,d:p.scale,e:p.x-p.scale*anchor.x,f:p.y-p.scale*anchor.y};
 const m=multiplyMatrix(old,multiplyMatrix(frame,physical));context.save();context.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);camera.billboardFrame=frame;
 return ()=>{context.restore();camera.billboardFrame=saved;};
}
// Ground paths project each physical vertex once; sprites instead use billboardFrame.
export function surfaceContext(context,camera){
 if(!camera?.perspectiveDegrees)return context;
 const point=(x,y)=>planePoint(camera,x,y),path=(name,x,y)=>{const p=point(x,y);context[name](p.x,p.y);};
 const rect=(x,y,w,h)=>{path('moveTo',x,y);path('lineTo',x+w,y);path('lineTo',x+w,y+h);path('lineTo',x,y+h);context.closePath();};
 return new Proxy(context,{get(c,key){
  if(key==='moveTo'||key==='lineTo')return (x,y)=>path(key,x,y);
  if(key==='rect')return rect;
  if(key==='fillRect'||key==='strokeRect')return (x,y,w,h)=>{c.beginPath();rect(x,y,w,h);c[key==='fillRect'?'fill':'stroke']();};
  if(key==='arc')return (x,y,r,start,end)=>{const n=24;for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;path(i?'lineTo':'moveTo',x+Math.cos(a)*r,y+Math.sin(a)*r);}};
  if(key==='createRadialGradient')return (x,y,r,xx,yy,rr)=>{const a=point(x,y),b=point(xx,yy);return c.createRadialGradient(a.x,a.y,r*a.scale,b.x,b.y,rr*b.scale);};
  const value=c[key];return typeof value==='function'?value.bind(c):value;
 },set(c,key,value){c[key]=value;return true;}});
}
export function readableContext(context,camera,dpr=1){
 if(!camera?.perspectiveDegrees&&!camera?.degrees)return context;
 return new Proxy(context,{get(c,key){
  if(key==='fillText'||key==='strokeText')return (text,x,y,maxWidth)=>{
   const m=c.getTransform(),x0=m.a*x+m.c*y+m.e,y0=m.b*x+m.d*y+m.f;
   let p={x:x0/dpr,y:y0/dpr},scale=Math.hypot(m.a,m.c)/dpr;
   if(!camera.billboardFrame){const inverse=inverseMatrix({a:camera.a,b:camera.b,c:camera.c,d:camera.d,e:camera.e,f:camera.f}),wx=inverse.a*p.x+inverse.c*p.y+inverse.e,wy=inverse.b*p.x+inverse.d*p.y+inverse.f;const q=billboardPoint(camera,wx,wy);p={x:camera.a*q.x+camera.c*q.y+camera.e,y:camera.b*q.x+camera.d*q.y+camera.f};scale*=q.scale;}
   c.save();c.setTransform(dpr*scale,0,0,dpr*scale,p.x*dpr,p.y*dpr);if(maxWidth===undefined)c[key](text,0,0);else c[key](text,0,0,maxWidth);c.restore();
  };
  const value=c[key];return typeof value==='function'?value.bind(c):value;
 },set(c,key,value){c[key]=value;return true;}});
}
