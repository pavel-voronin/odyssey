import test from 'node:test';
import assert from 'node:assert/strict';
import {paintPet,petShape,petPartyOffset} from '../pet-shapes.js';
import {recordSilhouette} from '../silhouette.js';
import {Scene} from '../scene.js';
import {createWorld,serialize,restore} from '../engine.js';
const shape=(id,pose={})=>recordSilhouette(c=>paintPet(c,id,pose));
const bounds=p=>({left:Math.min(...p.flat().map(v=>v[0])),right:Math.max(...p.flat().map(v=>v[0])),top:Math.min(...p.flat().map(v=>v[1])),bottom:Math.max(...p.flat().map(v=>v[1]))});
test('existing pet species IDs keep their species independently of nickname, UID and saved stats',()=>{
  const s=createWorld(17);s.hero.companions=['fox','owl','cat'].map((id,i)=>({id,uid:'existing-'+i,name:'одно имя',hp:7,maxHp:7,attack:0}));
  const before=serialize(s),loaded=restore(before);
  for(let i=0;i<3;i++){const c=loaded.hero.companions[i],copy=structuredClone(c);assert.equal(petShape(c),c.id);assert.equal(petShape({...c,uid:'other',name:'другое имя'}),c.id);for(let n=0;n<100;n++)shape(petShape(c));assert.deepEqual(c,copy);}
  assert.equal(serialize(s),before);assert.equal(petShape({id:'dog'}),null);assert.equal(petShape({id:'moth'}),null);assert.equal(petShape({id:'unknown'}),null);
});
test('unlabelled contours distinguish the broad fox brush, tall compact owl and high curved cat tail',()=>{
  const fox=shape('fox'),owl=shape('owl'),cat=shape('cat'),f=bounds(fox.polygons),o=bounds(owl.polygons),c=bounds(cat.polygons);
  assert.ok(f.left<=-34&&f.right>=27);assert.ok(o.top<=-34&&o.right-o.left<26);assert.ok(c.left<-18&&c.top<-28);assert.equal(f.bottom,0);assert.equal(o.bottom,0);assert.equal(c.bottom,0);
  for(const v of[fox,owl,cat]){assert.ok(v.polygons.flat(2).every(Number.isFinite));assert.ok(v.polygons.length<100);assert.ok(v.commands.every(command=>command[0]!=='fillText'));}
  assert.notDeepEqual(fox.polygons,owl.polygons);assert.notDeepEqual(cat.polygons,fox.polygons);
  const party=['fox','owl','cat','dog'].map(id=>({id}));assert.deepEqual(party.map((_,i)=>petPartyOffset(party,i)),[48,98,136,178]);assert.equal(petPartyOffset([{id:'dog'},{role:'person'}],1),43);
});
test('rest keeps every species recognisable and supported; hurt changes color without changing geometry',()=>{
  for(const id of['fox','owl','cat']){const normal=shape(id),rest=shape(id,{rest:true}),hurt=shape(id,{hurt:true});assert.equal(bounds(rest.polygons).bottom,0);assert.ok(bounds(rest.polygons).top< -18);assert.deepEqual(normal.polygons,hurt.polygons);assert.notDeepEqual(normal.commands,hurt.commands);}
});
test('actual scene pet wrapper reuses bounded geometry, mirrors its shared shadow once and leaves the save pure',()=>{
  const scene=Object.create(Scene.prototype),s=createWorld(17),before=serialize(s),shadows=[];let fallback=0;
  scene.state=s;scene.camera={a:1,b:0,c:0,d:1,e:0,f:0};scene.pixelRatio=1;scene.ctx=new Proxy({getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
  scene.castContourShadow=(polygons,anchor)=>shadows.push({polygons,anchor});scene.castShadow=()=>fallback++;
  for(let n=0;n<100;n++)for(const id of['fox','owl','cat'])scene.pet(100,150,id,n%2?-1:1,Boolean(n%3),Boolean(n%5));
  assert.equal(scene.petSilhouetteCache.size,12);assert.equal(serialize(s),before);assert.equal(fallback,0);assert.ok(shadows.every(x=>x.polygons.flat(2).every(Number.isFinite)));
  scene.pet(100,150,'fox',1);const right=shadows.at(-1);scene.pet(100,150,'fox',-1);const left=shadows.at(-1);assert.equal(bounds(right.polygons).left,100-34);assert.equal(bounds(left.polygons).right,100+34);
  s.rules['creature-motion']=false;scene.pet(100,150,'owl');assert.ok(shadows.at(-1).polygons.length>0);s.rules['contour-shadows']=false;scene.pet(100,150,'cat');assert.equal(fallback,1);
});
