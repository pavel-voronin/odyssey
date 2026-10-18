import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {noticeMisjudgment,principlePlan,reflectPrinciple,verifyGuiltPrinciple,principledClue} from '../modules/principles.js';
import * as mysteries from '../modules/mysteries.js';
import {principleFixture,prepareSecondCase,principleContext as ctx} from '../scripts/principles-scenarios.mjs';
function adopt(f){assert.ok(principlePlan(f.s,ctx));for(let i=0;i<3;i++){f.s.tick++;reflectPrinciple(f.s,ctx);}assert.equal(verifyGuiltPrinciple(f.s).status,'adopted');}

test('a real locally revealed wrong verdict supplies only the known innocent and case source, not the hidden culprit',()=>{
 const {s,h,c}=principleFixture(),p=verifyGuiltPrinciple(s);assert.equal(c.status,'failed');assert.equal(p.status,'pending');assert.equal(p.sources[0].case,c.id);assert.equal(p.sources[0].person,c.verdict);assert.ok(!Object.keys(p.sources[0]).includes('culprit'));assert.notEqual(c.verdict,c.culprit);assert.equal(p.remaining,3);assert.equal(h.stories.active,null);
});
test('the same source repeats without resetting reflection, stacking a bonus or changing RNG',()=>{
 const f=principleFixture();principlePlan(f.s,ctx);f.s.tick++;reflectPrinciple(f.s,ctx);const before=serialize(f.s);assert.equal(noticeMisjudgment(f.s,f.c),false);assert.equal(serialize(f.s),before);assert.equal(verifyGuiltPrinciple(f.s).remaining,2);
});
test('a remote, other-owner, old or unregistered false verdict cannot become personally learned news',()=>{
 for(const reason of ['remote','other-owner','old','unregistered','not-revealed']){const {s,h,c}=principleFixture();delete h.principles;if(reason==='remote')h.area='a0';if(reason==='other-owner')c.owner=c.accused;if(reason==='old')s.tick++;if(reason==='unregistered')s.storyCases=[];if(reason==='not-revealed')c.status='active';assert.equal(noticeMisjudgment(s,c),false);assert.equal(h.principles,undefined,reason);}
});
test('an interested person spends three real reflection actions while another rejects the rule without changing skill or profession',()=>{
 for(const interested of [false,true]){const f=principleFixture({interested}),profile=f.h.profession,energy=f.h.energy;if(interested)adopt(f);else assert.equal(principlePlan(f.s,ctx),false);assert.equal(verifyGuiltPrinciple(f.s).status,interested?'adopted':'rejected');assert.equal(f.h.energy,energy-(interested?3:0));assert.equal(f.h.profession,profile);assert.equal(f.h.career.rank,1);}
});
test('with identical clues an adopted principle changes the actual investigation target instead of only its dialogue',()=>{
 const f=principleFixture();adopt(f);const c=prepareSecondCase(f.s),off=restore(serialize(f.s));setModule(off,'principles',false);mysteries.plan(f.s,c,ctx);mysteries.plan(off,off.storyCases.find(x=>x.id===c.id),ctx);assert.equal(c.stage,'evidence');assert.equal(f.h.goal.area,c.clues[1].area);assert.equal(off.hero.goal.area,c.source);assert.equal(off.storyCases.find(x=>x.id===c.id).stage,'trial');assert.equal(f.h.goal.kind,'storyAction');
});
test('the changed real route collects the second clue and reaches another verdict without knowing its answer in advance',()=>{
 const f=principleFixture();adopt(f);const c=prepareSecondCase(f.s),off=restore(serialize(f.s));setModule(off,'principles',false);for(let i=0;i<100&&(c.status==='active'||off.storyCases.find(x=>x.id===c.id).status==='active');i++){step(f.s);step(off);}const d=off.storyCases.find(x=>x.id===c.id);assert.equal(c.status,'done');assert.equal(c.evidence.length,2);assert.equal(d.status,'failed');assert.equal(d.evidence.length,1);assert.equal(c.verdict,c.culprit);assert.notEqual(d.verdict,d.culprit);assert.ok(c.clues[1].found);
});
test('danger defers the extra check and reflection while keeping ordinary combat and unaltered evidence available',()=>{
 const f=principleFixture();adopt(f);const c=prepareSecondCase(f.s);f.s.areas[f.h.area].objects.push({id:'prepared-local-danger',kind:'enemy',alive:true,x:f.h.x,attack:f.h.hp,hp:20,maxHp:20});const evidence=JSON.stringify(c.evidence);assert.equal(principledClue(f.s,c,ctx),null);mysteries.plan(f.s,c,ctx);assert.equal(c.stage,'trial');assert.equal(JSON.stringify(c.evidence),evidence);assert.equal(verifyGuiltPrinciple(f.s).status,'adopted');
 const pending=principleFixture();pending.h.hp=1;assert.equal(principlePlan(pending.s,ctx),false);assert.equal(verifyGuiltPrinciple(pending.s).remaining,3);
});
test('unknown roads do not turn a principle into remote clue knowledge or guaranteed exoneration',()=>{
 const f=principleFixture();adopt(f);const c=prepareSecondCase(f.s);f.h.atlas.known=f.h.atlas.known.filter(id=>id!==c.clues[1].area);assert.equal(principledClue(f.s,c,ctx),null);mysteries.plan(f.s,c,ctx);assert.equal(c.stage,'trial');assert.equal(c.evidence.length,1);
});
test('partial reflection survives reload and interruption without accepting for free',()=>{
 const f=principleFixture();assert.ok(principlePlan(f.s,ctx));f.s.tick++;reflectPrinciple(f.s,ctx);const copy=restore(serialize(f.s));assert.equal(serialize(copy),serialize(f.s));f.h.energy=1;f.s.tick++;reflectPrinciple(f.s,ctx);assert.equal(f.h.goal,null);assert.equal(verifyGuiltPrinciple(f.s).remaining,2);for(let i=0;i<2;i++){copy.tick++;reflectPrinciple(copy,ctx);}assert.equal(verifyGuiltPrinciple(copy).status,'adopted');assert.equal(verifyGuiltPrinciple(f.s).status,'pending');
});
test('module-off preserves a principle and sources while restoring the previous mystery choice',()=>{
 const f=principleFixture();adopt(f);const c=prepareSecondCase(f.s),before=JSON.stringify(f.h.principles);setModule(f.s,'principles',false);mysteries.plan(f.s,c,ctx);assert.equal(c.stage,'trial');assert.equal(principlePlan(f.s,ctx),false);assert.equal(JSON.stringify(f.h.principles),before);
});
test('the actual autonomous engine reflects once and repeats exactly through a partial-thought checkpoint',()=>{
 const f=principleFixture();let copy=restore(serialize(f.s));for(let i=0;i<3;i++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));if(i===0)copy=restore(serialize(copy));}assert.equal(verifyGuiltPrinciple(f.s).status,'adopted');assert.equal(verifyGuiltPrinciple(f.s).sources.length,1);
});
