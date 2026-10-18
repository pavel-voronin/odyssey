import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore} from '../engine.js';
import {canStartPersonalLine,claimPersonalLine} from '../modules/story-rarity.js';
import {storyPlan} from '../modules/stories.js';
import {setModule} from '../rules.js';
test('most identities have no special line and each family stays individually uncommon',()=>{
 const counts={none:0,pact:0,mystery:0,expedition:0,two:0};
 for(let seed=0;seed<1000;seed++){
  const s=createWorld(seed),r=s.hero.storyRarity;if(!Object.values(r.affinity).some(Boolean))counts.none++;
  for(const kind of ['pact','mystery','expedition'])if(r.affinity[kind])counts[kind]++;
  if(r.budget===2)counts.two++;assert.equal(serialize(restore(serialize(s))),serialize(s));
 }
 assert.ok(counts.none>650&&counts.none<850);for(const kind of ['pact','mystery','expedition'])assert.ok(counts[kind]>40&&counts[kind]<180,JSON.stringify(counts));assert.ok(counts.two>15&&counts.two<90);
});
test('one shared budget and cooldown constrain new starts without deleting older cases',()=>{
 const s=createWorld(2),h=s.hero;h.storyRarity={affinity:{pact:true,mystery:true,expedition:true},budget:2,started:0,nextEligible:0};
 assert.ok(canStartPersonalLine(s,'pact'));claimPersonalLine(s);s.storyCases.push({id:'old',kind:'pact',owner:h.lineage,status:'done'});
 assert.equal(canStartPersonalLine(s,'mystery'),false);s.tick=2400;assert.ok(canStartPersonalLine(s,'mystery'));assert.equal(canStartPersonalLine(s,'pact'),false);
 claimPersonalLine(s);s.storyCases.push({id:'other',kind:'mystery',owner:h.lineage,status:'done'});s.tick=10000;assert.equal(canStartPersonalLine(s,'expedition'),false);
 const data=JSON.stringify(h.storyRarity);setModule(s,'story-rarity',false);assert.ok(canStartPersonalLine(s,'expedition'));claimPersonalLine(s);assert.equal(JSON.stringify(h.storyRarity),data);
});
test('a legacy active line can continue even when this identity has no affinity or remaining allowance',()=>{
 const s=createWorld(7),h=s.hero;h.storyRarity={affinity:{},budget:0,started:9,nextEligible:100000};
 const c={id:'legacy',kind:'pact',status:'active',owner:h.lineage,source:'a1',stage:'opening',refs:[],choices:[],effects:[]};s.storyCases.push(c);h.stories.active=c.id;
 let planned=false;assert.equal(storyPlan(s,{goal:()=>planned=true,log:()=>{}}),true);assert.ok(planned);assert.equal(c.status,'active');assert.equal(s.storyCases.length,1);
});
test('an eligible investigation starts from a real town problem rather than being filtered out permanently',()=>{
 const s=createWorld(2),h=s.hero;h.area='a1';s.tick=2000;h.stories.nextOffer=0;h.storyRarity={affinity:{mystery:true},budget:1,started:0,nextEligible:0};
 const ctx={goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,...extra},log:()=>{}};
 assert.equal(storyPlan(s,ctx),true);const c=s.storyCases[0];assert.equal(c.kind,'mystery');assert.ok(s.people[c.accused]?.alive);assert.ok(s.areas[c.source].objects.some(o=>o.story===c.id));assert.equal(h.storyRarity.started,1);
});
