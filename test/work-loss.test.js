import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,knownRoute} from '../engine.js';
import {setModule} from '../rules.js';
import {workTick,planWork} from '../modules/work.js';
import {reconsiderWorkLoss} from '../modules/work-loss.js';
import {observeProperty} from '../modules/property.js';
import {workLossFixture,workLossContext as ctx,closeWorkplace} from '../scripts/work-loss-scenarios.mjs';

test('the same actual paid job continues unchanged while intact, and only observed closure records a lost workplace',()=>{
 const f=workLossFixture(),{s,h,o}=f,before=h.goal.remaining,gold=h.gold,rank=h.career.rank;workTick(s,ctx);assert.equal(h.goal.remaining,before-1);assert.equal(h.workLife.loss,null);assert.equal(reconsiderWorkLoss(s,ctx),false);
 closeWorkplace(f);workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.workLife.loss.id,o.id);assert.equal(h.workLife.loss.status,'pending');assert.equal(h.gold,gold);assert.equal(h.career.rank,rank);assert.equal(h.intent,'Рабочее место закрыто');
});

test('a caring worker picks the existing family promise while a craft-attached worker picks another real workshop',()=>{
 for(const attached of [false,true]){const f=workLossFixture({attached}),{s,h,q,other}=f;closeWorkplace(f);workTick(s,ctx);const money=h.gold,rank=h.career.rank,old=h.profession;assert.equal(reconsiderWorkLoss(s,ctx),true);
  assert.equal(h.profession,old);assert.equal(h.gold,money);assert.equal(h.career.rank,rank);assert.equal(q.status,'active');assert.equal(h.workLife.loss.status,attached?'craft':'family');if(attached){assert.equal(h.goal.workplace.id,other.id);assert.equal(h.goal.area,f.b.id);}else assert.equal(h.goal.quest,q.id);
 }
});

test('the selected replacement is reached by ordinary movement and rents once before real work earns once',()=>{
 const f=workLossFixture({attached:true,family:false}),{s,h,b,other}=f;closeWorkplace(f);workTick(s,ctx);assert.equal(reconsiderWorkLoss(s,ctx),true);const origin=h.area,startGold=h.gold,owner=s.people[other.owner],ownerMoney=owner.agenda.wealth;let walking=0,paid=0,steps=0;
 while(h.counters.peacefulWork<1&&steps++<700){const before=h.gold;step(s);if(h.lastAction==='walk')walking++;if(h.gold<before)paid+=before-h.gold;}
 assert.notEqual(origin,b.id);assert.ok(walking>10);assert.equal(h.area,b.id);assert.equal(h.counters.peacefulWork,1);assert.equal(paid,other.rent);assert.equal(owner.agenda.wealth,ownerMoney+other.rent);assert.equal(h.gold,startGold-other.rent+10);assert.equal(h.workLife.last.id,other.id);
});

test('the family branch transports existing food and the old quest owner completes it without a second reward',()=>{
 const f=workLossFixture(),{s,h,q}=f;closeWorkplace(f);workTick(s,ctx);assert.equal(reconsiderWorkLoss(s,ctx),true);const source=s.areas[q.source],target=s.areas[q.target],food=source.civic.food,stock=target.civic.food,gold=h.gold;let walks=0;
 for(let i=0;i<500&&q.status==='active';i++){step(s);if(h.lastAction==='walk')walks++;}
 assert.equal(q.status,'done');assert.ok(walks>0);assert.equal(target.civic.food,stock-8);assert.equal(source.civic.food,food+40);assert.equal(h.gold,gold-4);assert.equal(h.questCargo[q.id],undefined);const count=h.timeline.filter(e=>e.type==='reward'&&e.text.includes(q.title)).length;for(let i=0;i<3;i++)step(s);assert.equal(h.timeline.filter(e=>e.type==='reward'&&e.text.includes(q.title)).length,count);assert.equal(count,1);
});

test('no known alternative leaves the old job and releases normal autonomous planning instead of an idle loop',()=>{
 const f=workLossFixture({family:false,alternative:false}),{s,h}=f;closeWorkplace(f);workTick(s,ctx);assert.equal(reconsiderWorkLoss(s,ctx),false);assert.equal(h.workLife.loss.status,'open');const events=h.timeline.length,x=h.x,tick=s.tick;assert.equal(reconsiderWorkLoss(s,ctx),false);assert.equal(h.timeline.length,events);for(let i=0;i<8;i++)step(s);assert.equal(s.tick,tick+8);assert.ok(h.x!==x||h.goal&&h.goal.kind!=='routeWait'||h.timeline.length>events);assert.notEqual(h.goal?.workplace?.id,f.o.id);
});

test('a distant unobserved closure is not scanned, but a later remembered observation can change the plan',()=>{
 const f=workLossFixture({family:false}),{s,h,o,a}=f;h.goal=null;h.area='a1';o.state='burned';assert.equal(h.property.known[o.id].state,'intact');assert.equal(reconsiderWorkLoss(s,ctx),false);assert.equal(h.workLife.loss,null);h.area=a.id;observeProperty(s,a);assert.equal(reconsiderWorkLoss(s,ctx),true);assert.equal(h.workLife.loss.id,o.id);
});

test('an unknown relative and a disconnected remembered workshop do not become reachable affairs',()=>{
 for(const mode of ['unknown-relative','blocked-workshop']){const f=workLossFixture({family:mode==='unknown-relative',alternative:mode!=='unknown-relative'}),{s,h}=f;if(f.relative)h.memory.people=h.memory.people.filter(id=>id!==f.relative.id);closeWorkplace(f);workTick(s,ctx);assert.equal(reconsiderWorkLoss(s,mode==='blocked-workshop'?{...ctx,knownRoute:()=>[]}:ctx),false);assert.equal(h.workLife.loss.status,'open');assert.equal(h.goal,null);if(f.q)assert.equal(f.q.status,'active');}
});

test('a workplace loss waits for urgent promises and the body resources rather than cancelling them',()=>{
 const f=workLossFixture({family:false}),{s,h}=f;closeWorkplace(f);workTick(s,ctx);assert.equal(reconsiderWorkLoss(s,ctx,{deadline:s.tick+5}),false);assert.equal(h.workLife.loss.status,'pending');h.energy=10;assert.equal(reconsiderWorkLoss(s,ctx),false);assert.equal(h.goal,null);h.energy=100;assert.equal(reconsiderWorkLoss(s,ctx),true);assert.equal(h.goal.kind,'work');
});

test('pending closure and the chosen actual executor survive save/load without extra rent, XP or duplicated progress',()=>{
 const f=workLossFixture({attached:true}),{s,h}=f;closeWorkplace(f);workTick(s,ctx);const copy=restore(serialize(s));reconsiderWorkLoss(s,ctx);reconsiderWorkLoss(copy,ctx);assert.equal(serialize(s),serialize(copy));const saved=serialize(s),again=restore(saved);for(let i=0;i<12;i++){step(s);step(again);}assert.equal(serialize(s),serialize(again));assert.equal(h.workLife.loss.id,f.o.id);
});

test('off preserves old work denial, saved knowledge and funding without creating a new work-life record',()=>{
 const f=workLossFixture({off:true}),{s,h}=f;assert.equal(h.workLife,undefined);closeWorkplace(f);const gold=h.gold;workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.workLife,undefined);assert.equal(h.gold,gold);assert.equal(reconsiderWorkLoss(s,ctx),false);setModule(s,'work-loss',true);assert.equal(reconsiderWorkLoss(s,ctx),false);
});

test('a new closure after actual renewed work is distinct, while repeated observation of the same loss is not',()=>{
 const f=workLossFixture({family:false,alternative:false}),{s,h,o}=f;closeWorkplace(f);workTick(s,ctx);reconsiderWorkLoss(s,ctx);const first=h.workLife.loss.observed,count=h.timeline.length;s.tick++;observeProperty(s,f.a);reconsiderWorkLoss(s,ctx);assert.equal(h.timeline.length,count);
 o.state='intact';h.workAfter=0;h.goal={kind:'work',area:h.area,x:42,job:'repair',remaining:5,workspace:{id:o.id,kind:'lease',owner:o.owner,until:s.tick+60}};workTick(s,ctx);s.tick++;closeWorkplace(f);workTick(s,ctx);assert.equal(h.workLife.loss.status,'pending');assert.ok(h.workLife.loss.observed>first);
});

test('visible closure is remembered even if the owner left, and a physically missing bound workplace is not retried as intact',()=>{
 for(const missing of [false,true]){const f=workLossFixture({family:false}),{s,h,o,a}=f;f.owner.area='a1';f.owner.status='travelling';
  if(missing){a.objects=a.objects.filter(other=>other!==o);for(const id of a.population){const p=s.people[id];if(p.agenda?.job==='artisan')p.status='travelling';}}else o.state='burned';
  assert.equal(h.property.known[o.id].state,'intact');workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.property.known[o.id].state,missing?'missing':'burned');assert.equal(h.workLife.loss.id,o.id);assert.equal(reconsiderWorkLoss(s,ctx),true);assert.equal(h.goal.workplace.id,f.other.id);
 }
});

test('a later career decision leaves the old workplace behind instead of forcing a return years later',()=>{
 for(const pending of [false,true]){const f=workLossFixture({family:false}),{s,h}=f;if(pending){closeWorkplace(f);workTick(s,ctx);}else h.goal=null;
  s.tick++;h.career.lastChange=s.tick;h.profession='mage';s.tick++;if(!pending)closeWorkplace(f);assert.equal(reconsiderWorkLoss(s,ctx),false);assert.equal(h.goal,null);assert.equal(h.profession,'mage');assert.equal(h.workLife.loss?.status,pending?'superseded':undefined);
 }
});

test('ordinary autonomous work planning binds a specific known workplace without inventing a job or title',()=>{
 for(const off of [false,true]){const f=workLossFixture({family:false,off}),{s,h}=f;h.goal=null;h.gold=4;h.workAfter=0;const title=f.o.owner,rank=h.career.rank;assert.equal(planWork(s,ctx),true);assert.equal(h.goal.job,'repair');if(off)assert.equal(h.goal.workplace,undefined);else{assert.ok(h.property.known[h.goal.workplace.id]);assert.equal(h.goal.area,h.property.known[h.goal.workplace.id].area);}assert.equal(h.gold,4);assert.equal(h.career.rank,rank);assert.equal(f.o.owner,title);}
});
