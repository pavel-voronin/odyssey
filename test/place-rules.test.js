import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,knownRoute,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {availableCombatSpells,castInCombat} from '../modules/magic.js';
import {combatOptions} from '../modules/combat-judgment.js';
import {observePlaceRule,knownLawBurden} from '../modules/place-rules.js';
import {localSpellExtra} from '../modules/place-rule-state.js';
import {addRoute} from '../modules/travel.js';
import {estimatePlan} from '../modules/preparation.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
import {actorView} from '../actor-view.js';
import {syncActiveActor} from '../actor-projection.js';
import {waystoneFixture} from '../scripts/waystone-scenarios.mjs';
import {placeRuleFixture,placeRuleContext as ctx} from '../scripts/place-rule-scenarios.mjs';

test('one actual forest constructor owns the rule; ON/restore/rumour do not create it in old absent places',()=>{
 const current=createWorld(7);assert.equal(Object.values(current.areas).filter(a=>a.localRule).length,1);assert.equal(current.areas.a2.localRule.extraMana,2);
 const old=createWorld(7,{rules:{'place-rules':false}});setModule(old,'place-rules',true);old.hero.memory.facts.push('Говорят о голодной долине.');const raw=serialize(old),loaded=restore(raw);assert.equal(serialize(loaded),raw);assert.equal(Object.values(loaded.areas).some(a=>a.localRule),false);assert.equal(loaded.hero.memory.localRules,undefined);
 const bad=JSON.parse(serialize(current));bad.areas.a2.localRule.extraMana=1;assert.throws(()=>restore(JSON.stringify(bad)),/localRule/);
 const attached={rules:{'place-rules':true},areas:{a:{id:'a',localRule:current.areas.a2.localRule},camp:{id:'camp',temporaryCamp:{parent:'a'}}}};assert.equal(localSpellExtra(attached,{area:'camp'}),2);assert.equal(localSpellExtra(attached,{area:'camp',transit:{}}),0);
});
test('same invoice serves preview/forecast/action; exact mana boundary, no price on failed cast or ordinary walking',()=>{
 const {s,h,enemy}=placeRuleFixture({mana:5});assert.equal(availableCombatSpells(s).length,0);const raw=serialize(s);assert.equal(castInCombat(s,enemy,ctx,'spark'),false);assert.equal(serialize(s),raw);
 h.magic.mana=6;const spell=availableCombatSpells(s)[0];assert.equal(spell.baseManaCost,4);assert.equal(spell.localManaCost,2);assert.equal(spell.totalManaCost,6);assert.equal(combatOptions(s,enemy).find(o=>o.spell==='spark').mana,6);
 observePlaceRule(s,ctx);assert.equal(estimatePlan(s,{kind:'hunt',area:'a2',x:h.x},ctx).mana,12);
 assert.equal(castInCombat(s,enemy,ctx,'spark'),true);assert.equal(h.magic.mana,0);assert.equal(h.magic.casts,1);assert.equal(h.memory.localRules.a2.lastCast.total,6);assert.equal(h.conditions.length,0);assert.equal(s.tick,0);assert.equal(castInCombat(s,enemy,ctx,'spark'),false);assert.equal(h.memory.localRules.a2.casts,1);
 const physical=placeRuleFixture({mana:5});step(physical.s);assert.equal(physical.h.lastAction,'attack');assert.equal(physical.h.magic.mana,5);assert.equal(physical.h.magic.casts,0);
 const n=placeRuleFixture({mage:false}),before=n.h.magic.mana;for(const o of n.a.objects)if(o.kind==='enemy')o.alive=false;n.h.combat=null;n.h.goal={kind:'routeWait',area:'a2',x:95,until:10000};for(let k=0;k<4;k++)step(n.s);assert.equal(n.h.magic.mana,before);assert.ok(n.h.distance>0);assert.equal(knownLawBurden(n.s,'a2'),false);
});
test('finite original waystone covers only the actual extra shortfall once and keeps its same UID',()=>{
 const f=waystoneFixture(),{s,h,item}=f;setModule(s,'place-rules',true);h.area='a2';h.x=40;h.magic.mana=3;h.magic.cooldowns={};syncActiveActor(s);const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');enemy.alive=true;enemy.hp=1000;enemy.resolved=false;
 const spell=availableCombatSpells(s).find(sp=>sp.id==='spark');assert.equal(spell.totalManaCost,6);assert.equal(spell.manaCost,3);assert.equal(spell.waystoneCost,3);assert.equal(spell.waystoneItem,item.id);
 const before=item.waystone.charge;assert.equal(castInCombat(s,enemy,ctx,'spark'),true);assert.equal(item.waystone.charge,before-3);assert.equal(h.magic.mana,0);assert.equal(h.memory.localRules.a2.lastCast.item,item.id);assert.equal(h.memory.localRules.a2.lastCast.charge,3);
 const loaded=restore(serialize(s));assert.equal(serialize(loaded),serialize(s));assert.equal(loaded.hero.memory.localRules.a2.casts,1);
});
test('known underfunded cautious mage takes an actual known bypass; bold/nonmage/unknown keep ordinary route',()=>{
 const {s,h}=placeRuleFixture({mana:3});observePlaceRule(s,ctx);
 // Prepared pair of existing finite roads, no new teleport or hypothetical route knowledge.
 for(const [a,b]of [['a1','a4'],['a4','a3']]){s.areas[a].links.push(b);s.areas[b].links.push(a);addRoute(s,a,b);}
 h.area='a1';h.x=95;h.combat=null;h.goal={kind:'explore',area:'a3',x:20,started:s.tick};for(const id of ['a1','a2','a3','a4'])revealArea(s,id);for(const [a,b]of [['a1','a2'],['a2','a3'],['a1','a4'],['a4','a3']])revealRoad(s,a,b);syncActiveActor(s);
 assert.deepEqual(knownRoute(s,'a1','a3'),['a1','a4','a3']);const raw=serialize(s);for(let n=0;n<2&&h.area==='a1';n++)step(s);assert.equal(h.area,'a4');assert.equal(h.magic.mana,3);
 const bold=restore(raw);bold.hero.personality.courage=.9;assert.deepEqual(knownRoute(bold,'a1','a3'),['a1','a2','a3']);bold.hero.personality.courage=.3;bold.hero.magic.spells=[];assert.deepEqual(knownRoute(bold,'a1','a3'),['a1','a2','a3']);
 const unknown=restore(raw);delete unknown.hero.memory.localRules;assert.deepEqual(knownRoute(unknown,'a1','a3'),['a1','a2','a3']);
});
test('an unobserved detailed caster pays in its own actual area, without charging the newly observed person',()=>{
 const {s,h,enemy}=placeRuleFixture();assert.equal(createNextStory(s,{allowLiving:true}),true);const other=s.hero;other.area='a0';syncActiveActor(s);const mana=other.magic.mana,journal=JSON.stringify(s.journal),view=actorView(s,h);
 assert.equal(castInCombat(view,enemy,ctx,'spark'),true);assert.equal(h.magic.mana,0);assert.equal(other.magic.mana,mana);assert.equal(h.memory.localRules.a2.lastCast.total,6);assert.equal(s.observation.person,other.lineage);
 assert.equal(JSON.stringify(s.journal),journal);
 const loaded=restore(serialize(s));assert.equal(loaded.actorStates[h.lineage].memory.localRules.a2.casts,1);
});
test('short actual spell batch restores the same prefix/calendar/RNG; OFF preserves notes but charges the old price',()=>{
 const {s,h}=placeRuleFixture({mana:6});const copy=restore(serialize(s));for(let n=0;n<4;n++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));assert.equal(s.tick,4);assert.equal(h.memory.localRules.a2.casts,1);assert.equal(h.memory.localRules.a2.lastCast.total,6);
 const raw=serialize(s),loaded=restore(raw);assert.equal(serialize(loaded),raw);setModule(loaded,'place-rules',false);loaded.hero.magic.mana=4;loaded.hero.magic.cooldowns={};const spell=availableCombatSpells(loaded)[0];assert.equal(spell.totalManaCost,4);assert.equal(spell.localManaCost,0);assert.equal(loaded.hero.memory.localRules.a2.casts,1);
 const bad=JSON.parse(raw);bad.hero.memory.localRules.a2.lastCast.total++;assert.throws(()=>restore(JSON.stringify(bad)),/localRule/);
});
