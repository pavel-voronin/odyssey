import {revealArea,revealRoad} from '../actor-atlas.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route} from '../engine.js';
import {setModule} from '../rules.js';
import {weatherAt,weatherPreference} from '../modules/weather.js';
import {supplyTick} from '../modules/supply.js';
import {estimatePlan} from '../modules/preparation.js';
function seedFor(id,tick=1){for(let seed=0;seed<200;seed++)if(weatherAt({seed,tick}, {type:'road',continent:'c0',realm:'surface',era:0}).id===id)return seed;throw new Error('Missing weather '+id);}
function traveller(seed){const s=createWorld(seed);for(const id of ['body','events','people','stories','caravans','faction-paths','preparation'])setModule(s,id,false);for(const area of Object.values(s.areas))revealArea(s,area);for(const area of Object.values(s.areas))for(const next of area.links)revealRoad(s,area.id,next);Object.assign(s.hero,{area:'a0',x:10,energy:80,hunger:0,goal:{kind:'explore',area:'a0',x:50,started:s.tick}});return s;}
test('weather fronts agree across a continent, remain deterministic through saves and respect shelter and disabling',()=>{
  const s=createWorld(seedFor('storm')),a=s.areas.a0;assert.equal(weatherAt(s,a).id,'storm');
  assert.equal(weatherAt(s,{...a,id:'other',name:'elsewhere',type:'village'}).id,'storm');
  assert.equal(weatherAt(s,{...a,type:'dungeon'}).id,'shelter');
  assert.deepEqual(weatherAt(restore(serialize(s)),a),weatherAt(s,a));
  setModule(s,'weather',false);assert.equal(weatherAt(s,a).energy,1);assert.equal(weatherAt(s,a).speed,1);
});
test('rain costs real extra energy, fog slows actual movement, and weather preferences alter route scores',()=>{
  const rain=traveller(seedFor('rain')),fog=traveller(seedFor('fog'));step(rain);step(fog);
  assert.ok(rain.hero.energy<80-.7);assert.ok(fog.hero.x<16);
  const a=rain.areas.a0;rain.hero.weatherTaste.likes='rain';const liked=weatherPreference(rain,a);rain.hero.weatherTaste.likes='clear';rain.hero.weatherTaste.dislikes='rain';assert.ok(weatherPreference(rain,a)>liked);
});
test('heat stops real forage renewal while rain increases finite renewal',()=>{
  for(const [kind,growth] of [['heat',0],['rain',3]]){
    const s=createWorld(seedFor(kind,384));s.tick=384;const a=s.areas.a2;a.forage.stock=0;a.forage.lastGrowth=0;
    supplyTick(s,{route,log:()=>{}});assert.equal(a.forage.stock,growth);
    setModule(s,'weather',false);s.tick+=384;supplyTick(s,{route,log:()=>{}});assert.equal(a.forage.stock,growth+2);
  }
});
test('a journey is budgeted before walking and a camp waits for the mana needed by the chosen fight',()=>{
  const s=traveller(seedFor('clear')),h=s.hero;setModule(s,'preparation',true);setModule(s,'weather',false);
  h.energy=30;h.goal={kind:'explore',area:'a2',x:90,started:0};
  const forecast=estimatePlan(s,h.goal,{route});assert.ok(forecast.energy>h.energy);step(s);
  assert.equal(h.goal.kind,'campPitch');assert.equal(h.x,10);assert.equal(h.planning.preparations,1);
  const mage=traveller(seedFor('clear'));setModule(mage,'preparation',true);setModule(mage,'weather',false);
  Object.assign(mage.hero.magic,{mana:0,maxMana:30,spells:['spark']});mage.hero.goal={kind:'hunt',area:'a2',x:36,object:mage.areas.a2.objects.find(o=>o.kind==='enemy').id,started:0};mage.hero.energy=100;
  step(mage);assert.equal(mage.hero.goal.kind,'campPitch');assert.ok(mage.hero.goal.preparation.mana>0);
  step(mage);const camp=mage.hero.area,needed=mage.hero.goal.preparation.mana;assert.ok(mage.areas[camp].temporaryCamp);
  for(let i=0;i<15&&mage.hero.area===camp;i++)step(mage);
  assert.equal(mage.hero.area,'a0');assert.ok(mage.hero.magic.mana>=needed);
  assert.equal(serialize(restore(serialize(mage))),serialize(mage));
});
