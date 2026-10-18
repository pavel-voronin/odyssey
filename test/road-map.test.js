// This controlled road layout predates optional settlement starts; current default-ON starts have separate coverage.
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,createNextStory,observeDetailedActor} from '../engine.js';
import {roadMapModel,RoadMapRenderer} from '../road-map.js';
import {initializeActorAtlas,revealArea,revealRoad} from '../actor-atlas.js';
function fixture(){const s=createWorld(1,{rules:{birthplaces:false}}),h=s.hero;initializeActorAtlas(s,h);h.area='a0';h.x=15;h.lastAction='walk';h.goal={kind:'explore',area:'a1',x:42};h.combat=null;s.areas.a0.length=260;return {s,h};}
function context(){const text=[],calls=[];return new Proxy({text,calls,measureText:s=>({width:String(s).length*6}),fillText:(s,...p)=>text.push({s,p})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push({kind:k,args})});}
function renderer(){const base=context(),r=new RoadMapRenderer({createCanvas:()=>({width:0,height:0,getContext:()=>base})});return {r,base,c:context()};}
test('the road map is personal knowledge, not the complete canonical geography or world discovered flags',()=>{
 const {s,h}=fixture();h.atlas.known=['a0'];h.atlas.roads=[];s.areas.a1.discovered=true;const before=serialize(s),m=roadMapModel(s);assert.deepEqual(m.nodes.map(n=>n.id),['a0']);assert.equal(m.roads.length,0);assert.equal(JSON.stringify(m).includes(s.areas.a1.name),false);assert.equal(serialize(s),before);revealArea(s,'a1');assert.ok(roadMapModel(s).nodes.some(n=>n.id==='a1'));assert.equal(roadMapModel(s).roads.length,1);h.atlas.roads=[];assert.equal(roadMapModel(s).roads.length,0);
});
test('two actual intermediate steps move the marker along the same local scene without reinterpreting ticks as distance',()=>{
 const {s,h}=fixture();h.hp=h.maxHp;h.energy=100;const start=roadMapModel(s);step(s);const first=roadMapModel(s);step(s);const second=roadMapModel(s);assert.ok(first&&second);assert.ok(start.marker.x<first.marker.x&&first.marker.x<second.marker.x);assert.equal(second.marker.localX,h.x);assert.ok(Math.abs(second.marker.x-first.marker.x-(h.x-first.marker.localX)*(s.areas[h.area].spatial.anchor.sceneScale??1.2))<1e-9);assert.equal(first.topology,second.topology);
});
test('local activity, combat, interiors, death and old transit return to the scene without inventing a map position',()=>{
 for(const mode of ['activity','combat','dead','transit','rest']){const {s,h}=fixture();if(mode==='activity')h.goal.area=h.area;if(mode==='combat')h.combat='enemy';if(mode==='dead')h.alive=false;if(mode==='transit')h.transit={from:'a0',to:'a1',remaining:9,total:5,mode:'sea'};if(mode==='rest')h.lastAction='rest';assert.equal(roadMapModel(s),null,mode);}
});
test('same-frame knowledge and real broken edges affect the next model without revealing a secret place',()=>{
 const {s,h}=fixture();h.atlas.known=['a0','a1'];h.atlas.roads=['a0|a1'];assert.equal(roadMapModel(s).roads.length,1);s.areas.a0.links=[];assert.equal(roadMapModel(s).roads.length,0);h.atlas.known=[];assert.equal(roadMapModel(s),null);
});
test('renderer caches the static known layer while real body movement, repeated draw and pan/zoom never change the world',()=>{
 const {s,h}=fixture(),{r,c}=renderer();r.update(s);const before=serialize(s);r.draw(c,390,180,1);const builds=r.builds,first=r.marker;for(let i=0;i<10;i++)r.draw(c,390,180,1);assert.equal(r.builds,builds);h.x+=10;r.update(s);r.draw(c,390,180,1);assert.equal(r.builds,builds);assert.ok(r.marker.x>first.x);const changed=serialize(s);r.pan(40,10);r.zoom(1.25);r.draw(c,390,180,1);r.follow();r.draw(c,320,140,2);assert.equal(serialize(s),changed);assert.notEqual(before,changed);assert.ok(Number.isFinite(r.marker.x)&&Number.isFinite(r.marker.y));
});
test('hidden names never reach canvas commands and narrow screens use bounded labels',()=>{
 const {s,h}=fixture(),{r,c,base}=renderer();h.atlas.known=['a0'];h.atlas.roads=[];s.areas.a1.name='СЕКРЕТНЫЙ ГОРОД';h.name='Оченьдлинноеимя'.repeat(10);s.areas.a0.name='Длинная дорога '.repeat(15);r.update(s);r.draw(c,320,150,1);assert.ok(![...c.text,...base.text].some(t=>t.s.includes('СЕКРЕТНЫЙ')));assert.ok(c.text.some(t=>t.s.endsWith('…')));assert.ok(base.text.some(t=>t.s.endsWith('…')));
});
test('ten view-only lifecycles and a reload preserve the exact same subsequent deterministic prefix',()=>{
 const {s}=fixture(),copy=restore(serialize(s)),{r,c}=renderer();for(let i=0;i<10;i++){r.update(s);if(r.model){r.draw(c,390,180);r.pan(20,0);r.zoom(.8);r.draw(c,390,180);}step(s);step(copy);}assert.equal(serialize(s),serialize(copy));
});
test('actual observer switch uses the other living body personal map, layer and position',()=>{
 const {s,h}=fixture();h.atlas.known=['a0'];h.atlas.roads=[];createNextStory(s,{allowLiving:true});const second=s.hero;initializeActorAtlas(s,second);second.area='a2';second.x=30;second.lastAction='walk';second.goal={kind:'explore',area:'a3',x:50};second.combat=null;second.atlas.known=['a2'];second.atlas.roads=[];assert.deepEqual(roadMapModel(s).nodes.map(n=>n.id),['a2']);assert.ok(observeDetailedActor(s,h.lineage));assert.deepEqual(roadMapModel(s).nodes.map(n=>n.id),['a0']);assert.ok(observeDetailedActor(s,second.lineage));assert.deepEqual(roadMapModel(s).nodes.map(n=>n.id),['a2']);
});
