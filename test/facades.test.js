import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {facadeLayout,initializeAreaFacades,initializeFacades} from '../facades.js';
import {houseProfile,scenery} from '../scenery.js';
import {workshopAt} from '../modules/property.js';
const overlaps=(a,b)=>Math.max(a.left,b.left)<Math.min(a.right,b.right)-1e-8&&Math.max(a.top,b.top)<Math.min(a.bottom,b.bottom)-1e-8;
test('full window frames, shutters, door jambs and porches fit narrow and wide facades without overlap at every positive scene scale',()=>{
 let samples=0,reduced=0;
 for(const width of [24,30,36,46,55,70,91,140])for(const floors of [1,2,3])for(const wanted of [0,1,2,3])for(const door of [-1,0,1])for(const porch of [false,true])for(const shutters of [false,true]){
  const p={width,floors,windows:wanted,door,porch,shutters},layout=facadeLayout(p),bounds={left:-width/2,right:width/2,top:-(floors*44+12),bottom:0};samples++;reduced+=layout.windows.length<wanted*floors;
  assert.ok(layout.door.left>=bounds.left+3-1e-8);assert.ok(layout.door.right<=bounds.right-3+1e-8);assert.ok(layout.windows.length<=wanted*floors);
  for(const w of layout.windows){assert.ok(w.bounds.left>=bounds.left+3-1e-8);assert.ok(w.bounds.right<=bounds.right-3+1e-8);assert.ok(w.bounds.top>=bounds.top);assert.ok(w.bounds.bottom<0);assert.equal(overlaps(w.bounds,layout.door),false);for(const other of layout.windows)if(other!==w)assert.equal(overlaps(w.bounds,other.bounds),false);
   for(const scale of [.45,.6,.85,1.2,2])assert.equal(overlaps(Object.fromEntries(Object.entries(w.bounds).map(([k,v])=>[k,v*scale])),Object.fromEntries(['left','right','top','bottom'].map(k=>[k,layout.door[k]*scale]))),false);
  }
  assert.deepEqual(facadeLayout(p),layout);
 }
 assert.equal(samples,1152);assert.ok(reduced>100);
});
test('canonical facade records preserve the existing source colors, size and identity across drawing inputs, repeated initialization and saving',()=>{
 const s=createWorld(0),before=serialize(s),rng=s.rng,streams=JSON.stringify(s.randomStreams);
 for(const a of Object.values(s.areas))for(const [i,saved]of(a.facades?.profiles||[]).entries()){const {id,facade,...source}=saved;assert.equal(id,`${a.id}-building-${i}`);assert.deepEqual(source,houseProfile(s.seed,a,i,scenery(s.seed,a)));assert.deepEqual(facade,facadeLayout(source));}
 initializeFacades(s);for(const a of Object.values(s.areas))initializeAreaFacades(s,a);assert.equal(serialize(s),before);assert.equal(s.rng,rng);assert.equal(JSON.stringify(s.randomStreams),streams);assert.equal(serialize(restore(before)),before);
});
test('current OFF construction retains its stored facade records through reload without generation or title grants',()=>{
 const s=createWorld(0,{rules:{facades:false}}),before=serialize(s),loaded=restore(before);assert.equal(serialize(loaded),before);assert.deepEqual(loaded.areas.a6.facades,s.areas.a6.facades);assert.equal(loaded.areas.a6.facades.profiles.length,3);assert.equal(loaded.rng,s.rng);assert.deepEqual(loaded.randomStreams,s.randomStreams);
});

test('a workshop keeps the same building profile through destruction and module switching; drawing layout never repairs or transfers it',()=>{
 const s=createWorld(0),a=s.areas.a6,o=workshopAt(s,a),saved=JSON.stringify(a.facades),owner=o.owner,gold=s.hero.gold;assert.equal(o.building,a.facades.profiles[1].id);
 o.state='burned';setModule(s,'facades',false);initializeFacades(s);initializeAreaFacades(s,a);assert.equal(JSON.stringify(a.facades),saved);assert.equal(o.owner,owner);assert.equal(o.state,'burned');assert.equal(s.hero.gold,gold);
 const loaded=restore(serialize(s));setModule(loaded,'facades',true);assert.equal(JSON.stringify(loaded.areas[a.id].facades),saved);assert.equal(loaded.areas[a.id].objects.find(p=>p.id===o.id).state,'burned');
});
test('normal area expansion and district creation save complete profiles before the next rendered visit without consuming an extra random stream',()=>{
 const s=createWorld(3);for(let i=0;i<1500&&s.hero.alive&&!s.hero.life.ended;i++)step(s);for(const a of Object.values(s.areas).filter(a=>a.district)){assert.ok(a.facades);const expected=a.district==='Жилой посад'?5:a.district==='Мастерские'?3:2;assert.ok(a.facades.profiles.length>=expected);assert.equal(new Set(a.facades.profiles.map(p=>p.id)).size,a.facades.profiles.length);}
 assert.equal(s.randomStreams.facades,undefined);const save=serialize(s);assert.equal(serialize(restore(save)),save);
});
