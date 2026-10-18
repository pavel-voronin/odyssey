import {prepareActiveWatch} from './fixtures/active-watch.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {areaScale,physicalDistance,areaOffset,areaStep} from '../geometry.js';
import {createWorld,step,serialize,restore,route} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {estimatePlan} from '../modules/preparation.js';
import {peopleTick,peopleArea} from '../modules/people.js';
import {civicArea} from '../modules/society.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {launchConvoy} from '../modules/supply.js';
import {advanceFreight} from '../modules/freight.js';
import {startPublicJourney,publicDestinations,advancePublicJourney} from '../modules/public-journeys.js';
import {ordersTick} from '../modules/orders.js';
import {createClock,catchUp} from '../clock.js';
const ctx={route,log(){},gainXp(){}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function walking(length){const s=createWorld(1);for(const m of MODULES)setModule(s,m.id,false);const h=s.hero,a=s.areas.a0;if(length!==undefined)a.length=length;Object.assign(h,{area:a.id,x:0,distance:0,energy:100,hunger:0,hp:h.maxHp,combat:null,transit:null,goal:{kind:'routeWait',area:a.id,x:84,until:100000}});return {s,h,a};}
test('old percentage coordinates retain scale one and physical budgets clamp invalid imports safely',()=>{
  for(const length of [undefined,null,0,-1,NaN,Infinity,'260'])assert.equal(areaScale({length}),1);
  assert.equal(areaScale({length:260}),2.6);assert.equal(areaScale({length:10000}),6);near(areaStep({length:260},20,80,6),6/2.6);near(physicalDistance({length:260},20,24),10.4);near(areaOffset({length:260},8)*2.6,8);
});
test('a real long-road walk takes more actions and energy, counts physical distance and matches the actual forecast',()=>{
  const rows=[];for(const length of [undefined,260]){
    let {s,h,a}=walking(length);const estimate=estimatePlan(s,h.goal,{route:()=>[a.id]});let ticks=0;
    while(physicalDistance(a,h.x,84)>1&&ticks<100){step(s);ticks++;if(ticks===7){const saved=serialize(s);s=restore(saved);assert.equal(serialize(s),saved);h=s.hero;a=s.areas[a.id];}}
    assert.equal(ticks,estimate.ticks);near(h.distance,84*areaScale(a));assert.ok(estimate.energyCost>=100-h.energy);assert.ok(estimate.energyCost-(100-h.energy)<1);rows.push({ticks,energy:h.energy});
  }
  assert.deepEqual(rows.map(r=>r.ticks),[14,37]);assert.ok(rows[1].energy<rows[0].energy);
});
test('a distant enemy on a long road is approached before the same physical encounter range can start combat',()=>{
  const {s,h,a}=walking(260);h.x=20;a.objects.push({id:'length-threat',kind:'enemy',name:'Дорожный страж',x:24,hp:100,maxHp:100,attack:1,alive:true,resolved:false});step(s);assert.equal(h.combat,null);assert.equal(h.lastAction,'walk');assert.ok(h.x>20);step(s);assert.equal(h.combat,'length-threat');assert.ok(physicalDistance(a,h.x,24)<=9);
});
test('a personal NPC uses a six-unit movement budget rather than six percent of a long place',()=>{
  for(const length of [100,260]){
    const s=createWorld(1),a=s.areas.a1,p=s.people[a.population[0]];a.length=length;for(const other of Object.values(s.people))if(other.agenda){other.agenda.task=null;other.agenda.due=100000;}
    setModule(s,'npc-needs',false);p.x=0;p.status='resident';p.area=a.id;p.agenda.task={kind:'work',target:a.id,x:84,remaining:3};s.tick=8;peopleTick(s,ctx);near(physicalDistance(a,0,p.x),6);assert.equal(p.agenda.task.remaining,3);
  }
});
function transport(length){
  const s=createWorld(1),source=s.areas.a1,to=s.areas.a4;to.type='village';civicArea(s,to);peopleArea(s,to);Object.assign(to.civic,{food:10,medicine:0,treasury:60});Object.assign(source.civic,{food:90,medicine:50});s.areas.a2.length=length;
  for(const other of Object.values(s.people))if(other.agenda){other.agenda.task=null;other.agenda.due=100000;}
  for(const a of Object.values(s.areas))for(const e of a.objects)if(e.kind==='enemy')e.alive=false;
  setModule(s,'npc-needs',false);const p=s.people[source.population[0]];Object.assign(p,{area:source.id,x:42,status:'resident',health:p.maxHealth||100});Object.assign(p.agenda,{job:'merchant',duty:.8,wealth:0});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});
  for(const id of route(s,source.id,to.id)){p.area=id;observeNPCPlace(s,p);observeFreightActor(s,p);}p.area=source.id;observeNPCPlace(s,p);observeFreightActor(s,p);return {s,p,source,to};
}
test('public travellers and finite freight spend proportionally more actual ticks on the long intermediate area',()=>{
  for(const role of ['journey','freight']){
    const times=[];for(const length of [100,260]){
      const {s,p,source,to}=transport(length),item=role==='journey'?startPublicJourney(s,p,source,publicDestinations(s,p).find(e=>e.place.area===to.id),ctx):launchConvoy(s,source,to,ctx);assert.ok(item);
      let ticks=0;const active=()=>role==='journey'?s.society.journeys.includes(item):s.logistics.convoys.includes(item);
      while(active()&&ticks<500){s.tick++;ticks++;if(role==='journey')advancePublicJourney(s,item,ctx);else advanceFreight(s,item,ctx);}
      assert.equal(active(),false);assert.equal(p.area,to.id);assert.equal(p.status,'resident');times.push(ticks);
      if(role==='freight'){assert.equal(to.civic.food,22);assert.equal(source.civic.food,78);assert.equal(p.agenda.wealth,3);assert.equal(s.logistics.history.filter(e=>e.id===item.id).length,1);}
    }
    assert.ok(times[1]>times[0],role+': '+times);
  }
});
test('freight ambush on a long road happens within physical reach and leaves the same single finite cargo',()=>{
  const {s,p,source,to}=transport(260),enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.alive=true;const c=launchConvoy(s,source,to,ctx);assert.ok(c);for(let i=0;i<300&&s.logistics.convoys.includes(c);i++){s.tick++;advanceFreight(s,c,ctx);}
  assert.equal(p.status,'captive');assert.equal(p.area,'a2');assert.ok(physicalDistance(s.areas.a2,p.x,enemy.x)<=8+1e-7);assert.equal(s.areas.a2.objects.filter(o=>o.id===c.id+'-cargo').length,1);assert.equal(to.civic.food,10);assert.equal(p.agenda.wealth,0);
});
test('only a subset of newly generated roads, also far from the start, get the profile without additional objects or RNG draws',()=>{
  let found=0;for(let seed=0;seed<12;seed++){
    const a=createWorld(seed);for(const m of MODULES)setModule(a,m.id,false);setModule(a,'travel',true);setModule(a,'long-roads',true);const h=a.hero,parent=a.areas.a2;parent.depth=seed%2?1:5;
    for(const e of parent.objects)if(e.kind==='enemy')e.alive=false;
    Object.assign(h,{area:parent.id,x:20,energy:100,hp:h.maxHp,hunger:0,combat:null,transit:null,goal:{kind:'expand',area:parent.id,x:20}});const old=Object.keys(a.areas),b=restore(serialize(a));setModule(b,'long-roads',false);step(a);step(b);
    assert.deepEqual(a.randomStreams,b.randomStreams);assert.equal(a.rng,b.rng);for(const id of old)assert.equal(a.areas[id].length,undefined);
    for(const[id,area]of Object.entries(a.areas)){
      if(!old.includes(id)&&area.type==='road'&&area.depth%4===2){assert.equal(area.length,260);found++;}else assert.equal(area.length,undefined);
      const copy={...area};delete copy.length;delete copy.roadProfile;assert.deepEqual(JSON.parse(JSON.stringify(copy)),JSON.parse(JSON.stringify(b.areas[id])));
    }
  }
  assert.ok(found>0);
  const old=createWorld(1);old.areas.a0.depth=2;assert.equal(restore(serialize(old)).areas.a0.length,undefined);
});
test('an offline batch and a save in the middle execute the same long-road prefix as individual world ticks',()=>{
  const {s:a}=walking(260);let b=restore(serialize(a));const clock=createClock(0);
  for(let i=0;i<100;i++)step(a);assert.equal(catchUp(clock,100000,()=>step(b),17),17);b=restore(serialize(b));while(clock.anchor<100000)catchUp(clock,100000,()=>step(b),17);
  assert.equal(serialize(a),serialize(b));assert.equal(b.generation,1);
});
test('the legacy guard travel abstraction charges the same weighted length on its outward and return budgets',()=>{
  const rows=[];for(const length of [100,260]){
    const s=createWorld(1),source=s.areas.a1,target=s.areas.a2,enemy=target.objects.find(o=>o.kind==='enemy');target.length=length;enemy.alive=false;setModule(s,'npc-watch-needs',false);
    assert.equal(prepareActiveWatch(s,source,{area:target.id,enemy:enemy.id},ctx),true);const order=s.society.orders.at(-1);const out=order.remaining;
    while(order.stage==='marching'){s.tick++;ordersTick(s,ctx);}assert.equal(order.stage,'returning');const back=order.remaining;
    while(s.society.orders.includes(order)&&s.tick<200){s.tick++;ordersTick(s,ctx);}assert.equal(s.people[order.person].area,source.id);rows.push({out,back});
  }
  assert.deepEqual(rows,[{out:12,back:12},{out:22,back:22}]);
});
