import {areaEnvironment} from './area-environment.js';
import {areaScale} from './geometry.js';
import {billboardPoint,inverseMatrix,multiplyMatrix} from './camera-perspective.js';
export function sceneFrame(area,width){const worldWidth=width+Math.max(0,areaScale(area)-1)*Math.max(0,width-48);return {viewportWidth:width,worldWidth,maxScroll:worldWidth-width};}
// A bounded visual probe on one short road. Logical positions and distance never change.
export function sceneCamera(s,area,width,{scroll,height,ground=height*.76}={}){
  const frame=sceneFrame(area,width),a=areaEnvironment(s,area),trial=(a.id==='a0'||a.roadProfile==='long-tract')&&a.type==='road'&&!a.interior;
  const degrees=s.rules?.['camera-probe']===false||!trial?0:Math.max(-4,Math.min(4,Number.isFinite(a.cameraSlopeDegrees)?a.cameraSlopeDegrees:2.5));
  const target=24+(s.hero?.x??0)/100*(frame.worldWidth-48)-width/2;
  const offset=Math.max(0,Math.min(frame.maxScroll,Number.isFinite(scroll)?scroll:target));
  const value=a.cameraPerspectiveDegrees===undefined?3:a.cameraPerspectiveDegrees;
  const perspectiveDegrees=s.rules?.['camera-probe']===false||!trial||s.hero?.transit||!Number.isFinite(height)||!Number.isFinite(ground)||!Number.isFinite(value)?0:Math.max(-4,Math.min(4,value));
  const b=Math.tan(degrees*Math.PI/180);return {...frame,scroll:offset,degrees,perspectiveDegrees,ground,height,focal:Math.max(180,width*.7,frame.worldWidth*.1),a:1,b,c:0,d:1,e:offset?-offset:0,f:-b*(width/2+offset)};
}
export function cameraPoint(camera,x,y,{ground=camera.ground}={}){const p=camera.perspectiveDegrees?billboardPoint(camera,x,y,ground):{x,y};return {x:camera.a*p.x+camera.c*p.y+camera.e,y:camera.b*p.x+camera.d*p.y+camera.f};}
export function applyCamera(context,camera,dpr=1){context.setTransform(camera.a*dpr,camera.b*dpr,camera.c*dpr,camera.d*dpr,camera.e*dpr,camera.f*dpr);}
// Remove only the global camera before calculating a physical caster in world coordinates.
// Local creature scaling/translation stays in the matrix. Shadows get the camera once at paint.
export function cameraLocalMatrix(matrix,camera,dpr=1){
  if(!matrix||!Number.isFinite(matrix.a))return null;
  const e=matrix.e/dpr-camera.e,physical={a:matrix.a/dpr,b:(matrix.b-camera.b*matrix.a)/dpr,c:matrix.c/dpr,d:(matrix.d-camera.b*matrix.c)/dpr,e,f:matrix.f/dpr-camera.b*e-camera.f};
  return camera.billboardFrame?multiplyMatrix(inverseMatrix(camera.billboardFrame),physical):physical;
}
export class CameraTrack{
  resolve({key,width,maxScroll,target,now,animate=true,reset=false}){
    target=Math.max(0,Math.min(maxScroll,target));
    if(reset||!animate||this.key!==key||this.width!==width||!Number.isFinite(this.position))this.position=target;
    else{const dt=Math.max(0,Math.min(250,now-this.at));this.position+=(target-this.position)*(1-Math.exp(-dt/90));}
    this.position=Math.max(0,Math.min(maxScroll,this.position));if(Math.abs(target-this.position)<.1)this.position=target;
    this.key=key;this.width=width;this.at=now;return {scroll:this.position,moving:this.position!==target};
  }
}
