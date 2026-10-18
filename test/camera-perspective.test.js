import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneCamera,cameraPoint,cameraLocalMatrix,applyCamera} from '../scene-camera.js';
import {planePoint,billboardFrame,multiplyMatrix,surfaceContext,readableContext} from '../camera-perspective.js';
import {surfaceShadow} from '../composition.js';
import {createWorld,serialize,restore,step} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const cam=(angle=3,slope=0)=>sceneCamera({rules:{},hero:{x:50}},{id:'a0',type:'road',cameraPerspectiveDegrees:angle,cameraSlopeDegrees:slope},320,{height:180,ground:140});
function context(){let matrix={a:1,b:0,c:0,d:1,e:0,f:0};const stack=[],points=[];return {points,getTransform:()=>({...matrix}),setTransform(a,b,c,d,e,f){matrix={a,b,c,d,e,f};},save(){stack.push({...matrix});},restore(){matrix=stack.pop();},translate(x,y){matrix=multiplyMatrix(matrix,{a:1,b:0,c:0,d:1,e:x,f:y});},scale(a,d){matrix=multiplyMatrix(matrix,{a,b:0,c:0,d,e:0,f:0});},moveTo(x,y){points.push([matrix.a*x+matrix.c*y+matrix.e,matrix.b*x+matrix.d*y+matrix.f]);},lineTo(x,y){this.moveTo(x,y);},beginPath(){},closePath(){},fill(){},clip(){}};}
test('0/+3/-3 use depth-dependent scale and converging equal segments independently of slope',()=>{
 for(const angle of [0,3,-3]){const c=cam(angle),near=planePoint(c,240,140),far=planePoint(c,240,120);if(!angle){assert.deepEqual(near,{x:240,y:140,scale:1});assert.deepEqual(far,{x:240,y:120,scale:1});}else{assert.notEqual(near.scale,far.scale);assert.equal(Math.sign(far.scale-near.scale),-Math.sign(angle));const a=planePoint(c,120,140),b=planePoint(c,160,140),aa=planePoint(c,120,120),bb=planePoint(c,160,120);assert.ok(Math.abs((b.x-a.x)-(bb.x-aa.x))>.1);}
  const sloped=cam(angle,2.5),p=cameraPoint(c,240,100),q=cameraPoint(sloped,240,100);close(p.x,q.x);close(q.y-p.y,sloped.b*(p.x-160));
 }
});
test('sprite supports/DOM anchors/ground shadows meet once; physical caster survives nested local scale and camera',()=>{
 const camera=cam(3,2.5),c=context();applyCamera(c,camera,2);c.translate(80,140);c.scale(1.15,1.15);const physical=cameraLocalMatrix(c.getTransform(),camera,2);
 const restore=billboardFrame(c,camera,0,0,2),anchor=cameraPoint(camera,80,140);c.moveTo(0,0);close(c.points[0][0]/2,anchor.x);close(c.points[0][1]/2,anchor.y);
 assert.deepEqual(cameraLocalMatrix(c.getTransform(),camera,2),physical);const nested=billboardFrame(c,camera,0,0,2);assert.deepEqual(cameraLocalMatrix(c.getTransform(),camera,2),physical);nested();restore();assert.equal(camera.billboardFrame,undefined);
 const shadow=surfaceShadow({x:80,y:140,width:14,height:40},{kind:'moon',x:20,y:20},{back:120,front:180,width:320,depth:60});applyCamera(c,camera,2);const surface=surfaceContext(c,camera);surface.moveTo(...shadow.points[0]);const p=planePoint(camera,...shadow.points[0]);const last=c.points.at(-1);close(last[0]/2,p.x+camera.e);close(last[1]/2,camera.b*p.x+p.y+camera.f);
 const dom=cameraPoint(camera,80,100),base=planePoint(camera,80,140);close(anchor.y-dom.y,40*base.scale);
 let textMatrix;c.fillText=()=>{textMatrix=c.getTransform();};readableContext(c,camera,2).fillText('Имя',80,100);close(textMatrix.b,0);close(textMatrix.c,0);close(textMatrix.a,textMatrix.d);
});
test('unsupported/invalid/OFF/transit safely have zero perspective; camp inherits the parent direction',()=>{
 const a={id:'a0',type:'road',cameraPerspectiveDegrees:-3},s={areas:{a0:a},hero:{x:24},rules:{}},options={height:180,ground:140};
 assert.equal(sceneCamera(s,{id:'camp',temporaryCamp:{parent:'a0'},type:'camp'},320,options).perspectiveDegrees,-3);
 for(const invalid of [NaN,Infinity,'3',null])assert.equal(sceneCamera(s,{...a,cameraPerspectiveDegrees:invalid},320,options).perspectiveDegrees,0);
 assert.equal(sceneCamera(s,{...a,interior:{}},320,options).perspectiveDegrees,0);assert.equal(sceneCamera(s,{...a,id:'other'},320,options).perspectiveDegrees,0);
 s.hero.transit={from:'a0',to:'a1'};assert.equal(sceneCamera(s,a,320,options).perspectiveDegrees,0);delete s.hero.transit;s.rules['camera-probe']=false;assert.equal(sceneCamera(s,a,320,options).perspectiveDegrees,0);
});
test('perspective selection cannot alter sixteen selected movement steps, expense, saved state or RNG',()=>{
 const s=createWorld(1);for(const k of Object.keys(s.rules))s.rules[k]=false;s.rules['camera-probe']=true;Object.assign(s.hero,{area:'a0',x:5,goal:{kind:'routeWait',area:'a0',x:95,until:10000},combat:null,energy:100,hunger:0,conditions:[]});syncActiveActor(s);
 const other=restore(serialize(s));other.rules['camera-probe']=false;const canonical=s=>JSON.stringify(JSON.parse(serialize(s)),(k,v)=>k==='camera-probe'?undefined:v);
 for(let n=0;n<16;n++){step(s);step(other);}assert.equal(canonical(s),canonical(other));assert.ok(s.hero.distance>0);assert.ok(s.hero.energy<100);
});
