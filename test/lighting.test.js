import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneLights,shadowShape,LIGHT_BUDGET} from '../lighting.js';
import {scenery} from '../scenery.js';
import {createWorld,serialize} from '../engine.js';
import {setModule} from '../rules.js';
test('a scene has a bounded set of logical sources, underground has no celestial lamp and abandoned streets have no lanterns',()=>{
  const s=createWorld(0),a=s.areas.a1,args={width:390,height:187,ground:134,view:scenery(s.seed,a),night:true,heroX:150},before=serialize(s);
  const town=sceneLights(s,a,args);assert.equal(town.sky.kind,'moon');assert.ok(town.local.length>0&&town.local.length<=LIGHT_BUDGET);assert.equal(serialize(s),before);
  const cave=sceneLights(s,{...a,type:'dungeon',realm:'underground'},args);assert.equal(cave.sky,null);assert.ok(cave.local.every(l=>l.kind==='torch'));
  const empty=sceneLights(s,{...a,population:[]},args);assert.ok(!empty.local.some(l=>l.kind==='lantern'));
  setModule(s,'lighting',false);assert.deepEqual(sceneLights(s,a,args),{sky:null,local:[],fixtures:[]});
});
test('shadows extend away from the source, stay finite at low angles and have hard moon edges versus soft sun edges',()=>{
  const caster={x:100,width:16,height:44};
  const left=shadowShape(caster,{x:0,y:10,kind:'moon'},130),right=shadowShape(caster,{x:300,y:10,kind:'sun'},130);
  assert.ok(left.points[2][0]>caster.x);assert.ok(right.points[2][0]<caster.x);assert.equal(left.blur,0);assert.equal(right.blur,4);
  const low=shadowShape({x:100,width:70,height:150},{x:1000,y:129,kind:'torch'},130);assert.ok(low.points.flat().every(Number.isFinite));assert.ok(Math.abs(low.points[2][0]-100)<=150);
});
