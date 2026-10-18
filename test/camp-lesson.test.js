import test from 'node:test';import assert from 'node:assert/strict';import {step,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {campLesson} from '../modules/camp-lesson.js';import {craftPractice} from '../modules/craft-practice.js';import {campLessonFixture} from '../scripts/camp-lesson-scenarios.mjs';
import {MODULES} from '../rules.js';import {skillBranchesHTML} from '../skill-branches-sheet.js';
import {releaseParty} from '../modules/social.js';import {invalidateNPCControl} from '../modules/npc-control.js';
const ctx={log:()=>{}};
test('actual three repairs each and actual bench knowledge lead to a shared camp lesson in either orientation',()=>{
 for(const heroTeacher of [false,true]){
  const f=campLessonFixture({heroTeacher}),{s,h,p,camp,teacher,pupil}=f;assert.equal(craftPractice(s,pupil.id).method,undefined);assert.equal(craftPractice(s,teacher.id).method.id,'fit-working-part');
  const gold=h.gold,wealth=p.agenda.wealth,stock=p.agenda.tools,energy=h.energy,npcEnergy=p.needs.energy,knife=p.localFood.tools.knife;
  for(let i=0;i<3;i++)step(s);
  assert.equal(craftPractice(s,pupil.id).method.id,'fit-working-part');assert.equal(craftPractice(s,pupil.id).method.teacher,teacher.id);assert.equal(h.campLesson.status,'done');assert.equal(h.campLesson.actions,3);assert.equal(h.energy,energy-6);assert.equal(p.needs.energy,npcEnergy-6);assert.equal(h.gold,gold);assert.equal(p.agenda.wealth,wealth);assert.equal(p.agenda.tools,stock-1);assert.equal(knife.uses,3);assert.equal(camp.objects.filter(o=>o.kind==='practicePart').length,1);assert.equal(camp.objects.find(o=>o.kind==='practicePart').state,'demonstration');assert.equal(craftPractice(s,pupil.id).total,3);assert.equal(h.campSession.activity,'camp-lesson');
 }
});
test('the same NPC and world tick cannot spend a second material, energy or learning action',()=>{
 const {s,h,p}=campLessonFixture({heroTeacher:true});step(s);const saved=serialize(s);for(let i=0;i<20;i++)assert.equal(campLesson(s,ctx),false);assert.equal(serialize(s),saved);assert.equal(craftPractice(s,p.id).study.remaining,2);assert.ok(p.actionControl.phases.includes('camp-study'));
});
test('indifference or missing material, knife or consenting master yields ordinary rest, not free skill',()=>{
 for(const mode of ['indifferent','material','knife','consent']){
  const f=campLessonFixture(),{s,h,p,pupil}=f;if(mode==='indifferent'){h.career.path='adventure';h.personality.curiosity=.1;}if(mode==='material'){p.agenda.tools=0;s.people[h.lineage].agenda.tools=0;}if(mode==='knife')p.localFood.tools.knife.state='broken';if(mode==='consent')p.agenda.sociability=.1;
  step(s);assert.equal(h.campLesson,undefined,mode);assert.equal(craftPractice(s,pupil.id).method,undefined);assert.equal(h.lastAction,'rest',mode);
 }
});
test('a departed teacher or new hunger interrupts the actual shared work and preserves partial learning',()=>{
 for(const mode of ['departure','hunger']){
  const {s,h,p,pupil}=campLessonFixture();step(s);const stock=p.agenda.tools;if(mode==='departure')h.companions=[];else p.needs.hunger=70;
  step(s);assert.equal(craftPractice(s,pupil.id).study.remaining,2);assert.equal(craftPractice(s,pupil.id).method,undefined);assert.equal(p.agenda.tools,stock);assert.equal(h.campLesson.status,'paused');
 }
});
test('disabling preserves the unfinished material and knowledge without any new teaching action',()=>{
 const {s,h,pupil}=campLessonFixture();step(s);const lesson=JSON.stringify(h.campLesson),state=JSON.stringify(craftPractice(s,pupil.id));setModule(s,'camp-lesson',false);step(s);assert.equal(JSON.stringify(h.campLesson),lesson);assert.equal(JSON.stringify(craftPractice(s,pupil.id)),state);
});
test('a partially worked actual camp and both personal inventories replay exactly through v1 save',()=>{
 const {s}=campLessonFixture();step(s);const copy=restore(serialize(s));for(let i=0;i<6;i++){step(s);step(copy);assert.equal(serialize(copy),serialize(s));}
});
test('actual newly arrived danger in the camp or its visible parent stops shared study before another material or progress',()=>{
 for(const site of ['camp','parent']){
  const {s,h,pupil,camp}=campLessonFixture();step(s);const state=craftPractice(s,pupil.id),part=camp.objects.find(o=>o.kind==='practicePart'),a=site==='camp'?camp:s.areas[camp.temporaryCamp.parent],x=site==='camp'?h.x:h.campReturn.x;
  a.objects.push({id:'actual-intruder',kind:'enemy',name:'Пришедший хищник',alive:true,hp:80,maxHp:80,attack:30,x});s.tick++;assert.equal(campLesson(s,ctx),false);assert.equal(state.study.remaining,2);assert.equal(state.method,undefined);assert.equal(part.state,'unfinished');assert.equal(h.campLesson.status,'paused');
 }
});
test('a paid local unfinished part needs no second stock unit, but a knife now owned by a stranger cannot be used',()=>{
 const f=campLessonFixture(),{s,h,p,pupil}=f;step(s);p.agenda.tools=0;s.people[h.lineage].agenda.tools=0;const tool=p.localFood.tools.knife,oldOwner=tool.owner;tool.owner='actual-other-owner';s.tick++;assert.equal(campLesson(s,ctx),false);assert.equal(craftPractice(s,pupil.id).study.remaining,2);
 tool.owner=oldOwner;for(let i=0;i<2;i++)step(s);assert.equal(craftPractice(s,pupil.id).method.id,'fit-working-part');assert.equal(p.agenda.tools,0);assert.equal(s.areas[h.area].objects.filter(o=>o.kind==='practicePart').length,1);assert.equal(tool.uses,3);
});
test('character sheet shows actual remaining learning and remembers the teachers known name instead of claiming a workbench',()=>{
 const {s,teacher}=campLessonFixture();step(s);assert.ok(skillBranchesHTML(s,String).includes('Учёба: осталось 2 действий.'));const name=teacher.name;step(s);step(s);teacher.name='Новое имя учителя';const html=skillBranchesHTML(s,String);assert.ok(html.includes('урок у '+name));assert.equal(html.includes('урок у Новое имя учителя'),false);
});
test('module reads the actual camp and canonical practice/controller contracts',()=>{
 const m=MODULES.find(m=>m.id==='camp-lesson');for(const id of ['fieldcamp','craft-practice','npc-control'])assert.ok(m.reads.includes(MODULES.find(m=>m.id===id).contract));assert.equal(m.reads.includes('camp-session.v1'),false);
});
test('the newly taught NPC actually returns with the party, leaves it and fits the next paid material in its own workshop',()=>{
 const {s,h,p,a,o}=campLessonFixture({heroTeacher:true});for(let i=0;i<3;i++)step(s);assert.equal(craftPractice(s,p.id).method.teacher,h.lineage);
 h.goal={kind:'routeWait',area:a.id,x:o.x,until:s.tick+1000};for(let i=0;i<100&&(h.area!==a.id||Math.abs(h.x-o.x)>1);i++)step(s);assert.equal(h.area,a.id);assert.ok(Math.abs(h.x-o.x)<=1);
 releaseParty(s,ctx);h.companions=[];invalidateNPCControl(s);p.agenda.due=s.tick;p.agenda.task=null;o.state='burned';o.damagedAt=s.tick;o.repair=null;const stock=a.civic.tools,wealth=p.agenda.wealth;
 for(let i=0;i<64&&o.state!=='intact';i++)step(s);
 assert.equal(o.state,'intact');assert.equal(o.lastFittedPart.actor,p.id);assert.equal(o.lastFittedPart.payer,p.id);assert.equal(a.civic.tools,stock-1);assert.equal(p.agenda.wealth,wealth-18);assert.equal(craftPractice(s,p.id).total,4);assert.equal(craftPractice(s,p.id).method.teacher,h.lineage);
});
test('observing the real NPC pupil shows the actual lesson and preserves the same two bodies work and material',()=>{
 const f=campLessonFixture({heroTeacher:true}),a=f.s,b=restore(serialize(a)),owner=f.h.lineage,id=f.p.id;assert.equal(observeExistingPerson(a,id),true);
 for(let i=0;i<3;i++){step(a);step(b);for(const key of ['energy','hp','gold','campLesson'])assert.deepEqual(a.actorStates[owner][key],b.actorStates[owner][key]);assert.deepEqual(a.people[id].skillPractice,b.people[id].skillPractice);assert.deepEqual(a.people[id].needs,b.people[id].needs);assert.equal(a.people[id].agenda.tools,b.people[id].agenda.tools);assert.deepEqual(a.areas[f.camp.id].objects,b.areas[f.camp.id].objects);assert.ok(a.hero.intent.startsWith('Учится подгонке'));assert.equal(a.hero.lastAction,'work');}
 assert.equal(craftPractice(a,id).method.teacher,owner);
});
test('actual resumed rest restores its own intention after completion, interruption or disabling the lesson',()=>{
 for(const mode of ['complete','pause','off']){
  const {s,h,p}=campLessonFixture();const intent=h.intent,reason=h.reason;step(s);if(mode==='complete'){step(s);step(s);}else if(mode==='pause')p.needs.hunger=70;else setModule(s,'camp-lesson',false);
  step(s);assert.equal(h.lastAction,'rest');assert.equal(h.intent,intent);assert.equal(h.reason,reason);assert.notEqual(h.action,'УРОК');
 }
});
