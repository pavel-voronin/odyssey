import {observeMarket} from '../modules/market-knowledge.js';
import {foodPrice} from '../modules/prices.js';
import {initializeMigrations} from '../modules/migrations.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,route,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {buyFood,restAmount,clinicTreatment,supplyTick,recoverCargo} from '../modules/supply.js';
import {availableOffers} from '../modules/quests.js';
const ctx={route,log:(s,text,type)=>s.journal.unshift({tick:s.tick,text,type}),goal:(s,kind,area,x,_,__,extra)=>s.hero.goal={kind,area,x,...extra}};
test('food cannot be bought from an empty store, and a meal consumes real food and coins',()=>{
  const s=createWorld(1);s.hero.area='a1';s.hero.x=42;s.areas.a1.civic.food=0;const gold=s.hero.gold;buyFood(s,ctx);assert.equal(s.hero.gold,gold);assert.equal(s.hero.hunger,8);
  s.areas.a1.civic.food=20;s.hero.gold=foodPrice(s);buyFood(s,ctx);assert.equal(s.areas.a1.civic.food,16);assert.equal(s.hero.gold,0);assert.equal(s.hero.hunger,5);
});
test('legacy foraging takes three ticks, exhausts a patch and produces a consumable ration',()=>{
  const s=createWorld(1,{rules:{birthplaces:false}});setModule(s,'local-food',false);s.hero.area='a1';s.hero.x=42;s.areas.a1.civic.food=0;observeMarket(s,s.hero.lineage);s.hero.area='a2';s.hero.x=18;s.hero.hunger=80;s.hero.inventory.rations=0;s.areas.a2.discovered=true;
  step(s);assert.equal(s.hero.goal?.kind,'forage');assert.equal(s.hero.inventory.rations,0);step(s);step(s);assert.equal(s.hero.inventory.rations,3);assert.equal(s.areas.a2.forage.stock,9);
  step(s);assert.equal(s.hero.inventory.rations,2);assert.ok(s.hero.hunger<25);
});
test('clinic shortages preserve illness and medical recovery spends stock',()=>{
  const s=createWorld(0),a=Object.values(s.areas).find(a=>a.district==='Мастерские');s.hero.area=a.id;s.hero.x=68;s.hero.hp=20;s.hero.conditions=[{id:'poison',until:200}];a.civic.medicine=0;
  clinicTreatment(s,ctx);assert.equal(s.hero.conditions.length,1);assert.equal(restAmount(s,a),2);
  a.civic.medicine=3;assert.equal(restAmount(s,a),5);assert.equal(a.civic.medicine,2);clinicTreatment(s,ctx);assert.equal(a.civic.medicine,0);assert.equal(s.hero.conditions.length,0);
});
function tradeWorld(){
  const s=createWorld(1),a=s.areas.a4;setModule(s,'npc-logistics',false);a.type='village';a.discovered=true;a.civic={food:10,medicine:0,tax:4,crisis:null};a.population=[];s.areas.a1.discovered=true;s.areas.a1.civic.food=90;s.areas.a1.civic.medicine=50;s.tick=193;s.logistics.nextDispatch=193;
  initializeMigrations(s);return s;
}
test('a caravan reserves cargo at departure and loading mid-route preserves arrival',()=>{
  let s=tradeWorld();for(const o of s.areas.a2.objects)if(o.kind==='enemy')o.alive=false;supplyTick(s,ctx);assert.equal(s.areas.a1.civic.food,78);assert.equal(s.areas.a4.civic.food,10);assert.equal(s.logistics.convoys.length,1);
  const saved=serialize(s);s=restore(saved);assert.equal(serialize(s),saved);for(let i=0;i<64;i++){s.tick++;supplyTick(s,ctx);}
  assert.equal(s.areas.a4.civic.food,22);assert.equal(s.areas.a4.civic.medicine,4);assert.equal(s.logistics.deliveries,1);assert.equal(s.logistics.convoys.length,0);
});
test('an ambush creates a captive and recoverable cargo without delivering a duplicate',()=>{
  const s=tradeWorld();supplyTick(s,ctx);for(let i=0;i<48;i++){s.tick++;supplyTick(s,ctx);}
  assert.equal(s.logistics.losses,1);assert.equal(s.areas.a4.civic.food,10);const cargo=s.areas.a2.objects.find(o=>o.kind==='supplyCache'),captive=s.areas.a2.objects.find(o=>o.kind==='captive');assert.ok(captive);assert.equal(s.people[captive.person].status,'captive');
  assert.ok(availableOffers(s,s.areas.a1).some(q=>q.kind==='rescue'&&q.person===captive.person),'real capture creates a rescue offer in an adjacent settlement');
  const rations=s.hero.inventory.rations;recoverCargo(s,cargo,ctx);assert.equal(s.hero.inventory.rations,rations+3);const save=serialize(s);recoverCargo(s,cargo,ctx);assert.equal(serialize(s),save);
});
test('disabling supply freezes cargo and stock without deleting them',()=>{
  const s=tradeWorld();supplyTick(s,ctx);setModule(s,'supply',false);const save=serialize(s);supplyTick(s,ctx);assert.equal(serialize(s),save);
});
