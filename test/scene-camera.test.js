import test from 'node:test';import assert from 'node:assert/strict';
import {sceneCamera,sceneFrame,CameraTrack,cameraPoint,applyCamera,cameraLocalMatrix} from '../scene-camera.js';
import {projectedCaster,surfaceShadow} from '../composition.js';
import {createWorld,step,serialize,restore} from '../engine.js';
import {Scene} from '../scene.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('only the one short-road trial gets a bounded angle; other places, transit and disabled mode retain zero',()=>{
  const s={areas:{},rules:{}},a={id:'a0',type:'road'};assert.equal(sceneCamera(s,a,390).degrees,2.5);
  for(const area of [{...a,id:'a1'},{...a,type:'forest'},{...a,interior:{}},{id:'transit-a0-a1',type:'road'}])assert.equal(sceneCamera(s,area,390).degrees,0);
  for(const angle of [-100,-2.5,0,2.5,100,NaN,Infinity]){const c=sceneCamera(s,{...a,cameraSlopeDegrees:angle},390);assert.ok(Number.isFinite(c.b));assert.ok(Math.abs(c.degrees)<=4);}
  s.rules['camera-probe']=false;assert.equal(sceneCamera(s,a,390).degrees,0);s.rules['camera-probe']=true;s.areas.a0=a;assert.equal(sceneCamera(s,{id:'camp',type:'camp',temporaryCamp:{parent:'a0'}},390).degrees,2.5);
});
test('zero and both small angles project the shared foot and shadow contact exactly once at every width',()=>{
  for(const width of [253,320,390,480])for(const degrees of [0,-2.5,2.5])for(const x of [24,width/2,width-24]){
    const c=sceneCamera({rules:{}},{id:'a0',type:'road',cameraSlopeDegrees:degrees},width),p=cameraPoint(c,x,140);near(p.x,x);near(p.y,140+(x-width/2)*Math.tan(degrees*Math.PI/180));
    const shadow=surfaceShadow({x,y:140,width:14,height:44},{kind:'moon',x:20,y:30},{back:120,front:190,width,depth:70}),left=cameraPoint(c,...shadow.points[0]),right=cameraPoint(c,...shadow.points[1]);near((left.y+right.y)/2,p.y);near((left.x+right.x)/2,p.x);
  }
});
test('shadow caster removes global projection but retains an actual local creature scale and support',()=>{
  for(const angle of [0,-2.5,2.5])for(const dpr of [1,2]){
    const camera=sceneCamera({rules:{}},{id:'a0',type:'road',cameraSlopeDegrees:angle},390),x=100,y=140,k=1.15;
    const local={a:k,b:0,c:0,d:k,e:x*(1-k),f:y*(1-k)},matrix={a:k*dpr,b:camera.b*k*dpr,c:0,d:k*dpr,e:local.e*dpr,f:(camera.b*local.e+local.f+camera.f)*dpr};
    const stripped=cameraLocalMatrix(matrix,camera,dpr),caster=projectedCaster({x,y,width:20,height:40},stripped,1);near(caster.x,x);near(caster.y,y);near(caster.width,23);near(caster.height,46);
    const calls=[];applyCamera({setTransform:(...args)=>calls.push(args)},camera,dpr);assert.deepEqual(calls[0],[dpr,camera.b*dpr,0,dpr,0,camera.f*dpr]);
  }
});
function renderFixture(run){
  const keys=['document','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let matrix={a:1,b:0,c:0,d:1,e:0,f:0},stack=[];const points=[];
  const multiply=n=>{const m=matrix;matrix={a:m.a*n.a+m.c*n.b,b:m.b*n.a+m.d*n.b,c:m.a*n.c+m.c*n.d,d:m.b*n.c+m.d*n.d,e:m.a*n.e+m.c*n.f+m.e,f:m.b*n.e+m.d*n.f+m.f};};
  const ctx=new Proxy({setTransform(a,b,c,d,e,f){matrix={a,b,c,d,e,f};},getTransform:()=>({...matrix}),save(){stack.push({...matrix});},restore(){matrix=stack.pop();},translate(x,y){multiply({a:1,b:0,c:0,d:1,e:x,f:y});},scale(x,y){multiply({a:x,b:0,c:0,d:y,e:0,f:0});},rotate(t){multiply({a:Math.cos(t),b:Math.sin(t),c:-Math.sin(t),d:Math.cos(t),e:0,f:0});},moveTo(x,y){points.push({x:matrix.a*x+matrix.c*y+matrix.e,y:matrix.b*x+matrix.d*y+matrix.f});}},{get:(o,k)=>k in o?o[k]:k==='measureText'?t=>({width:String(t).length*6}):['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}}):()=>{}});
  const canvas={clientWidth:390,clientHeight:180,width:0,height:0,dataset:{},getContext:()=>ctx},mocks={document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}}),ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},devicePixelRatio:1};
  for(const[k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});let scene;
  try{scene=new Scene(canvas,{profileMode:'legacy'});run({scene,canvas,points,getMatrix:()=>matrix});}finally{scene?.destroy();for(const[k,value]of old){if(value)Object.defineProperty(globalThis,k,value);else delete globalThis[k];}}
}
test('actual renderer handles both directions, resize, reload and off with stable logical bodies and one camera transform',()=>renderFixture(({scene,canvas,points,getMatrix})=>{
  const s=createWorld(1),h=s.hero;h.area='a0';h.x=24;h.facing=1;const a=s.areas.a0;a.type='road';
  for(const degrees of [0,-2.5,2.5])for(const direction of [-1,1]){
    a.cameraSlopeDegrees=degrees;h.facing=direction;const before=serialize(s);scene.update(s);assert.equal(canvas.dataset.cameraDegrees,String(degrees));assert.equal(serialize(s),before);assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.deepEqual(getMatrix(),{a:1,b:0,c:0,d:1,e:0,f:0});
    canvas.clientWidth=320;scene.draw();assert.equal(scene.camera.f,-160*scene.camera.b);assert.equal(serialize(s),before);scene.update(restore(before));assert.equal(canvas.dataset.cameraDegrees,String(degrees));canvas.clientWidth=390;
  }
  s.rules['camera-probe']=false;scene.update(s);assert.equal(scene.camera.degrees,0);
}));
test('the camera switch cannot change a thousand real simulation ticks, random streams or saved history',()=>{
  const a=createWorld(1),b=restore(serialize(a));b.rules['camera-probe']=false;
  const canonical=s=>JSON.stringify(JSON.parse(serialize(s)),(key,value)=>key==='camera-probe'?undefined:value);
  for(let i=0;i<1000;i++){step(a);step(b);if(i%199===0)assert.equal(canonical(a),canonical(b));}assert.equal(canonical(a),canonical(b));
});
test('a long-road frame preserves physical pixel scale, keeps both boundaries filled and inverts the scrolled camera once',()=>{
  for(const width of [253,320,390,480]){
    assert.equal(sceneFrame({},width).worldWidth,width);const a={id:'long',type:'road',roadProfile:'long-tract',length:260},frame=sceneFrame(a,width);near(frame.worldWidth-48,(width-48)*2.6);
    for(const position of [0,5,50,95,100]){
      const c=sceneCamera({hero:{x:position}},a,width),x=24+position/100*(frame.worldWidth-48),p=cameraPoint(c,x,140);assert.ok(c.scroll>=0&&c.scroll<=frame.maxScroll);assert.ok(p.x>=24&&p.x<=width-24);if(position===50)near(p.x,width/2);
      const matrix={a:2,b:c.b*2,c:0,d:2,e:c.e*2,f:c.f*2},local=cameraLocalMatrix(matrix,c,2);for(const k of ['a','d'])near(local[k],1);for(const k of ['b','c','e','f'])near(local[k],0);
      const before=cameraPoint(c,x,140),after=cameraPoint(c,x+6/100*(width-48),140);near(after.x-before.x,6/100*(width-48));
    }
  }
});
test('following eases only view displacement, snaps at entry or resize and clamps reversals without exposing empty space',()=>{
  const track=new CameraTrack(),base={key:'person/road',width:390,maxScroll:547.2,now:0,target:0};assert.equal(track.resolve(base).scroll,0);
  let r=track.resolve({...base,now:100,target:300});assert.ok(r.scroll>0&&r.scroll<300);assert.equal(r.moving,true);const previous=r.scroll;
  r=track.resolve({...base,now:116,target:0});assert.ok(r.scroll>0&&r.scroll<previous);
  for(let i=0;i<100;i++){r=track.resolve({...base,now:132+i*16,target:i%2?1000:-100});assert.ok(r.scroll>=0&&r.scroll<=base.maxScroll);}
  assert.equal(track.resolve({...base,now:2000,target:400,animate:false}).scroll,400);assert.equal(track.resolve({...base,key:'other/road',now:2100,target:547.2}).scroll,547.2);assert.equal(track.resolve({...base,width:320,now:2200,target:100}).scroll,100);assert.equal(track.resolve({...base,now:2300,target:40,reset:true}).scroll,40);
});
test('the actual long-road renderer keeps a viewport-sized canvas while framing both ends and the same stationary objects',()=>renderFixture(({scene,canvas})=>{
  const s=createWorld(1),h=s.hero,a=s.areas.a0;a.length=260;a.roadProfile='long-tract';h.area=a.id;h.lastAction='idle';
  for(const x of [0,50,100,95,5]){h.x=x;s.tick++;const before=serialize(s);scene.update(s);assert.equal(canvas.width,390);near(Number(canvas.dataset.worldWidth),937.2);near(Number(canvas.dataset.cameraScroll),sceneCamera(s,a,390).scroll);assert.equal(serialize(s),before);}
  const before=serialize(s);for(let i=0;i<100;i++)scene.draw();assert.equal(serialize(s),before);canvas.clientWidth=320;scene.draw();assert.equal(canvas.width,320);assert.equal(scene.camera.viewportWidth,320);assert.ok(scene.camera.scroll<=scene.camera.maxScroll);
}));
test('a real six-unit first step has the same visible displacement on a short and a long road',()=>renderFixture(({scene})=>{
  const positions=[];const original=scene.person.bind(scene);let heroPoint;
  scene.person=(...args)=>{if(args[3])heroPoint=cameraPoint(scene.camera,args[0],args[1]);return original(...args);};
  for(const length of [100,260]){
    const s=createWorld(1),h=s.hero,a=s.areas.a0;a.length=length;for(const key of Object.keys(s.rules))s.rules[key]=false;
    Object.assign(h,{area:a.id,x:0,distance:0,energy:100,hunger:0,hp:h.maxHp,goal:{kind:'routeWait',area:a.id,x:84,until:10000},combat:null,transit:null});scene.update(s);const start=heroPoint.x;step(s);scene.update(s);near(h.distance,6);near(100-h.energy,.7);positions.push(heroPoint.x-start);
  }
  near(positions[0],positions[1]);near(positions[1],20.52);
}));
