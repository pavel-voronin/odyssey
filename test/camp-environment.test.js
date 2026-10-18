import test from 'node:test';
import assert from 'node:assert/strict';
import {campEnvironmentFixture} from '../scripts/camp-environment-scenarios.mjs';
import {areaEnvironment} from '../area-environment.js';
import {climateId,worldDate,DAY_TICKS} from '../calendar.js';
import {weatherAt} from '../modules/weather.js';
import {sceneComposition} from '../composition.js';
import {sceneProfile} from '../color-profile.js';
import {sceneLights} from '../lighting.js';
import {scenery} from '../scenery.js';
import {setModule} from '../rules.js';
import {step,serialize,restore} from '../engine.js';
import {Scene} from '../scene.js';
test('actual camps share live forest, desert, alpine and cave terrain without becoming another productive area',()=>{
  for(const [type,climate]of [['forest','temperate'],['desert','arid'],['mountain','alpine'],['cave','underground']]){
    const {s,parent,camp}=campEnvironmentFixture(type);const snapshot=serialize(s);
    assert.equal(camp.type,'camp');assert.equal(areaEnvironment(s,camp),parent);assert.equal(climateId(s,camp),climate);
    assert.deepEqual(weatherAt(s,camp),weatherAt(s,parent));assert.deepEqual(worldDate(s,s.tick,camp),worldDate(s,s.tick,parent));
    assert.deepEqual(sceneComposition(s,camp,390,180),sceneComposition(s,parent,390,180));
    assert.deepEqual(sceneProfile(s,camp,weatherAt(s,camp)),sceneProfile(s,parent,weatherAt(s,parent)));
    assert.deepEqual(scenery(s.seed,areaEnvironment(s,camp)),scenery(s.seed,parent));
    assert.equal(camp.forage.stock,0);assert.equal(camp.forage.max,0);assert.equal(camp.population,undefined);assert.equal(camp.civic,undefined);assert.equal(camp.objects.length,1);assert.equal(serialize(s),snapshot);
    const r=restore(snapshot);assert.equal(areaEnvironment(r,r.areas[camp.id]),r.areas[parent.id]);assert.equal(serialize(r),snapshot);
  }
});
test('old parent-only camps follow changed terrain and climate rather than restoring a landscape snapshot',()=>{
  const {s,parent,camp}=campEnvironmentFixture('forest');const before={areas:s.nextArea,people:s.nextPerson};
  parent.type='ruins';parent.climate='alpine';parent.era=4;parent.name='Мёртвая чаща';parent.paletteVersion=2;s.tick=60*DAY_TICKS;
  assert.equal(areaEnvironment(s,camp),parent);assert.equal(sceneComposition(s,camp,390,180).kind,'ruins');assert.equal(worldDate(s,s.tick,camp).climate,'alpine');assert.equal(worldDate(s,s.tick,camp).year,worldDate(s,s.tick,parent).year);
  assert.deepEqual(weatherAt(s,camp),weatherAt(s,parent));assert.deepEqual(scenery(s.seed,areaEnvironment(s,camp)),scenery(s.seed,parent));
  assert.deepEqual({areas:s.nextArea,people:s.nextPerson},before);assert.equal(camp.type,'camp');assert.equal(camp.climate,undefined);
});
test('rain and snow, independent switches and underground shelter have the same real weather costs in a camp',()=>{
  const {s,parent,camp}=campEnvironmentFixture('forest');let rain=false,snow=false;
  for(let seed=0;seed<100;seed++)for(const tick of [0,60*DAY_TICKS]){
    s.seed=seed;s.tick=tick;const a=weatherAt(s,parent),b=weatherAt(s,camp);assert.deepEqual(b,a);rain ||= a.id==='rain';snow ||= a.id==='snow';
  }
  assert.ok(rain&&snow);setModule(s,'climate',false);parent.type='mountain';assert.deepEqual(weatherAt(s,camp),weatherAt(s,parent));
  setModule(s,'weather',false);assert.equal(weatherAt(s,camp).energy,1);assert.equal(weatherAt(s,camp).id,'clear');
  parent.type='cave';parent.realm='surface';assert.equal(weatherAt(s,camp).id,'shelter');
  const lights=sceneLights(s,camp,{width:390,height:180,ground:140,view:scenery(s.seed,parent),night:false,heroX:200});assert.equal(lights.sky,null);assert.equal(lights.local.filter(l=>l.kind==='fire').length,1);assert.equal(lights.fixtures.length,0);
});
test('missing and cyclic parent links have a neutral read-only fallback and do not create terrain or resources',()=>{
  const {s,camp,parent}=campEnvironmentFixture();delete s.areas[parent.id];const before=serialize(s);assert.equal(areaEnvironment(s,camp).type,'road');assert.doesNotThrow(()=>weatherAt(s,camp));assert.doesNotThrow(()=>sceneComposition(s,camp,390,180));assert.equal(serialize(s),before);
  s.areas[parent.id]=parent;parent.temporaryCamp={parent:camp.id};const cycle=serialize(s);assert.equal(areaEnvironment(s,camp).type,'road');assert.doesNotThrow(()=>worldDate(s));assert.equal(serialize(s),cycle);
});
test('terrain rendering changes no physical return position and disabling field camps still leaves the actual pocket',()=>{
  for(const type of ['forest','desert','mountain','cave']){
    const {s,h,camp,parent}=campEnvironmentFixture(type);const n=s.nextArea,people=Object.keys(s.people).length;setModule(s,'fieldcamp',false);h.goal=null;step(s);
    for(let i=0;i<12&&h.area===camp.id;i++)step(s);
    assert.equal(h.area,parent.id);assert.equal(h.x,24);assert.equal(s.nextArea,n);assert.equal(Object.keys(s.people).length,people);assert.equal(camp.type,'camp');assert.equal(camp.forage.stock,0);
  }
});
test('actual walking pays the same weather energy and speed in the parent and its field camp',()=>{
  for(const type of ['forest','desert','mountain','cave']){
    const {s,h,parent}=campEnvironmentFixture(type);h.x=20;h.energy=60;h.goal={kind:'rest',area:h.area,x:80};
    const b=restore(serialize(s));b.hero.area=parent.id;b.hero.goal.area=parent.id;
    step(s);step(b);assert.equal(h.lastAction,'walk');assert.equal(b.hero.lastAction,'walk');assert.equal(h.energy,b.hero.energy);assert.equal(h.x,b.hero.x);assert.equal(h.distance,b.hero.distance);assert.equal(h.hunger,b.hero.hunger);
  }
});
test('actual renderer keeps biome silhouettes and the single camp fire without drawing parent bodies or consuming RNG',()=>{
  const keys=['document','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:k==='measureText'?text=>({width:String(text).length*6}):['createLinearGradient','createRadialGradient'].includes(k)?()=>({addColorStop(){}}):()=>{}}),canvas={clientWidth:390,clientHeight:180,width:0,height:0,dataset:{},getContext:()=>ctx};
  const mocks={document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}}),ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},devicePixelRatio:1};
  for(const[k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,writable:true,configurable:true});
  try{for(const type of ['forest','desert','mountain','cave']){
    const {s,h,parent}=campEnvironmentFixture(type);const neighbour=Object.values(s.people).find(p=>p.id!==h.lineage);
    s.actorStates[neighbour.id]={...structuredClone(h),lineage:neighbour.id,area:parent.id,x:50};
    const before=serialize(s),scene=new Scene(canvas,{profileMode:'legacy'});let trees=0,fires=0;const tree=scene.tree.bind(scene),fire=scene.fire.bind(scene);scene.tree=(...args)=>{trees++;return tree(...args);};scene.fire=(...args)=>{fires++;return fire(...args);};
    try{scene.update(s);assert.equal(fires,1);assert.equal(trees,type==='forest'?29:0);assert.equal(canvas.dataset.detailedActors,'0');assert.equal(Boolean(scene.lightSet.sky),type!=='cave');if(type==='mountain')assert.equal(scene.composition.kind,'alpine');assert.equal(serialize(s),before);for(let i=0;i<10;i++)scene.draw();assert.equal(serialize(s),before);}finally{scene.destroy();}
  }}finally{for(const[k,value]of old){if(value)Object.defineProperty(globalThis,k,value);else delete globalThis[k];}}
});
