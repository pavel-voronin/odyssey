import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';import {setModule} from '../rules.js';import * as mysteries from '../modules/mysteries.js';
import {verdictFixture,verdictContext as ctx} from '../scripts/verdict-knowledge-scenarios.mjs';
import {verdictInquiryPlan,verdictInquiryAction} from '../modules/verdict-inquiry.js';
import {caseRecordStudyPlan,caseRecordStudyAction,observeCaseWitnesses,witnessInterview} from '../modules/verdict-witness.js';
import {peopleTick} from '../modules/people.js';import {npcAction} from '../modules/npc-control.js';
import {principlePlan,reflectPrinciple} from '../modules/principles.js';
import {verdictKnowledgeHTML} from '../verdict-sheet.js';
import {makePrincipleCase} from '../scripts/principles-scenarios.mjs';
import {recordReading} from '../modules/verdict-evidence.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
function readByWitness(f){assert.ok(caseRecordStudyPlan(f.s,f.p));assert.ok(caseRecordStudyAction(f.s,f.p));f.h.x=f.p.x;observeCaseWitnesses(f.s);return f.h.caseWitnesses[0];}
test('the actual engine returns to a remembered ledger after a closed verdict, reads it and reflects without rewriting the prisoner',()=>{
 const f=verdictFixture();for(let n=0;n<70&&!f.h.principles?.verifyGuilt?.adopted;n++)step(f.s);
 assert.equal(f.entry.sources.length,1);assert.equal(f.entry.sources[0].kind,'record');assert.equal(f.h.principles.verifyGuilt.status,'adopted');assert.equal(f.c.status,'done');assert.equal(f.s.people[f.c.verdict].status,'imprisoned');
});
test('curiosity, known roads, dangerous terrain and sufficient reserves decide whether to revisit, without testing hidden source availability',()=>{
 for(const mode of ['curiosity','unknown','danger','energy']){const f=verdictFixture();if(mode==='curiosity')f.h.personality.curiosity=.1;if(mode==='unknown')f.h.atlas.known=[];if(mode==='danger')f.s.areas.a1.danger=90;if(mode==='energy')f.h.energy=35;assert.equal(verdictInquiryPlan(f.s,ctx),false);assert.equal(f.entry.sources.length,0);}
 const f=verdictFixture();f.s.areas.a1.objects=f.s.areas.a1.objects.filter(o=>o!==f.o);assert.ok(verdictInquiryPlan(f.s,ctx));assert.equal(f.h.goal.kind,'verdictRecord');f.h.x=f.o.x;assert.equal(verdictInquiryAction(f.s,ctx),false);assert.ok(f.entry.attempts.record);assert.equal(verdictInquiryPlan(f.s,ctx),false);assert.equal(f.h.principles,undefined);
});
test('a scholar really walks to and reads the source under the existing personal controller, not as an extra salary action',()=>{
 const f=verdictFixture();for(const id of ['people','npc-control'])setModule(f.s,id,true);f.p.x=f.o.x+10;const energy=f.p.needs.energy,wealth=f.p.agenda.wealth,work=f.p.agenda.work;
 f.s.tick=8;peopleTick(f.s,ctx);assert.equal(f.p.caseReports,undefined);assert.equal(f.p.agenda.task.kind,'caseRecordStudy');assert.ok(f.p.x<f.o.x+10);
 for(let n=16;n<=32&&!f.p.caseReports;n+=8){f.s.tick=n;peopleTick(f.s,ctx);}assert.equal(f.p.caseReports.length,1);assert.equal(f.p.caseReports[0].record,f.o.sealRecord.id);assert.equal(f.p.needs.energy,energy-1);assert.equal(f.p.agenda.wealth,wealth);assert.equal(f.p.agenda.work,work);assert.equal(npcAction(f.s,f.p,'personal'),false);
});
test('a knowing witness does not transfer contents remotely; only a real paid interview creates reported provenance',()=>{
 const f=verdictFixture();assert.ok(caseRecordStudyPlan(f.s,f.p));caseRecordStudyAction(f.s,f.p);f.h.x=90;observeCaseWitnesses(f.s);assert.equal(f.h.caseWitnesses,undefined);assert.equal(f.entry.sources.length,0);
 f.h.x=f.p.x;f.s.tick+=20;observeCaseWitnesses(f.s);const contact=f.h.caseWitnesses[0],gold=f.h.gold,wallet=f.p.agenda.wealth;assert.equal(f.entry.sources.length,0);assert.ok(witnessInterview(f.s,f.entry,contact,ctx));assert.equal(f.h.gold,gold-1);assert.equal(f.p.agenda.wealth,wallet+1);const source=f.entry.sources[0];assert.equal(source.directness,'reported');assert.equal(source.readAt,0);assert.equal(source.learnedAt,20);assert.equal(source.reporter,f.p.id);assert.equal(source.record,f.o.sealRecord.id);assert.equal(f.entry.status,'reported-error');const saved=serialize(f.s);assert.equal(witnessInterview(f.s,f.entry,contact,ctx),false);assert.equal(serialize(f.s),saved);
});
test('a false report can mislead without the narrator announcing secret guilt, and a real original can later contradict it',()=>{
 const f=verdictFixture({wrong:false});const contact=readByWitness(f);f.p.agenda.bonds[f.c.culprit]=80;f.s.tick++;assert.ok(witnessInterview(f.s,f.entry,contact,ctx));assert.equal(f.entry.status,'reported-error');assert.notEqual(f.entry.sources[0].known.pointsTo,f.c.culprit);assert.ok(principlePlan(f.s,ctx));for(let n=0;n<3;n++){f.s.tick++;reflectPrinciple(f.s,ctx);}assert.ok(f.s.journal[0].text.startsWith('После услышанного'));assert.equal(f.h.principles.verifyGuilt.status,'adopted');assert.ok(verdictInquiryPlan(f.s,ctx));f.h.x=f.o.x;verdictInquiryAction(f.s,ctx);assert.equal(f.entry.status,'confirmed');assert.equal(f.entry.sources.length,2);assert.equal(f.s.people[f.c.verdict].status,'imprisoned');
});
test('the same stored report has the same effect in worlds with different hidden culprits and clue reliability',()=>{
 const a=verdictFixture();readByWitness(a);const b=restore(serialize(a.s));b.storyCases[0].culprit=a.c.accused;b.storyCases[0].evidence[0].reliable=true;b.areas.a1.objects.find(o=>o.id===a.o.id).sealRecord.pointsTo=a.c.accused;
 for(const s of [a.s,b]){s.tick++;assert.ok(witnessInterview(s,s.hero.verdictMemory.cases[0],s.hero.caseWitnesses[0],ctx));}
 assert.deepEqual(a.h.verdictMemory,b.hero.verdictMemory);assert.deepEqual(a.h.principles,b.hero.principles);assert.equal(a.h.gold,b.hero.gold);assert.deepEqual(a.s.journal,b.journal);
});
test('a dead, departed, busy, exhausted or ignorant witness and an empty purse cannot charge or invent information',()=>{
 for(const mode of ['dead','departed','busy','sleep','hunger','ignorant','broke','claimed']){const f=verdictFixture(),contact=readByWitness(f);setModule(f.s,'npc-control',true);f.s.tick++;if(mode==='dead')f.p.alive=false;if(mode==='departed')f.p.area='a0';if(mode==='busy')f.p.agenda.task={kind:'farm'};if(mode==='sleep')f.p.needs.sleeping=true;if(mode==='hunger')f.p.needs.hunger=90;if(mode==='ignorant')f.p.caseReports=[];if(mode==='broke')f.h.gold=0;if(mode==='claimed')npcAction(f.s,f.p,'personal');const gold=f.h.gold,wallet=f.p.agenda.wealth;assert.equal(witnessInterview(f.s,f.entry,contact,ctx),false,mode);assert.equal(f.h.gold,gold,mode);assert.equal(f.p.agenda.wealth,wallet,mode);assert.equal(f.entry.sources.length,0,mode);}
});
test('a remembered dead witness address remains a possible plan until the actual failed visit, then waits for fresh news',()=>{
 const f=verdictFixture(),contact=readByWitness(f);f.h.stats.wit=1;f.p.alive=false;assert.ok(verdictInquiryPlan(f.s,ctx));assert.equal(f.h.goal.kind,'verdictWitness');assert.equal(verdictInquiryAction(f.s,ctx),false);assert.equal(verdictInquiryPlan(f.s,ctx),false);assert.equal(f.entry.sources.length,0);assert.equal(contact.person,f.p.id);
});
test('partially read and reflected saves replay exactly; module off preserves real facts without free rereading or payment',()=>{
 const f=verdictFixture();readByWitness(f);f.s.tick++;witnessInterview(f.s,f.entry,f.h.caseWitnesses[0],ctx);principlePlan(f.s,ctx);f.s.tick++;reflectPrinciple(f.s,ctx);const raw=serialize(f.s),copy=restore(raw);assert.equal(serialize(copy),raw);for(let n=0;n<40;n++){step(f.s);step(copy);assert.equal(serialize(copy),serialize(f.s));}
 const facts=JSON.stringify(f.h.verdictMemory);setModule(f.s,'verdict-knowledge',false);assert.equal(verdictInquiryPlan(f.s,ctx),false);assert.equal(caseRecordStudyPlan(f.s,f.p),false);assert.equal(JSON.stringify(f.h.verdictMemory),facts);
});
test('presentation uses known provenance and dates, never the private culprit or reliability',()=>{
 const f=verdictFixture(),contact=readByWitness(f);f.s.tick++;witnessInterview(f.s,f.entry,contact,ctx);const html=verdictKnowledgeHTML(f.s,f.c,x=>String(x).replaceAll('<','&lt;'),e=>'date:'+e.tick);assert.ok(html.includes('Пересказ'));assert.ok(html.includes('Событие: date:0'));assert.ok(html.includes('узнано: date:1'));assert.ok(!html.includes('culprit'));assert.ok(!html.includes('reliable'));
});
test('a source lost during an active case is discovered at its remembered address and does not stall or regenerate',()=>{
 const f=verdictFixture();f.c.status='active';f.c.stage='evidence';f.c.clues[0].found=false;f.c.evidence=[];f.s.areas.a1.objects=f.s.areas.a1.objects.filter(o=>o!==f.o);f.h.x=90;
 mysteries.plan(f.s,f.c,ctx);assert.equal(f.h.goal.x,f.o.x);assert.equal(f.c.clues[0].unavailableAt,undefined);mysteries.act(f.s,f.c,ctx);assert.equal(f.c.clues[0].unavailableAt,undefined);f.h.x=f.o.x;mysteries.act(f.s,f.c,ctx);assert.equal(f.c.clues[0].unavailableAt,f.s.tick);assert.equal(f.c.evidence.length,0);mysteries.plan(f.s,f.c,ctx);assert.equal(f.h.goal.area,f.c.clues[1].area);assert.equal(f.s.areas.a1.objects.some(o=>o.id===f.o.id),false);
});
test('reported sources remain bounded, preserve an active cause, and repeated observation cannot clone a fee or belief',()=>{
 const f=verdictFixture();const witnesses=Object.values(f.s.people).filter(p=>p.alive&&p.agenda&&![f.h.lineage,f.c.accused,f.c.other].includes(p.id)).slice(0,6);f.h.x=f.o.x;
 for(const p of witnesses){Object.assign(p,{area:f.h.area,x:f.h.x,status:'resident',health:p.maxHealth||100,ailment:null});p.needs.energy=100;p.needs.hunger=0;p.agenda.job='scholar';p.agenda.task=null;f.p=p;const contact=readByWitness(f);const own=f.h.caseWitnesses.find(c=>c.person===p.id);f.s.tick++;assert.ok(witnessInterview(f.s,f.entry,own,ctx));assert.ok(f.entry.sources.length<=4);assert.ok(f.entry.sources.some(e=>e.id===f.h.principles.verifyGuilt.sources.at(-1).id));}
 const gold=f.h.gold,count=f.entry.sources.length;for(let n=0;n<20;n++)observeCaseWitnesses(f.s);assert.equal(f.h.gold,gold);assert.equal(f.entry.sources.length,count);assert.ok(f.h.caseWitnesses.length<=8);assert.ok(f.h.principles.verifyGuilt.sources.length<=8);
});
test('a principle from personally read new evidence changes the next new investigation route, without ensuring a true verdict',()=>{
 const f=verdictFixture();f.h.x=f.o.x;f.s.tick++;recordReading(f.s,f.entry,ctx);principlePlan(f.s,ctx);for(let n=0;n<3;n++){f.s.tick++;reflectPrinciple(f.s,ctx);}f.s.tick++;
 const c=makePrincipleCase(f.s,'second-recorded-case');c.clues[0].found=true;c.evidence=[{tick:f.s.tick,person:c.other,reliable:false}];revealArea(f.s,c.clues[1].area);revealRoad(f.s,c.source,c.clues[1].area);f.h.goal=null;const off=restore(serialize(f.s));setModule(off,'principles',false);mysteries.plan(f.s,c,ctx);mysteries.plan(off,off.storyCases.find(e=>e.id===c.id),ctx);assert.equal(f.h.goal.area,c.clues[1].area);assert.equal(off.hero.goal.area,c.source);assert.equal(c.stage,'evidence');assert.equal(c.evidence.length,1);assert.ok(f.h.reason.startsWith('Принятый принцип'));assert.equal(c.evidence[0].reliable,false);
});
test('source-description pruning does not allow a second fee from the same witness',()=>{
 const f=verdictFixture(),people=Object.values(f.s.people).filter(p=>p.alive&&p.agenda&&![f.h.lineage,f.c.accused,f.c.other].includes(p.id)).slice(0,6);f.h.x=f.o.x;let first;
 for(const p of people){Object.assign(p,{area:f.h.area,x:f.h.x,status:'resident',health:p.maxHealth||100,ailment:null});p.needs.energy=100;p.needs.hunger=0;p.agenda.job='scholar';p.agenda.task=null;f.p=p;readByWitness(f);const contact=f.h.caseWitnesses.find(c=>c.person===p.id);first ||= contact;f.s.tick++;assert.ok(witnessInterview(f.s,f.entry,contact,ctx));}
 assert.equal(f.entry.interviews.length,6);assert.equal(f.entry.sources.length,4);const raw=serialize(f.s);assert.equal(witnessInterview(f.s,f.entry,first,ctx),false);assert.equal(serialize(f.s),raw);const copy=restore(raw);assert.equal(witnessInterview(copy,copy.hero.verdictMemory.cases[0],copy.hero.caseWitnesses.find(c=>c.person===first.person),ctx),false);assert.equal(serialize(copy),raw);
});
test('a conversation blocked by the real eight-tick NPC action can retry on a free tick instead of locking to its cadence',()=>{
 const f=verdictFixture();f.h.stats.wit=1;f.h.x=f.p.x;readByWitness(f);setModule(f.s,'npc-control',true);const attempts=[];
 for(let t=8;t<=90;t++){f.s.tick=t;if(t%8===0)npcAction(f.s,f.p,'personal');if(verdictInquiryPlan(f.s,ctx)){const success=verdictInquiryAction(f.s,ctx);attempts.push({tick:t,success});if(success)break;}}
 assert.deepEqual(attempts,[{tick:8,success:false},{tick:81,success:true}]);assert.equal(f.entry.sources.length,1);assert.equal(f.entry.interviews.length,1);
});
