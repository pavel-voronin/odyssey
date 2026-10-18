import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {knownCausalHistory} from '../modules/causal-history.js';
import {causalHistoryHTML} from '../causal-history-sheet.js';
import {commitmentPlan,commitmentTick} from '../modules/commitments.js';
import {buyUpgrade} from '../modules/finances.js';
import {equipmentPrice} from '../modules/prices.js';
import {workTick} from '../modules/work.js';
import {causalFixture,causalEarning,personalContext,causalContext as ctx} from '../scripts/causal-history-scenarios.mjs';
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kinds=s=>knownCausalHistory(s)?.events.map(e=>e.kind)||[];

test('an actual retreat starts a chain from its existing memory without inventing another planner or price',()=>{
 const s=createWorld(11),h=s.hero;for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['commitments','causal-history'])setModule(s,id,true);const e=s.areas.a2.objects.find(o=>o.kind==='enemy');Object.assign(h,{area:'a2',x:e.x,combat:e.id,energy:1,weapon:0});h.inventory.potions=0;for(let i=0;i<4&&h.lastAction!=='flee';i++)step(s);assert.equal(h.lastAction,'flee');assert.deepEqual(kinds(s),['retreat','intent']);assert.equal(knownCausalHistory(s).cause,h.commitments.personal.cause);assert.equal(knownCausalHistory(s).events[0].enemy,e.id);
});
test('only the explicitly caused completed wage job joins the chain, never an unfinished or unrelated wage',()=>{
 const f=causalFixture(),{s,h,a}=f;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:1};s.tick++;workTick(s,ctx);assert.ok(!kinds(s).includes('work'));h.goal=null;causalEarning(f);const records=knownCausalHistory(s).events.filter(e=>e.kind==='work');assert.equal(records.length,1);assert.equal(records[0].pay,10);assert.equal(records[0].name,'Починить инструменты');assert.ok(records[0].id.startsWith(h.commitments.personal.cause+'/'));assert.equal(h.gold,10);
});
test('a real successful weapon purchase is linked by the goal cause and preparation is a separate fact',()=>{
 const {s,h,a}=causalFixture();h.gold=100;h.x=58;assert.ok(commitmentPlan(s,null,false,ctx));const price=equipmentPrice(s,'weapon',a.id),gold=h.gold;assert.ok(buyUpgrade(s,ctx));assert.equal(h.gold,gold-price);assert.equal(knownCausalHistory(s).events.filter(e=>e.kind==='purchase').length,1);commitmentTick(s,ctx);assert.equal(h.commitments.personal.status,'done');assert.ok(kinds(s).includes('prepared'));assert.ok(!kinds(s).includes('returned'));
});
test('equipment acquired without a linked purchase never becomes an invented trade, and unrelated trade stays unrelated',()=>{
 const {s,h}=causalFixture();h.weapon=1;commitmentTick(s,ctx);assert.ok(kinds(s).includes('prepared'));assert.ok(!kinds(s).includes('purchase'));h.goal={kind:'trade'};h.x=58;h.gold=100;buyUpgrade(s,ctx);assert.ok(!kinds(s).includes('purchase'));
});
test('a witnessed actual later encounter with the original enemy completes return once, not a remote enemy update',()=>{
 const f=causalFixture(),{s,h,enemy}=f;h.weapon=1;commitmentTick(s,ctx);enemy.hp=enemy.maxHp=1000;enemy.attack=1;h.area='a1';enemy.hp--;assert.ok(!kinds(s).includes('returned'));Object.assign(h,{area:'a2',x:enemy.x,combat:enemy.id,energy:100});step(s);assert.equal(knownCausalHistory(s).events.filter(e=>e.kind==='returned').length,1);step(s);assert.equal(knownCausalHistory(s).events.filter(e=>e.kind==='returned').length,1);
});
test('a genuinely expired preparation records refusal rather than a fictional purchase or return',()=>{
 const {s,h}=causalFixture();s.tick=1801;commitmentTick(s,ctx);assert.equal(h.commitments.personal.status,'abandoned');assert.ok(kinds(s).includes('abandoned'));assert.ok(!kinds(s).includes('purchase'));assert.ok(!kinds(s).includes('returned'));
});
test('old missing actions and cause memory stay explicitly partial instead of joining nearby journal text or secret NPC facts',()=>{
 const {s,h}=causalFixture();delete h.causalHistory;h.commitments.memories=[];h.actorJournal.unshift({tick:0,text:'Купил оружие и победил дракона'});s.people[Object.keys(s.people)[0]].privateFact='СЕКРЕТНАЯ ПЛАНЕТА';const before=serialize(s);const html=causalHistoryHTML(s,escape);assert.match(html,/Часть действий не записана/);assert.match(html,/Исходное отступление/);assert.ok(!html.includes('СЕКРЕТНАЯ'));assert.ok(!html.includes('победил дракона'));assert.ok(!kinds(s).includes('purchase'));assert.equal(serialize(s),before);
});
test('the sheet cause references resolve to actual event IDs, escape names and are pure across repeated reads and restore',()=>{
 const {s,h}=causalFixture();h.causalHistory[0].events[0].name='<img src=x onerror=alert(1)>';const before=serialize(s),html=causalHistoryHTML(s,escape);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));for(const [,id]of html.matchAll(/data-cause-link="([^"]+)"/g))assert.ok(html.includes('id="'+id+'"'));for(let i=0;i<30;i++){knownCausalHistory(s);causalHistoryHTML(s,escape);}assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
});
test('module-off or commitments-off preserves existing chains and performs the original action without another causal record',()=>{
 for(const flag of ['causal-history','commitments']){const {s,h}=causalFixture(),before=JSON.stringify(h.causalHistory);setModule(s,flag,false);h.weapon=1;commitmentTick(s,ctx);assert.equal(JSON.stringify(h.causalHistory),before);assert.equal(causalHistoryHTML(s,escape),'');}
});
test('a real action continuation preserves the full chain through checkpoint restore without changing the work or money',()=>{
 const f=causalFixture();f.h.gold=2;assert.ok(commitmentPlan(f.s,null,false,personalContext(f.s)));let copy=restore(serialize(f.s));for(let i=0;i<6;i++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));if(i===2)copy=restore(serialize(copy));}assert.equal(knownCausalHistory(f.s).events.filter(e=>e.kind==='work').length,1);
});
