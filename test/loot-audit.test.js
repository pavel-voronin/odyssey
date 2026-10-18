import test from 'node:test';import assert from 'node:assert/strict';
import {step,restore,serialize,route,log} from '../engine.js';
import {lootVictoryFixture,lootPickupFixture,lootFloorFixture} from '../scripts/loot-scenarios.mjs';
import {LootRecorder} from '../scripts/loot-model.mjs';
import {sendGuards} from '../modules/orders.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
function advance(s,r){const b=r.before(s);step(s);r.after(s,b);return r.finish(s);}
test('actual victory covers positive and negative rolls, collector and equipment off without awarding a second item',()=>{
 for(const [options,expected]of [[{positive:true},1],[{positive:false},0],[{positive:false,collector:true},1],[{positive:true,collector:true,equipment:false},0]]){
  const {s,enemy}=lootVictoryFixture(options),r=new LootRecorder(s),before=serialize(s),plain=restore(before),out=advance(s,r);step(plain);assert.equal(serialize(s),serialize(plain));
  assert.equal(out.summary.heroVictories,1);assert.equal(out.summary.receipts,expected);assert.equal(out.summary.generated,expected);assert.equal(out.summary.renderedRemains,1);assert.equal(enemy.alive,false);
  const once=s.hero.nextItem,kills=s.hero.kills,gold=s.hero.gold,loaded=restore(serialize(s));loaded.hero.combat=enemy.id;loaded.hero.goal=null;step(loaded);
  assert.equal(loaded.hero.nextItem,once);assert.equal(loaded.hero.kills,kills);assert.equal(loaded.hero.gold,gold);
 }
});
test('a relic and a purse are finite different sources and restoring a collected source cannot pay twice',()=>{
 for(const kind of ['relic','loot']){
  const {s,object}=lootPickupFixture(kind),r=new LootRecorder(s),gold=s.hero.gold,out=advance(s,r);assert.equal(object.taken,true);
  assert.equal(out.counters[kind==='relic'?'relics':'purses'],1);assert.equal(out.summary.receipts,kind==='relic'?1:0);if(kind==='relic')assert.equal(out.sourceCounts.relic,1);else assert.equal(s.hero.gold-gold,12);
  const saved=restore(serialize(s)),count=saved.hero.nextItem,coins=saved.hero.gold;saved.hero.goal={kind:'collect',area:saved.hero.area,x:saved.hero.x,object:object.id,started:saved.tick};step(saved);
  assert.equal(saved.hero.nextItem,count);assert.equal(saved.hero.gold,coins);
 }
});
test('full inventory exposes same-tick speech replacement and conversion of the discarded original to a gold cache',()=>{
 const {s}=lootVictoryFixture({full:true}),r=new LootRecorder(s),id=`item-${s.generation}-${s.hero.nextItem}`,out=advance(s,r);
 assert.equal(out.summary.receipts,1);assert.equal(out.summary.generated,1);assert.equal(out.summary.immediateSpeech,0);assert.equal(s.hero.bag.length,24);
 const item=out.items.find(i=>i.id===id);assert.ok(item);assert.equal(item.original,null);assert.deepEqual(item.physicalPlaces,[]);assert.equal(item.transitions.at(-1).place,'abandoned-as-gold');assert.equal(out.overflows.length,1);assert.equal(out.overflows[0].hasOriginalItems,false);
 const copy=serialize(s);r.finish(s);assert.equal(serialize(s),copy);
});
test('a cleared floor gives its finite item but its own completion messages replace the item speech before the frame',()=>{
 const {s,area}=lootFloorFixture(),r=new LootRecorder(s),out=advance(s,r);assert.equal(out.sourceCounts['dungeon-floor'],1);assert.equal(out.summary.receipts,1);assert.equal(out.summary.immediateSpeech,0);assert.equal(area.dungeon.cleared,true);
 const loaded=restore(serialize(s)),next=loaded.hero.nextItem;step(loaded);assert.equal(loaded.hero.nextItem,next);assert.equal(loaded.areas[area.id].dungeon.cleared,true);
});
test('an actual engine-driven guard victory is counted separately and never becomes a hero item or kill',()=>{
 const {s,h,enemy}=lootVictoryFixture(),source=s.areas.a1;h.area=source.id;h.x=68;h.combat=null;h.goal={kind:'routeWait',area:source.id,x:68,until:100000};setModule(s,'orders',true);syncActiveActor(s);
 assert.equal(sendGuards(s,source,{enemy:enemy.id,area:'a2'},{route,log}),true);const id=s.society.orders[0].person,r=new LootRecorder(s),next=h.nextItem;
 for(let i=0;i<30;i++){const b=r.before(s);step(s);r.after(s,b);}const out=r.finish(s);
 assert.equal(enemy.alive,false);assert.equal(enemy.defeatedBy,id);assert.deepEqual(out.npcDefeats,[enemy.id]);assert.equal(out.summary.heroVictories,0);assert.equal(out.summary.receipts,0);assert.equal(h.nextItem,next);
});
test('existing heirloom originals survive equipment off, transfer once with history, and do not reroll after restore',()=>{
 const {s,h,object}=lootPickupFixture('heirloom'),id=object.items[0].id,next=h.nextItem,gold=h.gold;setModule(s,'equipment',false);step(s);
 assert.equal(h.gold,gold+5);assert.equal(object.items[0].id,id);assert.equal(object.taken,false);assert.equal(h.nextItem,next);
 setModule(s,'equipment',true);h.goal={kind:'collect',area:h.area,x:h.x,object:object.id,started:s.tick};const r=new LootRecorder(s),out=advance(s,r);
 assert.equal(out.summary.receipts,1);assert.equal(out.summary.generated,0);assert.equal(out.summary.existingReceipts,1);assert.equal(out.sourceCounts['existing-heritage'],1);assert.equal(object.items.length,0);assert.equal(object.taken,true);assert.equal(h.gold,gold+5);assert.equal(h.nextItem,next);
 const original=[...h.bag,...Object.values(h.equipment).filter(Boolean)].find(i=>i.id===id);assert.ok(original.history.some(e=>e.text==='Сделан прежним путником.'));assert.equal(out.items.find(i=>i.id===id).physicalPlaces.length,1);
 const loaded=restore(serialize(s));loaded.hero.goal={kind:'collect',area:h.area,x:h.x,object:object.id,started:loaded.tick};step(loaded);assert.equal(loaded.hero.nextItem,next);assert.equal([...loaded.hero.bag,...Object.values(loaded.hero.equipment).filter(Boolean)].filter(i=>i.id===id).length,1);
});
