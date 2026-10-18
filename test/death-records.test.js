import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {step,serialize,restore,createNextStory,observeDetailedActor} from '../engine.js';
import {lifeFinished} from '../playback.js';
import {setModule} from '../rules.js';
import {deathSheet} from '../death-sheet.js';
import {archiveSheet} from '../life-archive-sheet.js';
import {deathFixture} from '../scripts/death-record-scenarios.mjs';
import {assertSameSave} from '../scripts/life-save-compare.mjs';
const life=s=>s.lives.at(-1),report=s=>life(s).deathReport,withoutReports=s=>JSON.stringify(JSON.parse(serialize(s)),(key,value)=>['death-records','deathReport'].includes(key)?undefined:value);
test('an actual lethal reply snapshots pre-hit health and remaining supplies before clearing the body',()=>{
 const {s,h,enemy}=deathFixture();step(s);assert.equal(h.alive,false);const r=report(s);assert.equal(r.kind,'battle');assert.equal(r.resources.hpBefore,100);assert.ok(r.resources.damage>=1000);assert.equal(r.resources.potions,2);assert.equal(r.resources.herbs,3);assert.equal(h.inventory.potions,0);assert.equal(h.hp,0);assert.equal(r.person,h.lineage);assert.equal(r.place.label,s.areas[h.area].name);assert.equal(life(s).causeMeaning.target.id,enemy.id);assert.ok(r.events.some(e=>e.meaning?.actor?.id===enemy.id));assert.ok(r.plan.intent.startsWith('Сражаться:'));
});
test('poison during combat is poison, never the stale enemy reply or lastDamage',()=>{
 const {s,h}=deathFixture('poison');step(s);const r=report(s);assert.equal(h.alive,false);assert.equal(r.kind,'poison');assert.equal(life(s).cause,'Отравление');assert.equal(r.resources.hpBefore,1);assert.equal(r.resources.damage,1);assert.equal(r.resources.potions,2);assert.equal(h.lastDamage,999);assert.ok(deathSheet(s,life(s)).includes('Отравление'));
});
test('a real hunger pulse records its actual fatal point and does not invent an enemy',()=>{
 const {s,h}=deathFixture('starvation');step(s);assert.equal(h.alive,false);assert.equal(report(s).kind,'starvation');assert.equal(report(s).resources.damage,1);assert.equal(report(s).resources.hpBefore,1);assert.equal(life(s).causeMeaning.target.kind,'danger');assert.ok(!deathSheet(s,life(s)).includes('Противник:'));
});
test('a fatal real sea-storm remains at sea; an unknown destination never leaks through the report',()=>{
 for(const unknownDestination of [false,true]){const {s,h}=deathFixture('storm',{unknownDestination});step(s);assert.equal(h.alive,false);const r=report(s);assert.equal(r.kind,'storm');assert.equal(r.place.transit.mode,'sea');assert.equal(r.resources.hpBefore,1);assert.ok(r.resources.damage>=3);assert.equal(h.transit,null);assert.ok(deathSheet(s,life(s)).includes('В море'));if(unknownDestination){assert.equal(r.place.transit.to,null);assert.equal(r.place.transit.toLabel,null);assert.ok(!JSON.stringify(r).includes('Секретный остров'));}}
});
test('a genuine caravan raid fatal branch records its own damage without handing over the convoy',()=>{
 const {s,h}=deathFixture('caravan'),c=s.logistics.convoys.find(c=>c.id==='fixture-fatal-caravan');step(s);assert.equal(h.alive,false);assert.equal(report(s).kind,'caravan');assert.equal(report(s).resources.hpBefore,3);assert.equal(report(s).resources.damage,4);assert.equal(c.food,12);assert.equal(c.medicine,2);
});
test('continued world time, renamed locations and a removed killer do not rewrite a witnessed historical report',()=>{
 const {s,h,enemy}=deathFixture();step(s);const l=life(s),before=JSON.stringify(l),html=deathSheet(s,l),old=s.areas[h.area].name;s.areas[h.area].name='Новое название';s.chronology.year+=20;s.areas[h.area].objects=s.areas[h.area].objects.filter(o=>o.id!==enemy.id);for(let i=0;i<25;i++)step(s);assert.equal(JSON.stringify(l),before);assert.equal(deathSheet(s,l),html);assert.ok(html.includes(old));assert.ok(!html.includes('останки сейчас'));assert.equal(s.generation,1);assert.equal(h.alive,false);
});
test('off preserves all original damage, death, archives, RNG and inventory with no extra report',()=>{
 for(const kind of ['battle','poison','starvation','storm','caravan']){const {s}=deathFixture(kind),off=restore(serialize(s));setModule(off,'death-records',false);step(s);step(off);assert.equal(s.hero.alive,false);assert.equal(off.hero.alive,false);assert.equal(life(off).deathReport,undefined);assert.equal(withoutReports(s),withoutReports(off));assert.equal(deathSheet(off,life(off)),null);}
});
test('report and compact summary survive exact save replay without a second death or paused world',()=>{
 const {s,h}=deathFixture();step(s);const saved=serialize(s),copy=restore(saved);assertSameSave(saved,serialize(copy));const text=deathSheet(s,life(s));for(let i=0;i<10;i++){step(s);step(copy);}assertSameSave(serialize(s),serialize(copy));assert.equal(s.lives.length,1);assert.equal(s.hero.lineage,h.lineage);assert.equal(deathSheet(s,life(s)),text);
});
test('an explicit next story adds no world tick or healing to the old deceased body and retains the readable archive',()=>{
 const {s,h}=deathFixture();step(s);const old=life(s),snapshot=JSON.stringify(old),tick=s.tick;assert.equal(createNextStory(s),true);assert.equal(s.tick,tick);assert.equal(s.actorStates[h.lineage].hp,0);assert.equal(s.hero.alive,true);assert.equal(JSON.stringify(old),snapshot);const html=archiveSheet(s,String,()=>'',()=> '');assert.ok(html.includes(old.name));assert.ok(html.includes('До последнего урона'));assert.ok(html.includes('Подробный журнал'));assert.equal(s.lives.length,1);
});
test('switching between two genuinely continuing living observers after a death never becomes another terminal history',()=>{
 const {s,h:dead}=deathFixture();step(s);const archive=JSON.stringify(life(s));assert.equal(createNextStory(s),true);const a=s.hero;assert.equal(createNextStory(s,{allowLiving:true}),true);const b=s.hero,tick=s.tick;assert.equal(observeDetailedActor(s,a.lineage),true);assert.equal(s.tick,tick);assert.equal(lifeFinished(s),false);step(s);assert.equal(observeDetailedActor(s,b.lineage),true);assert.equal(lifeFinished(s),false);step(s);assert.equal(observeDetailedActor(s,a.lineage),true);assert.equal(lifeFinished(s),false);assert.equal(s.tick,tick+2);assert.equal(s.actorStates[dead.lineage].hp,0);assert.equal(s.lives.length,1);assert.equal(JSON.stringify(s.lives[0]),archive);assert.equal(deathSheet(s,undefined),null);assert.equal(deathSheet(s,{...s.lives[0],outcome:'settled'},dead),null);
});
test('an old death file is rejected without inventing a historical report',async()=>{
 const raw=await readFile(new URL('./fixtures/legacy-settled-dead-v66.json',import.meta.url),'utf8');assert.throws(()=>restore(raw));
});

test('untrusted old names and broken optional report fields escape or fall back without revealing a fresh killer',()=>{
 const {s}=deathFixture();step(s);const l=life(s);l.deathReport.name='<img src=x>';l.deathReport.events='broken';l.deathReport.conditions='broken';l.deathReport.plan={intent:'<svg>',reason:'<script>'};const html=deathSheet(s,l);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;svg'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));l.deathReport.version=99;delete l.causeMeaning;l.cause=s.hero.name;const legacy=deathSheet(s,l);assert.equal(legacy.match(/class="death-cause">([\s\S]*?)<\/p>/)[1],s.hero.name);assert.ok(!legacy.includes('До последнего урона'));assert.ok(legacy.includes('Запасы сил'));
});
