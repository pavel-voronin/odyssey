import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {balanceFixture} from '../scripts/intention-balance-scenarios.mjs';
import {currentQuest,questReady} from '../modules/quests.js';
import {chooseQuest,questMeaning} from '../modules/intention-choice.js';
import {assertSameSave} from '../scripts/life-save-compare.mjs';
import {rememberRetreat,commitmentPlan} from '../modules/commitments.js';
import {commonContext} from '../scripts/common-life-scenarios.mjs';
import {areaAvoided} from '../modules/route-memory.js';
import {intentionFixture} from '../scripts/intention-scenarios.mjs';
import {poisonFixture} from '../scripts/poison-care-scenarios.mjs';
test('small trust changes retain a real current executor beyond the minimum window without sorting the canonical portfolio',()=>{
 for(const reverse of [false,true]){const f=balanceFixture(),old=f.h.goal;if(reverse)f.h.quests.reverse();const order=f.h.quests.map(q=>q.id);f.h.relations[f.b.giver]={trust:8};
  for(let i=0;i<5;i++){step(f.s);assert.equal(f.h.goal,old);assert.equal(f.h.goal.quest,f.a.id);}assert.ok(f.s.tick-f.h.intentions.balance.current.since>=4);assert.equal(chooseQuest(f.s,f.h.quests,q=>questReady(f.s,q)).retained,true);assert.deepEqual(f.h.quests.map(q=>q.id),order);assert.equal(f.stock.civic.food,65);
 }
});
test('a newly urgent feasible promise interrupts partial warehouse work and later resumes the same remaining actions without duplicating cargo',()=>{
 const f=balanceFixture({x:42,urgent:true}),old=f.h.goal;step(f.s);assert.equal(old.remaining,2);assert.equal(f.stock.civic.food,65);f.b.deadline=f.s.tick+24;
 step(f.s);assert.equal(f.h.goal.quest,f.b.id);assert.equal(f.h.intentions.balance.paused[f.a.id].action,old);assert.equal(old.remaining,2);assert.equal(f.h.quests.length,2);
 for(let i=0;i<50&&f.b.status==='active';i++)step(f.s);assert.equal(f.b.status,'done');assert.ok(f.b.completed<=f.b.deadline);assert.equal(f.h.gold,0);
 for(let i=0;i<3&&f.h.goal!==old;i++)step(f.s);assert.equal(f.h.goal,old);assert.equal(old.remaining,2);assert.equal(f.h.intentions.balance.paused[f.a.id],undefined);
 for(let i=0;i<40&&!f.a.cargo;i++)step(f.s);assert.equal(f.a.cargo,true);assert.equal(f.stock.civic.food,57);assert.equal(f.h.questCargo[f.a.id],'Ящик припасов');assert.equal(f.h.quests.length,2);assert.equal(f.h.gold,0);
});
test('an unrelated expired promise cannot erase the current warehouse action or spend its stock',()=>{
 const f=balanceFixture({x:42});f.b.deadline=f.s.tick;const old=f.h.goal;step(f.s);assert.equal(f.b.status,'failed');assert.equal(f.h.goal,old);assert.equal(old.remaining,2);assert.equal(f.a.status,'active');assert.equal(f.stock.civic.food,65);
});
test('a lost known route defers the executor with a reason while the accepted promise and original cargo stay canonical',()=>{
 const f=balanceFixture({x:42,parcel:true});f.h.memory.avoided.a5=f.s.tick+100;
 // Both targets are unreachable from this known neighbouring street.
 f.h.area='a1';f.h.x=42;step(f.s);assert.equal(f.h.intentions.balance.last.to,null);assert.ok(f.h.intentions.balance.blocked[f.a.id]);assert.equal(f.a.status,'active');assert.equal(f.h.questCargo[f.a.id],f.a.payload);assert.equal(f.stock.civic.food,65);assert.notEqual(f.h.goal?.quest,f.a.id);
});
test('actual known parentage changes the promise meaning independently of array and acceptance order; pure queries consume nothing',()=>{
 const f=balanceFixture();setModule(f.s,'lineage',true);f.b.giver=f.s.people[f.h.lineage].parents.find(id=>f.s.people[id]?.alive);assert.ok(f.b.giver);f.b.source=f.s.people[f.b.giver].area;f.b.accepted=1;f.a.accepted=99;f.h.goal=null;
 const before=serialize(f.s);assert.equal(questMeaning(f.s,f.b).family,true);assert.equal(currentQuest(f.h,f.s).id,f.b.id);assert.equal(serialize(f.s),before);f.h.quests.reverse();assert.equal(currentQuest(f.h,f.s).id,f.b.id);
});
test('equal purposes use a seed-based stable tie, independent of acceptance timestamps embedded in IDs',()=>{
 const f=balanceFixture();f.h.goal=null;f.h.intentions.balance.current=null;f.a.id='quest-1-10-0';f.b.id='quest-1-90-1';const selected=currentQuest(f.h,f.s).source;
 f.a.accepted=900;f.a.id='quest-1-900-1';f.b.accepted=1;f.b.id='quest-1-1-0';f.h.quests.reverse();assert.equal(currentQuest(f.h,f.s).source,selected);
});
test('a save in a real short interruption replays exactly; switching off preserves the existing executor and pending work',()=>{
 const f=balanceFixture({x:42,urgent:true});step(f.s);f.b.deadline=f.s.tick+24;step(f.s);const copy=restore(serialize(f.s));
 for(let i=0;i<45;i++){step(f.s);step(copy);assertSameSave(serialize(f.s),serialize(copy));}
 const other=balanceFixture();step(other.s);const old=other.h.goal,state=JSON.stringify(other.h.intentions.balance);setModule(other.s,'intention-balance',false);step(other.s);assert.equal(other.h.goal,old);assert.equal(JSON.stringify(other.h.intentions.balance),state);
});
test('four blocked promises do not cause a repeated attempt to accept a fifth quest',()=>{
 const f=balanceFixture({x:42,parcel:true}),patient=f.s.people[f.s.areas.a5.population[0]];patient.ailment='fever';patient.health=40;
 const wolves=f.s.areas.a2.objects.filter(o=>o.kind==='enemy');
 f.h.quests.push({id:'medicine-promise',kind:'medicine',source:'a5',target:'a5',person:patient.id,giver:patient.id,status:'active',accepted:90,required:1,reward:14},{id:'wolves-promise',kind:'wolves',source:'a1',target:'a2',giver:'person-2',status:'active',accepted:90,required:wolves.length,targets:wolves.map(e=>e.id),reward:22});
 f.h.area='a1';f.h.x=42;f.h.memory.avoided={a5:200,a2:200};for(let i=0;i<5;i++){step(f.s);assert.equal(f.h.quests.length,4);assert.notEqual(f.h.goal?.kind,'talk');}
 assert.ok(f.h.quests.every(q=>q.status==='active'));assert.equal(f.h.questCargo[f.a.id],f.a.payload);assert.equal(Object.keys(f.h.intentions.balance.blocked).length,4);
});
function personalFixture(){const f=balanceFixture({x:42,urgent:true});setModule(f.s,'commitments',true);f.h.personality.courage=.2;f.h.personality.generosity=.2;f.h.gold=100;f.h.weapon=0;f.h.memory.merchant='a1';f.s.merchant.area='a1';f.s.merchant.destination=null;f.s.merchant.nextMove=10000;rememberRetreat(f.s,f.s.areas.a2.objects.find(o=>o.kind==='enemy'));return f;}
test('a real remembered preparation keeps its decision through a small promise advantage, then yields to a genuinely short deadline',()=>{
 const f=personalFixture(),cause=f.h.commitments.personal.cause;assert.equal(commitmentPlan(f.s,f.a,false,commonContext),true);assert.equal(f.h.goal.commitment,cause);assert.equal(f.h.commitments.personal.decision,'prepare');
 for(const trust of [8,9,10]){f.h.relations[f.a.giver]={trust};f.h.goal=null;f.s.tick++;assert.equal(commitmentPlan(f.s,f.a,false,commonContext),true);assert.equal(f.h.commitments.personal.decision,'prepare');}
 assert.equal(f.h.commitments.decisions.length,1);f.a.deadline=f.s.tick+20;f.h.goal=null;assert.equal(commitmentPlan(f.s,f.a,false,commonContext),false);assert.equal(f.h.commitments.personal.decision,'promise:'+f.a.id);assert.equal(f.h.commitments.decisions.length,2);assert.equal(f.h.commitments.personal.cause,cause);assert.equal(f.h.gold,100);
});
test('a short promise can interrupt a real equipment trip and return to the same executor before one actual purchase',()=>{
 const f=personalFixture();assert.equal(commitmentPlan(f.s,f.a,false,commonContext),true);const old=f.h.goal,cause=old.commitment;f.b.deadline=f.s.tick+24;step(f.s);
 assert.equal(f.h.goal.quest,f.b.id);assert.equal(f.h.intentions.balance.personal.action,old);assert.equal(f.h.commitments.personal.decision,'promise:'+f.b.id);assert.equal(f.h.gold,100);assert.equal(f.h.weapon,0);
 for(let i=0;i<40&&f.b.status==='active';i++)step(f.s);assert.equal(f.b.status,'done');
 for(let i=0;i<3&&f.h.goal!==old;i++)step(f.s);assert.equal(f.h.goal,old);assert.equal(f.h.goal.commitment,cause);assert.equal(f.h.intentions.balance.personal,null);assert.equal(f.h.gold,100);
 for(let i=0;i<10&&!f.h.weapon;i++)step(f.s);assert.equal(f.h.weapon,1);assert.equal(f.h.gold,84);assert.equal(f.h.quests.length,2);assert.equal(f.a.cargo,false);assert.equal(f.stock.civic.food,65);
});
test('real equipment changes can reopen a remembered route without waiting for an unrelated timeout',()=>{
 const f=balanceFixture({x:42,parcel:true});setModule(f.s,'route-memory',true);f.h.area='a1';f.h.x=42;f.h.weapon=0;f.h.armor=0;f.h.level=1;f.h.memory.rejected={a5:{enemy:'remembered-raider',name:'Известный разбойник',hp:50,attack:12,seen:90}};
 assert.equal(areaAvoided(f.s,'a5'),true);step(f.s);assert.ok(f.h.intentions.balance.blocked[f.a.id]);f.h.goal={kind:'routeWait',area:'a1',x:f.h.x,until:10000};f.h.weapon=3;f.h.armor=2;assert.equal(areaAvoided(f.s,'a5'),false);step(f.s);assert.equal(f.h.intentions.balance.blocked[f.a.id],undefined);assert.equal(f.h.goal.quest,f.a.id);assert.equal(f.h.intentions.balance.last.kind,'route-opened');assert.ok(f.s.journal.some(e=>e.type==='plan'&&e.text.includes('продолжить прежнее дело')));
});
test('a selfish hero can consciously refuse a distrusted promise in one thought while retaining its actual letter; off and generosity keep it active',()=>{
 for(const [off,generosity,refuses]of [[false,.1,true],[true,.1,false],[false,.9,false]]){
  const f=balanceFixture({x:0,parcel:true,off});f.h.personality.generosity=generosity;f.h.relations[f.a.giver]={trust:-60};const cargo=f.h.questCargo[f.a.id],tick=f.s.tick,oldIntent=f.h.intent;step(f.s);
  assert.equal(f.a.status,refuses?'abandoned':'active');assert.equal(f.h.questCargo[f.a.id],cargo);assert.equal(f.h.quests.length,2);assert.equal(f.stock.civic.food,65);assert.equal(f.s.tick,tick+1);
  if(refuses){assert.equal(f.h.x,0);assert.equal(f.h.lastAction,'idle');assert.equal(f.h.gold,0);assert.equal(f.h.intentions.balance.last.kind,'refused');assert.ok(f.a.failure.includes('утратил доверие'));assert.equal(f.h.memory.refusedOffers[f.a.offer],f.s.tick+2400);assert.notEqual(f.h.intent,oldIntent);assert.ok(f.h.reason.includes('утратил доверие'));}
 }
});
test('a discretionary refusal cannot steal the action from a witnessed emergency or necessary medical camp',()=>{
 const f=intentionFixture();setModule(f.s,'intention-balance',true);setModule(f.s,'quests',true);f.h.personality.generosity=.1;f.h.relations[f.victim.id]={trust:80};f.h.relations['person-2']={trust:-60};const q={id:'distrusted',kind:'scout',title:'Прежняя разведка',status:'active',giver:'person-2',source:'a1',target:'a2',accepted:0,required:1,reward:14};f.h.quests=[q];step(f.s);assert.equal(q.status,'active');assert.equal(f.h.lastAction,'talk');assert.equal(f.victim.safetyAdvice.status,'pending');
 const camp=poisonFixture();setModule(camp.s,'intention-balance',true);setModule(camp.s,'quests',true);camp.h.personality.generosity=.1;camp.h.relations['person-2']={trust:-60};camp.h.quests=[{...q}];step(camp.s);assert.equal(camp.h.quests[0].status,'active');assert.equal(camp.h.goal.kind,'campPitch');assert.equal(camp.h.goal.remaining,1);assert.equal(camp.h.hp,5);
});
