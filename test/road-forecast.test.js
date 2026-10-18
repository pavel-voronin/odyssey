import test from 'node:test';import assert from 'node:assert/strict';
import {roadCase} from '../scripts/road-comparison.mjs';
import {estimatePlan} from '../modules/preparation.js';
import {physicalDistance} from '../geometry.js';
import {step} from '../engine.js';
test('rain and snow forecasts agree with actual long-road walking at the physical arrival tolerance in both directions',()=>{
 for(const weather of ['rain','snow'])for(const direction of [1,-1]){
  const {s,h,a}=roadCase({length:260,weather,direction}),target=direction>0?100:0;h.goal={kind:'routeWait',area:a.id,x:target,until:100000};
  const forecast=estimatePlan(s,h.goal,{route:()=>[a.id]}),energy=h.energy;let actions=0;
  while(physicalDistance(a,h.x,target)>1&&actions<100){step(s);actions++;assert.equal(h.lastAction,'walk');assert.equal(h.area,a.id);}
  assert.equal(actions,forecast.ticks);assert.ok(forecast.energyCost>=energy-h.energy);assert.ok(forecast.energyCost-(energy-h.energy)<1);assert.ok(physicalDistance(a,h.x,target)<=1);
 }
});
