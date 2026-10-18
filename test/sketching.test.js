import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {campConversation} from '../modules/camp-life.js';
import {sketchCamp} from '../modules/sketching.js';
function artist(){
  const s=createWorld(3),h=s.hero;
  for(const id of ['body','stories','caravans','faction-paths','events','people'])setModule(s,id,false);
  h.area='a0';h.x=24;h.energy=12;h.hp=h.maxHp;h.hunger=0;h.magic.mana=h.magic.maxMana;h.goal=null;
  if(!h.memory.places.includes('a0'))h.memory.places.push('a0');
  for(let i=0;i<3;i++)step(s);assert.ok(s.areas[h.area].temporaryCamp);assert.equal(h.sketchbook.interest,true);
  for(let i=0;i<12&&Math.abs(h.x-68)>1;i++)step(s);assert.ok(Math.abs(h.x-68)<=1);
  h.energy=60;h.mind.stress=20;h.mind.lastArea=h.area;return {s,h,b:h.sketchbook,camp:h.area};
}
test('only some adult travellers carry a finite sketchbook; missing current sketchbook is refused',()=>{
  let artists=0;for(let seed=0;seed<100;seed++){const s=createWorld(seed);artists+=s.hero.sketchbook.interest;assert.equal(s.hero.sketchbook.paper,s.hero.sketchbook.interest?3:0);assert.equal(serialize(restore(serialize(s))),serialize(s));}
  assert.ok(artists>3&&artists<40);
  const s=createWorld(3);delete s.hero.sketchbook;const old=serialize(s);assert.throws(()=>restore(old),/sketchbook/);assert.equal(serialize(s),old);
});
test('one sheet and three real actions produce one known-place record and practice, without money, experience or map revelation',()=>{
  const {s,h,b}=artist(),xp=h.xp,gold=h.gold,known=[...h.memory.places];
  step(s);assert.equal(h.lastAction,'work');assert.equal(b.paper,2);assert.equal(b.pending.remaining,2);assert.equal(b.practice,0);
  step(s);assert.equal(b.paper,2);assert.equal(b.pending.remaining,1);step(s);
  assert.equal(b.pending,null);assert.equal(b.practice,1);assert.equal(b.works.a0.name,s.areas.a0.name);assert.equal(b.works.a0.material,'Лист дорожного блокнота');assert.equal(b.works.a0.quality,1);
  assert.equal(h.xp,xp);assert.equal(h.gold,gold);assert.deepEqual(h.memory.places,known);assert.ok(h.mind.stress<20);
  h.counters.camps++;assert.equal(sketchCamp(s,{log(){}}),false);assert.equal(b.paper,2);assert.equal(b.practice,1);
});
test('no material, no interest or an unknown subject leads to ordinary rest rather than a search loop',()=>{
  for(const kind of ['paper','interest','unknown']){
    const {s,h,b}=artist();if(kind==='paper')b.paper=0;if(kind==='interest')b.interest=false;if(kind==='unknown')h.memory.places=[];
    const paper=b.paper;step(s);assert.equal(h.lastAction,'rest');assert.equal(b.paper,paper);assert.equal(b.pending,null);assert.equal(b.practice,0);
  }
});
test('an alarm ruins the started sheet; disabling mid-work pauses it, and loading cannot spend it a second time',()=>{
  const alarm=artist();step(alarm.s);const enemy=structuredClone(alarm.s.areas.a2.objects.find(o=>o.kind==='enemy'));enemy.id='camp-alarm';enemy.attack=1;alarm.s.areas[alarm.h.area].objects.push(enemy);alarm.h.combat=enemy.id;
  step(alarm.s);assert.equal(alarm.b.pending,null);assert.equal(alarm.b.paper,2);assert.equal(alarm.b.practice,0);assert.deepEqual(alarm.b.works,{});
  const {s,h,b}=artist();step(s);setModule(s,'sketching',false);const pending=JSON.stringify(b.pending);step(s);assert.equal(JSON.stringify(b.pending),pending);assert.equal(b.paper,2);
  setModule(s,'sketching',true);const loaded=restore(serialize(s));for(let i=0;i<3;i++){step(s);step(loaded);assert.equal(serialize(s),serialize(loaded));}assert.equal(b.practice,1);assert.equal(b.paper,2);
  const legacy=artist();delete legacy.h.counters.camps;step(legacy.s);assert.equal(legacy.b.paper,2);
  const oldLoaded=restore(serialize(legacy.s));for(let i=0;i<2;i++){step(legacy.s);step(oldLoaded);assert.equal(serialize(legacy.s),serialize(oldLoaded));}assert.equal(legacy.b.practice,1);assert.equal(legacy.b.paper,2);
});
test('a meaningful conversation and a drawing compete for the same camp activity slot',()=>{
  const {s,h,b}=artist(),p=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage);p.area=h.area;p.status='withHero';p.needs.energy=100;p.needs.sleeping=false;
  h.companions=[{person:p.id,hp:30,maxHp:30,loyalty:60,ethics:1}];h.relations[p.id]={trust:10};h.quests=[{id:'known-rescue',kind:'rescue',person:p.id,rescued:true,status:'done'}];
  assert.equal(campConversation(s,{log(){}}),true);assert.equal(sketchCamp(s,{log(){}}),false);assert.equal(b.paper,3);assert.equal(b.pending,null);
});
