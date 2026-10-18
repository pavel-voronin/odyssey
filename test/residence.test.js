import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,knownRoute,route,log,createNextStory,observeDetailedActor} from '../engine.js';
import {MODULES,setModule} from '../rules.js';import {settleLife,lifePlan} from '../modules/lifecycle.js';
import {workshopAt,observeProperty} from '../modules/property.js';import {planWork} from '../modules/work.js';import {localNeedsPlan} from '../modules/residence.js';
import {revealArea} from '../actor-atlas.js';import {npcController} from '../modules/npc-control.js';import {YEAR_TICKS} from '../calendar.js';import {lifeFinished} from '../playback.js';
const ctx={log,route,knownRoute,goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;},closest(s,predicate){return Object.values(s.areas).filter(a=>predicate(a)&&knownRoute(s,s.hero.area,a.id).length).sort((a,b)=>knownRoute(s,s.hero.area,a.id).length-knownRoute(s,s.hero.area,b.id).length)[0];}};
function resident(owner=false){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['lifecycle','identity','work','property'])setModule(s,id,true);
 const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');h.area=a.id;h.x=42;h.profession='clockmaker';h.career.path='peaceful';h.career.rank=3;h.gold=10;h.habits=[];h.conditions=[];h.quests=[];h.companions=[];h.personality.curiosity=.1;h.commitments.personal=null;s.storyCases=[];h.life.home=a.id;h.life.motive='Здесь есть работа и знакомые.';
 const o=workshopAt(s,a),p=s.people[o.owner];p.x=42;if(owner)o.owner=h.lineage;observeProperty(s,a);revealArea(s,a.id);settleLife(s,ctx);return {s,h,a,o,p};
}
test('a new home retains the same party, resources and active body rather than releasing contracts or inventing a workshop',()=>{
 const {s,h,a,o}=resident();const other=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.id!==o.owner);h.companions=[{person:other.id,name:other.name,hp:20,maxHp:20}];h.hp=23;h.energy=61;h.life.phase='returning';h.property.contract='still-owned';const party=h.companions,gold=h.gold,owner=o.owner;
 settleLife(s,ctx);assert.equal(h.companions,party);assert.equal(h.hp,23);assert.equal(h.energy,61);assert.equal(h.gold,gold);assert.equal(h.property.contract,'still-owned');assert.equal(o.owner,owner);assert.equal(h.life.ended,false);assert.equal(lifeFinished(s),false);assert.equal(npcController(s,s.people[h.lineage]),'actor');assert.equal(npcController(s,other),'party');assert.equal(s.lives.length,0);assert.equal(a.objects.filter(o=>o.id==='settled-'+h.lineage).length,1);assert.equal(s.journal.some(e=>e.text.includes('Открывается мастерская')),false);
});
test('resident owners work in their actual workshop and renters transfer one real lease payment without acquiring title',()=>{
 for(const owns of [false,true]){const {s,h,o,p}=resident(owns),coins=h.gold,wealth=p.agenda.wealth,owner=o.owner;for(let i=0;i<40&&!h.counters.peacefulWork;i++)step(s);assert.equal(h.counters.peacefulWork,1);assert.equal(h.gold,coins+10-(owns?0:2));assert.equal(p.agenda.wealth,wealth+(owns?0:2));assert.equal(o.owner,owner);assert.ok(h.life.residence.since>=0);assert.equal(h.life.ended,false);assert.equal(s.lives.length,0);const saved=serialize(s);assert.equal(serialize(restore(saved)),saved);}
});
test('a missing workspace leads to ordinary wage labour instead of a fabricated ownership or a permanent repair loop',()=>{
 const {s,h,a,o}=resident();o.state='burned';observeProperty(s,a);assert.ok(planWork(s,ctx));assert.equal(h.goal.job,'dock');const gold=h.gold,owner=o.owner;for(let i=0;i<10&&!h.counters.peacefulWork;i++)step(s);assert.equal(h.counters.peacefulWork,1);assert.equal(h.gold,gold+8);assert.equal(o.owner,owner);assert.equal(o.state,'burned');assert.equal(h.profession,'clockmaker');
});
test('an actual local food shortage changes the route without deleting home, mastery or owned property',()=>{
 const {s,h,a,o}=resident(true);setModule(s,'supply',true);a.civic.food=0;s.areas.a1.civic.food=40;revealArea(s,'a1');const home=h.life.home,rank=h.career.rank;assert.ok(localNeedsPlan(s,ctx));assert.equal(h.goal.kind,'explore');assert.notEqual(h.goal.area,a.id);assert.ok(s.areas[h.goal.area].civic.food>=20);assert.equal(h.life.residence.away.cause,'food');for(let i=0;i<60&&h.area===a.id;i++)step(s);assert.notEqual(h.area,a.id);for(let i=0;i<100;i++){step(s);assert.notEqual(h.area,a.id,'employment must not immediately send the hungry resident back into the same empty store');}assert.equal(h.life.home,home);assert.ok(h.career.rank>=rank);assert.equal(o.owner,h.lineage);assert.ok(h.life.residence.since>=0);assert.equal(h.life.ended,false);
});
test('disabling the lifestyle preserves its home and experience while allowing the ordinary planner again',()=>{
 const {s,h}=resident(true);setModule(s,'lifecycle',false);const before=serialize(s);assert.equal(lifePlan(s,ctx),false);assert.equal(serialize(s),before);assert.ok(h.life.residence.since>=0);assert.equal(h.career.rank,3);assert.equal(h.life.ended,false);
});
test('resident work continues after observation changes, and returning restores that same living worker',()=>{
 const {s,h,o}=resident(true),person=h.lineage;createNextStory(s,{allowLiving:true});s.hero.goal={kind:'routeWait',area:s.hero.area,x:s.hero.x,until:10000};for(let i=0;i<20;i++)step(s);assert.ok(h.counters.peacefulWork>0);assert.equal(h.actorStep,s.tick);assert.equal(h.life.ended,false);assert.ok(observeDetailedActor(s,person));assert.equal(s.hero,h);assert.equal(o.owner,person);assert.equal(npcController(s,s.people[person]),'actor');assert.equal(s.lives.length,0);
});
test('a provisioned resident lives and develops through a full world year with real needs, exact replay and reloads',()=>{
 let {s,h}=resident(true);setModule(s,'body',true);setModule(s,'supply',true);for(const a of Object.values(s.areas)){for(const o of a.objects)if(o.kind==='enemy')o.alive=false;if(a.civic)a.civic.food=100000;}
 const person=h.lineage,before=h.counters.peacefulWork||0,food=Object.values(s.areas).reduce((n,a)=>n+(a.civic?.food||0),0);let repeat=restore(serialize(s));for(let i=0;i<YEAR_TICKS+1;i++){step(s);step(repeat);if(i%997===0){const save=serialize(s);assert.equal(save,serialize(repeat));s=restore(save);assert.equal(serialize(s),save);}}
 h=s.actorStates[person];assert.equal(h.alive,true);assert.ok(h.life.residence.since>=0);assert.equal(h.life.ended,false);assert.equal(s.lives.length,0);assert.ok(h.counters.peacefulWork>before);assert.ok(h.career.rank>3||h.career.xp>0);assert.ok(Object.values(s.areas).reduce((n,a)=>n+(a.civic?.food||0),0)<food);assert.equal(s.generation,1);assert.equal(s.hero.lineage,person);assert.equal(npcController(s,s.people[person]),'actor');assert.equal(serialize(s),serialize(repeat));
});

test('a resident can actually die later and receives one death archive rather than an earlier peaceful final',()=>{
 const {s,h}=resident(true),e=s.areas.a2.objects.find(o=>o.kind==='enemy');h.area='a2';h.x=e.x;h.hp=h.maxHp;h.inventory.potions=0;h.personality.courage=1;h.combat=e.id;e.hp=e.maxHp=1000;e.attack=10000;step(s);assert.equal(h.alive,false);assert.equal(h.life.ended,true);assert.equal(s.lives.length,1);assert.equal(s.lives[0].outcome,'dead');assert.equal(s.lives[0].cause,e.name);const ended=s.lives[0].ended;step(s);assert.equal(s.lives.length,1);assert.equal(s.lives[0].ended,ended);assert.equal(s.generation,1);
});


