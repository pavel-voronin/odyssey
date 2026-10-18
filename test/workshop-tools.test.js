import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {recordToolUse,workToolReady,WORK_TOOL_LIMIT} from '../modules/workshop-tools.js';
import {craftFixture} from '../scripts/craft-respect-scenarios.mjs';
import {craftContext} from '../scripts/craft-respect-scenarios.mjs';
import {workTick,planWork} from '../modules/work.js';
import {peopleTick} from '../modules/people.js';
import {observeProperty} from '../modules/property.js';
import {npcToolPlan,observeWorkTools} from '../modules/workshop-tools.js';
import {knownRoute,route} from '../engine.js';
function fixture(){const f=craftFixture();setModule(f.s,'workshop-tools',true);return f;}
const ctx={log:()=>{}};
test('completed local work wears one existing fixture; repeated same-tick hooks grant no second use or goods',()=>{
 const {s,h,a,o}=fixture(),gold=h.gold,stock=a.civic.tools;assert.equal(o.workTool,undefined);assert.equal(workToolReady(s,o),true);assert.equal(o.workTool,undefined);
 assert.ok(recordToolUse(s,a,o,h.lineage,ctx));assert.equal(recordToolUse(s,a,o,h.lineage,ctx),false);assert.equal(o.workTool.uses,1);assert.equal(o.workTool.origin.kind,'existing-workshop');assert.equal(h.gold,gold);assert.equal(a.civic.tools,stock);assert.equal(o.state,'intact');
});
test('twenty-four actual work receipts cause one durable fault without destroying the room or changing its owner',()=>{
 const {s,h,a,o}=fixture(),owner=o.owner;for(let i=0;i<WORK_TOOL_LIMIT;i++){s.tick++;assert.ok(recordToolUse(s,a,o,h.lineage,ctx));}
 assert.equal(workToolReady(s,o),false);assert.equal(o.workTool.state,'broken');assert.equal(o.workTool.episode,1);assert.equal(o.state,'intact');assert.equal(o.owner,owner);const saved=serialize(s);s.tick++;assert.equal(recordToolUse(s,a,o,h.lineage,ctx),false);assert.equal(o.workTool.uses,WORK_TOOL_LIMIT);assert.equal(o.history.filter(e=>e.kind==='tool-break').length,1);const copy=restore(saved);assert.equal(serialize(copy),saved);assert.equal(workToolReady(copy,copy.areas[a.id].objects.find(x=>x.id===o.id)),false);
});
test('unseen remote operations, dead or travelling workers and a burned room cannot create a new fixture',()=>{
 for(const reason of ['distant','dead','transit','burned']){const {s,h,a,o}=fixture();if(reason==='distant')h.x=0;if(reason==='dead')s.people[h.lineage].alive=false;if(reason==='transit')h.transit={from:a.id,to:'a0',remaining:2};if(reason==='burned')o.state='burned';assert.equal(recordToolUse(s,a,o,h.lineage,ctx),false,reason);assert.equal(o.workTool,undefined,reason);}
});
test('disabling maintenance preserves the broken fixture and former work policy',()=>{
 const {s,h,a,o}=fixture();recordToolUse(s,a,o,h.lineage,ctx);o.workTool.state='broken';setModule(s,'workshop-tools',false);const saved=serialize(s);assert.equal(workToolReady(s,o),true);assert.equal(recordToolUse(s,a,o,h.lineage,ctx),false);assert.equal(serialize(s),saved);
});
test('actual paid repair work wears the bench, then the fault prevents another salary, work progress or lease payment',()=>{
 const f=fixture(),{s,h,a,o}=f;o.owner=h.lineage;observeProperty(s,a);recordToolUse(s,a,o,h.lineage,ctx);o.workTool.uses=23;
 h.goal={kind:'work',job:'repair',area:a.id,x:42,remaining:1};s.tick++;const gold=h.gold;workTick(s,craftContext);assert.equal(o.workTool.state,'broken');assert.ok(h.gold>gold);
 const paid=h.gold;h.goal={kind:'work',job:'repair',area:a.id,x:42,remaining:1};s.tick++;workTick(s,craftContext);assert.equal(h.gold,paid);assert.equal(h.goal,null);assert.equal(o.workTool.uses,24);
 h.gold=0;h.workAfter=0;assert.ok(planWork(s,{...craftContext,knownRoute,route,closest:(world,check)=>Object.values(world.areas).find(check)}));assert.notEqual(h.goal.job,'repair');
});
function npcFixture(){
 const f=fixture(),{s,p}=f;setModule(s,'people',true);setModule(s,'npc-control',true);setModule(s,'npc-needs',false);
 for(const person of Object.values(s.people))if(person.agenda)person.agenda.due=1e8;
 Object.assign(p.agenda,{job:'artisan',wealth:30,tools:1,work:2,curiosity:.2,sociability:.1,task:null,due:0});return f;
}
test('a real artisan production completion breaks the tool, actual repair consumes its own budget/material, and production resumes',()=>{
 const {s,h,a,o,p}=npcFixture();recordToolUse(s,a,o,p.id,ctx);o.workTool.uses=23;p.agenda.task={kind:'work',target:a.id,x:o.x,remaining:1};const initial=a.civic.tools;
 s.tick=8;peopleTick(s,craftContext);assert.equal(o.workTool.state,'broken');assert.equal(a.civic.tools,initial+1);assert.equal(p.agenda.work,3);
 const funds=p.agenda.wealth;assert.ok(npcToolPlan(s,p));assert.equal(p.agenda.task.kind,'toolMend');
 for(let i=0;i<3;i++){s.tick+=8;peopleTick(s,craftContext);}assert.equal(o.workTool.state,'working');assert.equal(a.civic.tools,initial);assert.equal(p.agenda.wealth,funds-3);assert.equal(o.workTool.lastRepair.method,'artisan-occupation');
 const after=a.civic.tools;p.agenda.due=s.tick;for(let i=0;i<80&&p.agenda.work<6;i++){s.tick+=8;peopleTick(s,craftContext);}assert.ok(p.agenda.work>=6);assert.ok(a.civic.tools>after);
});
test('an owner missing material or money selects another real activity and leaves the fault and skill intact',()=>{
 for(const missing of ['material','money']){const {s,a,o,p}=npcFixture();recordToolUse(s,a,o,p.id,ctx);o.workTool.state='broken';if(missing==='material')a.civic.tools=0;else p.agenda.wealth=0;
  const skill=p.agenda.job;assert.ok(npcToolPlan(s,p));assert.ok(['farm','learn'].includes(p.agenda.task.kind));const previous=p.agenda.work;for(let i=0;i<3;i++){s.tick+=8;peopleTick(s,craftContext);}assert.ok(p.agenda.work>previous);assert.equal(o.workTool.state,'broken');assert.equal(p.agenda.job,skill);
 }
});
test('a disabled repair keeps remaining progress without freezing the worker; enabling can resume the saved task',()=>{
 const {s,a,o,p}=npcFixture();recordToolUse(s,a,o,p.id,ctx);o.workTool.state='broken';npcToolPlan(s,p);p.agenda.task.remaining=2;setModule(s,'workshop-tools',false);s.tick=8;peopleTick(s,craftContext);assert.equal(p.agenda.toolMendPending.remaining,2);assert.notEqual(p.agenda.task?.kind,'toolMend');
 setModule(s,'workshop-tools',true);p.agenda.task=null;assert.ok(npcToolPlan(s,p));assert.equal(p.agenda.task.remaining,2);
});
