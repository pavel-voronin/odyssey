import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {knowsClamp,toolPlan,toolAction} from '../modules/tool-repair.js';
import {recoverHeirloom} from '../modules/inventory.js';
import {workTick} from '../modules/work.js';
import {toolFixture} from '../scripts/tool-repair-scenarios.mjs';
import {craftContext} from '../scripts/craft-respect-scenarios.mjs';
import {assertSameSave} from '../scripts/life-save-compare.mjs';
function runToRepair(f,limit=400){let steps=0;while(f.o.workTool.state==='broken'&&steps<limit){step(f.s);steps++;}assert.equal(f.o.workTool.state,'working');return steps;}
test('a curious owner autonomously pays for three real lessons, funds local material and learns an enduring repair method',()=>{
 const f=toolFixture(),{s,h,a,o,p,source}=f,gold=h.gold,purse=p.agenda.wealth,stock=a.civic.tools,remote=source.civic.tools;const steps=runToRepair(f);
 assert.equal(o.workTool.lastRepair.method,'learned-fit');assert.ok(knowsClamp(s));assert.equal(s.people[h.lineage].toolSkills.clamp.lessons.length,3);assert.equal(h.gold,gold-6);assert.equal(p.agenda.wealth,purse+3);assert.equal(a.civic.tools,stock-1);assert.equal(source.civic.tools,remote);assert.equal(h.toolTask,null);assert.equal(o.workTool.repair,null);assert.ok(steps>=6);
 h.profession='sailor';assert.ok(knowsClamp(s));const copy=restore(serialize(s));assert.ok(knowsClamp(copy));
});
test('an uninterested owner autonomously travels to a known warehouse, buys one physical part, returns and installs that original',()=>{
 const f=toolFixture({curiosity:.1}),{s,h,a,o,p,source}=f,gold=h.gold,purse=p.agenda.wealth,stock=a.civic.tools,remote=source.civic.tools;const steps=runToRepair(f);
 assert.equal(o.workTool.lastRepair.method,'replacement');assert.equal(knowsClamp(s),false);assert.equal(h.gold,gold-3);assert.equal(p.agenda.wealth,purse);assert.equal(a.civic.tools,stock);assert.equal(source.civic.tools,remote-1);assert.equal(h.bag.some(i=>i.kind==='workPart'),false);assert.equal(o.workTool.lastRepair.part.source,source.id);assert.ok(o.workTool.lastRepair.part.history.some(e=>e.text.startsWith('Установлено')));assert.ok(steps>10);
});
test('missing master and unknown part source defer the repair once and allow different real employment',()=>{
 const f=toolFixture({teacher:false,knownSource:false}),{s,h,o}=f;h.gold=0;const rank=h.career.rank;step(s);assert.equal(o.workTool.state,'broken');assert.equal(h.toolTask,null);assert.notEqual(h.goal?.job,'repair');assert.equal(h.career.rank,rank);assert.equal(knowsClamp(s),false);const messages=s.journal.filter(e=>e.text.includes('Верстак подождёт')).length;
 for(let i=0;i<3;i++)step(s);assert.equal(s.journal.filter(e=>e.text.includes('Верстак подождёт')).length,messages);
});
test('observing the same fault again preserves the refusal signature, so an unchanged unavailable plan does not repeat its log',()=>{
 const f=toolFixture({teacher:false,knownSource:false}),{s,h,o}=f;h.gold=0;let messages=0;const ctx={...craftContext,log:()=>{messages++;}};
 assert.equal(toolPlan(s,ctx),false);const blocked=h.workToolMemory.known[o.id].blocked;assert.ok(blocked);assert.equal(toolPlan(s,ctx),false);assert.equal(h.workToolMemory.known[o.id].blocked,blocked);assert.equal(messages,1);
});
test('a funded owner still needs a real master or a known source, and local fitting needs an actual material unit',()=>{
 for(const options of [{teacher:false,knownSource:false},{knownSource:false,local:0}]){const f=toolFixture(options),gold=f.h.gold;step(f.s);assert.equal(f.o.workTool.state,'broken');assert.equal(f.h.toolTask,null);assert.equal(knowsClamp(f.s),false);assert.equal(f.s.people[f.h.lineage].toolStudy,undefined);assert.equal(f.h.gold,gold);}
});
test('an owner without the whole lesson and material budget does not start unpaid tuition even beside a willing master',()=>{
 const f=toolFixture({knownSource:false});f.h.gold=2;const purse=f.p.agenda.wealth;step(f.s);assert.equal(f.h.gold,2);assert.equal(f.p.agenda.wealth,purse);assert.equal(f.h.toolTask,null);assert.equal(f.s.people[f.h.lineage].toolStudy,undefined);assert.equal(f.o.workTool.state,'broken');
});
test('a master occupied by another actual task is unavailable; the owner may choose the known replacement route',()=>{
 const f=toolFixture();f.p.agenda.task={kind:'work',target:f.a.id,x:42,remaining:3};step(f.s);assert.equal(f.h.toolTask.stage,'fetch');assert.equal(f.p.toolTeaching,undefined);assert.equal(f.p.agenda.task.remaining,3);
});
test('a duplicate same-world-tick lesson hook cannot transfer a second fee or teach a second lesson',()=>{
 const f=toolFixture();step(f.s);const gold=f.h.gold,wealth=f.p.agenda.wealth,lessons=f.s.people[f.h.lineage].toolStudy.clamp.lessons.length;assert.equal(toolAction(f.s,craftContext),false);assert.equal(f.h.gold,gold);assert.equal(f.p.agenda.wealth,wealth);assert.equal(f.s.people[f.h.lineage].toolStudy.clamp.lessons.length,lessons);
});
test('a method acquired during an interruption replaces the remaining lessons instead of charging for knowledge already owned',()=>{
 const f=toolFixture();step(f.s);const gold=f.h.gold,purse=f.p.agenda.wealth;f.s.people[f.h.lineage].toolSkills={clamp:{source:'prepared-independent-learning',learnedAt:f.s.tick}};f.h.goal=null;runToRepair(f);assert.equal(f.h.gold,gold-3);assert.equal(f.p.agenda.wealth,purse);
});
test('a departed teacher does not charge another lesson or finish the method; partial paid practice survives restoring',()=>{
 const f=toolFixture(),{s,h,o,p}=f;step(s);assert.equal(s.people[h.lineage].toolStudy.clamp.lessons.length,1);const gold=h.gold,paid=p.agenda.wealth;p.area=f.source.id;p.status='travelling';step(s);
 assert.equal(h.gold,gold);assert.equal(p.agenda.wealth,paid);assert.equal(knowsClamp(s),false);assert.equal(o.workTool.state,'broken');assert.equal(s.people[h.lineage].toolStudy.clamp.lessons.length,1);const copy=restore(serialize(s));assert.equal(copy.people[h.lineage].toolStudy.clamp.lessons.length,1);
});
test('stale remote stock is discovered only on arrival and never gifts or charges for a missing part',()=>{
 const f=toolFixture({curiosity:.1}),{s,h,o,source}=f,gold=h.gold;source.civic.tools=0;step(s);assert.equal(h.toolTask.stage,'fetch');
 for(let i=0;i<180&&h.toolTask;i++)step(s);assert.equal(o.workTool.state,'broken');assert.equal(h.bag.some(i=>i.kind==='workPart'),false);assert.equal(h.gold,gold);assert.equal(h.toolTask,null);
});
test('paid material and remaining labour survive interruption and reload without a second payment or a free next repair',()=>{
 const f=toolFixture(),{s,h,a,o}=f;s.people[h.lineage].toolSkills={clamp:{source:'prepared-prior-learning',learnedAt:0}};
 step(s);assert.equal(o.workTool.repair.funded,true);assert.equal(o.workTool.repair.remaining,2);const gold=h.gold,stock=a.civic.tools;let copy=restore(serialize(s));step(copy);step(copy);const repaired=copy.areas[a.id].objects.find(x=>x.id===o.id);assert.equal(repaired.workTool.state,'working');assert.equal(copy.hero.gold,gold);assert.equal(copy.areas[a.id].civic.tools,stock);assert.equal(repaired.workTool.repair,null);
});
test('disabling preserves the partial lesson and resumes it when enabled, without paying for the same lesson twice',()=>{
 const f=toolFixture(),{s,h,o}=f;step(s);const gold=h.gold;setModule(s,'workshop-tools',false);step(s);assert.equal(h.gold,gold);assert.equal(s.people[h.lineage].toolStudy.clamp.lessons.length,1);assert.equal(h.goal,null);setModule(s,'workshop-tools',true);runToRepair(f);assert.equal(h.gold,gold-5);assert.equal(o.workTool.state,'working');
});
test('a lesson across an NPC scheduling tick consumes the teacher turn rather than also performing ordinary work',()=>{
 const f=toolFixture(),{s,p}=f;setModule(s,'people',true);setModule(s,'npc-needs',false);s.tick=6;p.agenda.due=1e8;const work=p.agenda.work;step(s);step(s);assert.equal(p.agenda.work,work);assert.equal(p.actionControl.tick,8);assert.equal(p.actionControl.owner,'personal');assert.equal(p.toolTeaching.turn,8);assert.equal(s.people[f.h.lineage].toolStudy.clamp.lessons.length,2);
});
test('the original bought part survives death in the real heirloom and is never equipped as a material after recovery',()=>{
 const f=toolFixture({curiosity:.1}),{s,h,o}=f;for(let i=0;i<200&&!h.bag.some(i=>i.kind==='workPart');i++)step(s);const item=h.bag.find(i=>i.kind==='workPart');assert.ok(item);const id=item.id;setModule(s,'body',true);h.hp=1;h.conditions=[{id:'poison',since:s.tick,until:s.tick+80}];s.tick=Math.ceil((s.tick+1)/8)*8-1;step(s);assert.equal(h.alive,false);
 const cache=s.areas[h.area].objects.find(o=>o.kind==='heirloom'&&o.items.some(i=>i.id===id));assert.ok(cache);assert.ok(createNextStory(s));setModule(s,'equipment',true);s.hero.area=h.area;s.hero.x=cache.x;recoverHeirloom(s,cache,craftContext);assert.ok(s.hero.bag.some(i=>i.id===id));assert.equal(s.hero.equipment.material,undefined);assert.equal(cache.items.some(i=>i.id===id),false);
});
test('both autonomous solutions remain exactly repeatable through mid-activity restores and return actual work availability',()=>{
 for(const curiosity of [.1,.8]){const f=toolFixture({curiosity}),{s,h,o,a}=f;let b=restore(serialize(s));for(let i=0;i<250&&o.workTool.state==='broken';i++){step(s);step(b);assertSameSave(serialize(s),serialize(b));if(i%7===0)b=restore(serialize(b));}assert.equal(o.workTool.state,'working');h.goal={kind:'work',area:a.id,x:o.x,job:'repair',remaining:1};h.area=a.id;h.x=o.x;const gold=h.gold;s.tick++;workTick(s,craftContext);assert.ok(h.gold>gold);}
});
