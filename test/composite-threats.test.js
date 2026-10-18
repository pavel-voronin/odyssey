import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {initializeEnemyTraits,enemyDamage,enemyReply} from '../modules/adversaries.js';
import {constrainThreat,knownComposition,observeThreat} from '../modules/composite-threats.js';
import {chooseCombatAction} from '../modules/combat-judgment.js';
import {compositionFixture} from '../scripts/composite-threat-scenarios.mjs';
const ctx={log:()=>{}};
function learn(f){enemyDamage(f.s,f.enemy,10,'physical',ctx);enemyDamage(f.s,f.enemy,10,'fire',ctx);enemyReply(f.s,f.enemy,3,ctx);}
test('untried properties do not grant personal composition knowledge or consume any RNG',()=>{
 const {s,enemy}=compositionFixture();const before=serialize(s);assert.equal(knownComposition(s,enemy),null);chooseCombatAction(s,enemy);assert.equal(serialize(s),before);assert.equal(s.hero.threatCompositions,undefined);
});
test('real weapon mitigation and reflected spell pressure lead to different actual autonomous actions',()=>{
 const shell=compositionFixture('shell'),mirror=compositionFixture('mirror');learn(shell);learn(mirror);shell.enemy.battle.intent=mirror.enemy.battle.intent='guard';
 assert.equal(knownComposition(shell.s,shell.enemy),'shell-warden');assert.equal(knownComposition(mirror.s,mirror.enemy),'mirror-warden');
 assert.equal(chooseCombatAction(shell.s,shell.enemy).action,'spell');assert.equal(chooseCombatAction(mirror.s,mirror.enemy).action,'attack');
 const gold=shell.h.gold,xp=shell.h.xp;step(shell.s);step(mirror.s);assert.equal(shell.h.lastAction,'spell');assert.equal(mirror.h.lastAction,'attack');assert.ok(shell.h.magic.mana<40);assert.equal(mirror.h.magic.mana,40);assert.ok(shell.enemy.hp<mirror.enemy.hp);assert.equal(shell.h.gold,gold);assert.equal(shell.h.xp,xp);
});
test('a cold start really learns reflection during autonomous combat rather than on restore',()=>{
 const {s,h,enemy}=compositionFixture();let observed=false,adapted=false;
 for(let i=0;i<12&&enemy.alive&&h.alive;i++){step(s);observed ||= Boolean(h.threatCompositions?.[enemy.id]?.facts.mirror);adapted ||= h.combatJudgment?.last?.reason.includes('зеркало возвращает');}
 assert.ok(observed);assert.ok(adapted);assert.equal(s.journal.filter(e=>e.text.includes('возвращаются сдачей')).length,1);
});
test('unsafe reflection cannot override actual lethal-reply retreat or conjure an unavailable spell',()=>{
 const f=compositionFixture();learn(f);f.h.hp=3;assert.equal(chooseCombatAction(f.s,f.enemy).action,'flee');
 const shell=compositionFixture('shell');learn(shell);shell.enemy.battle.intent='guard';shell.h.magic.mana=0;assert.notEqual(chooseCombatAction(shell.s,shell.enemy).action,'spell');
 shell.h.magic.mana=40;shell.h.magic.cooldowns.spark=shell.s.tick+99;assert.notEqual(chooseCombatAction(shell.s,shell.enemy).action,'spell');
});
test('knowledge belongs to its actual enemy, location and observer and survives v1 roundtrip',()=>{
 const f=compositionFixture();learn(f);const data=serialize(f.s),r=restore(data);assert.deepEqual(r.hero.threatCompositions,f.h.threatCompositions);assert.equal(serialize(r),data);
 const other={...f.enemy,id:'unknown-other'};assert.equal(knownComposition(f.s,other),null);
 const count=Object.keys(f.h.threatCompositions).length;observeThreat(f.s,{...f.enemy,id:'remote'},'mirror','echo',ctx);assert.equal(Object.keys(f.h.threatCompositions).length,count);
});
test('module OFF preserves earned knowledge and restores the former spell choice',()=>{
 const f=compositionFixture();learn(f);f.enemy.battle.intent='guard';const memory=JSON.stringify(f.h.threatCompositions);setModule(f.s,'composite-threats',false);assert.equal(knownComposition(f.s,f.enemy),null);step(f.s);assert.equal(f.h.lastAction,'spell');assert.equal(JSON.stringify(f.h.threatCompositions),memory);
});
test('observations and asides are bounded, deduplicated and never pay or advance the world',()=>{
 const {s,h,enemy}=compositionFixture(),tick=s.tick,gold=h.gold,xp=h.xp;let lines=0;const ctx={log:()=>lines++};
 for(let i=0;i<100;i++)observeThreat(s,enemy,'mirror','echo',ctx);assert.equal(lines,1);
 for(let i=0;i<35;i++){const e={...enemy,id:'seen-'+i};s.areas[h.area].objects.push(e);s.tick=i;observeThreat(s,e,'warden','guard',ctx);}
 assert.equal(Object.keys(h.threatCompositions).length,24);assert.equal(h.gold,gold);assert.equal(h.xp,xp);assert.equal(tick,0);
});
test('construction caps property complexity to actual area danger, excludes duplicates and double evasion without weakening old enemies',()=>{
 const s=createWorld(1);for(let danger=0;danger<12;danger++){
  const e={baseName:'Испытуемый',name:'старое имя',mutation:'phase',tactic:'summoner',element:'fire',powers:['plain','temporal','temporal','fury','vampire']},hp=400,attack=70;e.hp=hp;e.attack=attack;
  constrainThreat(s,{danger},e);assert.ok(e.composition.cost<=e.composition.budget);assert.ok(e.composition.budget<=6);assert.equal(e.powers.includes('plain')&&e.powers.length>1,false);assert.equal(e.mutation==='phase'&&e.powers.includes('temporal'),false);assert.equal(new Set(e.powers).size,e.powers.length);assert.equal(e.hp,hp);assert.equal(e.attack,attack);assert.equal(e.name.includes('старое имя'),false);
 }
});
test('legacy uninitialised and already initialised bodies never acquire generation caps retroactively',()=>{
 const s=createWorld(1),a={id:'old-room',danger:0};for(const version of [undefined,1]){
  const e={name:'Старый страж',baseName:'Страж',alive:true,element:'fire',mutation:'mirror',tactic:'summoner',powers:['vampire','fury'],adversaryVersion:version};initializeEnemyTraits(s,a,e);assert.equal(e.composition,undefined);assert.equal(e.tactic,'summoner');assert.deepEqual(e.powers,['vampire','fury']);
 }
});
test('construction OFF leaves all original properties and random streams intact',()=>{
 const s=createWorld(1);setModule(s,'composite-threats',false);const e={name:'Прежний',mutation:'phase',tactic:'summoner',element:'fire',powers:['plain','temporal']},before=JSON.stringify(e),rng=JSON.stringify(s.randomStreams);constrainThreat(s,{danger:0},e);assert.equal(JSON.stringify(e),before);assert.equal(JSON.stringify(s.randomStreams),rng);
});
