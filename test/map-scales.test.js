import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore,step,knownRoute,createArea,connectAreas} from '../engine.js';
import {setModule} from '../rules.js';
import {RoadMapRenderer,roadMapModel,knownMapLayers} from '../road-map.js';
import {mapFixture} from '../scripts/map-scales-scenarios.mjs';
import {mapCanvas} from './fixtures/map-canvas.js';
import {syncActiveActor} from '../actor-projection.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {registerSpatialArea} from '../modules/spatial.js';
import {createGrate,observeGrate} from '../modules/mechanisms.js';
const renderer=()=>{const c=mapCanvas();return {...c,r:new RoadMapRenderer({createCanvas:c.createCanvas})};};

test('three scopes retain the exact same personal routes/fog/time while hierarchy changes only labels and presentation',()=>{
 const {s,h,area}=mapFixture(),raw=serialize(s),path=knownRoute(s,h.area,area('ruins').id),models=['overview','region','local'].map(scope=>roadMapModel(s,{scope}));
 for(const m of models){assert.deepEqual(m.nodes.map(n=>n.id),models[0].nodes.map(n=>n.id));assert.deepEqual(m.roads.map(r=>r.id),models[0].roads.map(r=>r.id));assert.equal(m.nodes.some(n=>n.id===area('island').id),false);}
 assert.ok(models[0].nodes.filter(n=>n.labelVisible).length<models[2].nodes.filter(n=>n.labelVisible).length);assert.equal(serialize(s),raw);assert.deepEqual(knownRoute(s,h.area,area('ruins').id),path);
});
test('automatic wilderness zoom has hysteresis measured in actual steps, not in redraw/update calls',()=>{
 const {s,h,area}=mapFixture(),{r}=renderer();connectAreas(s,h.area,area('hollow').id,{metric:{version:1,unit:'world',distance:6,terrain:'road',speed:6}});revealRoad(s,h.area,area('hollow').id);h.inventory.rations=0;h.x=100;h.goal={kind:'explore',area:area('ruins').id,x:30};for(const o of area('hollow').objects)if(o.kind==='enemy')o.alive=false;syncActiveActor(s);r.update(s);assert.equal(r.autoScope,'overview');
 step(s);assert.ok(h.transit?.metric);step(s);assert.equal(h.area,area('hollow').id);r.update(s);for(let n=0;n<5;n++)r.update(s);assert.equal(r.autoScope,'overview');step(s);r.update(s);assert.equal(r.autoScope,'local');
 h.goal={kind:'explore',area:area('mountain').id,x:30};let ticks=3;while(h.area!==area('crossroads').id&&ticks<11){step(s);ticks++;r.update(s);}assert.equal(h.area,area('crossroads').id);assert.equal(r.autoScope,'local');step(s);r.update(s);assert.equal(r.autoScope,'overview');assert.ok(s.tick<=12);
});
test('known surface/underground/past have separate fog/positions and connector stubs, never a false modern planar road',()=>{
 const {s,h,area}=mapFixture(),past=createArea(s,'road','Прежняя развилка',1,{continent:'c0',era:-25,timelineRoot:area('crossroads').id});connectAreas(s,h.area,past,{mode:'time',duration:4});revealArea(s,past);revealRoad(s,h.area,past);const raw=serialize(s),layers=knownMapLayers(s),under=layers.find(l=>l.realm==='underground'),old=layers.find(l=>l.era===-25),{r,ctx}=renderer();
 r.update(s);r.setView({inspect:true,scope:'region'});r.update(s);r.draw(ctx,320,200);r.pan(19,7);const offset={...r.offset};
 r.setView({layer:under.id});r.update(s);r.draw(ctx,320,200);assert.equal(r.marker,null);assert.equal(r.model.nodes.some(n=>n.layer!==under.id),false);assert.ok(r.model.connectors.some(c=>c.layer!==under.id));assert.ok(r.model.roads.every(road=>road.areas.every(id=>s.areas[id].spatial.layer===under.id)));
 r.setView({layer:old.id});r.update(s);r.draw(ctx,320,200);assert.deepEqual(r.model.nodes.map(n=>n.id),[past]);assert.equal(r.model.roads.length,0);assert.equal(r.model.connectors[0].kind,'time');
 r.setView({layer:'current'});r.update(s);assert.deepEqual(r.offset,offset);assert.equal(serialize(s),raw);assert.ok(r.views.size<=layers.length*3);
});
test('a short real stairs round trip and partial load is identical while map scales change; same entrance and no extra tick',()=>{
 const {s,h,area}=mapFixture(),from=area('hollow'),to=area('cave');for(const o of from.objects)if(o.kind==='enemy')o.alive=false;Object.assign(h,{area:from.id,x:100,goal:{kind:'explore',area:to.id,x:5},lastAction:'walk'});syncActiveActor(s);
 let copy=restore(serialize(s)),ticks=0;const {r,ctx}=renderer();r.update(s);
 while(h.area!==to.id&&ticks<6){step(s);step(copy);ticks++;r.setView({scope:['overview','region','local'][ticks%3],inspect:true});r.update(s);if(r.model)r.draw(ctx,320,200);assert.equal(serialize(s),serialize(copy));if(ticks===2)copy=restore(serialize(copy));}
 assert.equal(h.area,to.id);assert.equal(ticks,4);h.goal={kind:'explore',area:from.id,x:95};copy.hero.goal={...h.goal};
 while(h.area!==from.id&&ticks<12){step(s);step(copy);ticks++;r.update(s);if(r.model)r.draw(ctx,320,200);assert.equal(serialize(s),serialize(copy));}
 assert.equal(h.area,from.id);assert.equal(h.x,95);assert.equal(ticks,9);
});
test('a real closed grate and an empty known settlement do not become traversable or disappear through view changes',()=>{
 const {s,h,area}=mapFixture(),a=area('crossroads'),b=area('capital'),bypass=area('hollow');setModule(s,'mechanisms',true);h.x=91;h.personality.curiosity=.2;syncActiveActor(s);const grate=createGrate(s,a.id,b.id,bypass.id);assert.ok(grate);observeGrate(s,s.people[h.lineage],a.id,b.id);b.population=[];
 const path=knownRoute(s,a.id,b.id),raw=serialize(s),{r,ctx}=renderer();r.update(s);for(const scope of ['overview','region','local']){r.setView({scope,inspect:true});r.update(s);r.draw(ctx,320,200);assert.ok(r.model.nodes.some(n=>n.id===b.id));assert.equal(grate.state,'closed');assert.deepEqual(knownRoute(s,a.id,b.id),path);}assert.equal(serialize(s),raw);assert.ok(path.length>2);
});
test('warm canvas is reused, real geography revision invalidates it, and knowledge loss prunes foreign view positions',()=>{
 const {s,area}=mapFixture(),{r,ctx}=renderer();r.update(s);r.draw(ctx,320,200);const count=r.builds;for(let n=0;n<3;n++)r.draw(ctx,320,200);assert.equal(r.builds,count);
 s.geographyFrame.sites.crossroads.point.x+=2;s.geographyFrame.revision++;registerSpatialArea(s,area('crossroads'));r.update(s);r.draw(ctx,320,200);assert.ok(r.builds>count);
 const under=knownMapLayers(s).find(l=>l.realm==='underground');r.setView({inspect:true,layer:under.id});r.update(s);r.draw(ctx,320,200);r.setView({layer:'current'});r.update(s);assert.ok(r.views.size>0);s.hero.atlas.known=s.hero.atlas.known.filter(id=>s.areas[id].realm!=='underground');r.update(s);assert.equal([...r.views.values()].some(v=>v.knownLayer===under.id),false);
});
