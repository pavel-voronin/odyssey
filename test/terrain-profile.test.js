import test from 'node:test';import assert from 'node:assert/strict';
import {BIOMES} from '../content.js';
import {terrainProfile,terrainRidge,paintTerrainBackdrop,facadeSmoke,TERRAIN_FAMILIES} from '../terrain-profile.js';
import {scenery} from '../scenery.js';
import {ruinedSilhouette} from '../building-ruins-view.js';

test('the finite biome catalogue maps to eight families, with a neutral unknown and live camp parent',()=>{
 assert.deepEqual(Object.keys(TERRAIN_FAMILIES).sort(),Object.keys(BIOMES).sort());assert.equal(new Set(Object.values(TERRAIN_FAMILIES)).size,8);
 const parent={id:'parent',type:'desert',objects:[]},camp={id:'camp',type:'camp',temporaryCamp:{parent:'parent'}},s={areas:{parent,camp}};
 assert.equal(terrainProfile(s,camp).type,'desert');parent.type='forest';assert.equal(terrainProfile(s,camp).family,'forest');
 assert.equal(terrainProfile(s,{type:'unrecognised'}).family,'open');assert.equal(terrainProfile(s,{type:'unrecognised'}).trees,0);
});
test('eight static representatives and repeat entry preserve state, route space, finite strokes and RNG',()=>{
 const calls=[],c=new Proxy({},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 for(const type of ['road','forest','desert','island','sea','citadel','undercity','clockwork']){
  const a={id:'local',name:'Local',type,objects:[],length:100,links:[]},s={rng:91,tick:3,areas:{local:a},hero:{atlas:{known:['local'],roads:[]}}},raw=JSON.stringify(s),p=terrainProfile(s,a),view=scenery(7,a);
  for(let entry=0;entry<2;entry++){
   assert.deepEqual(terrainProfile(s,a),p);paintTerrainBackdrop(c,p,320,119,['#334455','#556677','#778899','#223344']);
   for(const x of [0,80,160,240,320])assert.ok(Number.isFinite(terrainRidge(p,x,1,view)));
  }
  assert.equal(JSON.stringify(s),raw);assert.equal(p.pier,type==='port');assert.ok(p.trees<=7);
 }
 for(const [kind,...args]of calls){assert.notEqual(kind,'fillText');for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));}
 assert.ok(calls.length<400);
 // No tall decoration extends down to the actor line. Supports stop 13px behind it.
 const supports=calls.filter(([kind,,,w,h])=>kind==='fillRect'&&w===16&&h>30);assert.equal(supports.length,4);for(const [,x,y,w,h]of supports)assert.equal(y+h,106);
});
test('coast and relief distinguish shore, actual port and sea without inventing a pier or rocky dunes',()=>{
 const s={areas:{}};assert.equal(terrainProfile(s,{type:'port'}).pier,true);assert.equal(terrainProfile(s,{type:'island'}).pier,false);assert.equal(terrainProfile(s,{type:'sea'}).shore,false);
 const view=scenery(3,{id:'a',name:'',type:'desert'}),d=terrainProfile(s,{type:'desert'}),m=terrainProfile(s,{type:'mountain'});
 assert.equal(d.relief,'dune');assert.equal(m.relief,'ledge');assert.notEqual(terrainRidge(d,80,0,view),terrainRidge(m,80,0,view));
 assert.equal(terrainProfile(s,{type:'dream'}).motif,null);assert.equal(terrainProfile(s,{type:'clockwork'}).motif,null);
});
test('two prepared workshop conditions retain the same ID, draw surviving structure and suppress extinguished smoke',()=>{
 const p={id:'workshop',smoke:true,roof:'gable',chimney:true,structure:{roof:1,walls:1,history:[{kind:'fire'}]}},o={kind:'workshop',building:p.id,state:'burned'},a={objects:[o]},s={areas:{a}};
 const ruined=ruinedSilhouette(p,60,56,24);assert.equal(facadeSmoke(s,a,p),false);assert.equal(p.id,o.building);
 o.state='intact';p.structure.roof=3;p.structure.walls=3;p.structure.history.push({kind:'repair'});assert.equal(facadeSmoke(s,a,p),true);assert.notDeepEqual(ruinedSilhouette(p,60,56,24),ruined);assert.equal(p.id,'workshop');
});
