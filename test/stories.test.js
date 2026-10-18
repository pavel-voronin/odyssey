import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,createEnemy} from '../engine.js';
import {setModule} from '../rules.js';

import {finishStory,storyTick,storyAction} from '../modules/stories.js';
import * as pacts from '../modules/pacts.js';
import * as mysteries from '../modules/mysteries.js';
const ctx={log:(s,text,type)=>s.journal.unshift({tick:s.tick,text,type}),goal:(s,kind,area,x,_,__,extra)=>s.hero.goal={kind,area,x,...extra},storyFinish:finishStory,random:()=>.2,spawnEnemy:createEnemy};
function caseFor(s,kind){const c={id:'case-test',kind,status:'active',owner:s.hero.lineage,source:'a1',stage:'opening',choices:[],effects:[],refs:[]};s.storyCases.push(c);s.hero.stories.active=c.id;return c;}
test('a pact has a real advance, deadline, persistent collector and paid resolution',()=>{
  const s=createWorld(1),c=caseFor(s,'pact');pacts.start(s,c,ctx);c.variant='fortune';s.hero.habits=['hoarder'];s.hero.gold=4;pacts.act(s,c,ctx);
  assert.equal(s.hero.gold,44);assert.equal(c.stage,'owed');s.tick=c.due;setModule(s,'pacts',false);storyTick(s,ctx);assert.equal(c.stage,'owed');
  setModule(s,'pacts',true);storyTick(s,ctx);assert.equal(c.stage,'collection');const enemy=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);assert.equal(enemy.alive,true);assert.ok(enemy.attack>5);
  const saved=serialize(s);assert.equal(serialize(restore(saved)),saved);s.hero.gold=64;storyAction(s,c.id,ctx);assert.equal(s.hero.gold,0);assert.equal(c.status,'done');assert.equal(enemy.resolved,true);assert.equal(enemy.alive,true);
});
test('a spent relic can cancel a signed debt without manufacturing money',()=>{
  const s=createWorld(1),c=caseFor(s,'pact');pacts.start(s,c,ctx);c.variant='fortune';s.hero.habits=['hoarder'];pacts.act(s,c,ctx);s.hero.gold=2;s.hero.stats.spirit=9;s.hero.inventory.relics=1;pacts.act(s,c,ctx);
  assert.equal(c.status,'done');assert.equal(s.hero.inventory.relics,0);assert.equal(s.hero.gold,2);
});
test('a wounded debtor can pay during combat instead of making another attack',()=>{
  const s=createWorld(1),c=caseFor(s,'pact');pacts.start(s,c,ctx);c.variant='fortune';s.hero.habits=['hoarder'];pacts.act(s,c,ctx);s.tick=c.due;storyTick(s,ctx);
  const enemy=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);s.hero.combat=enemy.id;s.hero.hp=20;s.hero.gold=64;const mana=s.hero.magic.mana;
  step(s);assert.equal(c.status,'done');assert.equal(s.hero.gold,0);assert.equal(s.hero.hp,20);assert.equal(s.hero.magic.mana,mana);assert.equal(s.hero.combat,null);assert.equal(enemy.alive,true);
});

test('two real avoidance notifications make an affordable debt payable in combat at full health',()=>{
  const s=createWorld(1),c=caseFor(s,'pact');pacts.start(s,c,ctx);c.variant='fortune';s.hero.habits=['hoarder'];pacts.act(s,c,ctx);s.tick=c.due;storyTick(s,ctx);
  const enemy=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);s.hero.area=c.collector.area;s.hero.combat=enemy.id;s.hero.hp=s.hero.maxHp;s.hero.gold=64;s.hero.inventory.relics=0;
  pacts.avoided(s,c,enemy,ctx);assert.equal(pacts.combat(s,c,enemy,ctx),false);assert.equal(s.hero.gold,64);
  pacts.avoided(s,c,enemy,ctx);const replay=restore(serialize(s));step(s);step(replay);
  assert.equal(serialize(s),serialize(replay));assert.equal(c.status,'done');assert.equal(c.avoidances,2);assert.equal(c.defy,false);assert.equal(s.hero.gold,0);assert.equal(s.hero.hp,s.hero.maxHp);assert.equal(enemy.resolved,true);assert.ok(c.choices.some(d=>d.text.includes('Повторная оценка')));
});
test('the same theft can lead to a correct or false verdict, changing actual NPC freedom and food',()=>{
  for(const mistaken of [false,true]){
    const s=createWorld(2),c=caseFor(s,'mystery');mysteries.start(s,c,ctx);const food=s.areas.a1.civic.food;
    const selected=mistaken?(c.culprit===c.accused?c.other:c.accused):c.culprit;c.evidence=[{person:selected,reliable:!mistaken}];c.stage='trial';mysteries.act(s,c,ctx);
    assert.equal(c.verdict,selected);assert.equal(s.people[selected].status,'imprisoned');assert.equal(c.status,mistaken?'failed':'done');assert.equal(s.areas.a1.civic.food,food+(mistaken?0:c.sealedFood.initial));assert.equal(c.sealedFood.lost,mistaken?c.sealedFood.initial:0);assert.equal(c.sealedFood.quantity,0);
    assert.equal(s.people[mistaken?c.culprit:(selected===c.other?c.accused:c.other)].status,'resident');
  }
});
test('a travelled suspect is wanted rather than jailed remotely',()=>{
  const s=createWorld(2),c=caseFor(s,'mystery');mysteries.start(s,c,ctx);s.people[c.culprit].area='a0';c.evidence=[{person:c.culprit,reliable:true}];c.stage='trial';mysteries.act(s,c,ctx);
  assert.equal(s.people[c.culprit].status,'resident');assert.equal(s.people[c.culprit].wanted,c.id);
});
test('disabling the director retains cases and prevents further actions',()=>{
  const s=createWorld(2),c=caseFor(s,'pact');pacts.start(s,c,ctx);setModule(s,'stories',false);const snapshot=serialize(s);storyAction(s,c.id,ctx);storyTick(s,ctx);assert.equal(c.stage,'opening');assert.equal(s.hero.stories.active,c.id);assert.equal(serialize(s),snapshot);
});
test('a collector resolved by an actual current payment cannot trap the same body in a cancelled hunt after reload',()=>{
 const s=createWorld(1),h=s.hero,c=caseFor(s,'pact');pacts.start(s,c,ctx);c.variant='fortune';h.habits=['hoarder'];pacts.act(s,c,ctx);s.tick=c.due;storyTick(s,ctx);const enemy=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);h.gold=c.debt;h.hp=20;h.combat=enemy.id;
 let loaded=restore(serialize(s));step(s);step(loaded);assert.equal(serialize(s),serialize(loaded));assert.equal(c.status,'done');assert.equal(enemy.resolved,true);assert.equal(h.combat,null);assert.equal(h.stories.active,null);
 const goals=new Set(),work=h.counters.peacefulWork||0;for(let n=0;n<200&&h.alive;n++){step(s);step(loaded);if(n%17===0)loaded=restore(serialize(loaded));assert.equal(serialize(s),serialize(loaded));goals.add(h.goal?.kind||h.lastAction);}assert.ok(!h.alive||goals.size>=3||(h.counters.peacefulWork||0)>work);assert.equal(h.stories.active,null);
});

test('autonomous heroes can conclude every chain family when the rare-start limiter is disabled for coverage',()=>{
  const completed=new Set();
  for(let seed=1;seed<=24;seed++){
    const s=createWorld(seed);setModule(s,'story-rarity',false);for(let i=0;i<5000;i++)step(s);
    for(const c of s.storyCases)if(['done','failed','declined'].includes(c.status))completed.add(c.kind);
  }
  assert.deepEqual([...completed].sort(),['expedition','mystery','pact']);
});
