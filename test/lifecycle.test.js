import {setActorMoney} from '../actor-projection.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,createNextStory,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {lifePlan,settleLife,meetLegacy} from '../modules/lifecycle.js';
import {receiveItem} from '../modules/inventory.js';
const ctx={log:(s,text,type)=>s.journal.unshift({tick:s.tick,text,type}),closest:s=>s.areas.a1,goal:(s,kind,area,x)=>s.hero.goal={kind,area,x},releaseParty:()=>{},gainXp:()=>{}};
test('choosing a home continues the same living body without a final, archive or automatic successor',()=>{
  const s=createWorld(5),h=s.hero,id=h.lineage;h.career.path='peaceful';h.counters.peacefulWork=45;h.habits.push('homebody');h.personality.curiosity=.1;s.tick=h.life.reflectAfter;h.area='a1';h.x=42;
  assert.equal(lifePlan(s,ctx),true);settleLife(s,ctx);
  assert.equal(h.alive,true);assert.equal(h.life.ended,false);assert.ok(h.life.residence.since>=0);assert.equal(s.people[id].alive,true);assert.equal(s.people[id].area,'a1');assert.ok(s.areas.a1.population.includes(id));assert.equal(s.graves.length,0);assert.equal(s.lives.length,0);
  const objects=s.areas.a1.objects.length;settleLife(s,ctx);assert.equal(s.areas.a1.objects.length,objects);
  const save=serialize(s);assert.equal(serialize(restore(save)),save);assert.equal(createNextStory(s),false);createNextStory(s,{allowLiving:true});assert.equal(s.generation,2);assert.notEqual(s.hero.lineage,id);assert.equal(s.lives.length,0);assert.equal(s.people[id].alive,true);
});
test('legacy gifts move actual items once, retain provenance and cost the former owner wealth',()=>{
  const s=createWorld(5),former=s.hero.lineage;receiveItem(s,{...ctx,random:()=>.1},2);s.hero.area='a1';s.hero.life.home='a1';s.hero.life.motive='Мастерская';settleLife(s,ctx);createNextStory(s,{allowLiving:true});
  const p=s.people[former];s.people[s.hero.lineage].parents=[former];p.legacy.gifts=[];setActorMoney(s,p,20);
  const item=p.legacy.keepsakes[0],wealth=s.hero.gold;meetLegacy(s,former,ctx);
  assert.notEqual(s.hero.area,p.area,'this new birthplace is away from the actual former resident');
  assert.equal(s.hero.gold,wealth,'a distant relative cannot transfer a gift before meeting');
  assert.equal(p.legacy.wealth,20);assert.equal(p.legacy.gifts.length,0);
  // Arrange the actual meeting whose finite transfer this test exercises.
  s.hero.area=p.area;s.hero.x=p.x;meetLegacy(s,former,ctx);
  assert.equal(s.hero.gold,wealth+12);assert.equal(p.legacy.wealth,8);assert.ok([...s.hero.bag,...Object.values(s.hero.equipment).filter(Boolean)].some(i=>i.id===item.id));assert.ok(item.history.some(e=>e.text.includes('наследнику')));
  const after=serialize(s);meetLegacy(s,former,ctx);assert.equal(serialize(s),after);
});
test('disabling endings cancels a settlement plan but preserves archived lives and stored intent',()=>{
  const s=createWorld(5);s.hero.life.home='a1';s.hero.life.motive='Дом';s.hero.goal={kind:'settle',area:'a1',x:42};setModule(s,'lifecycle',false);assert.equal(lifePlan(s,ctx),false);settleLife(s,ctx);assert.equal(s.hero.life.ended,false);assert.equal(s.hero.life.motive,'Дом');assert.equal(s.lives.length,0);
});
test('combat death creates one archived biography and one grave, and loading keeps that final',()=>{
  const s=createWorld(5),h=s.hero,e=s.areas.a2.objects.find(o=>o.kind==='enemy');h.area='a2';h.x=e.x;h.hp=h.maxHp;h.personality.courage=1;h.combat=e.id;h.inventory.potions=0;setModule(s,'magic',false);e.hp=e.maxHp=1000;e.attack=1000;
  // This tests death bookkeeping, not whether the new judgment can escape.
  // Keep judgment active, but make its one real retreat attempt fail.
  s.rng=1600;
  step(s);assert.equal(h.combatJudgment.last.retreatBlocked,true);assert.equal(h.alive,false);assert.equal(s.lives.length,1);assert.equal(s.lives[0].outcome,'dead');assert.equal(s.lives[0].cause,e.name);assert.equal(s.graves.length,1);
  const loaded=restore(serialize(s));createNextStory(loaded);assert.equal(loaded.generation,2);assert.equal(loaded.lives.length,1);
});
test('the legacy balance profile reaches varied deaths or a continuing resident lifestyle without a forced ending',{skip:process.env.ODYSSEY_SOAK!=='1'},()=>{
  const reasons=new Set();let finals=0;
  for(let seed=1;seed<=9;seed++){
    // Keep the original nine-seed balance sample on its singleton workshop
    // profile. Two-owner scarcity and production have separate ON controls.
    const s=createWorld(seed);for(const id of ['elements','tactics','mutations','workshop-dispute'])setModule(s,id,false);while(s.hero.alive&&s.hero.life.residence?.since===undefined&&s.tick<38400)step(s);
    if(s.hero.alive&&s.hero.life.residence?.since===undefined)continue;finals++;
    if(s.hero.alive){assert.equal(s.hero.life.ended,false);assert.equal(s.lives.length,0);reasons.add(s.hero.life.motive);}else{assert.equal(s.lives[0].outcome,'dead');assert.ok(s.lives[0].milestones.length);reasons.add(s.lives[0].cause);}
    const snapshot=serialize(s);assert.equal(serialize(restore(snapshot)),snapshot);createNextStory(s,{allowLiving:true});assert.equal(s.generation,2);
    // The asserted coverage is three real distinct outcomes, not nine mandatory
    // repetitions. Keep the original cohort available for balance research.
    if(finals>=3&&reasons.size>=3&&process.env.ODYSSEY_EXHAUSTIVE!=='1')break;
  }
  assert.ok(finals>=3);assert.ok(reasons.size>=3,'career, responsibility and exploration create different motives');
});
