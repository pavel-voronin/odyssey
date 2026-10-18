import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,route,knownRoute,step} from '../engine.js';
import {setModule,MODULES} from '../rules.js';
import {observeProperty,propertyPlan} from '../modules/property.js';
import {repairPlan} from '../modules/property-damage.js';
import {propertyMemoryTick,PROPERTY_ABSENCE} from '../modules/property-memory.js';
const ctx={route,knownRoute,log(){},random:()=>0,goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};}};
function fixture(){const s=createWorld(360),h=s.hero,id=h.property.origin.granted,k=h.property.known[id],a=s.areas[k.area],o=a.objects.find(o=>o.id===id);s.tick=PROPERTY_ABSENCE;h.mind.stress=80;h.goal=null;return{s,h,id,k,a,o};}
test('a rare old-address loss preserves the actual title, funds and history, and cannot create a remote repair or duplicate purchase',()=>{
 const {s,h,id,a,o,k}=fixture();h.gold=100;o.state='burned';k.state='burned';const control=restore(serialize(s)),money=h.gold,history=JSON.stringify(o.history);propertyMemoryTick(s,ctx);
 assert.equal(h.property.known[id],undefined);assert.equal(h.property.lost[id].name,o.name);assert.equal(o.owner,h.lineage);assert.equal(h.gold,money);assert.equal(JSON.stringify(o.history),history);
 assert.equal(repairPlan(control,ctx),true);assert.equal(repairPlan(s,ctx),false);h.gold=500;h.career.rank=4;assert.equal(propertyPlan(s,ctx),false);
 const before=serialize(s),loaded=restore(before);assert.equal(serialize(loaded),before);propertyMemoryTick(s,ctx);assert.equal(serialize(s),before);
});
test('the ordinary autonomous work route physically rediscovers the old property without repurchasing it',()=>{
 const {s,h,id,a,o}=fixture();propertyMemoryTick(s,ctx);const history=JSON.stringify(o.history),gold=h.gold;
 for(const m of MODULES)setModule(s,m.id,false);for(const key of ['property','work','identity','districts'])setModule(s,key,true);
 for(let i=0;i<150&&!h.property.known[id];i++)step(s);
 assert.equal(h.area,a.id);assert.ok(h.property.known[id]);assert.equal(h.property.lost[id],undefined);assert.equal(h.gold,gold);assert.equal(o.owner,h.lineage);assert.equal(JSON.stringify(o.history),history);
});
test('actual observation restores the same address without a fee or reward and automatic forgetting is not repeated',()=>{
 const {s,h,id,a,o}=fixture();propertyMemoryTick(s,ctx);const money=h.gold,xp=h.xp,history=JSON.stringify(o.history);h.area=a.id;observeProperty(s,a,ctx);
 assert.equal(h.property.lost[id],undefined);assert.equal(h.property.known[id].area,a.id);assert.equal(o.owner,h.lineage);assert.equal(h.gold,money);assert.equal(h.xp,xp);assert.equal(JSON.stringify(o.history),history);
 h.area='a1';s.tick+=PROPERTY_ABSENCE;propertyMemoryTick(s,ctx);assert.ok(h.property.known[id]);assert.equal(h.property.memory.losses,1);
});
test('fresh records, low stress, the current or actively planned place and disabled systems do not lose an address or roll a hidden chance',()=>{
 for(const reason of ['fresh','calm','present','planned','off','mind-off']){
  const {s,h,id,a}=fixture();if(reason==='fresh')s.tick-=240;if(reason==='calm')h.mind.stress=79;if(reason==='present')h.area=a.id;if(reason==='planned')h.goal={kind:'work',area:a.id};if(reason==='off')setModule(s,'property-memory',false);if(reason==='mind-off')setModule(s,'psychology',false);
  let rolls=0;propertyMemoryTick(s,{...ctx,random(){rolls++;return 0;}});assert.ok(h.property.known[id]);assert.equal(rolls,0);
 }
});
test('a diary protects the record, each day permits only one check, and disabling preserves already lost information for ordinary rediscovery',()=>{
 const a=fixture(),b=fixture();a.h.habits=['diary'];b.h.habits=[];propertyMemoryTick(a.s,{...ctx,random:()=>.02});propertyMemoryTick(b.s,{...ctx,random:()=>.02});
 assert.ok(a.h.property.known[a.id]);assert.equal(b.h.property.known[b.id],undefined);propertyMemoryTick(a.s,ctx);assert.ok(a.h.property.known[a.id]);
 setModule(b.s,'property-memory',false);const before=JSON.stringify(b.h.property.lost);propertyMemoryTick(b.s,ctx);assert.equal(JSON.stringify(b.h.property.lost),before);
 b.h.area=b.a.id;observeProperty(b.s,b.a,ctx);assert.ok(b.h.property.known[b.id]);assert.equal(b.h.property.lost[b.id],undefined);
});
test('missing mandatory property memory is refused without losing the actual title or altering the input',()=>{
 const s=createWorld(360),h=s.hero,id=h.property.origin.granted,k=h.property.known[id];delete h.property.lost;delete h.property.memory;const before=serialize(s);assert.throws(()=>restore(before),/property/);assert.equal(serialize(s),before);assert.equal(s.areas[k.area].objects.find(o=>o.id===id).owner,h.lineage);assert.equal(h.gold,4);
});
