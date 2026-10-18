import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,route} from '../engine.js';
import {CLIMATE_WEATHER,climateWeather} from '../modules/climate.js';
import {weatherAt,WEATHERS} from '../modules/weather.js';
import {setModule} from '../rules.js';
import {peopleTick} from '../modules/people.js';
import {supplyTick} from '../modules/supply.js';
import {DAY_TICKS} from '../calendar.js';
const area={type:'road',continent:'c0',era:0,realm:'surface'},ctx={route,log:()=>{}};
test('seasonal weather pools follow the same eighty-day calendar and remain individually weighted rather than compulsory events',()=>{
 for(const p of Object.values(CLIMATE_WEATHER))for(const id of p.choices)assert.ok(WEATHERS[id]);
 let snow=0,rain=0;for(let seed=0;seed<400;seed++){
  const s={seed,tick:0},winter=weatherAt(s,area,60*DAY_TICKS),summer=weatherAt(s,area,20*DAY_TICKS),dry=weatherAt(s,{...area,climate:'arid'},0),wet=weatherAt(s,{...area,climate:'tropical'},0);
  if(winter.id==='snow')snow++;if(['rain','storm'].includes(wet.id))rain++;
  assert.notEqual(summer.id,'snow');assert.notEqual(winter.id,'heat');assert.notEqual(dry.id,'rain');assert.notEqual(dry.id,'snow');
 }
 assert.ok(snow>70&&snow<300);assert.ok(rain>100&&rain<350);
});
test('real farming and legacy forage renewal change with season even when ordinary weather is disabled',()=>{
 const gains=[];for(const tick of [4992,14592]){
  const s=createWorld(1);setModule(s,'local-food',false);setModule(s,'weather',false);setModule(s,'npc-needs',false);s.tick=tick;
  for(const other of Object.values(s.people))if(other.agenda)other.agenda.due=1000000;
  const a=s.areas.a1,p=s.people[a.population[0]];p.x=42;p.status='resident';p.agenda.tools=0;p.agenda.task={kind:'farm',target:a.id,x:42,remaining:1};a.civic.food=50;
  peopleTick(s,ctx);const food=a.civic.food-50;
  const patch=s.areas.a2;patch.forage.stock=0;patch.forage.lastGrowth=tick-384;supplyTick(s,ctx);gains.push({food,forage:patch.forage.stock});
 }
 assert.deepEqual(gains,[{food:7,forage:2},{food:4,forage:1}]);
});
test('season influence and ordinary weather switch independently, while underground growth stays sheltered',()=>{
 const s=createWorld(5),a=s.areas.a0;s.tick=60*DAY_TICKS;setModule(s,'weather',false);assert.equal(weatherAt(s,a).harvest,.65);
 setModule(s,'climate',false);assert.equal(weatherAt(s,a).harvest,1);assert.equal(weatherAt(s,a).growth,2);
 setModule(s,'climate',true);assert.equal(weatherAt(s,{...a,type:'undercity',realm:'underground'}).harvest,1);
 const before=serialize(s);climateWeather(s,a);weatherAt(s,a);assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
});
