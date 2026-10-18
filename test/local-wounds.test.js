import {positionFixture,untilPosition} from '../scripts/position-scenarios.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {meaningFixture} from '../scripts/event-meaning-scenarios.mjs';
import {setModule} from '../rules.js';import {step,serialize,restore} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {recordLocalWound} from '../modules/wound-events.js';
import {woundParts,woundStride,woundForce,woundFocus,woundActivity,woundSummary} from '../modules/wound-state.js';
import {woundsTick} from '../modules/wound-world.js';import {walkingEnergy} from '../modules/armor.js';
import {foodWalkingStride} from '../modules/hearth-food.js';import {weaponDamageRange} from '../modules/combat-forecast.js';
import {availableCombatSpells} from '../modules/magic.js';import {teachSpell} from '../modules/magic.js';
import {workTick} from '../modules/work.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
function fixture({part,race='human'}={}){const f=meaningFixture();f.p=f.s.people[f.h.lineage];f.p.race=f.h.race=race;if(part)f.p.anatomy={parts:[part]};setModule(f.s,'local-wounds',true);f.enemy.species='wolf';f.enemy.damageType='cut';f.enemy.attack=15;return f;}
function hit(f,damage=20,lane='test'){const before=f.h.hp;f.h.hp-=damage;syncActiveActor(f.s);const receipt={before,after:f.h.hp,maximum:f.h.maxHp,area:f.h.area,controller:lane};return {w:recordLocalWound(f.s,f.p,f.enemy,receipt),receipt};}
function clock(f,n,{rest=false,role='body'}={}){for(let i=0;i<n;i++){woundActivity(f.s,f.p,role,rest);f.s.tick++;woundsTick(f.s,{bleed(p,h,n){h.hp=Math.max(0,h.hp-n);syncActiveActor(f.s);}});}}

test('one real engine hit records one canonical injury without a second debit or a repeated receipt after restore',()=>{
 const f=fixture();const hp=f.h.hp;step(f.s);assert.ok(f.h.hp<hp);const t=f.p.localWounds;assert.ok(t?.active.length);const w=t.active[0],c=w.lastCause;assert.equal(hp-f.h.hp,c.before-c.after);assert.equal(f.h.hp,c.after);assert.equal(f.h.localWounds,undefined);const raw=serialize(f.s);recordLocalWound(f.s,f.p,f.enemy,c);assert.equal(serialize(f.s),raw);const copy=restore(raw);assert.equal(serialize(copy),raw);for(let i=0;i<8;i++){step(f.s);step(copy);assert.equal(serialize(copy),serialize(f.s));}exact(f.s);
 const cover=positionFixture();cover.enemy.attack=20;setModule(cover.s,'local-wounds',true);untilPosition(cover,f=>f.enemy.positionAttack.last?.kind==='blocked');assert.equal(cover.s.people[cover.h.lineage].localWounds,undefined);step(cover.s);assert.equal(cover.enemy.positionAttack.last.kind,'approach');assert.equal(cover.s.people[cover.h.lineage].localWounds,undefined);step(cover.s);assert.ok(cover.s.people[cover.h.lineage].localWounds?.active.length);exact(cover.s);
});
test('equal HP with an arm or leg injury affects its own actual force, stride and walking energy',()=>{
 const arm=fixture({part:'leftArm'}),leg=fixture({part:'leftLeg'});hit(arm);hit(leg);clock(arm,1);clock(leg,1);assert.equal(arm.h.hp,leg.h.hp);assert.ok(woundForce(arm.s)<woundForce(leg.s));assert.ok(foodWalkingStride(leg.s)<foodWalkingStride(arm.s));assert.ok(walkingEnergy(leg.s,{energy:1})>walkingEnergy(arm.s,{energy:1}));assert.ok(weaponDamageRange(arm.s,arm.enemy).max<weaponDamageRange(leg.s,leg.enemy).max);exact(arm.s);exact(leg.s);
});
test('cuts close before their function recovers, bruises have no blood, and finite safe fed rest beats loading the injured role',()=>{
 const cut=fixture({part:'leftLeg'}),bruise=fixture({part:'leftDrive',race:'automaton'});const a=hit(cut).w,b=hit(bruise).w;cut.enemy.alive=bruise.enemy.alive=false;assert.equal(a.kind,'cut');assert.equal(b.kind,'bruise');const hp=bruise.h.hp;clock(cut,28,{rest:true});clock(bruise,28,{rest:true});assert.equal(a.closure,100);assert.ok(a.function<100);assert.ok(b.function>a.function);assert.equal(bruise.h.hp,hp);clock(cut,52,{rest:true});assert.equal(cut.p.localWounds.active.length,0);assert.equal(cut.p.localWounds.healed,1);
 const rest=fixture({part:'leftLeg'}),load=fixture({part:'leftLeg'});hit(rest);hit(load);rest.enemy.alive=load.enemy.alive=false;clock(rest,16,{rest:true});clock(load,16,{role:'leg'});assert.ok(rest.p.localWounds.active[0].closure>load.p.localWounds.active[0].closure);assert.ok(load.h.hp<80);exact(rest.s);exact(load.s);
});
test('HP medicine does not erase a wound and severe head impairment blocks complex spells without deleting knowledge',()=>{
 const f=fixture({part:'head'});hit(f,70);clock(f,1);assert.equal(woundFocus(f.s),false);setModule(f.s,'magic',true);teachSpell(f.s,'borrow',{log(){}},'Known spell');const spells=[...f.h.magic.spells];assert.deepEqual(availableCombatSpells(f.s),[]);f.h.inventory.potions=1;const wounds=structuredClone(f.p.localWounds.active),before=f.h.hp;step(f.s);assert.ok(f.h.hp>before);assert.equal(f.h.inventory.potions,0);assert.equal(f.p.localWounds.active.length,wounds.length);assert.equal(f.p.localWounds.active[0].id,wounds[0].id);assert.deepEqual(f.h.magic.spells,spells);exact(f.s);
});
test('anatomy is compatible, weak or stopped hits make no wounds, and OFF/load never invents past injuries',()=>{
 assert.equal(woundParts({race:'myconid'}).some(([p])=>p==='leftLeg'),false);assert.equal(woundParts({race:'automaton'}).some(([p])=>p==='leftArm'),false);assert.deepEqual(woundParts({race:'unknown'}),[['surface','поверхность тела','body']]);
 const f=fixture();assert.equal(hit(f,1).w,null);assert.equal(f.p.localWounds,undefined);exact(f.s);hit(f,20);const t=structuredClone(f.p.localWounds);setModule(f.s,'local-wounds',false);clock(f,8);assert.deepEqual(f.p.localWounds,t);assert.equal(woundStride(f.s),1);exact(f.s);setModule(f.s,'local-wounds',true);clock(f,1);assert.equal(f.p.localWounds.lastTick,f.s.tick);const clean=fixture();assert.equal(restore(serialize(clean.s)).people[clean.p.id].localWounds,undefined);
});
test('active sites merge with bounded current hit IDs, keep both actual causes and reject forged current forms',()=>{
 const f=fixture({part:'leftLeg'});f.enemy.species='stone';f.enemy.damageType='blunt';const first=hit(f,10,'one').w;f.s.tick++;const next=hit(f,10,'two').w;assert.equal(next,first);assert.equal(f.p.localWounds.active.length,1);assert.notEqual(first.firstCause.id,first.lastCause.id);assert.equal(first.severity,2);exact(f.s);const bad=JSON.parse(serialize(f.s));bad.people[f.p.id].localWounds.active[0].part='leftArm';assert.throws(()=>restore(JSON.stringify(bad)),/wound/i);const raw=serialize(f.s);woundSummary(f.p);assert.equal(serialize(f.s),raw);
 const reopened=fixture({part:'leftLeg'});const prior=hit(reopened).w;reopened.enemy.alive=false;clock(reopened,38,{rest:true});assert.equal(prior.closure,100);assert.ok(prior.function>0&&prior.function<100);const old=prior.lastCause;reopened.enemy.alive=true;hit(reopened,10);assert.equal(reopened.p.localWounds.active.length,1);assert.equal(prior.closure,0);assert.ok(prior.function<=25);exact(reopened.s);const saved=serialize(reopened.s);assert.equal(recordLocalWound(reopened.s,reopened.p,reopened.enemy,old),null);assert.equal(serialize(reopened.s),saved);
});
test('arm injury increases the energy of one ordinary work phase without changing finite job units or inventing another action',()=>{
 const arm=fixture({part:'leftArm'}),leg=fixture({part:'leftLeg'});hit(arm);hit(leg);clock(arm,1);clock(leg,1);
 for(const f of [arm,leg]){setModule(f.s,'work',true);f.h.goal={kind:'work',job:'dock',remaining:4,area:f.h.area,x:f.h.x,started:f.s.tick};workTick(f.s,{log(){}});assert.equal(f.h.goal.remaining,3);assert.equal(f.h.lastAction,'work');exact(f.s);}assert.ok(arm.h.energy<leg.h.energy);
});
test('world time processes a different canonical resident and a fatal ongoing bleed once; observing that person is unnecessary',()=>{
 const f=fixture(),p=Object.values(f.s.people).find(p=>p.alive&&p.id!==f.h.lineage);p.area=f.h.area;p.x=f.enemy.x;p.health=1;p.race='human';p.anatomy={parts:['leftLeg']};
 const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
 const controller=['blood0','blood1','blood2','blood3'].find(c=>hash(f.s.seed+'/'+JSON.stringify([p.id,f.s.tick,f.enemy.id,c]))%4!==0);
 const w=recordLocalWound(f.s,p,f.enemy,{before:100,after:1,maximum:100,area:p.area,controller});assert.equal(w.kind,'cut');f.enemy.alive=false;const copy=restore(serialize(f.s));
 for(let i=0;i<8;i++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));}assert.equal(p.alive,false);assert.equal(p.health,0);assert.equal(p.died,f.s.tick);assert.equal(f.h.lineage,f.s.hero.lineage);const died=p.died;step(f.s);assert.equal(p.died,died);assert.equal(f.s.woundClock.active.includes(p.id),false);exact(f.s);
 const actor=fixture({part:'leftLeg'});assert.equal(hit(actor,99).w.kind,'cut');clock(actor,7);assert.equal(actor.h.hp,1);step(actor.s);assert.equal(actor.h.alive,false);assert.equal(actor.h.hp,0);assert.equal(actor.h.life.ended,true);const lineage=actor.h.lineage;step(actor.s);assert.equal(actor.s.hero.lineage,lineage);exact(actor.s);
});
