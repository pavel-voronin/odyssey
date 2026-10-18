import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize} from '../engine.js';
import {sceneComposition,surfaceShadow,surfaceShadowAlpha,projectedCaster} from '../composition.js';
import {sceneLights,LIGHT_BUDGET,SHADOW_BUDGET} from '../lighting.js';
import {scenery} from '../scenery.js';
test('composition follows real local terrain, residents and stores without altering the world or producing a catastrophe from an empty district',()=>{
 const s=createWorld(0),a=s.areas.a5,before=serialize(s),port=sceneComposition(s,a,390,190);assert.equal(port.kind,'waterfront');assert.equal(port.occupied,true);assert.ok(port.cargo>0);assert.ok(port.buildingGround<port.actorGround);assert.equal(serialize(s),before);
 a.type='village';a.climate='alpine';assert.equal(sceneComposition(s,a,390,190).kind,'alpine');a.type='port';assert.equal(sceneComposition(s,a,390,190).alpine,true);assert.equal(sceneComposition(s,a,390,190).coast,true);
 for(const id of a.population)s.people[id].area='a0';a.civic.food=0;a.civic.tools=0;const empty=sceneComposition(s,a,390,190);assert.equal(empty.occupied,false);assert.equal(empty.quiet,true);assert.equal(empty.ruined,false);assert.equal(empty.cargo,0);assert.equal(a.type,'port');
 a.objects.push({kind:'workshop',state:'burned'});assert.equal(sceneComposition(s,a,390,190).kind,'ruins');assert.equal(sceneComposition(s,a,390,190).coast,true);
});
test('projected shadows begin at the actual caster foot, extend away from each source and remain finite and inside the receiving surface vertically',()=>{
 for(const width of [1,320,390,1280,4000])for(const height of [1,60,190,450]){
  const s=createWorld(0),p=sceneComposition(s,s.areas.a1,width,height),surface=p.surface;assert.ok(surface.back>=0);assert.ok(p.buildingGround<p.actorGround);assert.ok(p.actorGround<height);
  for(const y of [p.buildingGround,p.actorGround])for(const casterHeight of [10,44,120,250])for(const kind of ['sun','moon','torch'])for(const sourceX of [-100,width+100]){
   const caster={x:width/2,y,width:14,height:casterHeight},source={kind,x:sourceX,y:-10,baseY:surface.back},q=surfaceShadow(caster,source,surface);assert.deepEqual(q.points[0],[caster.x-7,y]);assert.deepEqual(q.points[1],[caster.x+7,y]);assert.ok(q.points.flat().every(Number.isFinite));assert.ok(q.points[2][1]>=surface.back);assert.ok(q.points[2][1]<height);const farCenter=(q.points[2][0]+q.points[3][0])/2;assert.equal(Math.sign(farCenter-caster.x),Math.sign(caster.x-sourceX));assert.equal(q.blur,kind==='sun'?3.5:kind==='moon'?0:1);
  }
 }
});
test('different background and foreground casters share one projected source rather than a disconnected shadow offset',()=>{
 const surface={back:120,front:190,width:390,depth:70},source={kind:'moon',x:300,y:30},house=surfaceShadow({x:195,y:120,width:60,height:80},source,surface),hero=surfaceShadow({x:195,y:145,width:14,height:44},source,surface);assert.equal(house.points[0][1],120);assert.equal(hero.points[0][1],145);assert.ok(house.points[2][0]<195);assert.ok(hero.points[2][0]<195);assert.ok(house.points[2][1]>120);assert.ok(hero.points[2][1]>145);assert.ok(house.points[3][0]<hero.points[3][0]);
});
test('local fixtures use their rear support while camp and magic light keep their actual foreground support, without expanding budgets',()=>{
 const s=createWorld(0),a=s.areas.a5,composition=sceneComposition(s,a,390,190),before=serialize(s),lights=sceneLights(s,a,{width:390,height:190,ground:composition.actorGround,backGround:composition.buildingGround,occupied:composition.occupied,view:scenery(s.seed,a),night:true,heroX:195});assert.ok(lights.local.length<=LIGHT_BUDGET);assert.equal(SHADOW_BUDGET,36);for(const f of lights.fixtures){assert.equal(f.baseY,composition.buildingGround);assert.equal(f.y,composition.buildingGround-80);}assert.equal(serialize(s),before);
 const camp=s.areas.a4,c=sceneComposition(s,camp,390,190),fire=sceneLights(s,camp,{width:390,height:190,ground:c.actorGround,backGround:c.buildingGround,view:scenery(s.seed,camp),night:true,heroX:195}).local.find(l=>l.kind==='fire');assert.equal(fire.baseY,c.actorGround);assert.equal(fire.y,c.actorGround-12);
});
test('a nearby lamp fills part of the moon shadow; its own shadow fades with range and is weaker in sunlight',()=>{
 const moon={kind:'moon'},sun={kind:'sun'},lamp={kind:'lantern',x:100,range:85};assert.equal(surfaceShadowAlpha(100,moon,null,'moon'),.28);assert.ok(surfaceShadowAlpha(100,moon,lamp,'moon')<surfaceShadowAlpha(150,moon,lamp,'moon'));assert.equal(surfaceShadowAlpha(200,moon,lamp,'moon'),.28);assert.ok(surfaceShadowAlpha(100,lamp,lamp,'moon')>surfaceShadowAlpha(170,lamp,lamp,'moon'));assert.equal(surfaceShadowAlpha(200,lamp,lamp,'moon'),0);assert.ok(surfaceShadowAlpha(100,lamp,lamp,'sun')<surfaceShadowAlpha(100,lamp,lamp,'moon'));assert.ok(surfaceShadowAlpha(100,sun,lamp,'sun')>surfaceShadowAlpha(100,moon,lamp,'moon'));
});
test('scaled creatures project in the same surface coordinates while retaining their actual foot and larger silhouette',()=>{
 const caster={x:100,y:120,width:20,height:40},dpr=2,scale=1.15,m={a:dpr*scale,b:0,c:0,d:dpr*scale,e:dpr*caster.x*(1-scale),f:dpr*caster.y*(1-scale)},p=projectedCaster(caster,m,dpr);assert.ok(Math.abs(p.x-100)<1e-8);assert.ok(Math.abs(p.y-120)<1e-8);assert.equal(p.width,23);assert.equal(p.height,46);assert.deepEqual(projectedCaster(caster,{a:2,b:0,c:0,d:2,e:0,f:0},2),caster);assert.equal(projectedCaster(caster,null,2),caster);
});

