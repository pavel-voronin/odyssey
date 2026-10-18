import {settleLife} from '../modules/lifecycle.js';
import {recruitPerson} from '../modules/social.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createWorld,step,advanceWorld,createNextStory,serialize,restore,route} from '../engine.js';import {MODULES,setModule} from '../rules.js';import {runLifeBatch} from '../playback.js';import {npcController} from '../modules/npc-control.js';import {observedAge} from '../modules/age.js';import {lifeTick} from '../presentation.js';
function dying(){const s=createWorld(1);for(const m of MODULES)setModule(s,m.id,false);const h=s.hero,e=s.areas.a2.objects.find(o=>o.kind==='enemy');h.area='a2';h.x=e.x;h.hp=h.maxHp=152;h.armor=0;h.personality.courage=1;h.inventory.potions=0;h.combat=e.id;e.hp=e.maxHp=1000;e.attack=100;return s;}
function same(a,b){assert.ok(serialize(a)===serialize(b),'serialized worlds differ');}
test('the compatibility hero references one canonical detailed person and saves its inventory only once',()=>{
 let s=createWorld(4);assert.equal(s.actorStates[s.observation.person],s.hero);const item={id:'unique-state-item',name:'Один предмет',history:[]};s.hero.bag.push(item);const saved=serialize(s),raw=JSON.parse(saved);assert.equal(raw.actorStates[s.hero.lineage],undefined);assert.equal((saved.match(/unique-state-item/g)||[]).length,1);s=restore(saved);assert.equal(s.actorStates[s.observation.person],s.hero);assert.ok(serialize(s)===saved);assert.equal(npcController(s,s.people[s.hero.lineage]),'actor');
});
test('the body dies once, its belongings move to one real cache, and world-only ticks never act through it',()=>{
 const s=dying(),h=s.hero;h.bag.push({id:'owned-once',name:'Вещь',history:[]});const result=runLifeBatch(s);assert.equal(result.ticks,2);const person=h.lineage,archive=JSON.stringify(s.lives),frozen={hp:h.hp,energy:h.energy,inventory:JSON.stringify(h.inventory),quests:JSON.stringify(h.quests),xp:h.xp,x:h.x,area:h.area},age=observedAge(h,s.tick),duration=lifeTick(s);const drop=s.areas[h.area].objects.find(o=>o.kind==='heirloom');assert.equal(drop.items.filter(i=>i.id==='owned-once').length,1);assert.equal(h.bag.length,0);assert.equal(h.gold,0);assert.ok(Object.values(h.equipment).every(i=>i===null));
 for(let i=0;i<400;i++)advanceWorld(s);assert.equal(s.hero,h);assert.equal(s.observation.person,person);assert.equal(s.generation,1);assert.equal(s.lives.length,1);assert.equal(JSON.stringify(s.lives),archive);assert.equal(s.graves.length,1);assert.equal(h.hp,frozen.hp);assert.equal(h.energy,frozen.energy);assert.equal(JSON.stringify(h.inventory),frozen.inventory);assert.equal(JSON.stringify(h.quests),frozen.quests);assert.equal(h.xp,frozen.xp);assert.equal(h.x,frozen.x);assert.equal(h.area,frozen.area);assert.equal(observedAge(h,s.tick+100000),age);assert.equal(lifeTick(s),duration);assert.equal(npcController(s,s.people[person]),'none');
});
test('existing towns and actual people continue working after the observed death, with exact repeat and restore',()=>{
 let a=dying();runLifeBatch(a);for(const id of ['people','npc-needs','npc-control','background-towns','supply'])setModule(a,id,true);a.society.nextEvent=100000;const worker=Object.values(a.people).find(p=>p.alive&&p.area==='a1'&&p.role!=='ребёнок');worker.agenda.job='farmer';worker.agenda.due=a.tick;worker.agenda.task=null;worker.agenda.duty=1;worker.needs.hunger=10;a.areas.a1.civic.food=10;const initial=worker.agenda.work,food=a.areas.a1.civic.food;let b=restore(serialize(a));for(let i=0;i<300;i++){step(a);step(b);if(i===127){same(a,b);a=restore(serialize(a));}}same(a,b);assert.ok(a.people[worker.id].agenda.work>initial||a.areas.a1.civic.food>food);assert.equal(a.hero.alive,false);assert.equal(a.generation,1);assert.equal(a.observation.person,b.observation.person);
});
test('an explicit next observer creates once without time, keeps the old detailed state, and remains saveable',()=>{
 const s=dying();runLifeBatch(s);const old=s.hero,tick=s.tick,person=old.lineage;assert.equal(createNextStory(s),true);assert.equal(s.tick,tick);assert.equal(s.generation,2);assert.equal(s.actorStates[person],old);assert.notEqual(s.observation.person,person);assert.equal(s.actorStates[s.observation.person],s.hero);assert.equal(createNextStory(s),false);const saved=serialize(s),loaded=restore(saved);same(s,loaded);assert.equal(loaded.actorStates[loaded.observation.person],loaded.hero);assert.equal(loaded.actorStates[person].alive,false);assert.equal(loaded.actorStates[person].bag.length,0);
});
test('old observed deaths and incomplete current observation records are refused rather than reconstructed',()=>{
 const raw=readFileSync(new URL('./fixtures/observed-death-v21.json',import.meta.url),'utf8');assert.throws(()=>restore(raw),/другой формат/);
 const active=createWorld(4);delete active.observation;delete active.actorStates;assert.throws(()=>restore(JSON.stringify(active)),/Повреждённое/);
});

test('a surviving companion is released to one NPC controller after the observed death',()=>{
 const s=dying(),h=s.hero,area=h.area,x=h.x;setModule(s,'companions',true);setModule(s,'relationships',true);setModule(s,'npc-control',true);setModule(s,'people',true);h.area='a1';const p=Object.values(s.people).find(p=>p.alive&&p.area==='a1'&&p.role!=='ребёнок');assert.ok(recruitPerson(s,p.id,{route,log:()=>{}},true));const c=h.companions[0];c.hp=c.maxHp=10000;h.area=area;h.x=x;runLifeBatch(s);assert.equal(h.alive,false);assert.equal(p.alive,true);assert.equal(h.companions.length,0);assert.equal(p.status,'resident');assert.equal(npcController(s,p),'personal');for(let i=0;i<10;i++)step(s);assert.equal(p.actionControl.owner,'personal');assert.equal(s.generation,1);
});

test('a current settled resident stays the same living detailed body through reload and continued ticks',()=>{
 const s=createWorld(5),h=s.hero;h.area='a1';h.x=42;h.life.home='a1';h.life.motive='Дом';settleLife(s,{log:()=>{},releaseParty:()=>{}});assert.equal(s.lives.length,0);assert.equal(h.life.ended,false);assert.equal(h.alive,true);
 let loaded=restore(serialize(s));assert.equal(loaded.hero.lineage,h.lineage);assert.equal(loaded.hero.actorMode,undefined);for(let n=0;n<32;n++){step(s);step(loaded);loaded=restore(serialize(loaded));same(s,loaded);}assert.equal(loaded.lives.length,0);assert.equal(loaded.generation,1);
});
