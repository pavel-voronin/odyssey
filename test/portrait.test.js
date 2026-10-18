import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore} from '../engine.js';
import {portraitModel,drawHeroPortrait} from '../portrait.js';
import {heroAppearance} from '../appearance.js';

test('a portrait reads the same face as the scene, stays stable across places and saves, and changes for another life',()=>{
  const faces=new Set();
  for(let seed=0;seed<24;seed++){
    const s=createWorld(seed),before=serialize(s),model=portraitModel(s),look=heroAppearance(s);
    for(const key of Object.keys(model.look))assert.equal(model.look[key],look[key]);
    faces.add(JSON.stringify(model));assert.deepEqual(portraitModel(restore(before)),model);assert.equal(serialize(s),before);
    s.hero.area='a1';assert.deepEqual(portraitModel(s),model);
  }
  assert.ok(faces.size>20);
});
test('the same portrait responds to actual headwear and death, without creating injuries or a level glyph',()=>{
  const s=createWorld(2),h=s.hero;h.level=5;const base=portraitModel(s);
  h.affiliation.primary='tide';h.affiliation.paths.tide={rank:4,suspended:false};assert.equal(portraitModel(s).look.hat,'brim');
  h.affiliation.paths.tide.suspended=true;assert.deepEqual(portraitModel(s),base);
  h.alive=false;assert.equal(portraitModel(s).alive,false);assert.deepEqual(portraitModel(s).look,base.look);
  const before=serialize(s),ops=[];const ctx=new Proxy({}, {get:(_,key)=>()=>ops.push(key)}),attributes={};
  const canvas={getContext:()=>ctx,setAttribute:(key,value)=>attributes[key]=value,classList:{toggle(){}}};
  drawHeroPortrait(canvas,s);const count=ops.length;assert.ok(count>10);drawHeroPortrait(canvas,s);assert.equal(ops.length,count);
  assert.ok(attributes['aria-label'].includes(h.name));assert.ok(attributes['aria-label'].includes('завершена'));assert.equal(serialize(s),before);
});
