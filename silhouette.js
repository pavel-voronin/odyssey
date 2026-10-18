// A small vector recorder for the actual actor painter. The same commands are
// replayed for the visible body; shadows do not maintain a second costume/pose.
const identity=()=>[1,0,0,1,0,0];
const multiply=(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function recordSilhouette(paint){
  const commands=[],polygons=[],stack=[];let matrix=identity(),alpha=1,lineWidth=1,paths=[],path=null;
  const add=(x,y)=>{if(!path){path=[];paths.push(path);}path.push(point(matrix,x,y));};
  const polygon=p=>{if(alpha>=.5&&p.length>=3&&p.flat().every(Number.isFinite))polygons.push(p);};
  const rect=(x,y,w,h)=>[point(matrix,x,y),point(matrix,x+w,y),point(matrix,x+w,y+h),point(matrix,x,y+h)];
  const stroke=()=>{
    if(alpha<.5)return;
    // A transformed stroke is a union of thin polygons, never a convex hull.
    const radius=lineWidth*Math.max(Math.hypot(matrix[0],matrix[1]),Math.hypot(matrix[2],matrix[3]))/2;
    for(const p of paths)for(let i=1;i<p.length;i++){
      const a=p[i-1],b=p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!length)continue;
      const nx=-(b[1]-a[1])/length*radius,ny=(b[0]-a[0])/length*radius;
      polygon([[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]]);
    }
  };
  const methods={
    save(){stack.push({matrix:[...matrix],alpha,lineWidth});},
    restore(){const saved=stack.pop();if(saved)({matrix,alpha,lineWidth}=saved);},
    translate(x,y){matrix=multiply(matrix,[1,0,0,1,x,y]);},
    scale(x,y){matrix=multiply(matrix,[x,0,0,y,0,0]);},
    rotate(a){matrix=multiply(matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);},
    beginPath(){paths=[];path=null;},
    moveTo(x,y){path=[];paths.push(path);add(x,y);},lineTo:add,
    closePath(){if(path?.length)path.push([...path[0]]);},
    rect(x,y,w,h){path=rect(x,y,w,h);paths.push(path);path.push([...path[0]]);},
    fillRect(x,y,w,h){polygon(rect(x,y,w,h));},
    strokeRect(x,y,w,h){const before=paths;paths=[rect(x,y,w,h)];paths[0].push([...paths[0][0]]);stroke();paths=before;},
    fill(){for(const p of paths)polygon(p.map(p=>[...p]));},stroke,
    ellipse(x,y,rx,ry,rotation,start,end,anticlockwise=false){
      let span=end-start;if(Math.abs(span)>=Math.PI*2)span=anticlockwise?-Math.PI*2:Math.PI*2;
      else if(anticlockwise&&span>0)span-=Math.PI*2;else if(!anticlockwise&&span<0)span+=Math.PI*2;
      const steps=Math.max(4,Math.ceil(Math.abs(span)*4));
      for(let i=0;i<=steps;i++){const a=start+span*i/steps,dx=Math.cos(a)*rx,dy=Math.sin(a)*ry;add(x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y+dx*Math.sin(rotation)+dy*Math.cos(rotation));}
    },
    arc(x,y,r,start,end,anticlockwise=false){methods.ellipse(x,y,r,r,0,start,end,anticlockwise);},
    quadraticCurveTo(cx,cy,x,y){
      const p0=path?.at(-1);if(!p0){add(cx,cy);return add(x,y);}const p1=point(matrix,cx,cy),p2=point(matrix,x,y);
      for(let i=1;i<=12;i++){const t=i/12,u=1-t;path.push([u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]]);}
    }
  };
  const context=new Proxy(methods,{
    get(target,key){if(typeof target[key]==='function')return(...args)=>{commands.push([key,...args]);return target[key](...args);};return target[key];},
    set(target,key,value){commands.push(['=',key,value]);target[key]=value;if(key==='globalAlpha')alpha=value;if(key==='lineWidth')lineWidth=value;return true;}
  });
  paint(context);
  return {polygons,commands,replay(c){for(const [name,...args]of commands)if(name==='=')c[args[0]]=args[1];else c[name](...args);}};
}
export function transformSilhouette(polygons,matrix={a:1,b:0,c:0,d:1,e:0,f:0}){
  const m=[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f];
  return polygons.map(p=>p.map(([x,y])=>point(m,x,y)));
}
export function projectSilhouette(polygons,{x,y},source,surface,depth=2,physical=true){
  const sky=['sun','moon'].includes(source.kind),foot=sky?surface.back-Math.max(16,(surface.back-source.y)*.3):(source.baseY??surface.back),elevation=physical?Math.max(1,foot-source.y):Math.max(8,y-source.y);
  const maxX=physical?surface.width*2:Math.min(180,surface.width*.46),maxY=physical?surface.depth*2:surface.depth*.85;
  if(physical&&!sky){
    // A ray through a point above a low flame travels upward, never onto the
    // ground. Clip at the light plane instead of inventing a head shadow.
    const limit=y-elevation+1;
    polygons=polygons.map(p=>{const out=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ain=a[1]>=limit,bin=b[1]>=limit;if(ain)out.push(a);if(ain!==bin){const t=(limit-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*t,limit]);}}return out;}).filter(p=>p.length>=3);
  }
  const project=([px,py],offset)=>{
    const height=Math.max(0,y-py),ratio=sky?height/elevation:height/Math.max(physical?1:8,elevation-height);
    return [px+clamp(((sky||!physical?x:px)-source.x)*ratio,-maxX,maxX),y+offset+clamp((y+offset-foot)*ratio,-maxY,maxY)];
  };
  // Finite caster depth prevents a same-plane point light flattening a body to
  // an invisible line. Front/back faces and their edge faces use the same
  // contour, rather than appending an unrelated ellipse or bounding box.
  return polygons.flatMap(p=>{
    const front=p.map(v=>project(v,-depth/2)),back=p.map(v=>project(v,depth/2));
    if(!depth)return [front];
    return [front,back,...p.map((_,i)=>{const j=(i+1)%p.length;return [front[i],front[j],back[j],back[i]];})];
  });
}
export function paintSilhouette(c,polygons){
  c.beginPath();
  for(const p of polygons){
    // Normalize winding so overlapping arms/clothes form one opaque union.
    let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a[0]*b[1]-b[0]*a[1];}
    const points=area<0?[...p].reverse():p;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
  }
  c.fill();
}
export class ContourCache{
 constructor(){this.ids=new WeakMap();this.serial=0;this.transforms=new Map();this.projections=new Map();}
 id(polygons){if(!this.ids.has(polygons))this.ids.set(polygons,++this.serial);return this.ids.get(polygons);}
 remember(map,key,make,limit){if(map.has(key))return map.get(key);const value=make();if(map.size>=limit)map.delete(map.keys().next().value);map.set(key,value);return value;}
 world(polygons,matrix){const key=[this.id(polygons),matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].join('/');return this.remember(this.transforms,key,()=>transformSilhouette(polygons,matrix),64);}
 shadow(polygons,anchor,source,surface,depth,physical=true){
  const key=[this.id(polygons),anchor.x,anchor.y,source.kind,source.x,source.y,source.baseY,surface.back,surface.front,surface.width,surface.depth,depth,physical].join('/');
  return this.remember(this.projections,key,()=>projectSilhouette(polygons,anchor,source,surface,depth,physical),64);
 }
}
// Static shell geometry is shared with the roof painter, including overhangs.
export function paintRoof(c,profile,width,height,roofHeight){
  const half=width/2;c.beginPath();
  if(profile.roof==='flat')c.rect(-half-4,-height-8,width+8,8);
  else if(profile.roof==='hip'){c.moveTo(-half-6,-height);c.lineTo(-half*.5,-height-roofHeight);c.lineTo(half*.5,-height-roofHeight);c.lineTo(half+6,-height);}
  else if(profile.roof==='thatch'){c.moveTo(-half-6,-height);c.quadraticCurveTo(-half,-height-roofHeight-12,0,-height-roofHeight);c.quadraticCurveTo(half,-height-roofHeight-12,half+6,-height);}
  else{c.moveTo(-half-6,-height);c.lineTo(0,-height-roofHeight);c.lineTo(half+6,-height);}
  c.closePath();c.fill();
}
const shells=new Map();
export function houseSilhouette(profile,width,height,roofHeight){
  const key=[profile.roof,profile.chimney,width,height,roofHeight].join('/');
  if(shells.has(key))return shells.get(key);
  const shape=recordSilhouette(c=>{c.fillRect(-width/2,-height,width,height);paintRoof(c,profile,width,height,roofHeight);if(profile.chimney){c.fillRect(width*.25,-height-24,8,26);c.fillRect(width*.25-1,-height-26,10,4);}}).polygons;
  if(shells.size>=64)shells.delete(shells.keys().next().value);shells.set(key,shape);return shape;
}
