import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createNextStory,serialize} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';import {Scene} from '../scene.js';
test('drawing another detailed adventurer is local, single-bodied and read-only across redraws',()=>{
 const keys=['document','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio'],originals=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const frames=new Map();let next=0;const ctx=new Proxy({},{get:(target,key)=>key in target?target[key]:key==='measureText'?text=>({width:String(text).length*6}):['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{}}),canvas={clientWidth:390,clientHeight:180,width:0,height:0,dataset:{},getContext:()=>ctx};
 const mocks={document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),devicePixelRatio:1};for(const [k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});
 let scene;try{
  const s=createWorld(1),first=s.hero;syncActiveActor(s);createNextStory(s,{allowLiving:true});s.hero.area=first.area;s.hero.x=20;first.x=65;syncActiveActor(s);s.rules.animation=false;const a=s.areas[first.area];
  scene=new Scene(canvas);let bodies=0;const person=scene.person.bind(scene);scene.person=(...args)=>{bodies++;return person(...args);};scene.update(s);const base=bodies;assert.equal(canvas.dataset.detailedActors,'1');
  // A stale resident object must not draw a second body at its obsolete address.
  a.objects.push({id:'old-actor-resident',kind:'resident',person:first.lineage,x:90});const before=serialize(s);bodies=0;for(let i=0;i<100;i++)scene.update(s);assert.equal(bodies,base*100);assert.equal(serialize(s),before);assert.ok(frames.size<=1);assert.equal(scene.actorPositions.get(first.lineage).to,65);
  s.tick++;first.transit={from:first.area,to:'a1',mode:'road'};scene.update(s);assert.equal(canvas.dataset.detailedActors,'0');assert.equal(scene.beastTracks.tracks.has(first.lineage),false);
  first.transit=null;s.hero.transit={from:s.hero.area,to:'a1',mode:'road'};scene.update(s);assert.equal(canvas.dataset.detailedActors,'0');assert.equal(scene.beastTracks.tracks.has(first.lineage),false);
 }finally{scene?.destroy();for(const [k,value]of originals){if(value)Object.defineProperty(globalThis,k,value);else delete globalThis[k];}}assert.equal(frames.size,0);
});
