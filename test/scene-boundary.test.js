import test from 'node:test';import assert from 'node:assert/strict';
import {boundaryMotifs,transitLandscape,transitProgress,blendColor,blendScenery,paintBoundaryMotifs,paintTransitLandmarks} from '../scene-boundary.js';
import {initializeSpatial,actorSpatialAddress} from '../modules/spatial.js';import {addRoute} from '../modules/travel.js';import {initializeAreaFacades} from '../facades.js';import {scenery} from '../scenery.js';import {sceneFrame} from '../scene-camera.js';
import {createWorld,step,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';
function fixture(){
 const s={seed:7,rng:33,tick:20,rules:{'scene-boundaries':true},areas:{},edges:{},people:{},society:{journeys:[]},actorStates:{},hero:{lineage:'watcher',area:'a0',x:50,goal:null,transit:null,atlas:{known:['a0','a1','a2','a3','a4'],roads:['a0|a1','a1|a2','a0|a3']}}};
 for(const [i,type]of ['road','village','forest','cave','village'].entries())s.areas['a'+i]={id:'a'+i,name:'Место '+i,type,depth:i,realm:type==='cave'?'underground':'surface',era:0,continent:'c0',length:i===0?260:100,objects:[],population:[],links:[]};
 for(const [a,b]of [['a0','a1'],['a1','a2']]){s.areas[a].links.push(b);s.areas[b].links.push(a);s.edges[[a,b].sort().join('|')]={a,b,mode:'road',duration:0,cost:0};}
 initializeAreaFacades(s,s.areas.a1);initializeSpatial(s);return s;
}
const endView=s=>{const a=s.areas[s.hero.area],frame=sceneFrame(a,390);return boundaryMotifs(s,a,{width:frame.worldWidth,viewportWidth:390,scroll:frame.maxScroll});};
test('a real known neighbour uses the original outer facade ID only at the visible long-road end',()=>{
 const s=fixture(),a=s.areas.a0,frame=sceneFrame(a,390),before=JSON.stringify(s);assert.deepEqual(boundaryMotifs(s,a,{width:frame.worldWidth,viewportWidth:390,scroll:0}),[]);const [m]=endView(s);assert.equal(m.area,'a1');assert.equal(m.edge,'edge/a0|a1');assert.equal(m.profile.id,s.areas.a1.facades.profiles[0].id);assert.equal(m.x,frame.worldWidth-24);assert.equal(m.side,1);assert.equal(m.profile.door,undefined);assert.equal(JSON.stringify(s),before);
});
test('city to forest and forest back to city respect actual endpoint direction and dense local visibility',()=>{
 const s=fixture();s.hero.area='a1';s.hero.x=90;const [trees]=endView(s);assert.equal(trees.area,'a2');assert.equal(trees.kind,'forest');assert.equal(trees.side,1);s.hero.area='a2';s.hero.x=50;assert.deepEqual(endView(s),[]);s.hero.x=10;const [town]=endView(s);assert.equal(town.area,'a1');assert.equal(town.side,-1);assert.equal(town.x,24);
});
test('a hidden or remote town, unknown road, stale passage and explicit opaque turn never get an invented entrance',()=>{
 for(const cause of ['hidden','road-unknown','stale','opaque']){const s=fixture();if(cause==='hidden')s.hero.atlas.known=s.hero.atlas.known.filter(id=>id!=='a1');if(cause==='road-unknown')s.hero.atlas.roads=[];if(cause==='stale')s.edges['a0|a1'].cost=1;if(cause==='opaque')s.edges['a0|a1'].visibility='opaque';assert.deepEqual(endView(s),[],cause);}
 const s=fixture();assert.ok(!endView(s).some(m=>m.area==='a4'));
});
test('two branches sharing one edge have no arbitrary city gate; an actual direct goal identifies its own visible branch',()=>{
 const s=fixture();s.areas.a0.links.push('a4');s.areas.a4.links.push('a0');s.edges['a0|a4']={a:'a0',b:'a4',mode:'road',duration:0,cost:0};s.hero.atlas.roads.push('a0|a4');initializeSpatial(s,{force:true});assert.deepEqual(endView(s),[]);s.hero.goal={area:'a4'};assert.equal(endView(s)[0].area,'a4');s.hero.goal={area:'a1'};assert.equal(endView(s)[0].area,'a1');
});
test('a cave exterior surrounds its actual stair marker and never reveals underground objects or an extra door',()=>{
 const s=fixture();s.areas.a0.links.push('a3');s.areas.a3.links.push('a0');addRoute(s,'a0','a3',{mode:'stairs',duration:3});s.hero.goal={area:'a3'};const marker=s.areas.a0.objects.find(o=>o.to==='a3'),[m]=endView(s);assert.equal(m.area,'a3');assert.equal(m.kind,'rock');assert.equal(m.entrance,marker.id);assert.equal(m.x,24+marker.x/100*(sceneFrame(s.areas.a0,390).worldWidth-48));const before=JSON.stringify(m);s.areas.a3.objects.push({kind:'loot',name:'secret relic',x:20},{kind:'resident',name:'secret person',x:40});assert.equal(JSON.stringify(endView(s)[0]),before);assert.ok(!before.includes('secret'));assert.equal(m.profile,null);
});
test('portal, sea, other continent and epoch cannot masquerade as a nearby ordinary land scene',()=>{
 for(const cause of ['portal','sea','continent','epoch']){const s=fixture();if(['portal','sea'].includes(cause))addRoute(s,'a0','a1',{mode:cause,duration:4});if(cause==='continent')s.areas.a1.continent='c9';if(cause==='epoch')s.areas.a1.era=10;assert.deepEqual(endView(s),[],cause);s.hero.transit={from:'a0',to:'a1',mode:cause==='portal'||cause==='sea'?cause:'road',total:20,remaining:10};assert.equal(transitLandscape(s).mix,null,cause);}
});
test('ordinary saved progress continuously blends source and target rather than selecting the destination immediately',()=>{
 const s=fixture();s.hero.transit={from:'a0',to:'a1',mode:'road',total:40,remaining:40};for(const progress of [0,.25,.5,.75,1]){s.hero.transit.remaining=40*(1-progress);const v=transitLandscape(s);assert.equal(v.mix.progress,progress);assert.equal(v.mix.from,s.areas.a0);assert.equal(v.mix.to,s.areas.a1);assert.equal(v.area.type,'road');assert.deepEqual(v.area.objects,[]);}assert.equal(blendColor('#000000','#ffffff',.5),'#808080');const a=scenery(s.seed,s.areas.a0),b=scenery(s.seed,s.areas.a1);assert.deepEqual(blendScenery(a,b,0).values,a.values);assert.deepEqual(blendScenery(a,b,1).values,b.values);assert.equal(blendScenery(a,b,.5).sunX,(a.sunX+b.sunX)/2);
});
test('an NPC observer uses canonical recorded departure, never the total inferred when that observer was first selected',()=>{
 const s=fixture();s.hero.transit={from:'a0',to:'a1',mode:'road',total:99,remaining:1,viewOnly:true};assert.equal(transitProgress(s),null);assert.equal(transitLandscape(s).mix,null);const j={version:1,movement:'timed',person:s.hero.lineage,from:'a0',to:'a1',reason:'Поездка',arrival:40,departedAt:0,duration:40};s.society.journeys.push(j);assert.equal(transitProgress(s),.5);s.hero.transit.total=2;s.hero.transit.remaining=2;assert.equal(transitProgress(s),.5);delete j.departedAt;assert.equal(transitProgress(s),null);
});
test('a genuine group transit uses the leaders actual saved time without giving the follower another action or clock',()=>{
 const s=fixture();s.hero.transit={from:'a0',to:'a1',mode:'road',remaining:99,total:99,viewOnly:true};s.actorStates.leader={lineage:'leader',alive:true,life:{ended:false},companions:[{person:s.hero.lineage}],transit:{from:'a0',to:'a1',mode:'road',remaining:10,total:50}};assert.equal(transitProgress(s),.8);const before=JSON.stringify(s);assert.equal(transitLandscape(s).mix.progress,.8);assert.equal(JSON.stringify(s),before);
});
test('repeated readers and exterior painters use bounded finite strokes without text, discovery, objects, RNG or save writes',()=>{
 const s=fixture(),before=JSON.stringify(s),calls=[],c=new Proxy({},{get:(target,k)=>k in target?target[k]:(...args)=>calls.push([k,...args]),set:(target,k,v)=>(target[k]=v,true)});for(let i=0;i<20;i++)paintBoundaryMotifs(c,endView(s),140);s.hero.transit={from:'a0',to:'a1',mode:'road',total:40,remaining:20};const during=JSON.stringify(s);paintTransitLandmarks(c,s,transitLandscape(s).mix,390,140);assert.equal(JSON.stringify(s),during);s.hero.transit=null;assert.equal(JSON.stringify(s),before);assert.equal(calls.some(([k])=>k==='fillText'),false);assert.ok(calls.length<500);for(const [, ...args]of calls)for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));
});
test('off retains the exact legacy destination view and preserves stored journey metadata',()=>{
 const s=fixture();s.hero.transit={from:'a0',to:'a1',mode:'road',total:40,remaining:20};s.rules['scene-boundaries']=false;const before=JSON.stringify(s);assert.deepEqual(endView(s),[]);assert.equal(transitLandscape(s).area.type,'village');assert.equal(transitLandscape(s).mix,null);assert.equal(JSON.stringify(s),before);
});
test('an actual society departure stores its own clock; first observing halfway cannot restart its visual journey',()=>{
 // The current hero's decisions can change which real resident departs. The
 // contract is the actual journey clock, not person-3's historical itinerary.
 const s=createWorld(4);setModule(s,'npc-travel',false);for(let i=0;i<154;i++)step(s);const j=s.society.journeys.find(j=>j.movement==='timed'&&j.departedAt===144&&j.arrival>s.tick);assert.ok(j);assert.equal(j.departedAt,144);assert.equal(j.duration,20);assert.equal(j.arrival,164);const tick=s.tick;assert.ok(observeExistingPerson(s,j.person));assert.equal(s.tick,tick);assert.equal(s.hero.transit.total,10);assert.equal(transitProgress(s),.5);assert.equal(transitLandscape(s).mix.progress,.5);assert.equal(actorSpatialAddress(s).physicalProgress,null);const copy=restore(serialize(s));assert.equal(transitProgress(copy),.5);for(let i=0;i<10;i++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));}assert.equal(s.hero.transit,null);assert.equal(s.people[j.person].area,j.to);
});
test('the enabled visual feature changes only its flag and new departure metadata, not any actual world decision, cost, RNG or arrival',()=>{
 const a=createWorld(4),b=createWorld(4);for(const s of [a,b])setModule(s,'npc-travel',false);setModule(b,'scene-boundaries',false);
 const mechanical=s=>{const v=JSON.parse(serialize(s));function walk(x){if(!x||typeof x!=='object')return;for(const [k,y]of Object.entries(x)){if((k==='rules'||k==='ruleFlags')&&y&&typeof y==='object')delete y['scene-boundaries'];else walk(y);}}walk(v);for(const j of v.society.journeys)if(j.movement==='timed'&&Number.isFinite(j.departedAt)&&j.arrival===j.departedAt+j.duration){delete j.departedAt;delete j.duration;}return JSON.stringify(v);};
 for(let i=0;i<180;i++){step(a);step(b);boundaryMotifs(a,a.areas[a.hero.area],{width:390});transitLandscape(a);assert.equal(mechanical(a),mechanical(b));}assert.deepEqual(a.randomStreams,b.randomStreams);assert.equal(a.rng,b.rng);
});
