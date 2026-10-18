import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {initializeProperty,originProperty,workshopAt,workspaceAccess} from '../modules/property.js';
const ctx={route,knownRoute,log(){}};
test('initial property is an uncommon adult circumstance with one actual title, a known address and no added coins',()=>{
 let holders=0;
 for(let seed=0;seed<1000;seed++){
  const s=createWorld(seed),h=s.hero,id=h.property.origin.granted;if(!id)continue;holders++;
  const known=h.property.known[id],o=s.areas[known.area].objects.find(o=>o.id===id);
  assert.equal(h.gold,4);assert.equal(o.owner,h.lineage);assert.equal(o.history.length,1);assert.equal(o.history[0].basis,'adult-start');assert.equal(o.offer,null);assert.equal(known.source,'deed');
  const before=serialize(s);originProperty(s,s.areas[h.area],ctx);assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
 }
 assert.ok(holders>0&&holders<20);
});
test('the actual new owner can reach the workbench and finish the ordinary job without an initial rental charge',()=>{
 const s=createWorld(360),h=s.hero,k=h.property.known[h.property.origin.granted];assert.ok(k);
 for(const m of MODULES)setModule(s,m.id,false);for(const id of ['identity','property','work'])setModule(s,id,true);
 h.goal={kind:'work',job:'repair',area:k.area,x:42,remaining:5,started:s.tick};let ownUse=false;
 for(let i=0;i<150&&!h.counters.peacefulWork;i++){step(s);ownUse ||= h.goal?.workspace?.kind==='owner';}
 assert.equal(h.counters.peacefulWork,1);assert.equal(ownUse,true);assert.equal(h.gold,14);assert.equal(s.areas[k.area].objects.find(o=>o.id===h.property.origin.granted).owner,h.lineage);
});
test('an incomplete property origin is refused and later births receive no retroactive grant, while disabling retains an existing original title',()=>{
 const s=createWorld(0);delete s.hero.property.origin;const before=serialize(s);assert.throws(()=>restore(before),/property.origin/);assert.equal(serialize(s),before);
 const next=structuredClone(s.hero);delete next.property;initializeProperty(next,{seed:360,generation:2,tick:100});assert.equal(next.property.origin.eligible,false);
 const owner=createWorld(360),h=owner.hero,k=h.property.known[h.property.origin.granted],o=owner.areas[k.area].objects.find(o=>o.id===h.property.origin.granted);setModule(owner,'property',false);
 assert.equal(o.owner,h.lineage);assert.equal(h.property.origin.granted,o.id);assert.equal(workspaceAccess(owner,ctx),'ready');assert.equal(h.gold,4);
});
test('initial distribution cannot take an already registered title and consumes no world randomness',()=>{
 const s=createWorld(0),a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a),former=o.owner;
 s.hero.property.origin={eligible:true,checked:false,granted:null};const rng=s.rng,streams=JSON.stringify(s.randomStreams);
 originProperty(s,s.areas.a1,ctx);assert.equal(o.owner,former);assert.equal(s.hero.property.origin.granted,null);assert.equal(s.rng,rng);assert.equal(JSON.stringify(s.randomStreams),streams);
 const fresh=createWorld(0);fresh.hero.profession='clockmaker';fresh.hero.property.origin={eligible:true,checked:false,granted:null};const freshRng=fresh.rng,freshStreams=JSON.stringify(fresh.randomStreams);
 originProperty(fresh,fresh.areas.a1,ctx);assert.ok(fresh.hero.property.origin.granted);assert.equal(fresh.rng,freshRng);assert.equal(JSON.stringify(fresh.randomStreams),freshStreams);assert.equal(fresh.hero.gold,4);
});
