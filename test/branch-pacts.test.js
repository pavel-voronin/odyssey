import test from 'node:test';import assert from 'node:assert/strict';
import {pactFixture,answerPactAid,helpAgainstPact,launchPactCarrier,pactContext as ctx} from '../scripts/branch-pact-scenarios.mjs';
import {serialize,restore,observeExistingPerson} from '../engine.js';
import {pactLeaderTurn,pactTalkPlan,pactTalkAction,bindBranchPact} from '../modules/branch-pacts.js';
import {pactBlocked} from '../modules/branch-pact-state.js';
import {performAid} from '../modules/personal-aid.js';
import {relayNews} from '../modules/witness-news.js';
import {advanceFreight} from '../modules/freight.js';
import {peopleTick} from '../modules/people.js';
import {setModule} from '../rules.js';
import {branchPactHTML} from '../branch-pact-sheet.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
function localReport(f){f.h.area=f.a.id;f.h.x=f.leader.x;f.s.tick++;assert.equal(relayNews(f.s,f.s.people[f.h.lineage],f.leader,f.event),true);return f;}
test('actual marshal service binds one named living local leader, never appoints another on load or repeated duty',()=>{
 const f=pactFixture(),{s,h,leader}=f,b=h.branchPact;assert.equal(b.leader,leader.id);assert.equal(b.member,h.lineage);assert.equal(h.affiliation.primary,'crown');assert.deepEqual(b.cases,{});assert.equal(bindBranchPact(s,ctx),false);exact(s);const copy=restore(serialize(s));assert.equal(copy.hero.branchPact.id,b.id);delete copy.hero.branchPact;assert.equal(restore(serialize(copy)).hero.branchPact,undefined);
});
test('different personal priorities permit aid or obedience during faction conflict, spending only the real medicine',()=>{
 const generous=pactFixture(),dutiful=pactFixture({generosity:.4});assert.deepEqual(generous.s.diplomacy,dutiful.s.diplomacy);const a=helpAgainstPact(generous),herbs=dutiful.h.inventory.herbs,b=answerPactAid(dutiful);assert.equal(a.choice,'help');assert.equal(b.choice,'obey');assert.equal(dutiful.patient.aidRequest.status,'declined');assert.equal(dutiful.h.inventory.herbs,herbs);assert.equal(generous.h.inventory.herbs,0);assert.ok(generous.h.relations[generous.patient.id].trust>0);assert.deepEqual(generous.s.diplomacy,dutiful.s.diplomacy);assert.equal(dutiful.s.newsEvents,undefined);exact(generous.s);exact(dutiful.s);
 const traveller=pactFixture({generosity:.4,resident:false});assert.equal(traveller.patient.aidRequest.residence,undefined);answerPactAid(traveller);assert.equal(traveller.patient.aidRequest.status,'agreed');assert.equal(Object.keys(traveller.h.branchPact.cases).length,0);exact(traveller.s);
});
test('a distant leader cannot react before a physical carrier brings the actual performed fact; short replay is exact',()=>{
 const f=pactFixture(),{s,h,leader,event}=f,c=helpAgainstPact(f),diplomacy=JSON.stringify(s.diplomacy);assert.equal(pactLeaderTurn(s,leader,ctx),false);assert.equal(c.review,null);assert.equal(c.notified,null);const convoy=launchPactCarrier(f);let copy=restore(serialize(s)),ticks=0;while(!leader.news?.known[event]&&ticks++<80){for(const w of [s,copy]){w.tick++;advanceFreight(w,w.logistics.convoys.find(x=>x.id===convoy.id),ctx);pactLeaderTurn(w,w.people[leader.id],ctx);}assert.equal(serialize(copy),serialize(s));if(ticks===3)copy=restore(serialize(copy));}assert.ok(ticks<=80);assert.equal(c.review,'suspended');assert.equal(c.blocked,true);assert.equal(c.notified,null);assert.equal(leader.news.known[event].mode,'reported');assert.equal(JSON.stringify(s.diplomacy),diplomacy);const raw=serialize(s);assert.equal(pactLeaderTurn(s,leader,ctx),false);assert.equal(serialize(s),raw);assert.equal(pactBlocked(s,h,'crown'),false);h.area=f.a.id;assert.equal(pactBlocked(s,h,'crown'),false);assert.equal(pactLeaderTurn(s,leader,ctx),true);assert.equal(c.notified,s.tick);assert.equal(pactBlocked(s,h,'crown'),true);exact(s);
});
test('a retained promise is not proof of performance and hearsay is not replaced with a distant latest outcome',()=>{
 const f=pactFixture(),{s,leader,carrier,patient,h,event}=f,c=answerPactAid(f);assert.equal(carrier.news.known[event].revision,1);const convoy=launchPactCarrier(f);for(let i=0;i<14;i++){s.tick++;advanceFreight(s,convoy,ctx);}assert.equal(performAid(s,ctx),true);assert.equal(c.performed,s.tick);assert.equal(carrier.news.known[event].revision,1);let n=0;while(!leader.news?.known[event]&&n++<80){s.tick++;advanceFreight(s,convoy,ctx);}assert.ok(n<=80);assert.equal(leader.news.known[event].status,'agreed');assert.equal(patient.aidRequest.status,'helped');assert.equal(pactLeaderTurn(s,leader,ctx),false);assert.equal(h.branchPact.cases[c.request].review,null);exact(s);
});
test('an actual conversation can negotiate an exception, accept a sanction or refuse, without automatic war or new payment',()=>{
 for(const answer of ['negotiated','accepted','refused']){const f=pactFixture({curiosity:answer==='negotiated'?.7:.1}),{s,h,leader}=f,c=helpAgainstPact(f);localReport(f);pactLeaderTurn(s,leader,ctx);if(answer==='accepted')h.personality.curiosity=.1;if(answer==='refused')h.personality.curiosity=.8;const gold=h.gold,treasury=f.a.civic.treasury,old=JSON.stringify(s.diplomacy);s.tick++;assert.equal(pactTalkPlan(s,ctx),true);assert.equal(pactTalkAction(s,ctx),true);assert.equal(c.answer,answer);assert.equal(c.blocked,answer!=='negotiated');assert.equal(h.gold,gold);assert.equal(f.a.civic.treasury,treasury);assert.equal(JSON.stringify(s.diplomacy),old);const raw=serialize(s);s.tick++;assert.equal(pactTalkPlan(s,ctx),false);s.tick--;assert.equal(serialize(s),raw);exact(s);}
});
test('observing the ordinary NPC leader keeps one personal reaction and does not notify the distant member telepathically',()=>{
 const f=pactFixture(),{s,h,leader}=f,c=helpAgainstPact(f);localReport(f);h.area=f.foreign.id;h.x=50;assert.equal(observeExistingPerson(s,leader.id),true);s.tick=Math.ceil(s.tick/8)*8+8;peopleTick(s,ctx);assert.equal(c.review,'suspended');assert.equal(c.notified,null);assert.equal(leader.actionControl.owner,'personal');const raw=serialize(s);peopleTick(s,ctx);assert.equal(serialize(s),raw);exact(s);
});
test('OFF preserves decisions and the current schema rejects forged performance, leader and impossible resolution',()=>{
 const f=pactFixture(),{s,h,leader}=f;helpAgainstPact(f);localReport(f);setModule(s,'branch-pacts',false);const raw=serialize(s);assert.equal(pactLeaderTurn(s,leader,ctx),false);assert.equal(serialize(s),raw);exact(s);for(const mutate of [b=>b.leader='missing',b=>Object.values(b.cases)[0].performed--,b=>Object.values(b.cases)[0].blocked=true]){const bad=JSON.parse(raw);mutate(bad.hero.branchPact);assert.throws(()=>restore(JSON.stringify(bad)),/branchPact/);}setModule(s,'branch-pacts',true);assert.equal(pactLeaderTurn(s,leader,ctx),true);exact(s);
});
test('the member sheet reveals a response only after local notification, and rendering creates no facts',()=>{
 const f=pactFixture(),{s,h,leader}=f,c=helpAgainstPact(f);f.carrier.area=f.a.id;f.carrier.x=leader.x;s.tick++;assert.equal(relayNews(s,f.carrier,leader,f.event),true);pactLeaderTurn(s,leader,ctx);assert.equal(c.blocked,true);const raw=serialize(s),html=branchPactHTML(s,String);assert.match(html,/Нового ответа/);assert.doesNotMatch(html,/приостановил доступ/);assert.equal(serialize(s),raw);h.area=f.a.id;h.x=leader.x;s.tick++;assert.equal(pactTalkPlan(s,ctx),true);pactTalkAction(s,ctx);assert.match(branchPactHTML(s,String),/исключение/);exact(s);
});
