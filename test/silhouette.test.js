import test from 'node:test';
import assert from 'node:assert/strict';
import {recordSilhouette,transformSilhouette,projectSilhouette,houseSilhouette,paintRoof} from '../silhouette.js';
import {Scene} from '../scene.js';
import {race} from '../content.js';
import {cameraPoint} from '../scene-camera.js';
const surface={back:120,front:220,width:390,depth:100};
function body({look={},species='human',direction=1,pose={},rest=false,hero=false}={}){
 const scene=Object.create(Scene.prototype);scene.state={hero:{weapon:0}};
 return recordSilhouette(c=>{scene.ctx=c;scene.paintPerson(0,0,'#a9c686',hero,direction,0,false,rest,{hairStyle:'bald',hat:'none',prop:'none',...look},race(species),pose);});
}
function contains(polygons,x,y){return polygons.some(p=>{let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;});}
const bounds=p=>({left:Math.min(...p.flat().map(p=>p[0])),right:Math.max(...p.flat().map(p=>p[0])),top:Math.min(...p.flat().map(p=>p[1])),bottom:Math.max(...p.flat().map(p=>p[1]))});
test('the actual person painter supplies separated feet, clothes, mushroom cap and posed hands without a hull',()=>{
 const human=body(),mushroom=body({species:'myconid'}),brim=body({look:{hat:'brim'}}),robe=body({look:{coat:'robe'}});
 assert.equal(contains(human.polygons,0,-1),false);assert.equal(contains(human.polygons,-4,-1),true);assert.equal(contains(human.polygons,5,-1),true);
 assert.equal(contains(human.polygons,-9,-39),false);assert.equal(contains(mushroom.polygons,-9,-39),true);
 assert.ok(bounds(brim.polygons).top<bounds(human.polygons).top);assert.equal(contains(robe.polygons,9,-6),true);assert.equal(contains(human.polygons,9,-6),false);
 assert.notDeepEqual(body({pose:{walking:true,progress:.1,distance:20}}).polygons,body({pose:{walking:true,progress:.4,distance:20}}).polygons);
 assert.notDeepEqual(body({pose:{kind:'spell'}}).polygons,human.polygons);assert.notDeepEqual(body({direction:-1}).polygons,human.polygons);
});
test('one recorded geometry replays the original painter commands rather than drawing a separately maintained mask',()=>{
 const shape=body({look:{hat:'hood',prop:'staff'},pose:{kind:'spell'},hero:true}),calls=[];
 const context=new Proxy({},{get:(_,name)=>(...args)=>calls.push([name,...args]),set:(_,name,value)=>{calls.push(['=',name,value]);return true;}});
 shape.replay(context);assert.deepEqual(calls,shape.commands);assert.ok(shape.polygons.length>20);assert.ok(shape.polygons.length<150);
 assert.ok(shape.polygons.flat(2).every(Number.isFinite));
});
test('height projection keeps the real feet, preserves gaps and differs for a fallen rotated body and opposite light',()=>{
 const shape=body().polygons,standing=transformSilhouette(shape,{a:1,b:0,c:0,d:1,e:180,f:150});
 const source={kind:'moon',x:180,y:10},projected=projectSilhouette(standing,{x:180,y:150},source,surface);
 assert.equal(contains(projected,180,150.5),false);assert.equal(contains(projected,176,150.5),true);
 const fallen=transformSilhouette(shape,{a:0,b:1,c:-1,d:0,e:180,f:150});
 const flat=projectSilhouette(fallen,{x:180,y:150},source,surface);assert.ok(bounds(flat).bottom<bounds(projected).bottom);
 assert.notDeepEqual(projectSilhouette(standing,{x:180,y:150},{...source,x:0},surface),projectSilhouette(standing,{x:180,y:150},{...source,x:390},surface));
 for(const source of [{kind:'torch',x:0,y:149,baseY:150},{kind:'sun',x:400,y:149}])assert.ok(projectSilhouette(standing,{x:180,y:150},source,surface).flat(2).every(Number.isFinite));
 const aligned=projectSilhouette(standing,{x:180,y:150},{kind:'lantern',x:110,y:120,baseY:150},surface);
 assert.ok(bounds(aligned).bottom>bounds(aligned).top+2,'a same-plane point lamp casts a finite-depth contour, not an invisible line');
});
test('the shared roof path retains overhang, chimney and curved or flat alternatives with bounded static caching',()=>{
 const profile={roof:'gable',chimney:true},shape=houseSilhouette(profile,60,56,24),box=bounds(shape);
 assert.equal(box.left,-36);assert.equal(box.right,36);assert.equal(contains(shape,-34,-57),true);assert.equal(contains(shape,25,-79),false);
 const roof=recordSilhouette(c=>paintRoof(c,profile,60,56,24));assert.deepEqual(shape[1],roof.polygons[0]);
 assert.equal(houseSilhouette(profile,60,56,24),shape);assert.notDeepEqual(shape,houseSilhouette({roof:'flat'},60,56,8));
 assert.ok(houseSilhouette({roof:'thatch'},60,56,24)[1].length>20);
});
test('camera shear and scroll are applied once to the same projected support and silhouette',()=>{
 const camera={a:1,b:.04,c:0,d:1,e:-120,f:-12},shape=transformSilhouette(body().polygons,{a:1,b:0,c:0,d:1,e:300,f:150});
 const groundShape=projectSilhouette(shape,{x:300,y:150},{kind:'moon',x:100,y:0},surface);
 const support=cameraPoint(camera,300,150);assert.deepEqual(support,{x:180,y:150});
 const projected=groundShape.map(p=>p.map(([x,y])=>Object.values(cameraPoint(camera,x,y))));assert.ok(projected.flat(2).every(Number.isFinite));
 assert.ok(bounds(projected).left<support.x+100);
});
test('the real person wrapper shares cached visible commands, bounds its cache and keeps the camera and off path separate',()=>{
 const scene=Object.create(Scene.prototype),camera={a:1,b:.04,c:0,d:1,e:-120,f:-12};let contour,legacy=0;
 scene.ctx=new Proxy({getTransform:()=>camera},{get:(t,k)=>t[k]||(()=>{})});scene.camera=camera;scene.pixelRatio=1;scene.ground=150;
 scene.state={hero:{weapon:0},rules:{lighting:true,'contour-shadows':true}};
 scene.castContourShadow=(polygons,anchor)=>contour={polygons,anchor};scene.castShadow=()=>legacy++;
 const before=JSON.stringify(scene.state);
 for(let i=0;i<200;i++)scene.person(300,150,'#997656',true,1,0,false,false,{hairStyle:'bald',hat:i%2?'none':'brim',prop:'none',packColor:'#'+String(i).padStart(6,'0')},race('human'),{kind:'idle'});
 assert.equal(scene.silhouetteCache.size,128);assert.deepEqual(contour.anchor,{x:300,y:150});assert.ok(contour.polygons.flat(2).every(Number.isFinite));assert.equal(JSON.stringify(scene.state),before);assert.equal(legacy,0);
 scene.state.rules['contour-shadows']=false;scene.person(300,150,'#997656',true,1,0);assert.equal(legacy,1);
});
