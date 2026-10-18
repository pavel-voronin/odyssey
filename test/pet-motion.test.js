import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore} from '../engine.js';import {ActorTracks,companionKey,actorFact} from '../actor-facts.js';
import {petMotion} from '../pet-motion.js';import {paintPet} from '../pet-shapes.js';import {recordSilhouette} from '../silhouette.js';import {Scene} from '../scene.js';
function setup(){const s=createWorld(17);s.hero.companions=[{id:'fox',uid:'kept-fox',hp:20,maxHp:20}];s.hero.x=50;s.hero.facing=1;const tracks=new ActorTracks();tracks.update(s,'same-area');return{s,tracks,key:companionKey(s.hero.companions[0])};}
test('pet look follows actual world displacement, retains its last look at rest and turns once on reversal',()=>{
 const{s,tracks,key}=setup();s.tick++;s.hero.x=48;s.hero.facing=1;tracks.update(s,'same-area');assert.equal(petMotion('fox',tracks.tracks.get(key),.3).direction,-1);
 s.tick++;tracks.update(s,'same-area');const still=tracks.tracks.get(key);assert.equal(still.direction,-1);assert.equal(petMotion('fox',still,.3).walking,false);assert.equal(tracks.update(s,'same-area'),false);
 s.tick++;s.hero.x=49;tracks.update(s,'same-area');const right=tracks.tracks.get(key);assert.equal(right.direction,1);for(let i=0;i<100;i++)assert.equal(petMotion('fox',right,i/100).direction,1);
});
test('first frame, missing ticks, restored saves and another area do not replay a displaced step or strike',()=>{
 const{s,tracks,key}=setup();s.hero.facing=-1;s.tick+=2;s.hero.x=10;actorFact(s,'attack',key);tracks.update(s,'same-area');let pose=petMotion('fox',tracks.tracks.get(key),.3);assert.equal(pose.direction,-1);assert.equal(pose.walking,false);assert.equal(pose.reach,0);
 s.tick++;s.hero.x=80;tracks.update(s,'other-area');assert.equal(petMotion('cat',tracks.tracks.get(key),.3).walking,false);
 const loaded=restore(serialize(s)),fresh=new ActorTracks();fresh.update(loaded,'other-area');pose=petMotion('owl',fresh.tracks.get(key),.3);assert.equal(pose.direction,-1);assert.equal(pose.walking,false);assert.equal(pose.wing,0);assert.equal(petMotion('cat',undefined,.3,{facing:-1}).direction,-1);
});
test('fox and cat use different finite planted steps; idle and completed frames cannot march in place',()=>{
 const track={from:50,to:52,direction:1};
 for(let n=0;n<=100;n++)for(const id of['fox','cat','owl']){const p=petMotion(id,track,n/100,{pixelsPerUnit:3});assert.ok(p.feet.every(f=>f.y<=0&&Number.isFinite(f.x)));assert.ok(p.feet.some(f=>f.y===0));const shape=recordSilhouette(c=>paintPet(c,id,{motion:p}));assert.ok(shape.polygons.flat(2).every(Number.isFinite));assert.ok(Math.max(...shape.polygons.flat().map(p=>p[1]))<.001);}
 assert.notDeepEqual(petMotion('fox',track,.3).feet,petMotion('cat',track,.3).feet);
 assert.equal(petMotion('fox',track,1).walking,false);assert.equal(petMotion('cat',{...track,to:50},.3).walking,false);
});
test('rest and switches stop gait and wings; actual hurt is brief and has no invented repeated action',()=>{
 const track={from:50,to:52,direction:-1,hurt:true,attack:true};
 for(const id of['fox','cat','owl']){const rest=petMotion(id,track,.7,{rest:true}),off=petMotion(id,track,.7,{animate:false});assert.equal(rest.walking,false);assert.equal(rest.wing,0);assert.equal(off.walking,false);assert.equal(off.hurt,false);assert.equal(off.wing,0);assert.equal(off.direction,-1);assert.equal(petMotion(id,track,1).hurt,false);assert.equal(petMotion(id,{...track,attack:false},.7).wing,0);}
 assert.equal(petMotion('fox',track,.7).hurt,true);assert.ok(petMotion('owl',track,.3).wing>0);
});
test('reading any number of poses and silhouettes leaves the real world, RNG, original pet and save unchanged',()=>{
 const{s,tracks,key}=setup();s.tick++;s.hero.x=49;tracks.update(s,'same-area');const before=serialize(s),track=structuredClone(tracks.tracks.get(key));for(let i=0;i<120;i++)for(const id of['fox','owl','cat']){const p=petMotion(id,track,i/120);recordSilhouette(c=>paintPet(c,id,{rest:p.rest,hurt:p.hurt,motion:p}));}assert.equal(serialize(s),before);assert.deepEqual(tracks.tracks.get(key),track);
});
test('actual scene shares posed body and shadow with a bounded cache independent of camera scroll',()=>{
 const scene=Object.create(Scene.prototype);scene.state=createWorld(17);scene.pixelRatio=1;scene.camera={a:1,b:0,c:0,d:1,e:0,f:0};scene.ctx=new Proxy({getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});let count=0;scene.castContourShadow=p=>{count++;assert.ok(p.flat(2).every(Number.isFinite));};scene.castShadow=()=>{};
 const track={from:49,to:50,direction:1};for(let i=0;i<300;i++){const p=petMotion(i%2?'fox':'cat',track,i/301,{pixelsPerUnit:3});scene.pet(120,150,i%2?'fox':'cat',p.direction,p.rest,p.hurt,p);}assert.ok(scene.petSilhouetteCache.size<=96);assert.equal(count,300);const before=petMotion('fox',track,.3);scene.camera.e=-200;assert.deepEqual(petMotion('fox',track,.3),before);
});
