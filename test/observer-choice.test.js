import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,createNextStory} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createClock,catchUp,hasDue} from '../clock.js';
import {observerChoices,observerRequest,commitObserverRequest} from '../observer-choice.js';
function fixture(){const s=createWorld(1);for(const m of MODULES)setModule(s,m.id,false);s.hero.area='a1';s.hero.x=15;s.hero.goal={kind:'routeWait',area:'a1',x:15,until:10000};const p=Object.values(s.people).find(p=>p.alive&&p.role!=='ребёнок'&&p.area==='a1'&&p.id!==s.hero.lineage);return {s,p};}
test('choices learn only the observed body and visible or personally known people, never a hidden current address',()=>{
 const {s,p}=fixture(),remote=Object.values(s.people).find(q=>q.alive&&q.id!==p.id&&q.id!==s.hero.lineage&&q.role!=='ребёнок');assert.ok(remote);remote.area='a3';let choices=observerChoices(s);assert.ok(choices.some(c=>c.id===p.id));assert.equal(choices.some(c=>c.id===remote.id),false);
 s.hero.memory.people.push(remote.id);choices=observerChoices(s);assert.equal(choices.find(c=>c.id===remote.id).description,'Знакомый житель');
 p.area='a3';s.areas.a3.name='Скрытое новое поселение';const entry=observerChoices(s).find(c=>c.id===p.id);assert.equal(entry.description,'Последняя встреча: '+s.areas.a1.name);assert.equal(JSON.stringify(entry).includes('Скрытое'),false);
 remote.role='ребёнок';p.alive=false;assert.equal(observerChoices(s).some(c=>[p.id,remote.id].includes(c.id)),false);assert.equal(observerRequest(s,'person',remote.id,0),null);
});
test('two explicit returns keep the same bodies, wounded worker, wallet, private maps and birth counter without ticking',()=>{
 let {s,p}=fixture();const old=s.hero;p.health=73;p.agenda.wealth=29;const task=p.agenda.task={kind:'farm',target:'a1',x:42,remaining:7},count=s.nextPerson,rng=s.rng,streams=structuredClone(s.randomStreams),clock=createClock(1000);
 for(let i=0;i<2;i++){
  const request=observerRequest(s,'person',p.id,1000);assert.ok(commitObserverRequest(s,clock,request,1000));assert.equal(s.hero.hp,73);assert.equal(s.hero.gold,29);assert.equal(s.people[p.id].agenda.task.kind,task.kind);assert.equal(s.hero.actorMode,'npc');
  const back=observerRequest(s,'person',old.lineage,1000);assert.ok(commitObserverRequest(s,clock,back,1000));assert.equal(s.hero.lineage,old.lineage);assert.equal(s.hero.goal.kind,'routeWait');
  const save=serialize(s);s=restore(save);assert.equal(serialize(s),save);
 }
 assert.equal(s.tick,0);assert.equal(s.nextPerson,count);assert.equal(s.nextGeneration,1);assert.equal(s.rng,rng);assert.deepEqual(s.randomStreams,streams);assert.equal(s.people[p.id].actorLink.inventory,s.actorStates[p.id].inventory);
});
test('old wall-time debt is processed first and a target who dies during it is never replaced automatically',()=>{
 const {s,p}=fixture(),clock=createClock(0),request=observerRequest(s,'person',p.id,6000),old=s.hero;
 assert.equal(commitObserverRequest(s,clock,request,6000),false);assert.equal(s.hero,old);
 catchUp(clock,6000,()=>step(s),2);assert.equal(s.tick,2);assert.equal(commitObserverRequest(s,clock,request,6000),false);
 p.alive=false;p.health=0;while(hasDue(clock,request.target))catchUp(clock,request.target,()=>step(s),2);
 assert.equal(s.tick,6);assert.equal(commitObserverRequest(s,clock,request,9000),false);assert.equal(s.hero,old);assert.equal(s.nextGeneration,1);assert.equal(clock.anchor,6000);
});
test('a successful handoff adds no tick, waits five seconds and rejects the old request after switching back',()=>{
 const {s,p}=fixture(),clock=createClock(0),old=s.hero,request=observerRequest(s,'person',p.id,6000);
 catchUp(clock,6000,()=>step(s));const before=s.tick;assert.ok(commitObserverRequest(s,clock,request,9000));assert.equal(s.tick,before);assert.equal(clock.anchor,9000);assert.equal(clock.idleUntil,14000);assert.equal(hasDue(clock,13999),false);
 const back=observerRequest(s,'person',old.lineage,9000);assert.ok(commitObserverRequest(s,clock,back,9000));assert.equal(commitObserverRequest(s,clock,request,9000),false);assert.equal(s.hero,old);
});
test('one fresh explicit new-person request works while alive and cannot create a second person when replayed',()=>{
 const {s}=fixture(),clock=createClock(1000),old=s.hero,request=observerRequest(s,'new',null,1000);assert.ok(commitObserverRequest(s,clock,request,1000));const person=s.hero.lineage,count=s.nextPerson;assert.equal(s.tick,0);assert.equal(s.generation,2);assert.equal(s.actorStates[old.lineage],old);assert.equal(old.alive,true);assert.equal(commitObserverRequest(s,clock,request,1000),false);assert.equal(s.hero.lineage,person);assert.equal(s.nextPerson,count);
});

test('a known traveller can be observed on its actual journey without revealing that route in the choice list',()=>{
 const {s,p}=fixture(),clock=createClock(1000);s.hero.memory.people.push(p.id);p.area=null;p.status='travelling';s.society.journeys.push({version:1,movement:'timed',person:p.id,from:'a1',to:'a4',arrival:200,reason:'Ищет новый дом.'});
 const choice=observerChoices(s).find(c=>c.id===p.id);assert.equal(choice.description,'Знакомый житель');const request=observerRequest(s,'person',p.id,1000);assert.ok(commitObserverRequest(s,clock,request,1000));assert.equal(s.tick,0);assert.equal(p.area,null);assert.equal(s.hero.personPosition.area,null);assert.equal(s.hero.transit.to,'a4');assert.equal(s.hero.transit.remaining,200);assert.equal(s.hero.transit.viewOnly,true);
});

