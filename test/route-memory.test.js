import {revealArea,revealRoad} from '../actor-atlas.js';
// This controlled road layout predates optional settlement starts; current default-ON starts have separate coverage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,restore,serialize,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {expectedLoss,areaAvoided,rememberRejected,observeRejected} from '../modules/route-memory.js';
function blocked(){
 const s=createWorld(1,{rules:{birthplaces:false}});for(const m of MODULES)setModule(s,m.id,false);setModule(s,'route-memory',true);
 const h=s.hero,e=s.areas.a2.objects.find(o=>o.kind==='enemy');
 Object.assign(e,{hp:1000,maxHp:1000,attack:100,alive:true,x:50});Object.assign(h,{area:'a2',x:42,hp:h.maxHp,energy:100,goal:{kind:'explore',area:'a3',x:84,started:s.tick}});
 for(const area of Object.values(s.areas))revealArea(s,area);for(const area of Object.values(s.areas))for(const next of area.links)revealRoad(s,area.id,next);return {s,h,e};
}
test('a real refusal records observed power; full recovery and elapsed cooldown cannot make the same opponent weaker',()=>{
 const {s,h,e}=blocked();step(s);assert.equal(h.goal.kind,'rest');assert.equal(h.memory.rejected.a2.enemy,e.id);
 h.area='a1';h.x=68;h.goal=null;h.hp=h.maxHp;h.energy=100;
 h.memory.places=['a0','a1','a2'];for(const a of Object.values(s.areas))a.expanded=true;
 for(let i=0;i<300;i++){step(s);assert.equal(h.area,'a1');assert.equal(areaAvoided(s,'a2'),true);}
 assert.ok(s.tick>h.memory.avoided.a2);assert.equal(h.goal.kind,'routeWait');assert.equal(e.hp,1000);
 const loaded=restore(serialize(s));step(s);step(loaded);assert.equal(serialize(s),serialize(loaded));
 h.hp=5;step(s);assert.equal(h.goal.kind,'rest');assert.ok(h.hp>5);
});
test('sufficient actual equipment or available party assistance can reopen a known route; disabling preserves its memory',()=>{
 const {s,h,e}=blocked();rememberRejected(s,e);h.area='a1';h.memory.avoided.a2=s.tick+70;
 assert.deepEqual(knownRoute(s,'a1','a4'),[]);h.weapon=10;h.armor=100;
 assert.equal(areaAvoided(s,'a2'),false);assert.deepEqual(knownRoute(s,'a1','a4'),['a1','a2','a4']);
 assert.ok(expectedLoss(s,e)>0);h.weapon=0;h.armor=0;assert.equal(areaAvoided(s,'a2'),true);
 h.memory.rejected.a2.hp=30;h.memory.rejected.a2.attack=12;assert.equal(areaAvoided(s,'a2'),true);
 h.companions.push({attack:30});setModule(s,'companions',true);assert.equal(areaAvoided(s,'a2'),false);
 setModule(s,'companions',false);assert.equal(areaAvoided(s,'a2'),true);
 const memory=JSON.stringify(h.memory.rejected);s.tick=100;setModule(s,'route-memory',false);assert.equal(areaAvoided(s,'a2'),false);
 setModule(s,'route-memory',true);assert.equal(areaAvoided(s,'a2'),true);assert.equal(JSON.stringify(h.memory.rejected),memory);
});
test('distant enemy changes remain unknown until an actual local observation; old saves receive no invented observations',()=>{
 const {s,h,e}=blocked();rememberRejected(s,e);h.area='a1';e.alive=false;e.hp=0;
 observeRejected(s,s.areas.a2);assert.equal(areaAvoided(s,'a2'),true);
 const before=serialize(s);knownRoute(s,'a1','a4');assert.equal(serialize(s),before);
 h.area='a2';observeRejected(s,s.areas.a2);assert.equal(h.memory.rejected.a2,undefined);
 delete h.memory.rejected;const loaded=restore(serialize(s));assert.equal(loaded.hero.memory.rejected,undefined);
});

test('an identified collector permits a funded peaceful approach, while missing funds or disabled negotiation do not grant passage',()=>{
 const {s,h,e}=blocked();rememberRejected(s,e);h.area='a1';h.gold=64;h.bag=[];
 const c={id:'debt',kind:'pact',status:'active',owner:h.lineage,collector:{area:'a2',id:e.id},debt:64};s.storyCases.push(c);
 setModule(s,'stories',true);setModule(s,'pacts',true);
 h.goal={kind:'storyAction',area:'a2',story:c.id,safePassage:{kind:'debt',enemy:e.id}};
 assert.equal(areaAvoided(s,'a2'),false);h.gold=63;assert.equal(areaAvoided(s,'a2'),true);
 h.gold=64;setModule(s,'pacts',false);assert.equal(areaAvoided(s,'a2'),true);
 setModule(s,'pacts',true);c.status='done';assert.equal(areaAvoided(s,'a2'),true);
});
