import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {smokeCamp,smokingEffect,smokeRestEnergy} from '../modules/smoking.js';
import {activeEffects} from '../status.js';
const ctx={log(){}};
function smoker(){
  const s=createWorld(3),h=s.hero;
  for(const id of ['body','stories','caravans','faction-paths','events','people','sketching'])setModule(s,id,false);
  h.area='a0';h.x=24;h.energy=12;h.hp=h.maxHp;h.hunger=0;h.magic.mana=h.magic.maxMana;h.goal=null;
  for(let i=0;i<3;i++)step(s);assert.ok(s.areas[h.area].temporaryCamp);
  for(let i=0;i<12&&Math.abs(h.x-68)>1;i++)step(s);assert.ok(Math.abs(h.x-68)<=1);
  setModule(s,'body',true);h.energy=60;h.habits=[];h.conditions=[];h.mind.stress=35;h.mind.lastArea=h.area;
  h.smoking={habit:true,tobacco:3,uses:0,lastUse:null,affectedUntil:0};return {s,h,p:h.smoking};
}
test('pipe habits remain individually rare and fixed; missing current habit state is refused without manufacturing tobacco',()=>{
  let count=0;
  for(let seed=0;seed<1000;seed++){
    const s=createWorld(seed),p=s.hero.smoking;count+=p.habit;assert.equal(p.tobacco,p.habit?3:0);
    if(['automaton','revenant','myconid'].includes(s.hero.race))assert.equal(p.habit,false);
    if(seed%100===0)assert.equal(serialize(restore(serialize(s))),serialize(s));
  }
  assert.ok(count>=20&&count<=90,`habits ${count}/1000`);
  const s=createWorld(2);delete s.hero.smoking;const old=serialize(s);assert.throws(()=>restore(old),/smoking/);assert.equal(serialize(s),old);
});
test('a real puff costs tobacco, time and energy, calms stress, then makes an actual resting tick restore nine rather than twelve',()=>{
  const {s,h,p}=smoker(),hp=h.hp;step(s);
  assert.equal(p.tobacco,2);assert.equal(p.uses,1);assert.equal(h.energy,58);assert.equal(h.hp,hp);assert.equal(h.mind.stress,23);
  assert.equal(smokingEffect(s).phase,'fresh');assert.equal(activeEffects(s).find(e=>e.id==='smoking:aftereffect').phase,'fresh');
  const off=restore(serialize(s));setModule(off,'smoking',false);const energy=h.energy;step(s);step(off);
  assert.equal(h.energy-energy,9);assert.equal(off.hero.energy-energy,12);assert.equal(p.tobacco,2);assert.equal(smokingEffect(s).phase,'settled');
  assert.equal(smokingEffect(off),null);assert.equal(off.hero.smoking.uses,1);
});
test('food, wounds, exhaustion, low stress or no supply prevent smoking without searching or changing state',()=>{
  for(const kind of ['hungry','wounded','tired','calm','empty','off','body','psychology']){
    const {s,h,p}=smoker();if(kind==='hungry')h.hunger=70;if(kind==='wounded')h.hp=h.maxHp*.5;if(kind==='tired')h.energy=30;if(kind==='calm')h.mind.stress=5;if(kind==='empty')p.tobacco=0;
    if(kind==='off')setModule(s,'smoking',false);if(['body','psychology'].includes(kind))setModule(s,kind,false);
    const before=serialize(s);assert.equal(smokeCamp(s,ctx),false,kind);assert.equal(serialize(s),before);
  }
});
test('cooldown, finite supplies, optional effect visibility and exact expiry survive replay without a second charge',()=>{
  const {s,h,p}=smoker();step(s);h.counters.camps++;h.mind.stress=35;assert.equal(smokeCamp(s,ctx),false);assert.equal(p.tobacco,2);
  const until=p.affectedUntil;s.tick=until-1;assert.ok(smokingEffect(s));s.tick=until;assert.equal(smokingEffect(s),null);assert.equal(smokeRestEnergy(s,12),12);
  s.tick=p.lastUse+480;assert.equal(smokeCamp(s,ctx),true);assert.equal(p.tobacco,1);
  setModule(s,'effects',false);assert.deepEqual(activeEffects(s),[]);assert.equal(smokeRestEnergy(s,12),9);setModule(s,'body',false);assert.equal(smokeRestEnergy(s,12),12);setModule(s,'body',true);
  const saved=serialize(s),loaded=restore(saved);assert.equal(serialize(loaded),saved);for(let i=0;i<5;i++){step(s);step(loaded);assert.equal(serialize(s),serialize(loaded));}assert.equal(p.tobacco,1);
});
