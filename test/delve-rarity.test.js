import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {delvePlan} from '../modules/delves.js';
import {startDelve} from '../modules/delve-attempts.js';
import {canStartPersonalLine} from '../modules/story-rarity.js';
import {newDelveAllowed} from '../modules/delve-rarity.js';
import {rescueStartFixture} from '../scripts/dungeon-rescue-scenarios.mjs';
function fixture(){
 const {s,h,source}=rescueStartFixture(),gate=s.areas.a2;gate.dungeon={root:gate.id,floor:1,cleared:false};gate.type='dungeon';source.links=[gate.id];h.storyRarity={affinity:{expedition:true,mystery:true},budget:1,started:0,nextEligible:0};
 const ctx={log:()=>{},expeditionReady:()=>true,goal:(s,kind,area,x,intent,reason,extra)=>h.goal={kind,area,x,intent,reason,...extra}};return {s,h,gate,ctx};
}
test('new dungeon opportunity needs a rare affinity, shared budget and due date without drawing again',()=>{
 const {s,h,ctx}=fixture(),rng=JSON.stringify(s.randomStreams);h.storyRarity.affinity.expedition=false;assert.equal(delvePlan(s,ctx),false);assert.equal(h.delve,undefined);
 h.storyRarity.affinity.expedition=true;h.storyRarity.nextEligible=s.tick+1;assert.equal(delvePlan(s,ctx),false);h.storyRarity.nextEligible=0;h.storyRarity.started=1;assert.equal(delvePlan(s,ctx),false);assert.equal(JSON.stringify(s.randomStreams),rng);
});
test('accepted real dungeon starts claim exactly one opportunity after preparation, and every hall can continue',()=>{
 const {s,h,gate,ctx}=fixture();assert.equal(delvePlan(s,ctx),true);assert.deepEqual(h.storyRarity.delves,[gate.id]);assert.equal(h.storyRarity.started,1);const id=h.delve.attemptId;
 for(let i=0;i<10;i++){s.tick++;assert.equal(delvePlan(s,ctx),true);assert.equal(h.delve.attemptId,id);assert.equal(h.storyRarity.started,1);}
 assert.equal(canStartPersonalLine(s,'mystery'),false);assert.equal(h.goal.delve,true);
});
test('failed actual preparation neither consumes the lifetime allowance nor creates an attempt',()=>{
 const {s,h,ctx}=fixture(),r=JSON.stringify(h.storyRarity);ctx.expeditionReady=()=>false;ctx.prepareExpedition=()=>true;assert.equal(delvePlan(s,ctx),true);assert.equal(h.delve,undefined);assert.equal(JSON.stringify(h.storyRarity),r);assert.equal(h.delveMemory,undefined);
});
test('a promised rescue is not a newly rolled curiosity and does not consume a second personal line',()=>{
 const {s,h,gate,ctx}=fixture();h.storyRarity={affinity:{},budget:0,started:3,nextEligible:1e9};h.quests=[{id:'given-word',kind:'rescue',status:'active',target:gate.id,deadline:s.tick+100}];const r=JSON.stringify(h.storyRarity);assert.equal(delvePlan(s,ctx),true);assert.equal(h.delveMemory.places[gate.id].reason,'promise:rescue');assert.equal(JSON.stringify(h.storyRarity),r);
});
test('a current OFF-started expedition continues after reload and enable without a retroactive rarity claim',()=>{
 const f=fixture();f.h.delve={root:f.gate.id,room:f.gate.id,started:f.s.tick,floors:3,cleared:0};setModule(f.s,'delve-attempts',false);startDelve(f.s,f.h.delve,'curiosity');setModule(f.s,'delve-attempts',true);f.h.storyRarity={affinity:{},budget:0,started:5,nextEligible:1e9};const s=restore(serialize(f.s));let planned=false;assert.equal(delvePlan(s,{log:()=>{},goal:()=>planned=true}),true);assert.ok(planned);assert.equal(s.hero.storyRarity.started,5);assert.equal(s.hero.storyRarity.delves,undefined);assert.equal(s.hero.delveMemory.adoptions,1);
});
test('known former attempt is never rerolled and a separate new root cannot bypass family rarity',()=>{
 const {s,h}=fixture();h.storyRarity.delves=['former'];h.storyRarity.budget=2;assert.equal(newDelveAllowed(s,null,'curiosity'),false);assert.equal(newDelveAllowed(s,{root:'former'},'recovered'),true);assert.equal(newDelveAllowed(s,null,'promise:rescue'),true);
});
test('either frequency switch restores ordinary opportunity rules without erasing remembered roots',()=>{
 for(const id of ['delve-rarity','story-rarity']){const {s,h,ctx}=fixture();h.storyRarity={affinity:{},budget:0,started:5,nextEligible:1e9,delves:['old']};const before=JSON.stringify(h.storyRarity);setModule(s,id,false);assert.equal(delvePlan(s,ctx),true);assert.equal(JSON.stringify(h.storyRarity),before);}
});
