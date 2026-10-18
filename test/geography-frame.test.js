import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,route,step,createNextStory} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {insideLand,currentGeography} from '../modules/geography-anchor.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {spatialAddress,spatialPassage} from '../modules/spatial.js';
import {addRoute} from '../modules/travel.js';
import {createGeographyFrame} from '../modules/geography-frame.js';
import {syncActiveActor} from '../actor-projection.js';
const selected=['geography-frame','districts','people','origins','birthplaces','travel'];
const world=seed=>createWorld(seed,{rules:Object.fromEntries(MODULES.map(m=>[m.id,selected.includes(m.id)]))});
const site=(s,key)=>s.areas[s.geographyFrame.sites[key].area];
const physical=s=>JSON.stringify({frame:s.geographyFrame,people:s.people,areas:Object.fromEntries(Object.entries(s.areas).map(([id,a])=>[id,Object.fromEntries(Object.entries(a).filter(([k])=>!['visited','discovered','visits'].includes(k)))]))});
test('two fixed seeds have bounded land/country/settlement frames before observation; discovery order does not create stock or people',()=>{
 for(const seed of [0,1]){const a=world(seed),b=restore(serialize(a)),f=a.geographyFrame,keys=Object.keys(f.sites);assert.equal(keys.length,20);assert.equal(Object.keys(f.landmasses).length,2);assert.equal(f.created,0);assert.ok(Object.keys(a.areas).length<64);assert.ok(a.hero.atlas.known.length<keys.length);
  const before=physical(a),people=a.nextPerson,areas=a.nextArea;for(const key of keys)revealArea(a,f.sites[key].area);for(const key of [...keys].reverse())revealArea(b,f.sites[key].area);assert.equal(physical(a),before);assert.equal(physical(b),before);assert.equal(a.nextPerson,people);assert.equal(a.nextArea,areas);assert.deepEqual(Object.keys(f.countries['country-0']).sort(),['capital','id','landmass','name']);
 }
});
test('land scenes and their local endpoints stay on their own land; only real sea edges cross the strait',()=>{
 const s=world(1),f=s.geographyFrame;for(const p of Object.values(f.sites)){
  const a=s.areas[p.area];assert.ok(route(s,site(s,'crossroads').id,a.id).length);if(p.realm!=='surface'||p.type==='sea')continue;
  for(const x of [0,100]){const address=spatialAddress(s,a.id,x);assert.equal(address.status,'known');assert.equal(insideLand(address.point,f.landmasses[p.landmass].polygon),true);}
 }
 const west=site(s,'port-west'),sea=site(s,'strait'),east=site(s,'port-east');assert.equal(west.type,'port');assert.equal(east.type,'port');assert.equal(Object.values(f.landmasses).some(l=>insideLand(f.sites.strait.point,l.polygon)),false);
 for(const [a,b]of [[west,sea],[sea,east]]){const key=[a.id,b.id].sort().join('|');assert.equal(s.edges[key].mode,'sea');assert.equal(spatialPassage(s,key).kind,'sea');assert.ok(s.edges[key].duration>0);assert.ok(s.edges[key].cost>0);}
 const paths=f.roads.filter(r=>r.from==='crossroads'||r.to==='crossroads');assert.ok(paths.length>=2);assert.equal(site(s,'center').district,'Районный центр');assert.equal(site(s,'village-west').district,'Деревня');assert.equal(site(s,'capital').districts.length,4);
 for(const path of [['crossroads','village-west','center'],['crossroads','hollow','village-east','center']])for(let i=1;i<path.length;i++){const a=site(s,path[i-1]),b=site(s,path[i]);assert.equal(s.edges[[a.id,b.id].sort().join('|')].mode,'road');}
});
test('one real sea passage pays once, takes its actual finite ticks and survives a partial save prefix',()=>{
 const s=world(1),h=s.hero,from=site(s,'port-west'),to=site(s,'strait');Object.assign(h,{area:from.id,x:100,gold:20,energy:100,hunger:0,hp:h.maxHp,goal:{kind:'explore',area:to.id,x:5,started:s.tick},combat:null,companions:[],conditions:[],quests:[]});h.stories.active=null;h.destiny.completed=true;revealArea(s,from);revealArea(s,to);revealRoad(s,from.id,to.id);syncActiveActor(s);
 // One fixed calm voyage branch; unrelated treasure/storm variants are not swept.
 s.randomStreams.voyages=1000;const gold=h.gold;step(s);assert.ok(h.transit);assert.equal(h.transit.mode,'sea');const paid=h.gold;assert.ok(paid<gold);const copy=restore(serialize(s));let ticks=1;while(h.transit&&ticks<12){step(s);step(copy);ticks++;assert.equal(serialize(copy),serialize(s));}
 assert.equal(h.area,to.id);assert.equal(h.transit,null);assert.equal(h.gold,paid);assert.equal(ticks,7);assert.equal(s.geographyFrame.created,0);
});
test('new observation cannot rebuild geography or reveal all land; a current edge writer changes the real passage revision',()=>{
 const s=world(0),frame=JSON.stringify(s.geographyFrame),n=s.nextArea,people=s.nextPerson;assert.equal(createNextStory(s,{allowLiving:true}),true);assert.equal(JSON.stringify(s.geographyFrame),frame);assert.equal(s.nextArea,n);assert.ok(s.nextPerson>=people);assert.ok(s.hero.atlas.known.length<20);
 const a=site(s,'port-west'),b=site(s,'strait'),key=[a.id,b.id].sort().join('|'),revision=s.edges[key].spatial.revision;addRoute(s,a.id,b.id,{duration:7});assert.ok(s.edges[key].spatial.revision>revision);assert.equal(spatialPassage(s,key).duration,7);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('old absent frames remain schematic on ON/restore; corrupt coast or disconnected layout is rejected',()=>{
 const old=createWorld(0,{rules:Object.fromEntries(MODULES.map(m=>[m.id,false]))}),raw=serialize(old),anchor=JSON.stringify(old.areas.a0.spatial.anchor);setModule(old,'geography-frame',true);assert.equal(old.geographyFrame,undefined);assert.equal(JSON.stringify(old.areas.a0.spatial.anchor),anchor);const loaded=restore(serialize(old));assert.equal(loaded.geographyFrame,undefined);assert.equal(serialize(restore(raw)),raw);assert.equal(currentGeography(old),null);
 createGeographyFrame(old,{}, {addArea:()=>assert.fail('retroactive constructor')});assert.equal(old.geographyFrame,undefined);
 const s=world(1),bad=JSON.parse(serialize(s));bad.geographyFrame.sites['port-west'].point.x=365;assert.throws(()=>restore(JSON.stringify(bad)),/geographyFrame/);
 const missing=JSON.parse(serialize(s));missing.geographyFrame.roads=missing.geographyFrame.roads.filter(r=>r.from!=='strait'&&r.to!=='strait');assert.throws(()=>restore(JSON.stringify(missing)),/geographyFrame/);
});
