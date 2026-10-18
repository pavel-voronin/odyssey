import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize} from '../engine.js';
import {setModule} from '../rules.js';
import {scenery} from '../scenery.js';
import {sceneLights,LIGHT_BUDGET} from '../lighting.js';
import {lightContributions,lightVisibility,contactContour,lightInViewport,groundLightReach} from '../light-contributions.js';
import {ContourCache,projectSilhouette} from '../silhouette.js';
import {Scene} from '../scene.js';
const caster={x:100,y:150,left:90,right:110,top:100},surface={back:120,front:220,width:390,depth:100};
const sources=Array.from({length:6},(_,i)=>({id:'lamp-'+i,kind:'lantern',x:50+i*20,y:80,baseY:130,range:200,color:'#ddcc99',active:true}));
const lights={sky:{kind:'moon',x:300,y:20},local:sources};
test('the real source registry retains a fourth lamp, portals and actual owned charm glow without RNG or a new emitter',()=>{
 const s=createWorld(0),a=s.areas.a1;a.district='Мастерские';s.hero.conditions.push({id:'blessing',until:s.tick+100});s.hero.equipment.charm={modifier:'luck'};
 a.objects.push({id:'test-rift-left',kind:'gate',mode:'portal',x:20},{id:'test-rift-right',kind:'gate',mode:'time',x:80});
 const args={width:390,height:200,ground:150,backGround:130,view:scenery(s.seed,a),night:true,heroX:100,occupied:true},before=serialize(s),full=sceneLights(s,a,args);
 assert.equal(serialize(s),before);assert.equal(full.local.length,7);assert.ok(full.local.length>LIGHT_BUDGET);assert.equal(full.fixtures.length,2);
 assert.ok(full.local.some(l=>l.id==='charm-glow'&&l.owner===s.hero.lineage));assert.ok(full.local.some(l=>l.id==='test-rift-right'));
 setModule(s,'source-shadows',false);const legacy=sceneLights(s,a,args);assert.equal(legacy.local.length,3);assert.equal(legacy.local.some(l=>l.id==='charm-glow'),false);
 setModule(s,'lighting',false);assert.deepEqual(sceneLights(s,a,args),{sky:null,local:[],fixtures:[]});
});
test('all seven influencing sources contribute with a bounded shared darkness rather than a nearest-light replacement',()=>{
 const result=lightContributions(caster,lights);assert.equal(result.length,7);assert.equal(result.filter(c=>c.alpha>0).length,7);
 assert.ok(result.reduce((n,c)=>n+c.alpha,0)<=.400000001);assert.ok(result.every(c=>c.alpha<.15));
 const polygon=[[[95,150],[105,150],[105,110],[95,110]]];
 const left=projectSilhouette(polygon,{x:100,y:150},{...sources[0],x:0},surface).flat(),right=projectSilhouette(polygon,{x:100,y:150},{...sources[0],x:200},surface).flat();
 assert.ok(Math.max(...left.map(p=>p[0]))>105);assert.ok(Math.min(...right.map(p=>p[0]))<95);
});
test('opaque shell rays block a source, an opening clears it and a wall-mounted emitter can shine out of its own shell',()=>{
 const wall={contour:[[[40,40],[60,40],[60,140],[40,140]]]},sample={x:100,y:120,left:90,right:110,top:70},lamp={id:'lamp',kind:'lantern',x:0,y:50,range:200};
 assert.equal(lightVisibility(sample,lamp,[wall]),0);
 const blocked=lightContributions(sample,{sky:null,local:[lamp]},{occluders:[wall]})[0];assert.equal(blocked.reason,'occluded');assert.equal(blocked.alpha,0);
 assert.equal(lightVisibility(sample,lamp,[{contour:[[[40,10],[60,10],[60,25],[40,25]]]}]),1);
 assert.equal(lightVisibility(sample,{...lamp,x:50,y:60},[wall]),1);
 assert.equal(lightVisibility(sample,lamp,[wall],wall.contour),1);
 const background={...wall,y:90};assert.equal(lightVisibility(sample,{...lamp,baseY:120},[background]),1,'a background wall cannot occlude two foreground points merely because their images overlap');
 const rearHouse={y:130,contour:[[[60,50],[72,50],[72,130],[60,130]]]};assert.equal(lightVisibility(caster,{kind:'moon',x:0,y:0},[rearHouse],null,{back:130}),0,'a sky ray can really cross the rear house volume');
});
test('range, inactivity and an owned internal emitter have explicit reasons, while visible nearby light remains independent',()=>{
 const result=lightContributions(caster,{sky:null,local:[{...sources[0],x:1000,range:20},{...sources[1],active:false},{...sources[2],owner:'hero'},sources[3]]},{owner:'hero'});
 assert.deepEqual(result.map(c=>c.reason),['outside-range','inactive','own-emitter',null]);assert.ok(result[3].alpha>0);
 assert.equal(result[2].alpha,0);assert.ok(result[2].intensity>0,'own light fills other shadows without casting a self shadow');
 assert.equal(lightInViewport({...sources[0],x:900,range:30},{scroll:0,viewportWidth:390},200),false);
 assert.equal(lightInViewport({...sources[0],x:400,range:30},{scroll:0,viewportWidth:390},200),true);
});
test('a low flame casts only the lower contour onto the ground; point height and range define an actual receiving disk',()=>{
 const head=[[[95,105],[105,105],[105,115],[95,115]]],feet=[[[95,143],[105,143],[105,150],[95,150]]],anchor={x:100,y:150},fire={kind:'fire',x:70,y:138,baseY:150,range:85};
 assert.deepEqual(projectSilhouette(head,anchor,fire,surface),[]);assert.ok(projectSilhouette(feet,anchor,fire,surface).length>0);
 assert.ok(projectSilhouette(head,anchor,fire,surface,2,false).length>0,'disabled source policy retains the prior projection');
 assert.deepEqual(groundLightReach({x:100,y:90,baseY:150,range:100},surface),{x:100,y:150,radius:80});
 assert.equal(groundLightReach({x:100,y:20,baseY:150,range:50},surface).radius,0);
 const s=createWorld(0),a=s.areas.a1,args={width:390,height:200,ground:150,backGround:130,view:scenery(s.seed,a),night:true,heroX:100,occupied:true};
 const current=sceneLights(s,a,args).fixtures[0];assert.equal(current.y,50);assert.equal(current.range,150);
 setModule(s,'source-shadows',false);const old=sceneLights(s,a,args).fixtures[0];assert.equal(old.y,83);assert.equal(old.range,85);
});
test('contact uses the actual lower feet polygons and never bridges the gap or floats with the head',()=>{
 const feet=[[[-7,147],[-1,147],[-1,150],[-7,150]],[[3,147],[10,147],[10,150],[3,150]],[[-5,100],[5,100],[5,110],[-5,110]]];
 const contact=contactContour(feet,150);assert.equal(contact.length,2);assert.ok(contact.flat().every(p=>p[1]>=149.4&&p[1]<=150.3));assert.ok(contact.every(p=>p.every(v=>v[0]<0)||p.every(v=>v[0]>0)));
});
test('bounded contour caches reuse a stationary projection and invalidate actual pose, support, source and receiving surface',()=>{
 const cache=new ContourCache(),shape=[[[0,0],[10,0],[10,-40],[0,-40]]],m={a:1,b:0,c:0,d:1,e:100,f:150},world=cache.world(shape,m),anchor={x:100,y:150};
 assert.equal(cache.world(shape,m),world);const first=cache.shadow(world,anchor,sources[0],surface,2);assert.equal(cache.shadow(world,anchor,sources[0],surface,2),first);
 assert.notEqual(cache.shadow(world,anchor,{...sources[0],x:51},surface,2),first);assert.notEqual(cache.shadow(world,anchor,sources[0],{...surface,depth:50},2),first);assert.notEqual(cache.world(shape,{...m,e:110}),world);
 for(let i=0;i<120;i++){const shifted=cache.world(shape,{...m,e:i});cache.shadow(shifted,{x:i,y:150},sources[0],surface,2);}assert.equal(cache.transforms.size,64);assert.equal(cache.projections.size,64);
});
test('the actual casting path paints every contributing source and its off switch restores sky plus nearest local',()=>{
 const scene=Object.create(Scene.prototype),context=new Proxy({getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},{get:(t,k)=>t[k]||(['createRadialGradient','createLinearGradient'].includes(k)?()=>({addColorStop(){}}):()=>{})});
 Object.assign(scene,{ctx:context,state:{rules:{lighting:true,'source-shadows':true},hero:{lineage:'hero'}},canvas:{clientWidth:390,clientHeight:220},composition:{surface,width:390},ground:150,pixelRatio:1,camera:{a:1,b:0,c:0,d:1,e:0,f:0},shadowCount:0,shadowCasters:[],lightSet:lights,shadowWeather:'clear',occludedLightSources:0});
 const polygons=[[[95,150],[105,150],[105,110],[95,110]]];scene.castContourShadow(polygons,{x:100,y:150},true);assert.equal(scene.usedLightSources.size,7);assert.equal(scene.shadowCount,1);
 scene.state.rules['source-shadows']=false;scene.usedLightSources.clear();scene.shadowCount=0;scene.castContourShadow(polygons,{x:100,y:150},true);assert.equal(scene.usedLightSources.size,2);assert.ok(scene.usedLightSources.has('moon'));
});
