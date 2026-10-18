import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,createNextStory,observeDetailedActor} from '../engine.js';
import {initializeSpatial,registerSpatialArea,registerSpatialEdge,spatialAddress,spatialPassage,actorSpatialAddress} from '../modules/spatial.js';
import {addRoute} from '../modules/travel.js';
import {lodgingFixture} from '../scripts/lodging-scenarios.mjs';
const edge=(a,b)=>[a,b].sort().join('|');
function fixture(){const s={seed:11,rng:73,areas:{},edges:{},people:{},society:{journeys:[]},actorStates:{}};for(let n=0;n<5;n++)s.areas['a'+n]={id:'a'+n,type:'road',continent:n===4?'c1':'c0',realm:'surface',era:0,links:[],objects:[]};return s;}
function link(s,a,b,mode='road'){s.areas[a].links.push(b);s.areas[b].links.push(a);s.edges[edge(a,b)]={a,b,mode,duration:mode==='road'?0:7,cost:0};}
test('stable schematic anchors distinguish identical local positions without spending RNG or moving a body',()=>{
 const s=fixture();link(s,'a0','a1');initializeSpatial(s);const a=spatialAddress(s,'a0',42),b=spatialAddress(s,'a1',42),old=JSON.stringify(a);assert.equal(a.status,'known');assert.equal(a.scene.x,42);assert.notDeepEqual(a.point,b.point);assert.equal(s.rng,73);s.areas.a99={...s.areas.a0,id:'a99',links:[],spatial:undefined};registerSpatialArea(s,'a99');assert.equal(JSON.stringify(spatialAddress(s,'a0',42)),old);const save=JSON.stringify(s);initializeSpatial(s);for(let i=0;i<10;i++){spatialAddress(s,'a0',i);spatialPassage(s,'a0|a1');}assert.equal(JSON.stringify(s),save);
});
test('old long chains bootstrap iteratively without recursively traversing the whole graph from one writer',()=>{
 const s=fixture();s.areas={};for(let i=0;i<2500;i++){s.areas['a'+i]={id:'a'+i,continent:'c0',realm:'surface',era:0,type:'road',links:[],objects:[]};if(i)link(s,'a'+(i-1),'a'+i);}initializeSpatial(s);assert.equal(Object.keys(s.areas).length,2500);assert.equal(spatialAddress(s,'a2499',20).status,'known');const saved=JSON.stringify(s);initializeSpatial(s);assert.equal(JSON.stringify(s),saved);
});
test('continents and eras stay separate; sea, portal and time are connectors with no invented physical distance',()=>{
 const s=fixture();s.areas.a3.era=-3;s.areas.a2.realm='underworld';link(s,'a0','a4','sea');link(s,'a0','a2','portal');link(s,'a0','a3','time');link(s,'a1','a4');initializeSpatial(s);
 for(const [id,kind]of [['a0|a4','sea'],['a0|a2','portal'],['a0|a3','time'],['a1|a4','legacy-connector']]){const p=spatialPassage(s,id);assert.equal(p.status,'known');assert.equal(p.kind,kind);assert.equal(p.worldDistance,null);assert.equal(p.duration,s.edges[id].duration);}assert.notEqual(spatialAddress(s,'a0').continent,spatialAddress(s,'a4').continent);assert.equal(spatialPassage(s,'a0|a3').crossLayer,true);
});
test('actual hall and room collapse to the recorded outside door without becoming new settlements',()=>{
 const {s,hall,room,d}=lodgingFixture();initializeSpatial(s,{force:true});const a=spatialAddress(s,room.id,25),b=spatialAddress(s,'a1',d.x);assert.equal(a.status,'known');assert.equal(a.precision,'entrance');assert.equal(a.attachments.length,2);assert.equal(a.anchor,b.anchor);assert.deepEqual(a.point,b.point);assert.equal(room.city,undefined);assert.equal(room.spatial.anchor,undefined);assert.equal(hall.spatial.attachment.parent,'a1');assert.equal(a.scene.area,room.id);
});
test('old camps remain explicitly approximate and do not borrow an observer-specific return coordinate',()=>{
 const s=fixture();s.areas.a2.temporaryCamp={parent:'a0'};link(s,'a0','a2');s.hero={area:'a2',x:68,campReturn:{parent:'a0',x:91}};initializeSpatial(s);const a=spatialAddress(s,'a2',68);assert.equal(a.status,'partial');assert.equal(a.precision,'area');assert.deepEqual(a.point,spatialAddress(s,'a0',50).point);assert.equal(spatialPassage(s,'a0|a2').kind,'camp');assert.equal(spatialPassage(s,'a0|a2').status,'partial');
});
test('delve floors follow unique real gate and next-floor pointers; ambiguous roots are unknown',()=>{
 const s=fixture();s.areas.a0.delveGate='a1';s.areas.a1.dungeon={root:'a1',floor:1,next:'a2'};s.areas.a2.dungeon={root:'a1',floor:2};link(s,'a0','a1','stairs');link(s,'a1','a2','stairs');initializeSpatial(s);assert.equal(spatialAddress(s,'a2',40).attachments.length,2);assert.equal(s.areas.a2.spatial.attachment.parent,'a1');s.areas.a3.delveGate='a1';link(s,'a3','a1','stairs');initializeSpatial(s,{force:true});assert.equal(spatialAddress(s,'a1').status,'unknown');assert.equal(s.areas.a1.spatial.attachment.parent,null);
});
test('missing, stale and cyclic parents never generate a location on read',()=>{
 const s=fixture();s.areas.a1.interior={parent:'a2',entrance:20};s.areas.a2.interior={parent:'a1',entrance:30};link(s,'a1','a2','door');initializeSpatial(s);let before=JSON.stringify(s);assert.equal(spatialAddress(s,'a1').reason,'parent-cycle');assert.equal(JSON.stringify(s),before);s.areas.a2.interior.parent='absent';before=JSON.stringify(s);assert.equal(spatialAddress(s,'a1').status,'unknown');assert.equal(JSON.stringify(s),before);delete s.areas.a2;assert.equal(spatialAddress(s,'a1').status,'unknown');assert.equal(spatialAddress(s,'absent').status,'unknown');assert.equal(spatialAddress(s,'a0',101).status,'unknown');
});
test('canonical edge revisions are idempotent and change when the real passage changes',()=>{
 const s=fixture();link(s,'a0','a1');initializeSpatial(s);const revision=s.edges['a0|a1'].spatial.revision,r=s.spatial.revision;registerSpatialEdge(s,'a0|a1');assert.equal(s.spatial.revision,r);addRoute(s,'a0','a1',{mode:'sea',duration:9,cost:3});assert.equal(s.edges['a0|a1'].spatial.revision,revision+1);assert.equal(spatialPassage(s,'a0|a1').duration,9);s.edges['a0|a1'].duration=10;assert.equal(spatialPassage(s,'a0|a1').reason,'changed-edge');registerSpatialEdge(s,'a0|a1');assert.equal(spatialPassage(s,'a0|a1').duration,10);s.areas.a0.links=[];assert.equal(spatialPassage(s,'a0|a1').reason,'broken-edge');
});
test('a real endpoint writer refreshes only its incident canonical passages and versions',()=>{
 const s=fixture();link(s,'a0','a1');link(s,'a2','a3');initializeSpatial(s);const old=s.edges['a0|a1'].spatial.revision,untouched=JSON.stringify(s.edges['a2|a3']);s.areas.a1.era=3;assert.equal(spatialPassage(s,'a0|a1').status,'unknown');registerSpatialArea(s,'a1');assert.equal(s.edges['a0|a1'].spatial.revision,old+1);assert.equal(spatialPassage(s,'a0|a1').kind,'legacy-connector');assert.equal(spatialPassage(s,'a0|a1').crossLayer,true);assert.equal(JSON.stringify(s.edges['a2|a3']),untouched);
});
test('old sea transit reports authoritative time, never a made-up midpoint or departure geometry version',()=>{
 const s=fixture();link(s,'a0','a4','sea');initializeSpatial(s);const h={lineage:'old',alive:false,area:'a0',x:100,transit:{from:'a0',to:'a4',mode:'sea',remaining:12,total:7}};const before=JSON.stringify(s),a=actorSpatialAddress(s,h);assert.equal(a.kind,'transit');assert.equal(a.status,'partial');assert.equal(a.point,null);assert.equal(a.physicalProgress,null);assert.equal(a.departureVersion,null);assert.equal(a.time.remaining,12);assert.equal(JSON.stringify(s),before);
});
test('NPC location uses its real controller rather than a stale detailed scene, including recorded journeys',()=>{
 const s=fixture();link(s,'a0','a4','sea');initializeSpatial(s);const h={lineage:'p',alive:true,actorMode:'npc',life:{},area:'a1',x:40};s.actorStates.p=h;s.people.p={id:'p',alive:true,area:'a4',x:24};assert.equal(actorSpatialAddress(s,h).scene.area,'a4');s.people.p.area=null;s.society.journeys.push({person:'p',from:'a0',to:'a4'});const a=actorSpatialAddress(s,h);assert.equal(a.kind,'transit');assert.equal(a.time.total,null);assert.equal(a.mode,null);assert.equal(h.area,'a1');
});
test('future metadata is retained as unsupported and queries stay read-only',()=>{
 const s=fixture();link(s,'a0','a1');s.areas.a0.spatial={version:99,private:'future'};initializeSpatial(s);assert.deepEqual(s.areas.a0.spatial,{version:99,private:'future'});assert.equal(spatialAddress(s,'a0').status,'unknown');assert.equal(spatialPassage(s,'a0|a1').status,'unknown');
});
test('real saves restore exactly, and observer address reads do not change deterministic subsequent steps',()=>{
 const s=createWorld(31),save=serialize(s),copy=restore(save);assert.equal(serialize(copy),save);for(let i=0;i<16;i++){for(const h of Object.values(s.actorStates))actorSpatialAddress(s,h);step(s);step(copy);}assert.equal(serialize(s),serialize(copy));
});
test('two continuing bodies keep independent spatial scenes through actual observation switches and restore',()=>{
 const s=createWorld(9),first=s.hero;assert.equal(createNextStory(s,{allowLiving:true}),true);const second=s.hero;first.area='a0';first.x=42;second.area='a4';second.x=42;const a=actorSpatialAddress(s,first),b=actorSpatialAddress(s,second);assert.notEqual(a.anchor,b.anchor);assert.equal(observeDetailedActor(s,first.lineage),true);assert.deepEqual(actorSpatialAddress(s),a);assert.equal(observeDetailedActor(s,second.lineage),true);assert.deepEqual(actorSpatialAddress(s),b);const copy=restore(serialize(s));assert.deepEqual(actorSpatialAddress(copy),b);assert.deepEqual(actorSpatialAddress(copy,copy.actorStates[first.lineage]),a);
});
