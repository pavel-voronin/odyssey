import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld,step,serialize,restore,route } from '../engine.js';
import { BIOMES } from '../content.js';
import { setModule } from '../rules.js';
import { addRoute,beginTransit,transitTick,applyTimeConsequence,temporalCollection,edgeKey } from '../modules/travel.js';
const ctx={log:()=>{},gainXp:()=>{},random:()=>.5,die:(s)=>{s.hero.alive=false;},enter:(s,id)=>{s.hero.area=id;}};

test('autonomous worlds produce multiple real branches and visit every new biome',()=>{
  const visited=new Set();let voyages=0,portals=0,epochs=0,forks=0;
  // Optional interiors change subsequent area IDs and therefore routes. Keep the original
  // cohort and observed rare trajectories rather than forcing every life there.
  // Correct initial specialist means change later food/route history. Frozen
  // FOOD-01.3 coverage observed seed29 reaching an island through a real portal;
  // retain every original seed and add that example with the live food policy.
  // Real common camp paths change later preparations and travel. The stage133
  // natural ON audit observed seed11 reaching clockwork by4800 with live services.
  // Preserve the whole old cohort and add that actual trajectory, without forcing a portal.
  const cohort=[...Array.from({length:24},(_,i)=>i+1),36,29].map(seed=>({seed,ticks:3000,liveServices:false}));cohort.push({seed:11,ticks:4800,liveServices:true});
  for(const {seed,ticks,liveServices} of cohort){
    const s=createWorld(seed);if(!liveServices)setModule(s,'service-access',false);
    // This established bounded travel cohort pins the old service policy. New scarcity
    // deliberately changes routes; its live-policy replay/divergence cohort is audited separately.
    for(let i=0;i<ticks;i++)step(s);
    for(const a of Object.values(s.areas)){if(a.visited)visited.add(a.type);if(a.links.length>=4)forks++;assert.ok(route(s,'a0',a.id).length);assert.ok(s.continents[a.continent]);}
    voyages+=s.hero.travel.voyages;portals+=s.hero.travel.portals;epochs+=s.hero.travel.epochs;
  }
  for(const id of Object.keys(BIOMES))assert.ok(visited.has(id),`visited ${id}`);
  assert.ok(voyages>0&&portals>0&&epochs>0&&forks>0);
});
test('a sea voyage uses ticks and survives save/restore mid-journey',()=>{
  let s=createWorld(3);s.hero.area='a0';addRoute(s,'a0','a1',{mode:'sea',duration:6,cost:3});const gold=s.hero.gold;
  assert.ok(beginTransit(s,'a1',5,ctx));assert.equal(s.hero.gold,gold-3);assert.equal(s.hero.area,'a0');
  s=restore(serialize(s));assert.equal(s.hero.transit.remaining,6);
  const saved=serialize(s),repeat=restore(saved);
  for(let i=0;i<10;i++){step(s);step(repeat);}
  assert.equal(serialize(s),serialize(repeat));assert.equal(s.hero.travel.voyages,1);assert.equal(s.hero.transit,null);
});
test('travellers without a fare can work passage rather than get trapped',()=>{
  const s=createWorld(4);s.hero.area='a0';s.hero.x=95;s.hero.gold=0;addRoute(s,'a0','a1',{mode:'sea',duration:1,cost:4});
  assert.ok(beginTransit(s,'a1',5,ctx));assert.ok(s.hero.transit.crew);transitTick(s,ctx);assert.equal(s.hero.area,'a1');assert.equal(s.hero.gold,2);
});
test('past actions change a present object without decreasing the simulation clock',()=>{
  const s=createWorld(9),original=s.areas.a2.objects.find(o=>o.kind==='enemy');
  s.areas.echo={...s.areas.a2,id:'echo',timelineRoot:'a2',era:-25,objects:[]};s.hero.area='echo';
  const tick=s.tick;applyTimeConsequence(s,{timelineOrigin:original.id,baseName:'Волк'},ctx);
  assert.equal(original.alive,false);assert.equal(s.tick,tick);assert.equal(s.chronology.echoes.length,1);
  const loot=s.areas.a0.objects.find(o=>o.kind==='loot');s.areas.echo.timelineRoot='a0';
  temporalCollection(s,{timelineOrigin:loot.id},ctx);assert.equal(loot.taken,true);
  const paradox=s.chronology.paradox;temporalCollection(s,{timelineOrigin:loot.id},ctx);assert.equal(s.chronology.paradox,paradox+2);
});
test('disabling special travel leaves persistent map connectivity intact',()=>{
  const s=createWorld(10);addRoute(s,'a0','a1',{mode:'portal',duration:3});setModule(s,'portals',false);
  assert.equal(beginTransit(s,'a1',5,ctx),false);assert.equal(s.edges[edgeKey('a0','a1')].mode,'portal');assert.deepEqual(route(s,'a0','a1'),['a0','a1']);
});
