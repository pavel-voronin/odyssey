import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {intentionFixture} from '../scripts/intention-scenarios.mjs';
import {visibleAssaults,assessAssistance} from '../modules/intentions.js';
function fixture(){const f=intentionFixture({method:'guard',enemyHp:20,enemyAttack:4,victimHp:20,remaining:999});f.h.personality.generosity=.2;f.h.personality.courage=.2;f.h.memory.people.push(f.victim.id,f.guard.id);f.h.innerLife={facets:[{id:'caution',name:'Caution',weight:6},{id:'loyalty',name:'Loyalty',weight:8}],spokeAt:-240,history:[],lastAssessment:null};setModule(f.s,'inner-life',true);return f;}
test('inner sides change actual assistance and a casualty outcome, within eight ticks',()=>{
 const on=fixture(),off=fixture(),count=Object.keys(on.s.people).length;setModule(off.s,'inner-life',false);
 step(on.s);step(off.s);assert.equal(on.h.intentions.last.method,'guard');assert.equal(on.h.intentions.last.status,'guard-agreed');assert.equal(off.h.intentions.last.method,'leave');assert.equal(on.h.innerLife.assistance.length,1);assert.equal(off.h.innerLife.assistance,undefined);
 for(let i=1;i<8;i++){step(on.s);step(off.s);}assert.equal(on.victim.alive,true);assert.equal(off.victim.alive,false);assert.equal(on.enemy.alive,false);assert.equal(Object.keys(on.s.people).length,count);assert.equal(on.h.kills,0);
});
test('assessment uses witnessed injury and available known helper, never hidden enemy stats',()=>{
 const f=fixture();step(f.s);const e=visibleAssaults(f.s).find(e=>e.person===f.victim.id),before=serialize(f.s);f.guard.status='resident';f.s.society.orders=f.s.society.orders.filter(o=>o.person!==f.guard.id);const snapshot=serialize(f.s),a=assessAssistance(f.s,e);assert.equal(a.method,'guard');assert.equal(serialize(f.s),snapshot);
 Object.assign(f.enemy,{hp:9999,attack:999,mutation:'armored'});const b=assessAssistance(f.s,e);assert.deepEqual(a,b);
 f.enemy.hidden=true;assert.deepEqual(visibleAssaults(f.s),[]);f.enemy.hidden=false;f.s.tick++;assert.deepEqual(visibleAssaults(f.s),[]);
});
test('no eligible known helper means leave; prepared strength permits own intervention; survival veto remains',()=>{
 const f=fixture();step(f.s);const e=visibleAssaults(f.s).find(e=>e.person===f.victim.id);f.guard.agenda.task={kind:'work'};assert.equal(assessAssistance(f.s,e).method,'leave');
 f.h.weapon=6;f.h.personality.courage=.9;f.h.innerLife.facets[0].weight=2;assert.equal(assessAssistance(f.s,e).method,'fight');f.h.hp=20;assert.equal(assessAssistance(f.s,e).method,'leave');
});
test('saved actual choice replays exactly, OFF retains history and corrupt source is rejected',()=>{
 const f=fixture();step(f.s);const copy=restore(serialize(f.s));for(let i=0;i<3;i++){step(f.s);step(copy);}assert.equal(serialize(f.s),serialize(copy));
 setModule(f.s,'inner-life',false);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);const bad=JSON.parse(raw);bad.hero.innerLife.assistance[0].choice='teleport';assert.throws(()=>restore(JSON.stringify(bad)),/assistance/);
});
