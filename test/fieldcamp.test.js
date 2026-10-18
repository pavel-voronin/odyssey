import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {calendar,DAY_TICKS,LIGHT_TICKS} from '../calendar.js';

function tiredTraveller(){
  const s=createWorld(1),h=s.hero;
  for(const id of ['body','stories','caravans','faction-paths','events','people'])setModule(s,id,false);
  h.area='a0';h.x=24;h.goal=null;h.energy=12;h.hp=h.maxHp;h.hunger=0;
  return s;
}
test('a traveller pitches a real camp, restores through real ticks and returns to the same position without discovery rewards',()=>{
  const s=tiredTraveller(),h=s.hero,xp=h.xp,known=[...h.memory.places];
  step(s);assert.equal(h.goal.kind,'campPitch');
  const b=restore(serialize(s));
  for(let i=0;i<2;i++){step(s);step(b);assert.equal(serialize(restore(serialize(s))),serialize(s));}
  assert.equal(serialize(s),serialize(b));
  const camp=s.areas[h.area];assert.ok(camp.temporaryCamp);assert.equal(camp.forage.stock,0);assert.equal(camp.forage.max,0);
  assert.equal(h.xp,xp);assert.deepEqual(h.memory.places,known);assert.equal(camp.objects.length,1);
  for(let i=0;i<30&&h.area===camp.id;i++)step(s);
  assert.equal(h.area,'a0');assert.equal(h.x,24);assert.ok(h.energy>=95);assert.equal(h.counters.camps,1);
  const count=s.nextArea;h.energy=12;h.goal=null;
  for(let i=0;i<3;i++)step(s);
  assert.equal(s.nextArea,count);assert.equal(h.area,camp.id);
});
test('nearby enemies prevent pitching; disabling a camp does not strand its inhabitant',()=>{
  const s=tiredTraveller(),h=s.hero;
  s.areas.a0.objects.push({id:'close-threat',kind:'enemy',name:'Страж',x:25,hp:100,maxHp:100,attack:5,alive:true});
  step(s);assert.notEqual(h.goal?.kind,'campPitch');assert.ok(!s.areas.a0.fieldCamp);
  const a=tiredTraveller();for(let i=0;i<3;i++)step(a);
  const id=a.hero.area;setModule(a,'fieldcamp',false);a.hero.goal=null;step(a);
  // Saved physical camp geometry remains real even with pitching disabled.
  for(let i=0;i<12&&a.hero.area===id;i++)step(a);
  assert.equal(a.hero.area,'a0');assert.equal(a.areas[id].temporaryCamp.parent,'a0');
});
test('daylight lasts two hundred ticks and the shorter night forty',()=>{
  assert.equal(DAY_TICKS,240);assert.equal(LIGHT_TICKS,200);
  assert.equal(calendar(199).phase,'Вечер');assert.equal(calendar(200).night,true);
  assert.deepEqual(calendar(240),{day:2,night:false,phase:'Утро'});
});
