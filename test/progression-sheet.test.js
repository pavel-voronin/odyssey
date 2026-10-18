import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';
import {progressionView,progressionHeader,skillBranchesHTML} from '../skill-branches-sheet.js';
import {changeProfession} from '../modules/identity.js';import {fieldFixture,fieldContext as ctx} from '../scripts/field-craft-scenarios.mjs';
import {studyFieldCraft} from '../modules/field-craft.js';
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
test('common level is separate from current mastery and cannot promise a skill with no practice',()=>{
 const s=createWorld(12);s.hero.level=99;const before=serialize(s),v=progressionView(s),html=skillBranchesHTML(s,escape);assert.equal(v.level,99);assert.equal(v.rank,s.hero.career.rank);assert.ok(v.branches.every(b=>b.count===0&&b.status!=='known'));assert.equal(v.nodes.find(n=>n.id==='field-maintenance').status,'locked');assert.equal(v.composite,null);assert.match(html,/ОБЩЕЕ РАЗВИТИЕ/);assert.match(html,/ТЕКУЩИЙ ПРОФИЛЬ/);assert.match(html,/НЕЗАВИСИМАЯ ПРАКТИКА/);assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
});
test('own confirmed branches show the available next composite; learning leaves the stable current-profile header unchanged',()=>{
 const f=fieldFixture(),{s,p}=f,header=progressionHeader(s),before=serialize(s),v=progressionView(s),html=skillBranchesHTML(s,escape);assert.equal(v.next.id,'field-maintenance');assert.equal(v.next.status,'available');for(const label of ['Освоено','Доступно для изучения','Недоступно'])assert.ok(html.includes(label));assert.match(html,/<details class="skill-tree" data-progression-detail="tree">/);assert.doesNotMatch(html,/<details class="skill-tree" open/);assert.equal(serialize(s),before);
 for(let i=0;i<3;i++){s.tick++;studyFieldCraft(s,p,'field-maintenance',ctx);}const learned=progressionView(s);assert.equal(learned.composite,'Походный мастер');assert.equal(learned.next.id,'careful-maintenance');assert.equal(learned.next.status,'locked');assert.match(learned.next.reason,/три выполненных/);assert.equal(progressionHeader(s),header);
});
test('veteran preparation is factual origin, a changed present profile is not replaced by the largest practice counter',()=>{
 const s=createWorld(12);assert.match(progressionHeader(s),/Воинский путь/);assert.match(progressionView(s).origin,/бывший солдат/);assert.equal(changeProfession(s,'smith',ctx,'Появилась доступная работа в кузнице.'),true);const v=progressionView(s),header=progressionHeader(s);assert.match(v.origin,/бывший солдат/);assert.equal(v.profile,'Кузнец-пилигрим');assert.equal(v.records.find(r=>r.id==='soldier').current,false);assert.equal(v.history[0].from,'Воинский путь');assert.equal(v.history[0].to,'Кузнец-пилигрим');assert.match(header,/Кузнец/);
});
test('ordinary observed NPC shows real work and branches, without turning its display scaffold into a battle level',()=>{
 const s=createWorld(12),id=Object.keys(s.people).find(id=>id!==s.hero.lineage&&s.people[id].alive&&s.people[id].role!=='ребёнок'),p=s.people[id];p.agenda.job='farmer';p.agenda.work=7;assert.ok(observeExistingPerson(s,id));const raw=serialize(s),v=progressionView(s),html=skillBranchesHTML(s,escape);assert.equal(v.npc,true);assert.equal(v.level,null);assert.equal(v.rank,null);assert.equal(v.work,7);assert.equal(progressionHeader(s),'Земледелец');assert.match(html,/Отдельный уровень этого жителя не записан/);assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);
});
test('absent optional current practice stays absent, disabled mechanics retain learned facts and explanation',()=>{
 const s=createWorld(12),p=s.people[s.hero.lineage];assert.equal(p.fieldCraft,undefined);const raw=serialize(s);skillBranchesHTML(s,escape);assert.equal(p.skillPractice,undefined);assert.equal(p.fieldCraft,undefined);assert.equal(serialize(s),raw);
 const f=fieldFixture();for(let i=0;i<3;i++){f.s.tick++;studyFieldCraft(f.s,f.p,'field-maintenance',ctx);}setModule(f.s,'field-craft',false);const saved=serialize(f.s),v=progressionView(f.s);assert.equal(v.nodes.find(n=>n.id==='field-maintenance').status,'known');assert.equal(v.nodes.find(n=>n.id==='careful-maintenance').status,'locked');assert.equal(serialize(f.s),saved);
});
test('long names and all teacher/goal explanations are escaped; rendering does not select goals or award methods',()=>{
 const f=fieldFixture(),{s,h,p}=f;h.name='Длинное имя '.repeat(20)+'<script>bad()</script>';p.skillPractice.craft.method.teacher=f.teacher.id;p.skillPractice.craft.method.teacherName='<img src=x onerror=bad()> '+('Оченьдлинноеимя'.repeat(15));const raw=serialize(s),html=skillBranchesHTML(s,escape);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));assert.doesNotMatch(html,/<script>|<img/);assert.equal(serialize(s),raw);assert.equal(p.fieldCraft,undefined);assert.equal(h.goal,null);
});
