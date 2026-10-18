import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {braceAvailable,braceStrength,braceDamage,performBrace,BRACE_ENERGY} from '../modules/brace.js';
import {combatOptions,chooseCombatAction} from '../modules/combat-judgment.js';
import {incomingReply} from '../modules/combat-forecast.js';
import {enemyReply} from '../modules/adversaries.js';
import {combatResponse} from '../modules/combat.js';
import {braceFixture} from '../scripts/brace-scenarios.mjs';
const ctx={log:()=>{},random:()=>.5};

test('a real observed windup permits a full-action brace that spends8energy, deals no hit and still receives the actual charged response',()=>{
 const {s,h,enemy}=braceFixture(),energy=h.energy,hp=h.hp,enemyHp=enemy.hp,forecast=incomingReply(s,enemy,{brace:true});assert.ok(h.defenseMemory.warnings[enemy.id]);step(s);assert.equal(h.lastAction,'guard');assert.equal(h.energy,energy-BRACE_ENERGY);assert.equal(enemy.hp,enemyHp);assert.equal(enemy.battle.turns,2);assert.equal(enemy.battle.intent,'idle');assert.ok(hp-h.hp>=forecast.min&&hp-h.hp<=forecast.max);assert.equal(h.combatJudgment.last.performed,'brace');assert.equal(h.combatJudgment.last.energySpent,8);assert.equal(s.actorFacts.events.some(e=>e.tick===s.tick&&e.kind==='attack'&&e.actor===h.lineage),false);
});
test('the same actual known threat yields defense for a cautious person and the original attack for an adventurous one',()=>{
 const cautious=braceFixture({courage:.1}),bold=braceFixture({courage:.95});assert.equal(chooseCombatAction(cautious.s,cautious.enemy).action,'brace');assert.equal(chooseCombatAction(bold.s,bold.enemy).action,'legacy');const hp=bold.enemy.hp,energy=bold.h.energy;step(cautious.s);step(bold.s);assert.equal(cautious.h.lastAction,'guard');assert.equal(bold.h.lastAction,'attack');assert.ok(bold.enemy.hp<hp);assert.equal(bold.h.energy,energy-3);
});
test('an unknown, stale, other-enemy or disabled windup never creates a guard option or a free source',()=>{
 for(const reason of ['unknown','stale','other','tactics-off']){const f=braceFixture({known:reason!=='unknown'});if(reason==='stale')f.s.tick+=3;if(reason==='other')f.h.defenseMemory.warnings[f.enemy.id].enemy='another-enemy';if(reason==='tactics-off')setModule(f.s,'tactics',false);const before=serialize(f.s);assert.equal(braceAvailable(f.s,f.enemy),false,reason);assert.equal(combatOptions(f.s,f.enemy).some(o=>o.action==='brace'),false);assert.equal(serialize(f.s),before);}
});
test('skill and real worn protection change mitigation, with a finite cap and at least one harm on a landed hit',()=>{
 const f=braceFixture(),basic=braceStrength(f.s);setModule(f.s,'identity',true);f.h.profession='soldier';f.h.stats.might=4;assert.ok(braceStrength(f.s)>basic);setModule(f.s,'equipment',true);f.h.equipment.armor={id:'prepared-physical-mail',slot:'armor',stat:'defense',power:10,modifier:'none'};const gear=braceStrength(f.s);assert.ok(gear>basic);assert.ok(gear<=.65);assert.equal(braceDamage(f.s,f.enemy,1,{preview:true}),1);assert.equal(braceDamage(f.s,f.enemy,0,{preview:true}),0);assert.ok(braceDamage(f.s,f.enemy,1000,{preview:true})>1);
});
test('the guard forecast is pure and bounds all four actual charged rolls through the same physical, racial and mutation protection',()=>{
 for(const race of ['human','orc','halfling'])for(const mutation of ['none','mirror']){const f=braceFixture();setModule(f.s,'lineage',true);f.h.race=race;f.h.armor=1;f.enemy.mutation=mutation;f.enemy.battle.echo=8;f.enemy.powers=['fury','swarm','vampire','venom'];f.enemy.hp=100;const saved=serialize(f.s),forecast=incomingReply(f.s,f.enemy,{brace:true});assert.equal(serialize(f.s),saved);for(let roll=0;roll<4;roll++){const s=restore(saved),h=s.hero,e=s.areas[h.area].objects.find(e=>e.id===f.enemy.id);s.tick++;assert.ok(performBrace(s,e,ctx));const raw=enemyReply(s,e,e.attack+roll,ctx),damage=raw?combatResponse(s,e,Math.max(1,raw-h.armor*2),ctx):0;assert.ok(damage>=forecast.min&&damage<=forecast.max,`${race}/${mutation}/${roll}: ${damage}`);assert.ok(damage>0);}}
});
test('energy and a same-tick receipt prevent duplicate or infinite braces while the enemy remains a real attacker',()=>{
 const f=braceFixture();f.h.energy=8;f.s.tick++;assert.ok(performBrace(f.s,f.enemy,ctx));assert.equal(f.h.energy,0);assert.equal(performBrace(f.s,f.enemy,ctx),false);assert.equal(f.h.defenseMemory.braces,1);assert.equal(braceAvailable(f.s,f.enemy),false);const other=braceFixture();other.h.energy=7;assert.equal(braceAvailable(other.s,other.enemy),false);assert.ok(!combatOptions(other.s,other.enemy).some(o=>o.action==='brace'));
});
test('a defensive frame expires next world tick and cannot protect another enemy or another body',()=>{
 const f=braceFixture();f.s.tick++;assert.ok(performBrace(f.s,f.enemy,ctx));assert.ok(braceDamage(f.s,f.enemy,30)<30);assert.equal(braceDamage(f.s,{...f.enemy,id:'other'},30),30);f.s.tick++;assert.equal(braceDamage(f.s,f.enemy,30),30);assert.ok(createNextStory(f.s,{allowLiving:true}));assert.equal(braceDamage(f.s,f.enemy,30),30);
});
test('module-off freezes remembered warnings and receipts and restores unchanged responses',()=>{
 const f=braceFixture(),before=JSON.stringify(f.h.defenseMemory);setModule(f.s,'brace',false);assert.equal(braceAvailable(f.s,f.enemy),false);assert.equal(performBrace(f.s,f.enemy,ctx),false);assert.equal(braceDamage(f.s,f.enemy,30,{preview:true}),30);assert.equal(JSON.stringify(f.h.defenseMemory),before);assert.equal(serialize(restore(serialize(f.s))),serialize(f.s));
});
test('a partial brace never cancels the enemy charge, recovery or secondary theft',()=>{
 const f=braceFixture();f.enemy.powers=['thief','vampire','regrowth'];f.h.gold=10;step(f.s);assert.equal(f.enemy.battle.turns,2);assert.equal(f.enemy.battle.intent,'idle');assert.equal(f.h.gold,8);assert.ok(f.h.lastDamage>0);assert.ok(f.enemy.hp>990);assert.equal(f.h.defenseMemory.braces,1);
});
test('a later actual poison death gives no remaining guard or body action while the same world continues without a successor',()=>{
 const f=braceFixture();step(f.s);assert.equal(f.h.defenseMemory.braces,1);setModule(f.s,'body',true);f.h.hp=1;f.h.conditions=[{id:'poison',until:100}];f.s.tick=23;const enemyHp=f.enemy.hp,turns=f.enemy.battle.turns,generation=f.s.generation;step(f.s);assert.equal(f.h.alive,false);assert.equal(f.h.lastAction,'death');assert.equal(f.h.defenseMemory.braces,1);assert.equal(f.enemy.hp,enemyHp);assert.equal(f.enemy.battle.turns,turns);step(f.s);assert.equal(f.s.tick,25);assert.equal(f.s.generation,generation);assert.equal(f.s.hero,f.h);assert.equal(f.h.defenseMemory.braces,1);
});
test('a saved observed windup repeats through actual defense and its enemy answer exactly',()=>{
 const f=braceFixture(),copy=restore(serialize(f.s));for(let i=0;i<12;i++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));}assert.ok(f.h.defenseMemory.braces>=1);
});
