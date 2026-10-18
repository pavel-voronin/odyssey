import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {recordLastingInjury,injuryPart,injurySummary} from '../modules/injury-state.js';
import {injuryFixture} from '../scripts/injury-scenarios.mjs';
import {heroAppearance,personAppearance} from '../appearance.js';
import {portraitModel} from '../portrait.js';
import {drawHead} from '../actor-head.js';
import {syncActiveActor} from '../actor-projection.js';
import {partyCombatFixture} from '../scripts/party-combat-scenarios.mjs';
import {hurtCompanion} from '../modules/social.js';

test('one survived meaningful cutting cause leaves one stable mark on the same person, separate from conditions',()=>{
 const {s,h,p,enemy,mark}=injuryFixture(),look=heroAppearance(s),conditions=structuredClone(h.conditions),appearance=structuredClone(h.appearance),id=h.lineage;
 assert.equal(mark.kind,'scar');assert.equal(mark.part,'face');assert.equal(mark.cause.damage,30);assert.equal(mark.cause.enemy,enemy.id);assert.deepEqual(look.injuryMarks,[{kind:'scar',part:'face'}]);assert.match(injurySummary(p),/Шрам/);
 const raw=serialize(s);recordLastingInjury(s,p,enemy,{before:100,after:70,maximum:100,area:h.area,controller:'actor'},{log:()=>{}});assert.equal(serialize(s),raw);const copy=restore(raw);assert.equal(serialize(copy),raw);assert.equal(copy.hero.lineage,id);assert.deepEqual(heroAppearance(copy),look);assert.deepEqual(copy.hero.appearance,appearance);assert.deepEqual(copy.hero.conditions,conditions);assert.deepEqual(portraitModel(s).look.injuryMarks,look.injuryMarks);
});
test('only selected anatomically compatible marks are possible: flesh, fungal cap and mechanical scorch',()=>{
 for(const [race,kind,part]of [['human','scar','face'],['myconid','burn','cap'],['automaton','burn','plating']]){const {p,s}=injuryFixture({race,kind});assert.equal(p.trauma.marks[0].part,part);assert.deepEqual(personAppearance(s,p).injuryMarks,heroAppearance(s).injuryMarks);}
 assert.equal(injuryPart({race:'automaton'},'scar'),null);assert.equal(injuryPart({race:'ghost'},'burn'),null);assert.equal(injuryPart({race:'human',anatomy:{parts:['torso']}},'scar'),null);assert.equal(injuryPart({race:'myconid',anatomy:{missing:['cap']}},'burn'),null);
});
test('zero, weak, fatal, absent-part and untyped losses cannot mint permanent scars; OFF preserves a previous mark',()=>{
 const {s,h,p,enemy}=injuryFixture();const prior=structuredClone(p.trauma);setModule(s,'lasting-injuries',false);const raw=serialize(s);assert.equal(recordLastingInjury(s,p,enemy,{before:100,after:70,maximum:100,area:h.area},{}),null);assert.equal(serialize(s),raw);assert.deepEqual(heroAppearance(s).injuryMarks,[{kind:'scar',part:'face'}]);setModule(s,'lasting-injuries',true);delete p.trauma;
 for(const after of [100,99,0]){h.hp=after;assert.equal(recordLastingInjury(s,p,enemy,{before:100,after,maximum:100,area:h.area},{}),null);}h.hp=70;p.anatomy={parts:[]};assert.equal(recordLastingInjury(s,p,enemy,{before:100,after:70,maximum:100,area:h.area},{}),null);delete p.anatomy;enemy.species='slime';assert.equal(recordLastingInjury(s,p,enemy,{before:100,after:70,maximum:100,area:h.area},{}),null);assert.equal(p.trauma,undefined);p.trauma=prior;
});
test('the bounded conditional rarity gate rejects most otherwise eligible causes without consuming RNG (24 inputs)',()=>{
 const {s,h,p,enemy}=injuryFixture(),rng=s.rng,streams=JSON.stringify(s.randomStreams);let count=0;delete p.trauma;
 for(let i=0;i<24;i++){enemy.id='bounded-cut-'+i;h.hp=70;const mark=recordLastingInjury(s,p,enemy,{before:100,after:70,maximum:100,area:h.area},{log:()=>{}});if(mark)count++;delete p.trauma;}
 assert.ok(count>0&&count<8);assert.equal(s.rng,rng);assert.equal(JSON.stringify(s.randomStreams),streams);
});
test('a single actual engine reply records the prepared injury once and replays through saving',()=>{
 const {s,h,p,enemy,mark}=injuryFixture();delete p.trauma;s.tick=0;h.hp=100;h.energy=100;h.combat=enemy.id;h.goal={kind:'hunt',area:h.area,x:enemy.x,object:enemy.id,started:0};syncActiveActor(s);const copy=restore(serialize(s));step(s);step(copy);assert.equal(serialize(s),serialize(copy));assert.equal(p.trauma.marks[0].id,mark.id);assert.ok(p.trauma.marks[0].cause.damage>=27);assert.ok(h.hp>0);assert.equal(s.tick,1);
});
test('head painter and portrait include the canonical mark while all look queries remain read-only',()=>{
 const {s}=injuryFixture({race:'myconid',kind:'burn'}),raw=serialize(s),look=heroAppearance(s),ops=[],c=new Proxy({}, {get:(_,key)=>(...args)=>ops.push([key,...args]),set:(obj,key,value)=>{ops.push([key,value]);obj[key]=value;return true;}});drawHead(c,look,{id:'myconid',skin:'#c1ae96'});assert.ok(ops.some(o=>o[0]==='fillRect'&&o[1]===-3&&o[2]===-44));assert.deepEqual(portraitModel(s).look.injuryMarks,look.injuryMarks);assert.equal(serialize(s),raw);
});
test('the same actual intercepted party wound records only that existing person and source, not a second body or damage',()=>{
 const {s,h,e,guard,ctx}=partyCombatFixture({roles:['guard']}),p=guard.person,c=guard.companion;setModule(s,'lasting-injuries',true);setModule(s,'elements',true);e.element='fire';s.tick=1;p.health=70;p.maxHealth=100;let found=false;
 for(let i=0;i<48&&!found;i++){e.id='guard-burn-'+i;found=Boolean(recordLastingInjury(s,p,e,{before:100,after:70,maximum:100,area:h.area,controller:'party'},ctx));}assert.ok(found);delete p.trauma;p.health=100;c.hp=c.maxHp=30;const people=s.nextPerson;hurtCompanion(s,c,9,ctx,e.id);assert.equal(p.health,70);assert.equal(c.hp,21);assert.equal(p.trauma.marks.length,1);assert.equal(p.trauma.marks[0].cause.controller,'party');assert.equal(p.trauma.marks[0].cause.damage,30);assert.equal(s.nextPerson,people);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
