import test from 'node:test';
import assert from 'node:assert/strict';
import {appearance} from '../appearance.js';
import {scenery} from '../scenery.js';
import {createWorld,serialize,restore} from '../engine.js';
test('portrait generation distinguishes people and preserves inherited appearance without consuming simulation RNG',()=>{
  const s=createWorld(1),before=serialize(s),p=s.people[s.hero.lineage];
  assert.deepEqual(appearance(s.seed,p,s.hero.appearance),appearance(s.seed,restore(before).people[p.id],s.hero.appearance));
  const variants=Array.from({length:100},(_,i)=>appearance(s.seed,{id:'person-'+i}));
  assert.equal(new Set(variants.map(v=>JSON.stringify(v))).size,100);
  assert.equal(new Set(variants.map(v=>v.hairStyle)).size,6);assert.equal(new Set(variants.map(v=>v.hat)).size,4);
  assert.ok(variants.some(v=>v.glasses)&&variants.some(v=>v.earring));
  const old={hair:'#123456',cloak:'#abcdef',mark:'шрам'},look=appearance(s.seed,p,old);assert.equal(look.hair,old.hair);assert.equal(look.cloak,old.cloak);assert.equal(look.mark,old.mark);
  const scholar=appearance(1,{id:'same-person',profession:'scholar'}),smith=appearance(1,{id:'same-person',profession:'smith'});
  assert.equal(scholar.prop,'book');assert.equal(smith.prop,'hammer');assert.deepEqual({...scholar,prop:null},{...smith,prop:null});
  assert.equal(serialize(s),before);
});
test('district architecture follows actual district services while each area has its own deterministic landscape',()=>{
  const s=createWorld(0),a=s.areas.a1,before=serialize(s);
  const districts=['Площадь','Торговые ряды','Мастерские','Жилой посад'].map(district=>scenery(s.seed,{...a,district}));
  assert.deepEqual(districts.map(d=>d.district),['square','market','workshop','homes']);
  assert.deepEqual(scenery(s.seed,a),scenery(s.seed,restore(before).areas[a.id]));
  assert.notDeepEqual(scenery(s.seed,a),scenery(s.seed,{...a,id:'elsewhere'}));
  assert.equal(scenery(s.seed,a,false).district,null);assert.equal(serialize(s),before);
});
