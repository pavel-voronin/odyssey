import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,createNextStory,observeDetailedActor,step,knownRoute,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';import {initializeActorAtlas,knownArea,visitedArea,revealArea,revealRoad,recordAreaVisit,observeLocalRoutes,knownRoad} from '../actor-atlas.js';
import {syncActiveActor} from '../actor-projection.js';import {consumeCarriedSupplies} from '../modules/stores.js';import {foodPlan,eat} from '../modules/supply.js';import {meetLegacy,settleLife} from '../modules/lifecycle.js';import {encounter} from '../modules/encounters.js';
const ctx={log:()=>{},gainXp:()=>{},random:()=>.5,goal:(s,kind,area,x)=>s.hero.goal={kind,area,x}};
// These controlled road/atlas scenarios pin the old initial road; default-ON multi-body births are covered separately.
function pair(){const s=createWorld(1,{rules:{birthplaces:false}});for(const m of MODULES)setModule(s,m.id,false);const first=s.hero;revealArea(s,'a3');createNextStory(s,{allowLiving:true});return {s,first,second:s.hero};}
test('a new person has a private atlas; returning preserves the former map without sharing a later rumour',()=>{
 const {s,first,second}=pair();assert.ok(knownArea(s,'a2'));assert.equal(knownArea(s,'a3'),false);const tick=s.tick,rng=s.rng,xp=first.xp;
 assert.ok(observeDetailedActor(s,first.lineage));assert.equal(knownArea(s,'a3'),true);assert.equal(first.xp,xp);assert.equal(s.tick,tick);assert.equal(s.rng,rng);
 setModule(s,'encounters',true);encounter(s,{encounter:'cartographer'},ctx);assert.ok(knownArea(s,'a3'));observeDetailedActor(s,second.lineage);assert.equal(knownArea(s,'a3'),false);
 const text=serialize(s),loaded=restore(text);assert.equal(serialize(loaded),text);assert.equal(knownArea(loaded,'a3'),false);observeDetailedActor(loaded,first.lineage);assert.equal(knownArea(loaded,'a3'),true);
});
test('first discovery is personal even when another person already visited; observing and revisiting give no discovery XP',()=>{
 const {s,first}=pair();assert.equal(s.areas.a1.visited,true);observeDetailedActor(s,first.lineage);assert.equal(visitedArea(s,'a1'),false);const xp=first.xp;first.x=99;first.goal={kind:'explore',area:'a1',x:42};syncActiveActor(s);step(s);assert.equal(first.area,'a1');assert.equal(first.xp,xp+3);assert.ok(visitedArea(s,'a1'));
 first.x=0;first.goal={kind:'explore',area:'a0',x:42};syncActiveActor(s);step(s);assert.equal(first.area,'a0');first.x=100;first.goal={kind:'explore',area:'a1',x:42};syncActiveActor(s);step(s);assert.equal(first.area,'a1');assert.equal(first.xp,xp+3);
});
test('knowing a distant name does not reveal intervening roads or a newly built remote shortcut',()=>{
 const s=createWorld(1,{rules:{birthplaces:false}});initializeActorAtlas(s,s.hero);revealArea(s,'a2');revealArea(s,'a3');assert.deepEqual(knownRoute(s,'a0','a3'),[]);revealRoad(s,'a1','a2');revealRoad(s,'a2','a3');assert.deepEqual(knownRoute(s,'a0','a3'),['a0','a1','a2','a3']);
 s.areas.a0.links.push('a3');s.areas.a3.links.push('a0');s.graphRevision++;assert.deepEqual(knownRoute(s,'a0','a3'),['a0','a1','a2','a3']);revealRoad(s,'a0','a3');assert.deepEqual(knownRoute(s,'a0','a3'),['a0','a3']);
});
test('new routes can be noticed locally, but a distant place or transit does not reveal them or grant discovery XP',()=>{
 const s=createWorld(1,{rules:{birthplaces:false}}),h=s.hero;initializeActorAtlas(s,h);const xp=h.xp,rng=s.rng;observeLocalRoutes(s);assert.equal(knownArea(s,'a3'),false);h.transit={from:'a0',to:'a2',mode:'road'};h.area='a2';observeLocalRoutes(s);assert.equal(knownArea(s,'a3'),false);h.transit=null;recordAreaVisit(s,'a2');observeLocalRoutes(s);assert.equal(knownArea(s,'a3'),true);assert.equal(knownRoad(s,'a2','a3'),true);assert.equal(visitedArea(s,'a3'),false);assert.equal(h.xp,xp);assert.equal(s.rng,rng);
});
test('a personally known road changes a real walking decision without changing the world clock or gifting resources',()=>{
 const a=createWorld(1,{rules:{birthplaces:false}});for(const m of MODULES)setModule(a,m.id,false);initializeActorAtlas(a,a.hero);revealArea(a,'a2');revealArea(a,'a3');a.hero.x=50;a.hero.goal={kind:'explore',area:'a3',x:42};syncActiveActor(a);const b=restore(serialize(a));revealRoad(b,'a1','a2');revealRoad(b,'a2','a3');const gold=a.hero.gold;step(a);step(b);assert.equal(a.tick,1);assert.equal(b.tick,1);assert.notEqual(a.hero.goal.area,'a3');assert.equal(b.hero.goal.area,'a3');assert.equal(b.hero.x,56);assert.equal(a.hero.gold,gold);assert.equal(b.hero.gold,gold);assert.equal(a.hero.lastAction,'walk');assert.equal(b.hero.lastAction,'walk');let diverged=false;for(let i=0;i<60;i++){step(a);step(b);diverged ||=a.hero.area!==b.hero.area||a.hero.x!==b.hero.x;}assert.ok(diverged);
});
test('an NPC-opened ration remains finite edible portions when its original person is observed again',()=>{
 const s=createWorld(1),h=s.hero,p=s.people[h.lineage];h.inventory.rations=1;assert.ok(consumeCarriedSupplies(p,null,'food',1));assert.equal(h.inventory.rations,0);assert.equal(p.roadSupplies.food,3);
 createNextStory(s,{allowLiving:true});observeDetailedActor(s,h.lineage);h.hunger=90;assert.ok(foodPlan(s,ctx));assert.equal(h.goal.kind,'eat');eat(s,ctx);assert.equal(p.roadSupplies.food,2);assert.equal(h.hunger,25);
 const loaded=restore(serialize(s)),body=loaded.hero,owner=loaded.people[h.lineage];assert.equal(owner.actorLink.inventory,body.inventory);body.hunger=90;eat(loaded,ctx);assert.equal(owner.roadSupplies.food,1);body.hunger=90;eat(loaded,ctx);assert.equal(owner.roadSupplies.food,0);assert.equal(body.inventory.rations,0);const meals=body.counters.meals;eat(loaded,ctx);assert.equal(body.counters.meals,meals);
});
test('a partial opened meal only feeds the funded human portions and supply-off preserves them',()=>{
 const s=createWorld(1),h=s.hero,p=s.people[h.lineage];h.inventory.rations=0;p.roadSupplies={food:2,medicine:0};const humans=Object.values(s.people).filter(p=>p.alive&&p.id!==h.lineage).slice(0,3);h.companions=humans.map(p=>({id:p.id,uid:p.id,person:p.id,role:'person',loyalty:50}));for(const p of humans){p.needs.hunger=80;}
 h.hunger=80;setModule(s,'supply',false);eat(s,ctx);assert.equal(p.roadSupplies.food,2);assert.equal(h.hunger,80);setModule(s,'supply',true);eat(s,ctx);assert.equal(p.roadSupplies.food,0);assert.equal(h.hunger,15);assert.equal(humans[0].needs.hunger,32);assert.equal(humans[1].needs.hunger,80);assert.equal(humans[2].needs.hunger,80);assert.equal(h.companions[0].loyalty,53);assert.equal(h.companions[1].loyalty,50);
});
test('a settled living owner gives from its actual purse once to each receiving person',()=>{
 const s=createWorld(5),old=s.hero,p=s.people[old.lineage];old.area='a1';old.x=42;old.gold=20;old.life.home='a1';old.life.motive='Дом';syncActiveActor(s);settleLife(s,ctx);assert.equal(createNextStory(s,{allowLiving:true}),true);const h=s.hero;h.area=p.area;s.people[h.lineage].parents=[];const money=h.gold;meetLegacy(s,p.id,ctx);assert.equal(h.gold,money+4);assert.deepEqual(p.legacy.gifts,[h.lineage]);assert.equal(old.gold,16);meetLegacy(s,p.id,ctx);assert.equal(h.gold,money+4);const text=serialize(s);assert.equal(serialize(restore(text)),text);
});
