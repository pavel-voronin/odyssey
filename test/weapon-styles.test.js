import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {weaponFixture,styleItem} from '../scripts/weapon-styles-scenarios.mjs';
import {combatAttack} from '../modules/combat.js';
import {combatOptions} from '../modules/combat-judgment.js';
import {weaponDamageRange} from '../modules/combat-forecast.js';
import {rememberWeaponRole,weaponKnowledge,recordWeaponHit,beginWeapon,readyWeapon,weaponTick,itemStyle,markNewWeapon,knownWeaponCycle} from '../modules/weapon-styles.js';
import {chooseWeaponStyle} from '../modules/weapon-decision.js';
import {makeItem,receiveItem} from '../modules/inventory.js';
import {weaponStylesHTML} from '../weapon-styles-sheet.js';
const ctx={random:()=>.5,log:()=>{}};

test('heavy preparation spends a whole action and2energy, no hit or helper strike, while the real enemy responds',()=>{
 const {s,h,enemy}=weaponFixture(),hp=h.hp,energy=h.energy,before=enemy.hp;step(s);
 assert.equal(h.lastAction,'windup');assert.equal(enemy.hp,before);assert.equal(h.energy,energy-2);assert.ok(h.hp<hp);assert.equal(enemy.battle.turns,1);assert.equal(h.combatJudgment.last.performed,'windup');assert.equal(s.actorFacts?.events.some(e=>e.kind==='attack'&&e.actor===h.lineage),false);
 const options=combatOptions(s,enemy);assert.equal(options.find(o=>o.id==='windup')?.win,undefined);step(s);assert.equal(h.lastAction,'attack');assert.equal(h.weaponStrike.style,'heavy');assert.equal(h.weaponWindup,undefined);assert.equal(h.weaponLast.status,'released');assert.equal(h.energy,energy-5);assert.ok(enemy.hp<before);
});
test('equal solo summed potential gives different physical sequences and energy costs for two quick hits versus a preparation and release',()=>{
 const quick=weaponFixture({style:'quick'}),heavy=weaponFixture();
 assert.equal(2*combatAttack(quick.s,quick.enemy,10,ctx,'quick'),combatAttack(heavy.s,heavy.enemy,10,ctx,'heavy'));
 step(quick.s);step(heavy.s);assert.ok(quick.enemy.hp<1000);assert.equal(heavy.enemy.hp,1000);assert.equal(quick.h.weaponStrike.style,'quick');assert.equal(heavy.h.lastAction,'windup');step(quick.s);step(heavy.s);assert.equal(quick.h.energy,96);assert.equal(heavy.h.energy,95);assert.equal(quick.s.people[quick.h.lineage].weaponPractice.total,2);assert.equal(heavy.s.people[heavy.h.lineage].weaponPractice.total,1);
});
test('the ordinary familiar attack remains a finishing option instead of forcing a weaker short hit',()=>{
 const f=weaponFixture({style:'quick'});rememberWeaponRole(f.s);const range=weaponDamageRange(f.s,f.enemy);f.enemy.hp=range.min;assert.ok(weaponDamageRange(f.s,f.enemy,'quick').min<range.min);assert.equal(chooseWeaponStyle(f.s,f.enemy),null);step(f.s);assert.equal(f.enemy.alive,false);assert.equal(f.h.weaponStrike,undefined);
});
test('a method needs actual practice or a real physical role, not rank, idle ticks, fabricated damage or a restore',()=>{
 const f=weaponFixture({style:'quick',profession:'merchant'});f.h.career.rank=99;f.h.career.xp=999;const loaded=restore(serialize(f.s));assert.equal(weaponKnowledge(loaded,'quick'),null);
 recordWeaponHit(f.s,f.enemy,10,1010);assert.equal(f.s.people[f.h.lineage].weaponPractice,undefined);
 for(let i=0;i<3;i++){step(f.s);assert.equal(f.h.weaponStrike,undefined);}const p=f.s.people[f.h.lineage];assert.equal(p.weaponPractice.total,3);assert.equal(p.weaponPractice.methods.quick.origin,'practice');assert.equal(p.weaponPractice.methods.quick.source.length,3);const stats=JSON.stringify(f.h.stats);step(f.s);assert.equal(f.h.weaponStrike.style,'quick');assert.equal(JSON.stringify(f.h.stats),stats);f.h.profession='alchemist';assert.ok(weaponKnowledge(f.s,'quick'));assert.ok(weaponKnowledge(restore(serialize(f.s)),'quick'));
});
test('role knowledge has zero invented XP and canonical bounded receipts cannot be credited twice in a world tick',()=>{
 const f=weaponFixture({style:'quick',attack:0});rememberWeaponRole(f.s);const p=f.s.people[f.h.lineage];assert.equal(p.weaponPractice.total,0);assert.equal(p.weaponPractice.methods.quick.source,'profession/soldier');for(let i=0;i<22;i++){f.h.hp=100;f.h.energy=100;step(f.s);recordWeaponHit(f.s,f.enemy,1,f.enemy.hp+1);}assert.equal(p.weaponPractice.total,22);assert.equal(p.weaponPractice.operations.length,16);assert.equal(new Set(p.weaponPractice.operations.map(x=>x.id)).size,16);
});
test('personally witnessed two phases permit timing a guard opening; unknown or stale enemy information does not',()=>{
 const f=weaponFixture({tactic:'warden',courage:.3});rememberWeaponRole(f.s);assert.equal(knownWeaponCycle(f.s,f.enemy),false);assert.equal(chooseWeaponStyle(f.s,f.enemy),null);step(f.s);assert.equal(knownWeaponCycle(f.s,f.enemy),false);step(f.s);assert.equal(knownWeaponCycle(f.s,f.enemy),true);step(f.s);assert.equal(f.enemy.battle.intent,'guard');const decision=chooseWeaponStyle(f.s,f.enemy);assert.equal(decision.id,'windup');assert.match(decision.reason,/смену стоек/);const before=serialize(f.s);combatOptions(f.s,f.enemy);chooseWeaponStyle(f.s,f.enemy);assert.equal(serialize(f.s),before);step(f.s);assert.equal(f.h.lastAction,'windup');assert.equal(f.enemy.battle.intent,'strike');step(f.s);assert.equal(f.h.weaponStrike.style,'heavy');f.s.tick+=3;assert.equal(knownWeaponCycle(f.s,f.enemy),false);
});
test('source item, enemy, place, captivity, missed tick and module toggles cancel paid preparation without refund or a later release',()=>{
 for(const change of ['weapon','enemy','place','captive','expired','disable','identity','equipment']){const f=weaponFixture();step(f.s);const energy=f.h.energy;assert.ok(f.h.weaponWindup);if(change==='weapon')f.h.equipment.weapon=styleItem('heavy','other');if(change==='enemy')f.h.combat='missing';if(change==='place')f.h.area='a0';if(change==='captive')f.s.people[f.h.lineage].status='captive';if(change==='expired')f.s.tick+=3;if(['disable','identity','equipment'].includes(change))setModule(f.s,change==='disable'?'weapon-styles':change,false);f.s.tick++;weaponTick(f.s);assert.equal(readyWeapon(f.s,f.enemy),false,change);assert.equal(f.h.weaponLast?.status,'cancelled',change);assert.equal(f.h.energy,energy,change);assert.equal(f.h.weaponWindup,undefined,change);}
});
test('a successful escape or a healing action abandons the paid windup and still keeps normal combat costs',()=>{
 const f=weaponFixture();step(f.s);f.h.hp=5;f.s.rng=0;step(f.s);assert.equal(f.h.lastAction,'flee');assert.equal(f.h.weaponWindup,undefined);assert.equal(f.h.weaponLast.status,'cancelled');
 const heal=weaponFixture();step(heal.s);heal.h.hp=35;heal.h.inventory.potions=1;heal.enemy.tactic='charged';heal.enemy.battle.intent='idle';step(heal.s);assert.equal(heal.h.lastAction,'heal');assert.equal(heal.h.weaponWindup,undefined);assert.equal(heal.h.inventory.potions,0);
});
test('a later poison death ends the prepared body before any release while the same world continues',()=>{
 const f=weaponFixture();rememberWeaponRole(f.s);f.s.tick++;assert.ok(beginWeapon(f.s,f.enemy,ctx));f.h.hp=1;setModule(f.s,'body',true);f.h.conditions=[{id:'poison',until:100}];f.s.tick=23;const hp=f.enemy.hp,gen=f.s.generation;step(f.s);assert.equal(f.h.alive,false);assert.equal(f.h.weaponWindup,undefined);assert.equal(f.h.weaponLast.status,'cancelled');const practice=JSON.stringify(f.s.people[f.h.lineage].weaponPractice);step(f.s);assert.equal(f.s.tick,25);assert.equal(f.s.generation,gen);assert.equal(f.enemy.hp,hp);assert.equal(JSON.stringify(f.s.people[f.h.lineage].weaponPractice),practice);
});
test('prepared action is not an immediate win and does not evade regrowth, theft, secondary exhaustion or summoning',()=>{
 const f=weaponFixture({tactic:'leech'});f.enemy.powers=['regrowth','thief'];f.enemy.hp=950;f.h.gold=10;rememberWeaponRole(f.s);const option=combatOptions(f.s,f.enemy).find(o=>o.id==='windup');assert.equal(option.win,false);assert.equal(option.mayWin,false);assert.ok(option.reply.max>0);step(f.s);assert.equal(f.h.lastAction,'windup');assert.equal(f.enemy.hp,952);assert.equal(f.h.gold,8);assert.equal(f.h.energy,95);
 const summons=weaponFixture({tactic:'summoner'});summons.enemy.battle.turns=2;step(summons.s);assert.equal(summons.h.lastAction,'windup');assert.equal(summons.enemy.battle.summons,1);
});
test('all damage rolls fit the same forecast through personal bonuses, party assistance, shell, guard, enchantments and known elements',()=>{
 for(const style of ['quick','heavy'])for(const mutation of ['none','shell'])for(const tactic of ['simple','warden'])for(const element of ['normal','frost']){
  const f=weaponFixture();setModule(f.s,'elements',true);setModule(f.s,'enchantments',true);f.enemy.mutation=mutation;f.enemy.tactic=tactic;f.enemy.battle.intent='guard';f.enemy.element=element;f.h.memory.threats[f.enemy.id]={rates:{physical:element==='frost'?.85:1}};f.h.equipment.weapon.modifier='curse';const before=serialize(f.s),range=weaponDamageRange(f.s,f.enemy,style);assert.equal(serialize(f.s),before);for(let roll=0;roll<4;roll++){const raw=4+f.h.weapon*3+Math.floor(f.h.level/2)+roll,damage=combatAttack(f.s,f.enemy,raw,ctx,style);assert.ok(damage>=range.min&&damage<=range.max,`${style}/${mutation}/${tactic}/${element}/${roll}: ${damage} in ${JSON.stringify(range)}`);}
 }
 const f=weaponFixture();setModule(f.s,'companions',true);f.h.companions=[{id:'dog',uid:'helper',attack:3}];assert.equal(combatAttack(f.s,f.enemy,10,ctx,'heavy')-2*combatAttack(f.s,f.enemy,10,ctx,'quick'),-3);
});
test('old neutral equipment and disabled new styles retain ordinary attacks without inventing an item method or RNG draw',()=>{
 const f=weaponFixture();delete f.h.equipment.weapon.weaponStyle;const item=JSON.stringify(f.h.equipment.weapon);step(f.s);assert.equal(f.h.lastAction,'attack');assert.equal(f.h.weaponStrike,undefined);assert.equal(f.s.people[f.h.lineage].weaponPractice,undefined);assert.equal(JSON.stringify(f.h.equipment.weapon),item);
 const a=weaponFixture(),b=restore(serialize(a.s));setModule(b,'weapon-styles',false);let callsA=0,callsB=0;for(let i=0;i<20;i++){makeItem(a.s,{...ctx,random:()=>{callsA++;return .5;}});makeItem(b,{...ctx,random:()=>{callsB++;return .5;}});}assert.equal(callsA,callsB);const old=styleItem();delete old.weaponStyle;assert.equal(itemStyle(old),null);const fresh=styleItem();delete fresh.weaponStyle;markNewWeapon(a.s,fresh);assert.equal(itemStyle(fresh),'heavy');
});
test('one acquisition evaluator uses remembered familiarity without per-tick wardrobe changes or a forced new weapon',()=>{
 const f=weaponFixture({style:'quick'});rememberWeaponRole(f.s);f.h.energy=20;const familiar=f.h.equipment.weapon;const candidate=styleItem('heavy','acquired');receiveItem(f.s,ctx,null,candidate);assert.equal(f.h.equipment.weapon,familiar);assert.ok(f.h.bag.includes(candidate));step(f.s);assert.ok(f.h.bag.includes(candidate));
});
test('saved windups replay exactly, remain owned by their canonical person when another observer is created, and sheet reads are pure',()=>{
 const f=weaponFixture();step(f.s);const text=serialize(f.s),copy=restore(text),id=f.h.lineage;for(let i=0;i<8;i++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));}assert.equal(copy.people[id].weaponPractice.methods.heavy.origin,'role');const before=serialize(copy);assert.match(weaponStylesHTML(copy,String),/Подготовленный удар/);assert.equal(serialize(copy),before);const multi=restore(text);assert.ok(createNextStory(multi,{allowLiving:true}));assert.equal(multi.hero.weaponWindup,undefined);step(multi);assert.equal(multi.actorStates[id].weaponLast.status,'released');assert.ok(multi.people[id].weaponPractice.methods.heavy);
});
test('a charged enemy really advances its windup during preparation and the new threat can replace the release with a brace',()=>{
 const f=weaponFixture({tactic:'charged',courage:.61,attack:14,hp:80,enemyHp:28});setModule(f.s,'brace',true);step(f.s);assert.equal(f.h.lastAction,'windup');assert.equal(f.enemy.hp,28);assert.equal(f.enemy.battle.intent,'strike');assert.equal(f.h.hp,80);step(f.s);assert.equal(f.h.lastAction,'guard');assert.equal(f.h.weaponWindup,undefined);assert.equal(f.enemy.hp,28);assert.equal(f.enemy.battle.intent,'idle');assert.ok(f.h.hp<80);
});
test('affordable existing magic replaces a ready physical release rather than stacking a spell and a strong strike',()=>{
 const f=weaponFixture();step(f.s);f.h.profession='mage';setModule(f.s,'magic',true);f.h.magic={mana:40,maxMana:40,spells:['spark'],cooldowns:{},casts:0};step(f.s);assert.equal(f.h.lastAction,'spell');assert.equal(f.h.magic.casts,1);assert.equal(f.h.weaponWindup,undefined);assert.equal(f.h.weaponStrike,undefined);assert.equal(f.h.weaponLast.status,'cancelled');
});
test('a blocked withdrawal from a suddenly fatal encounter does not preserve a release after actual battle death',()=>{
 const f=weaponFixture();step(f.s);f.enemy.attack=1000;f.h.hp=1;f.s.rng=1600;const gen=f.s.generation;step(f.s);assert.equal(f.h.alive,false);assert.equal(f.h.weaponWindup,undefined);assert.equal(f.h.lastAction,'death');assert.equal(f.h.weaponLast.status,'cancelled');step(f.s);assert.equal(f.s.generation,gen);assert.equal(f.h.lastAction,'death');
});
test('disabled styles freeze learned practice and the public damage forecasts return ordinary rules even with an explicit style request',()=>{
 const f=weaponFixture();rememberWeaponRole(f.s);const known=JSON.stringify(f.s.people[f.h.lineage].weaponPractice);setModule(f.s,'weapon-styles',false);assert.equal(combatAttack(f.s,f.enemy,10,ctx,'heavy'),combatAttack(f.s,f.enemy,10,ctx));assert.deepEqual(weaponDamageRange(f.s,f.enemy,'heavy'),weaponDamageRange(f.s,f.enemy));step(f.s);assert.equal(f.h.lastAction,'attack');assert.equal(JSON.stringify(f.s.people[f.h.lineage].weaponPractice),known);
});
test('a ready guaranteed finishing release takes priority over a defensive brace instead of wasting its paid preparation',()=>{
 const f=weaponFixture({tactic:'charged',courage:.3,attack:14,hp:80,enemyHp:16});setModule(f.s,'brace',true);step(f.s);assert.equal(f.h.lastAction,'windup');assert.equal(f.enemy.battle.intent,'strike');step(f.s);assert.equal(f.enemy.alive,false);assert.equal(f.h.weaponStrike.style,'heavy');assert.equal(f.h.hp,80);assert.equal(f.h.weaponLast.status,'released');
});

