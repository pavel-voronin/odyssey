import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {initializeAge,observedAge,personAge,ageLabel} from '../modules/age.js';
import {YEAR_TICKS} from '../calendar.js';

test('adult observation begins at varied fixed ages without spending simulation randomness',()=>{
  const ages=new Set();
  for(let seed=0;seed<32;seed++){
    const s=createWorld(seed),h=s.hero,p=s.people[h.lineage],before=serialize(s);
    assert.ok(h.startAge>=3);assert.equal(observedAge(h,s.tick),personAge(s,p));ages.add(h.startAge);
    initializeAge(s,h);assert.equal(serialize(s),before);
    assert.equal(serialize(restore(before)),before);
  }
  assert.ok(ages.size>15);
});
test('missing current age metadata is refused without reconstructing a birth or changing the source',()=>{
  const s=createWorld(3),h=s.hero;delete h.startAge;delete s.people[h.lineage].ageOrigin;
  const text=serialize(s);assert.throws(()=>restore(text),/startAge|ageOrigin/);assert.equal(serialize(s),text);
});
test('a shared eighty-day year ages the same person; death and archived history freeze their own age',()=>{
  const s=createWorld(4),h=s.hero,p=s.people[h.lineage],start=h.startAge;
  s.tick=h.born+YEAR_TICKS-1;assert.equal(observedAge(h,s.tick),start);assert.equal(personAge(s,p),start);
  s.tick++;assert.equal(observedAge(h,s.tick),start+1);assert.equal(personAge(s,p),start+1);
  s.tick+=15;h.hp=1;h.inventory.potions=0;h.inventory.herbs=0;h.conditions=[{id:'poison',since:s.tick,until:s.tick+100}];setModule(s,'body',true);setModule(s,'magic',false);step(s);assert.equal(h.alive,false);
  const snapshot=JSON.stringify(s.lives[0]);s.tick+=YEAR_TICKS;
  assert.equal(observedAge(s.lives[0],s.lives[0].ended),start+1);assert.equal(personAge(s,p),start+1);assert.equal(JSON.stringify(s.lives[0]),snapshot);assert.equal(observedAge(h,s.tick),start+1);
  assert.equal(ageLabel(21),'21 год');assert.equal(ageLabel(24),'24 года');assert.equal(ageLabel(114),'114 лет');
});
