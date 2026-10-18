import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore} from '../engine.js';import {syncActiveActor} from '../actor-projection.js';import {initializeSpatial} from '../modules/spatial.js';import {boundaryMotifs} from '../scene-boundary.js';import {sceneFrame} from '../scene-camera.js';
import {initializeActorAtlas} from '../actor-atlas.js';
const dir='artifacts/scene-boundary-132',views=[];
async function save(label,s,prepared,details={}){const a=s.areas[s.hero.area],f=sceneFrame(a,390),ms=boundaryMotifs(s,a,{width:f.worldWidth,viewportWidth:390,scroll:Math.max(0,24+s.hero.x/100*(f.worldWidth-48)-195)});await writeFile(dir+'/ui-'+label+'.json',serialize(s));views.push({label,prepared,tick:s.tick,area:a.id,x:s.hero.x,length:a.length||100,motifs:ms.map(m=>({area:m.area,entrance:m.entrance,kind:m.kind,x:m.x})),...details});}
const s=createWorld(4);await save('road',s,false);let town=false,forest=false;
for(let i=0;i<100&&!forest;i++){
 step(s);const a=s.areas[s.hero.area],ms=boundaryMotifs(s,a,{width:390});
 if(!town&&['village','port','citadel'].includes(a.type)&&ms.some(m=>m.kind==='forest')){await save('town-edge',s,false);town=true;}
 if(a.type==='forest'&&ms.some(m=>m.kind==='settlement')){await save('forest-edge',s,false);const middle=restore(serialize(s));middle.hero.x=50;syncActiveActor(middle);await save('forest-opaque',middle,true,{change:'Only test body position moved into the existing dense forest, no new place or invisible turn generated.'});forest=true;}
}
assert.ok(town&&forest,'Actual autonomous town/forest frames required');
for(const [label,x,hidden]of [['long-start',5,false],['long-end',95,false],['hidden-end',95,true]]){
 const w=createWorld(4),a=w.areas[w.hero.area];a.length=260;a.roadProfile='long-tract';w.hero.x=x;w.hero.goal={kind:'routeWait',area:a.id,x,until:100000};if(hidden){initializeActorAtlas(w,w.hero,true);w.hero.atlas.known=w.hero.atlas.known.filter(id=>id!=='a1');w.hero.atlas.roads=w.hero.atlas.roads.filter(id=>id!=='a0|a1');}syncActiveActor(w);initializeSpatial(w,{force:true});await save(label,w,true,{change:'Prepared existing road length260/body position; hidden variant removes only the observer knowledge. Does not claim natural generation or arrival.'});
}
let cave=false;
for(let seed=1;seed<=16&&!cave;seed++){
 const w=createWorld(seed);
 for(let n=0;n<1200&&w.hero.alive;n++){
  step(w);const a=w.areas[w.hero.area],gate=a.objects.find(o=>o.kind==='gate'&&o.mode==='stairs'&&w.areas[o.to]?.type==='cave');if(!gate||a.realm!=='surface')continue;
  const copy=restore(serialize(w));copy.hero.x=gate.x;copy.hero.goal={kind:'explore',area:gate.to,x:gate.x};syncActiveActor(copy);
  if(!boundaryMotifs(copy,copy.areas[copy.hero.area],{width:390}).some(m=>m.kind==='rock'))continue;
  await save('cave-edge',copy,true,{seed,gate:gate.id,change:'Actual autonomously generated local stair/cave and known route; only hero position and direct goal prepared for a readable exterior frame. No cave contents or second gate added.'});cave=true;break;
 }
}
assert.ok(cave,'Bounded search must find a real generated stair before claiming native cave coverage');await writeFile(dir+'/views.json',JSON.stringify({views,scope:'Two actual autonomous opposing town/forest frames. Prepared long-camera/hidden/dense-forest placement separated from actual travel. Cave uses a genuinely generated local stairs marker, not another invented entrance.'},null,2));console.log(JSON.stringify(views.map(v=>({label:v.label,tick:v.tick,prepared:v.prepared,motifs:v.motifs}))));
