import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore,step} from '../engine.js';import {setModule} from '../rules.js';
import {sequenceFixture,inspectSequence,sequenceCopies,sequenceContext as ctx} from '../scripts/sequence-scenarios.mjs';
import {operateGrate,blockedGratePlan} from '../modules/mechanisms.js';
import {askSequenceWitness} from '../modules/mechanism-sequences.js';
import {sequenceNote,usableSequence} from '../modules/sequence-memory.js';
import {readText} from '../modules/texts.js';import {heldTexts,canReadText} from '../modules/text-state.js';
import {askTextReader,studyTextLesson,sellTextWithoutReading} from '../modules/literacy.js';
import {sequenceHTML} from '../sequence-sheet.js';import {drawMechanisms} from '../mechanism-view.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
test('three actual inspections yield one known opening without level, XP or a fabricated extra action',()=>{
 const f=sequenceFixture(),{s,h,p,g,key}=f,level=h.level,xp=h.xp,energy=h.energy;assert.equal(operateGrate(s,p,key,'open'),false);assert.equal(h.energy,energy);inspectSequence(f);assert.equal(usableSequence(p,g,s.tick),true);assert.equal(operateGrate(s,p,key,'open'),false);s.tick++;assert.equal(operateGrate(s,p,key,'open'),true);assert.equal(g.operations.length,1);assert.equal(h.energy,energy-5);assert.equal(h.level,level);assert.equal(h.xp,xp);assert.equal(sequenceNote(p,g.id).hint.verified,true);exact(s);
});
test('a fallible actual witness gives a wrong order; it fails once and cannot be retried after cooldown',()=>{
 const f=sequenceFixture(),{s,author:q,pupil:p,g,key}=f;inspectSequence(f,q);q.agenda.duty=.45;const cash=p.agenda.wealth;s.tick++;assert.equal(askSequenceWitness(s,p,q,key),true);assert.equal(p.agenda.wealth,cash-1);assert.equal(canReadText(s,p,q.culture),false);s.tick++;assert.equal(operateGrate(s,p,key,'open'),true);assert.equal(g.state,'closed');assert.equal(sequenceNote(p,g.id).failures.length,1);s.tick+=8;const energy=p.needs.energy;assert.equal(operateGrate(s,p,key,'open'),false);assert.equal(p.needs.energy,energy);assert.equal(askSequenceWitness(s,p,q,key),false);inspectSequence(f,p);s.tick++;assert.equal(operateGrate(s,p,key,'open'),true);exact(s);
});
test('a tired witness remembers only two components and the same report cannot charge twice',()=>{
 const f=sequenceFixture(),{s,author:q,pupil:p,g,key}=f;inspectSequence(f,q);q.needs.energy=35;s.tick++;assert.equal(askSequenceWitness(s,p,q,key),true);assert.equal(sequenceNote(p,g.id).hint.complete,false);s.tick++;const cash=p.agenda.wealth;assert.equal(askSequenceWitness(s,p,q,key),false);assert.equal(p.agenda.wealth,cash);assert.equal(operateGrate(s,p,key,'open'),false);assert.equal(g.state,'closed');exact(s);
});
test('an actual readable manual teaches the order and selling that physical copy preserves the learned action',()=>{
 const f=sequenceCopies(),{s,pupil:p,author,reader,second,g,key,work,a}=f;
 for(let i=0;i<3;i++){s.tick++;assert.ok(['progress','learned'].includes(studyTextLesson(s,p,author,second.id,'reading').status));}
 s.tick++;assert.equal(readText(s,p,second.id),true);assert.deepEqual(sequenceNote(p,g.id).hint.order,work.content.order);const learned=JSON.stringify(sequenceNote(p,g.id));s.tick++;assert.equal(readText(s,p,second.id),false);reader.agenda.wealth+=4;a.civic.treasury-=4;s.tick++;assert.equal(sellTextWithoutReading(s,p,reader,second.id),true);assert.equal(heldTexts(s,p.id).length,0);assert.equal(JSON.stringify(sequenceNote(p,g.id)),learned);p.x=g.lever.x;s.tick++;assert.equal(operateGrate(s,p,key,'open'),true);exact(s);
});
test('a provided manual can be read aloud to an illiterate holder without granting reading or direct reading credit',()=>{
 const f=sequenceCopies(),{s,pupil:p,author,second,g,key}=f;s.tick++;assert.equal(readText(s,p,second.id),false);const result=askTextReader(s,p,author,second.id);assert.equal(result.status,'reported');assert.equal(result.report.known.kind,'mechanism-sequence');assert.equal(canReadText(s,p,f.work.language),false);assert.equal(p.textCraft.readings.length,0);assert.equal(sequenceNote(p,g.id).hint.source.kind,'heard-text-reader');p.x=g.lever.x;s.tick++;assert.equal(operateGrate(s,p,key,'open'),true);exact(s);
});
test('a remote or sleeping witness cannot advise; an uncurious actor leaves the gate for a known bypass',()=>{
 const f=sequenceFixture(),{s,h,p,pupil,q,author,g,key,to,bypass}=f;inspectSequence(f,author);author.x=42;s.tick++;assert.equal(askSequenceWitness(s,pupil,author,key),false);author.x=g.lever.x;author.needs.sleeping=true;assert.equal(askSequenceWitness(s,pupil,author,key),false);h.personality.curiosity=.1;h.goal={kind:'explore',area:to,x:50};assert.equal(blockedGratePlan(s,to,ctx),true);assert.equal(h.goal,null);assert.equal(g.state,'closed');exact(s);
});
test('three isolated engine inspections replay exactly across saves, followed by one actual known opening',()=>{
 const f=sequenceFixture(),{s,h,p,key,g}=f;let copy=restore(serialize(s));for(let i=0;i<3;i++){for(const w of [s,copy]){w.hero.goal={kind:'mechanism',area:h.area,x:g.lever.x,key,operation:'inspect'};step(w);}assert.equal(serialize(s),serialize(copy));copy=restore(serialize(copy));}assert.equal(sequenceNote(p,g.id).parts.length,3);for(const w of [s,copy]){w.hero.goal={kind:'mechanism',area:h.area,x:g.lever.x,key,operation:'open'};step(w);}assert.equal(g.state,'open');assert.equal(serialize(s),serialize(copy));exact(s);
});
test('OFF, current absence and read-only views preserve facts; invalid orders and forged successful operations are rejected',()=>{
 const f=sequenceFixture(),{s,h,p,g,key,a}=f;const raw=serialize(s),c=new Proxy({},{get:()=>()=>{},set:()=>true});assert.equal(sequenceHTML(s,String),'');drawMechanisms(c,s,a,x=>x,100);assert.equal(serialize(s),raw);inspectSequence(f);setModule(s,'mechanism-sequences',false);s.tick++;const off=serialize(s);assert.equal(operateGrate(s,p,key,'open'),false);assert.equal(serialize(s),off);exact(s);setModule(s,'mechanism-sequences',true);const bad=JSON.parse(serialize(s));bad.edges[key].mechanism.sequence.order=['handle','handle','handle'];assert.throws(()=>restore(JSON.stringify(bad)),/sequence/);const forged=JSON.parse(serialize(s));forged.edges[key].mechanism.operations.push({tick:s.tick,person:p.id,state:'open',sequence:['handle','handle','handle']});assert.throws(()=>restore(JSON.stringify(forged)),/sequence/);delete g.sequence;delete p.mechanisms.sequences;const absent=serialize(s);assert.equal(restore(absent).edges[key].mechanism.sequence,undefined);assert.equal(serialize(s),absent);
});
