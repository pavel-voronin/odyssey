import test from 'node:test';
import assert from 'node:assert/strict';
import {walkPose} from '../motion.js';
import {houseProfile} from '../scenery.js';
import {heroAppearance} from '../appearance.js';
import {createWorld,serialize} from '../engine.js';
test('a walking cycle keeps a foot planted, lifts the other without crossing the ground, and repeats continuously',()=>{
  for(let i=0;i<=100;i++){
    const p=walkPose(i/100,20);assert.ok(p.feet.some(f=>Math.abs(f.y)<1e-8));assert.ok(p.feet.every(f=>f.y<=0&&Number.isFinite(f.x)));
    assert.ok(p.bodyY>=-1.21&&p.bodyY<=0);
  }
  assert.deepEqual(walkPose(0),walkPose(1));assert.notDeepEqual(walkPose(.2),walkPose(.7));
});
test('houses combine structural details deterministically without consuming world randomness',()=>{
  const s=createWorld(0),a=s.areas.a1,before=serialize(s),profiles=Array.from({length:100},(_,i)=>houseProfile(s.seed,a,i));
  assert.equal(new Set(profiles.map(p=>p.roof)).size,4);assert.equal(new Set(profiles.map(p=>p.material)).size,3);assert.equal(new Set(profiles.map(p=>p.floors)).size,2);
  assert.ok(new Set(profiles.map(p=>JSON.stringify(p))).size>95);assert.deepEqual(profiles[0],houseProfile(s.seed,a,0));assert.equal(serialize(s),before);
});
test('a new hero starts simply and actual armor, weapon and carried supplies change the visible equipment',()=>{
  const s=createWorld(0),h=s.hero;h.level=1;h.career.rank=1;h.bag=[];h.inventory.rations=0;h.equipment={weapon:null,armor:null,charm:null};const before=serialize(s),first=heroAppearance(s);
  assert.equal(first.coat,'tunic');assert.equal(first.hat,'none');assert.equal(first.scarf,false);assert.equal(serialize(s),before);
  h.equipment.armor={base:'mail',name:'Переименованная память',slot:'armor'};h.equipment.weapon={base:'axe',name:'Дедушкин довод',slot:'weapon'};h.inventory.rations=9;
  const later=heroAppearance(s);assert.equal(later.armored,true);assert.equal(later.prop,'axe');assert.ok(later.packSize>first.packSize);
});
