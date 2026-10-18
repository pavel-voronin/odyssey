import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,knownRoute,route,serialize,restore,createNextStory,observeExistingPerson} from '../engine.js';
import {initializeActorAtlas,revealArea,revealRoad,hideNewArea} from '../actor-atlas.js';
import {actorView} from '../actor-view.js';
import {setModule} from '../rules.js';
function fixture(){const s=createWorld(2),h=s.hero;h.area='a1';initializeActorAtlas(s,h);h.atlas.known=Object.keys(s.areas);h.atlas.roads=[...new Set(Object.values(s.areas).flatMap(a=>a.links.map(id=>[a.id,id].sort().join('|'))))];h.memory.avoided={};h.memory.rejected={};return{s,h};}
const path=s=>knownRoute(s,'a1','a4');
test('a tiny personal map keeps live array membership and can cross the index boundary without a tick',()=>{
 const {s,h}=fixture(),all=structuredClone(h.atlas);assert.ok(path(s).length);h.atlas.known=['a1','a2','a4'];h.atlas.roads=['a1|a2','a2|a4'];assert.deepEqual(path(s),['a1','a2','a4']);h.atlas.roads.pop();assert.deepEqual(path(s),[]);h.atlas=all;assert.deepEqual(path(s),['a1','a2','a4']);
});
test('known BFS keeps link order and the first parent when equally short paths exist',()=>{
 const {s}=fixture();s.areas.a0.links.push('a4');s.areas.a4.links.push('a0');revealRoad(s,'a0','a4');assert.deepEqual(path(s),['a1','a0','a4']);s.areas.a1.links.reverse();assert.deepEqual(path(s),['a1','a2','a4']);
});
test('missing endpoints, unknown destination, an empty atlas and a self query retain their distinct results',()=>{
 const {s,h}=fixture();assert.deepEqual(knownRoute(s,'absent','a1'),[]);assert.deepEqual(knownRoute(s,'a1','absent'),[]);h.atlas.known=['a1'];h.atlas.roads=[];assert.deepEqual(path(s),[]);assert.deepEqual(knownRoute(s,'a1','a1'),['a1']);h.atlas.known=[];assert.deepEqual(knownRoute(s,'a1','a1'),['a1']);assert.deepEqual(path(s),[]);
});
test('a known place does not reveal its road; actual reveal and hide are reflected again in the same tick',()=>{
 const {s,h}=fixture(),tick=s.tick;h.atlas.roads=h.atlas.roads.filter(k=>k!==['a1','a2'].sort().join('|'));assert.deepEqual(path(s),[]);revealRoad(s,'a1','a2');assert.deepEqual(path(s),['a1','a2','a4']);hideNewArea(s,'a2');assert.deepEqual(path(s),[]);revealArea(s,'a2');assert.deepEqual(path(s),[]);revealRoad(s,'a2','a4');assert.deepEqual(path(s),['a1','a2','a4']);assert.equal(s.tick,tick);
});
test('in-place road removal, atlas replacement and an actual broken edge invalidate the next query without a tick',()=>{
 const {s,h}=fixture(),original=structuredClone(h.atlas);assert.ok(path(s).length);h.atlas.roads.splice(h.atlas.roads.indexOf('a2|a4'),1);assert.deepEqual(path(s),[]);h.atlas=structuredClone(original);assert.deepEqual(path(s),['a1','a2','a4']);s.areas.a2.links=s.areas.a2.links.filter(id=>id!=='a4');s.areas.a4.links=s.areas.a4.links.filter(id=>id!=='a2');assert.deepEqual(path(s),[]);s.areas.a2.links.push('a4');s.areas.a4.links.push('a2');assert.deepEqual(path(s),['a1','a2','a4']);
});
test('the current avoided deadline, equipment and real available help are assessed anew inside the same tick',()=>{
 const {s,h}=fixture();h.memory.avoided.a2=s.tick+10;assert.deepEqual(path(s),[]);delete h.memory.avoided.a2;assert.ok(path(s).length);h.maxHp=30;h.weapon=0;h.armor=0;h.personality.courage=0;h.memory.rejected.a2={enemy:'remembered',hp:30,attack:12};assert.deepEqual(path(s),[]);h.weapon=10;assert.ok(path(s).length);h.weapon=0;assert.deepEqual(path(s),[]);h.companions.push({attack:30});setModule(s,'companions',true);assert.ok(path(s).length);setModule(s,'companions',false);assert.deepEqual(path(s),[]);setModule(s,'route-memory',false);assert.ok(path(s).length);
});
test('a collector passage reacts to actual funds, bag value, negotiation rules and the same case ending',()=>{
 const {s,h}=fixture();h.maxHp=30;h.weapon=0;h.armor=0;h.personality.courage=0;h.memory.rejected.a2={enemy:'collector',hp:1000,attack:100};h.bag=[];h.gold=64;const c={id:'actual-debt',kind:'pact',status:'active',owner:h.lineage,collector:{area:'a2',id:'collector'},debt:64};s.storyCases.push(c);h.goal={kind:'storyAction',area:'a2',story:c.id,safePassage:{kind:'debt',enemy:'collector'}};setModule(s,'stories',true);setModule(s,'pacts',true);assert.ok(path(s).length);h.gold=63;assert.deepEqual(path(s),[]);h.bag.push({id:'owned-coin-charm',value:1});assert.ok(path(s).length);h.bag=[];assert.deepEqual(path(s),[]);h.gold=64;setModule(s,'pacts',false);assert.deepEqual(path(s),[]);setModule(s,'pacts',true);assert.ok(path(s).length);c.status='done';assert.deepEqual(path(s),[]);
});
test('another detailed body and actual observer switches keep different personal maps in the same world',()=>{
 const {s,h:first}=fixture(),tick=s.tick;assert.ok(path(s).length);assert.ok(createNextStory(s,{allowLiving:true}));const second=s.hero;second.atlas={version:1,known:['a1'],visited:['a1'],roads:[],visits:{}};second.area='a1';s.people[second.lineage].area='a1';assert.deepEqual(path(s),[]);assert.deepEqual(knownRoute(actorView(s,first),'a1','a4'),['a1','a2','a4']);assert.deepEqual(path(s),[]);assert.ok(observeExistingPerson(s,first.lineage));assert.equal(s.hero,first);assert.ok(path(s).length);assert.ok(observeExistingPerson(s,second.lineage));assert.equal(s.hero,second);assert.deepEqual(path(s),[]);assert.equal(s.tick,tick);
});
test('a missing current atlas cannot fall back to world knowledge or be reconstructed on load',()=>{
 const {s,h}=fixture();delete h.atlas;assert.deepEqual(path(s),[]);assert.throws(()=>restore(serialize(s)),/atlas/);assert.equal(h.atlas,undefined);
});

test('queries and reload retain full canonical data, old item/contract IDs and RNG without saving an index',()=>{
 const {s,h}=fixture();h.bag.push({id:'old-volume',kind:'book',name:'Записная книга',slot:'material',stat:'none',power:0,value:3,history:[{tick:0,text:'Старая запись'}]});const contract={id:'old-promise',kind:'remembered',owner:h.lineage,status:'active'};s.storyCases.push(contract);const before=serialize(s);for(let i=0;i<12;i++)assert.deepEqual(path(s),['a1','a2','a4']);assert.equal(serialize(s),before);const loaded=restore(before);assert.equal(serialize(loaded),before);assert.deepEqual(path(loaded),path(s));assert.equal(serialize(loaded),before);assert.ok(loaded.hero.bag.some(i=>i.id==='old-volume'));assert.ok(loaded.storyCases.some(c=>c.id==='old-promise'));
});
