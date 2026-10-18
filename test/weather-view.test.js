import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weatherParticles} from '../weather-view.js';
import {scenery} from '../scenery.js';
import {createWorld,serialize} from '../engine.js';
import {weatherAt} from '../modules/weather.js';
import {Scene} from '../scene.js';

test('bounded rain and snow move by frame time at an unchanged world tick without spending RNG',()=>{
  const s=createWorld(4),view=scenery(s.seed,s.areas.a0),before=serialize(s);
  for(const id of ['rain','snow','storm']){
    assert.notDeepEqual(weatherParticles(id,view,360,140,1000),weatherParticles(id,view,360,140,1100));
    for(const width of [1,360,4000])for(const time of [0,500,100000000]){
      const points=weatherParticles(id,view,width,140,time);assert.ok(points.length<=48);
      assert.ok(points.every(p=>p.x>=0&&p.x<width&&p.y>=-12&&p.y<140));
    }
  }
  assert.deepEqual(weatherParticles('shelter',view,360,140,1000),[]);assert.equal(serialize(s),before);
});

test('the actual scene owns one frame loop, pauses when hidden, respects motion controls and releases listeners',()=>{
  const originals=new Map(['document','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio','performance'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  let time=1000,next=0,mediaChange,visibility,resize;const frames=new Map();let paints=0;
  const ctx=new Proxy({}, {get:(target,key)=>key in target?target[key]:key==='measureText'?text=>({width:String(text).length*6}):['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{}});
  const canvas={clientWidth:360,clientHeight:180,width:0,height:0,dataset:{},getContext:()=>ctx};
  const mocks={document:{hidden:false,addEventListener:(type,fn)=>visibility=fn,removeEventListener:()=>visibility=null},matchMedia:()=>({matches:false,addEventListener:(type,fn)=>mediaChange=fn,removeEventListener:()=>mediaChange=null}),ResizeObserver:class{constructor(fn){resize=fn;}observe(){}disconnect(){resize=null;}},requestAnimationFrame:fn=>{const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),devicePixelRatio:1,performance:{now:()=>time}};
  for(const [k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});
  let scene;
  try{
    let s;for(let seed=0;seed<100;seed++){const candidate=createWorld(seed);if(['rain','storm'].includes(weatherAt(candidate,candidate.areas[candidate.hero.area]).id)){s=candidate;break;}}
    assert.ok(s);const before=serialize(s);scene=new Scene(canvas);const draw=scene.draw.bind(scene);scene.draw=()=>{paints++;draw();};
    scene.update(s);assert.equal(frames.size,1);
    for(let i=0;i<50;i++){scene.update(s);resize();assert.equal(frames.size,1);}
    const frame=()=>{time+=40;const entry=frames.entries().next().value;assert.ok(entry);frames.delete(entry[0]);entry[1]();};
    for(let i=0;i<30;i++)frame();assert.equal(frames.size,1);assert.equal(serialize(s),before);
    for(let i=0;i<20;i++){s.rules.weather=i%2===1;scene.update(s);assert.ok(frames.size<=1);frame();}
    s.rules.weather=false;scene.update(s);assert.equal(weatherAt(s,s.areas[s.hero.area]).id,'clear');
    for(let i=0;i<20&&frames.size;i++)frame();assert.equal(frames.size,0,'the departing rain ends instead of leaving a permanent empty loop');
    s.rules.weather=true;scene.update(s);assert.equal(frames.size,1);assert.equal(serialize(s),before);
    mocks.document.hidden=true;visibility();assert.equal(frames.size,0);const stopped=paints;time+=100000;assert.equal(paints,stopped);
    mocks.document.hidden=false;visibility();assert.equal(frames.size,1);frame();assert.equal(frames.size,1);
    mediaChange({matches:true});assert.equal(frames.size,0);assert.equal(serialize(s),before);
    mediaChange({matches:false});assert.equal(frames.size,1);
    s.rules.animation=false;scene.update(s);assert.equal(frames.size,0);assert.ok(['rain','storm'].includes(weatherAt(s,s.areas.a0).id));
    s.rules.animation=true;scene.update(s);assert.equal(frames.size,1);
    scene.destroy();assert.equal(frames.size,0);assert.equal(resize,null);assert.equal(visibility,null);assert.equal(mediaChange,null);
  }finally{scene?.destroy();for(const [k,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}}
});
