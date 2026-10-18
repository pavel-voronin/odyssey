import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,route,step,serialize,restore} from '../engine.js';
import {MODULES,setModule,moduleRandom} from '../rules.js';
import {recordValueOutcome,valueRevisionBias,promiseBreachChance,valueRevisionHTML} from '../modules/value-revision.js';
import {finishQuest,abandonQuest,failQuest,planQuest,questAction,currentQuest} from '../modules/quests.js';
import {promiseWeight} from '../modules/commitments.js';
import {questChoiceAvailable} from '../modules/intention-choice.js';
import {rescueFixture} from '../scripts/dungeon-rescue-scenarios.mjs';
import {hearCaptive,finishDungeonRescue} from '../modules/rescue-plan.js';
import {beginRescueEscape} from '../modules/rescue-escape.js';
import {peopleTick} from '../modules/people.js';
import {escapeText} from '../text.js';
const ctx={route,random:()=>.99,log:()=>{},gainXp:()=>{},goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['value-revision','commitments','intention-balance','identity','quests'].includes(m.id));const h=s.hero;s.tick=40;h.area='a1';h.x=42;h.hp=h.maxHp;h.energy=100;h.hunger=0;h.combat=null;h.goal=null;h.profession='scholar';h.personality.generosity=.5;h.personality.curiosity=.8;h.companions=[];h.inventory.herbs=0;h.inventory.relics=0;
 const people=Object.values(s.people).filter(p=>p.alive&&p.id!==h.lineage&&p.role!=='ребёнок'),[giver,victim,helpGiver,relicGiver,nextVictim]=people;
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 h.memory.people=[...new Set([...h.memory.people,giver.id,victim.id,helpGiver.id,relicGiver.id,nextVictim.id])];victim.area=h.area;victim.status='escorted';nextVictim.area='a2';nextVictim.status='captive';s.areas.a2.objects.push({id:'future-captive',kind:'captive',person:nextVictim.id,name:nextVictim.name,x:84,resolved:false});
 const relicArea=Object.values(s.areas).find(a=>a.objects.some(o=>o.kind==='relic'&&!o.taken)),relicObject=relicArea.objects.find(o=>o.kind==='relic'&&!o.taken);
 const old={id:'experienced-rescue',kind:'rescue',status:'active',source:h.area,target:'a2',giver:giver.id,person:victim.id,rescued:true,required:1,reward:0,accepted:0,title:'Вернуть живого человека'},help={id:'next-rescue',kind:'rescue',status:'active',source:h.area,target:'a2',giver:helpGiver.id,person:nextVictim.id,object:'future-captive',targets:[],required:1,reward:0,accepted:30,title:'Другая помощь'},relic={id:'next-relic',kind:'relic',status:'active',source:h.area,target:relicArea.id,giver:relicGiver.id,object:relicObject.id,required:1,reward:24,accepted:30,title:'Поиск древности'};
 h.relations[helpGiver.id]={trust:0};h.relations[relicGiver.id]={trust:40};h.quests=[old,help,relic];return {s,h,old,help,relic,giver,victim};
}
test('a witnessed actual rescue changes the next available ordinary plan, preserving profile and the same resources/actions',()=>{
 const {s,h,old,help,relic}=fixture(),baseline=restore(serialize(s));setModule(baseline,'value-revision',false);const profile=JSON.stringify([h.personality,h.stats,h.habits,h.profession]),rng=JSON.stringify(s.randomStreams);
 finishQuest(s,old,ctx);finishQuest(baseline,baseline.hero.quests[0],ctx);setModule(baseline,'value-revision',true);assert.equal(h.valueRevision.help,6);assert.equal(h.valueRevision.promise,0);assert.equal(JSON.stringify([h.personality,h.stats,h.habits,h.profession]),profile);assert.equal(JSON.stringify(s.randomStreams),rng);assert.equal(h.gold,baseline.hero.gold);assert.deepEqual(h.inventory,baseline.hero.inventory);
 assert.equal(questChoiceAvailable(s,help),true);assert.equal(questChoiceAvailable(s,relic),true);const before=currentQuest(baseline.hero,baseline),after=currentQuest(h,s);assert.equal(before.id,relic.id);assert.equal(after.id,help.id);planQuest(baseline,before,ctx);planQuest(s,after,ctx);assert.equal(baseline.hero.goal.kind,'collect');assert.equal(h.goal.kind,'questAction');assert.equal(h.valueRevision.events[0].person.id,old.person);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a less open hero can preserve conviction after the same known rescue; duplicate outcomes never add another shift or reward',()=>{
 const {s,h,old}=fixture();h.personality.curiosity=.2;finishQuest(s,old,ctx);assert.equal(h.valueRevision.help,0);assert.equal(h.valueRevision.events[0].stance,'kept');assert.match(h.valueRevision.events[0].reason,/сохраняет/);const raw=serialize(s);assert.equal(recordValueOutcome(s,old,'rescue',ctx),false);finishQuest(s,old,ctx);assert.equal(serialize(s),raw);
});
test('an actual abandoned old promise changes word-keeping with no random draw; the same next letter roll now yields delivery instead of sale',()=>{
 const {s,h,old,giver,victim}=fixture();old.kind='delivery';old.recipient=victim.id;old.payload='Старое письмо';old.cargo=true;old.rescued=undefined;const baseline=restore(serialize(s));setModule(baseline,'value-revision',false);const streams=JSON.stringify(s.randomStreams);abandonQuest(s,old,ctx);abandonQuest(baseline,baseline.hero.quests[0],ctx);setModule(baseline,'value-revision',true);assert.equal(h.valueRevision.promise,6);assert.equal(JSON.stringify(s.randomStreams),streams);assert.ok(promiseBreachChance(s)<promiseBreachChance(baseline));
 let seed=1;for(;seed<=32;seed++){const scratch={...s,randomStreams:{...s.randomStreams,quests:seed}},roll=moduleRandom(scratch,'quests');if(roll>.07&&roll<.29)break;}assert.ok(seed<=32);
 for(const w of [s,baseline]){const actor=w.hero;actor.profession='thief';actor.alignment=-40;actor.area='a1';w.people[victim.id].area='a1';w.people[victim.id].status='resident';w.randomStreams.quests=seed;const q={id:'new-letter',kind:'delivery',status:'active',source:'a1',target:'a1',giver:giver.id,recipient:victim.id,payload:'Новое письмо',accepted:0,cargo:true,delivered:false,required:1,reward:8};actor.quests.push(q);actor.questCargo ||= {};actor.questCargo[q.id]=q.payload;actor.goal={kind:'questAction',area:'a1',x:42,quest:q.id};questAction(w,q,ctx);}
 assert.equal(h.quests.at(-1).delivered,true);assert.equal(baseline.hero.quests.at(-1).status,'failed');assert.equal(baseline.hero.quests.at(-1).promiseBreach.kind,'sold-letter');assert.equal(baseline.hero.valueRevision.promise,6);assert.equal(h.valueRevision.events.length,1);assert.equal(serialize(restore(serialize(s))),serialize(s));assert.equal(serialize(restore(serialize(baseline))),serialize(baseline));
});
test('external failure, a merely found captive, a new short promise and later re-reading cannot invent a value experience',()=>{
 const {s,h,old}=fixture();old.rescued=false;assert.equal(recordValueOutcome(s,old,'rescue',ctx),false);failQuest(s,old,ctx,'Срок истёк из-за разлива.');assert.equal(recordValueOutcome(s,old,'brokenPromise',ctx),false);assert.equal(h.valueRevision,undefined);
 const f=fixture();f.old.accepted=f.s.tick;abandonQuest(f.s,f.old,ctx);assert.equal(f.h.valueRevision,undefined);const g=fixture();setModule(g.s,'value-revision',false);finishQuest(g.s,g.old,ctx);const saved=serialize(g.s);assert.equal(serialize(restore(saved)),saved);g.s.tick++;setModule(g.s,'value-revision',true);assert.equal(recordValueOutcome(g.s,g.old,'rescue',ctx),false);assert.equal(g.h.valueRevision,undefined);
});
test('domain caps preserve the first known cause through a bounded recent history instead of grinding unlimited values',()=>{
 const {s,h,old,giver}=fixture();finishQuest(s,old,ctx);for(let i=0;i<10;i++){s.tick++;const q={id:'old-word-'+i,kind:'delivery',giver:giver.id,status:'active',accepted:0,source:'a1',target:'a1'};h.quests.push(q);abandonQuest(s,q,ctx);}assert.equal(h.valueRevision.help,6);assert.equal(h.valueRevision.promise,6);assert.equal(h.valueRevision.events.length,8);assert.ok(h.valueRevision.events.some(e=>e.quest===old.id&&e.delta===6));assert.equal(h.valueRevision.events.filter(e=>e.kind==='brokenPromise'&&e.delta===6).length,1);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('self-offered dungeon rescue records the real prisoner as speaker only after actual escape arrival (at most24 NPC actions)',()=>{
 const f=rescueFixture(),{s,h,p,cage,guard,source}=f;setModule(s,'value-revision',true);h.personality.curiosity=.8;h.personality.generosity=.6;h.x=cage.x;h.goal={object:cage.id};assert.equal(hearCaptive(s,ctx),true);const q=h.quests.at(-1);assert.equal(q.giver,null);assert.equal(recordValueOutcome(s,q,'rescue',ctx),false);guard.alive=false;guard.resolved=true;h.x=cage.x;h.combat=null;assert.equal(beginRescueEscape(s,p,q),true);h.area=source.id;h.x=42;
 let actions=0;while(p.rescueFlight.status!=='arrived'&&actions++<24){s.tick+=8;peopleTick(s,ctx);}assert.ok(actions<=24);assert.equal(p.rescueFlight.status,'arrived');assert.equal(finishDungeonRescue(s,q,ctx),true);assert.equal(h.valueRevision.help,6);assert.equal(h.valueRevision.events[0].giver.id,p.id);assert.equal(h.valueRevision.events[0].person.id,p.id);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('read-only reason/weight queries and OFF preserve exact sources; one bounded engine replay and malformed-counter rejection',()=>{
 const {s,h,old,help}=fixture();finishQuest(s,old,ctx);const raw=serialize(s);assert.equal(valueRevisionBias(s,help),6);assert.match(valueRevisionHTML(s,escapeText,()=>'<date>'),/Вернуть живого/);assert.match(valueRevisionHTML(s,escapeText,()=>'<date>'),/&lt;date&gt;/);assert.equal(serialize(s),raw);setModule(s,'value-revision',false);const off=serialize(s);assert.equal(valueRevisionBias(s,help),0);assert.equal(serialize(restore(off)),off);setModule(s,'value-revision',true);h.goal={kind:'routeWait',area:h.area,x:h.x,until:1e6};const copy=restore(serialize(s));for(let i=0;i<2;i++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));const bad=JSON.parse(serialize(s));bad.hero.valueRevision.help=12;assert.throws(()=>restore(JSON.stringify(bad)),/valueRevision/);
});
