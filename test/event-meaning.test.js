import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorld,serialize,restore,log} from '../engine.js';
import {setModule} from '../rules.js';
import {eventMeaning,enemyReference,deathMeaning} from '../event-meaning.js';
import {semanticEvent,semanticCause,referenceText} from '../event-text.js';
import {semanticText} from '../text.js';
import {createSpeech,visibleSpeech} from '../presentation.js';
import {archiveSheet} from '../life-archive-sheet.js';
import {meaningFixture,performMeaning,withoutMeaning,copyMeaning} from '../scripts/event-meaning-scenarios.mjs';
test('witnessed labels and IDs survive removal or renaming without resolving fresh hidden enemy data',()=>{
 const s=createWorld(1),e={kind:'enemy',id:'same',name:'Старый страж',species:'guard'},meaning=eventMeaning(s,'strike',{target:enemyReference(e),amount:7}),before=serialize(s),html=semanticEvent(s,{meaning});
 e.name='Скрытое новое имя';s.people.same={name:'Другой владелец ID',role:'Секрет'};
 assert.equal(semanticEvent(s,{meaning}),html);assert.ok(html.includes('Старый страж'));assert.ok(!html.includes('Секрет'));delete s.people.same;assert.equal(serialize(s),before);
});
test('equal visible names retain their own explicit person and enemy IDs instead of guessing from prose',()=>{
 const s=createWorld(1),meaning=eventMeaning(s,'strike',{actor:{kind:'person',id:'person-a',label:'Дорн',role:'воин'},target:{kind:'enemy',id:'enemy-b',label:'Дорн',role:'противник'},amount:5}),html=semanticEvent(s,{meaning});
 assert.ok(html.includes('data-entity="person-a"'));assert.ok(html.includes('data-entity="enemy-b"'));assert.ok(html.includes('ref-enemy'));assert.ok(html.includes('(воин)'));
});
test('legacy names respect word boundaries and ambiguous same-name people remain plain text',()=>{
 const s=createWorld(1);s.hero.name='Дорн';s.people[s.hero.lineage].name='Дорн';assert.equal((semanticText(s,'Дорн Дорнский ПодДорн Дорн2').match(/ref-person/g)||[]).length,1);
 const p=Object.values(s.people).find(p=>p.id!==s.hero.lineage);p.name='Дорн';s.hero.memory.people.push(p.id);assert.equal(semanticText(s,'Дорн'),'Дорн');
});
test('all witnessed labels, roles and IDs are escaped; unsupported or missing structured records safely fall back',()=>{
 const s=createWorld(1),ref={kind:'enemy',id:'" onclick="evil()',label:'<img src=x onerror=evil()>',role:'<svg>'},html=referenceText(s,ref);assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot; onclick'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<svg>'));
 assert.equal(semanticEvent(s,{text:'<bad>',meaning:{version:9}}),'&lt;bad&gt;');assert.equal(semanticEvent(s,{text:'<bad>',meaning:{version:1,action:'strike'}}),'&lt;bad&gt;');
});
test('unknown death causes stay unknown and stored history does not fetch a hidden killer by ID',()=>{
 const s=createWorld(1),m=deathMeaning(s,{}),html=semanticEvent(s,{meaning:m});assert.ok(html.includes('Причина неизвестна'));assert.equal(m.target.id,null);assert.ok(!html.includes('Противник:'));
});
test('an old cause string never claims a known same-name person as the killer; off preserves the plain historical cause',()=>{
 const s=createWorld(1),name=s.hero.name;assert.equal(semanticCause(s,name),name);assert.equal(semanticCause(s,'<img>'),'&lt;img&gt;');assert.equal(semanticEvent(s,{type:'combat',text:name}),name);const meaning=deathMeaning(s,{kind:'enemy',id:'enemy',name});setModule(s,'event-meaning',false);assert.equal(semanticCause(s,name,meaning),name);
});
test('real strike and reply record their actual subjects, targets and damage without changing off outcomes',()=>{
 const f=meaningFixture(),off=copyMeaning(f);setModule(off.s,'event-meaning',false);performMeaning(f,'strike');performMeaning(off,'strike');
 const events=f.s.journal.filter(e=>e.meaning?.action==='strike');assert.equal(events.length,2);assert.equal(events[0].meaning.actor.id,f.enemy.id);assert.equal(events[0].meaning.target.id,f.h.lineage);assert.equal(events[1].meaning.actor.id,f.h.lineage);assert.equal(events[1].meaning.amount,10000-f.enemy.hp);assert.equal(events[0].meaning.amount,100-f.h.hp);assert.equal(withoutMeaning(f.s),withoutMeaning(off.s));
});
test('a real lethal response preserves cause meaning in journal, timeline and archived life after the enemy is gone',()=>{
 const f=meaningFixture('death');performMeaning(f,'death');assert.equal(f.h.alive,false);const life=f.s.lives.at(-1),event=f.s.journal.find(e=>e.type==='death');assert.deepEqual(life.causeMeaning,event.meaning);assert.ok(f.h.timeline.some(e=>e.meaning?.action==='death'));
 const name=event.meaning.target.label;f.s.areas[f.h.area].objects=f.s.areas[f.h.area].objects.filter(e=>e.id!==f.enemy.id);const copy=restore(serialize(f.s)),html=archiveSheet(copy,String,()=>'',()=> '');assert.ok(html.includes(name));assert.ok(html.includes('ref-enemy'));assert.ok(!copy.hero.alive);
});
test('real victory uses the defeated existing enemy and does not invent a new role or another reward',()=>{
 const f=meaningFixture('victory'),off=copyMeaning(f);setModule(off.s,'event-meaning',false);performMeaning(f,'victory');performMeaning(off,'victory');const event=f.s.journal.find(e=>e.type==='victory');assert.equal(event.meaning.target.id,f.enemy.id);assert.equal(event.meaning.target.label,f.enemy.name);assert.equal(f.h.kills,1);assert.equal(withoutMeaning(f.s),withoutMeaning(off.s));
});
test('one actual potion records the actual healing before the ordinary enemy response',()=>{
 const f=meaningFixture('heal'),off=copyMeaning(f);setModule(off.s,'event-meaning',false);performMeaning(f,'heal');performMeaning(off,'heal');const event=f.s.journal.find(e=>e.meaning?.action==='heal');assert.equal(event.meaning.amount,19);assert.equal(f.h.inventory.potions,0);assert.equal(event.meaning.actor.id,f.h.lineage);assert.equal(withoutMeaning(f.s),withoutMeaning(off.s));
});
test('one real merchant upgrade records actual price and abstract gear without inventing a persistent item ID',()=>{
 const f=meaningFixture('buy'),off=copyMeaning(f);setModule(off.s,'event-meaning',false);assert.equal(performMeaning(f,'buy'),true);performMeaning(off,'buy');const event=f.s.journal.find(e=>e.meaning?.action==='buy');assert.equal(event.meaning.amount,100-f.h.gold);assert.equal(event.meaning.target.id,'merchant');assert.equal(event.meaning.item.id,null);assert.equal(f.h.weapon,1);assert.equal(withoutMeaning(f.s),withoutMeaning(off.s));const copy=restore(serialize(f.s));assert.ok(semanticEvent(copy,event).includes('ref-money'));assert.equal(copy.hero.weapon,1);
});
test('speech preserves the corresponding structured event for its normal three-tick lifetime and then replaces it',()=>{
 const s=createWorld(1),m=createSpeech(),meaning=eventMeaning(s,'strike',{target:enemyReference({id:'e',name:'Страж'}),amount:5});log(s,'Удар','combat',s.hero.area,{meaning});assert.equal(visibleSpeech(m,s),'Удар');assert.deepEqual(m.meaning,meaning);s.tick++;s.hero.speech='';assert.equal(visibleSpeech(m,s),'Удар');assert.deepEqual(m.meaning,meaning);s.tick++;s.hero.speech='Другое';visibleSpeech(m,s);assert.equal(m.meaning,null);setModule(s,'event-meaning',false);assert.equal(semanticEvent(s,{text:'Удар',meaning}),'Удар');
});
test('entity roles and damage/healing colors have at least4.5 contrast on both actual journal and caption backgrounds',async()=>{
 const css=await readFile(new URL('../style.css',import.meta.url),'utf8'),rgb=hex=>hex.match(/\w\w/g).map(x=>parseInt(x,16)/255),luma=hex=>rgb(hex.slice(1)).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
 for(const color of ['#ffc5b9','#ffd0ad','#c8edc6','#c9d1d3','#d8ddbc','#d0e4ff','#ffe0a1','#c4eac1','#ffc2b1']){assert.ok(css.includes(color)||['#d0e4ff','#ffe0a1','#c4eac1','#ffc2b1'].includes(color));for(const bg of ['#172125','#20292e'])assert.ok((luma(color)+.05)/(luma(bg)+.05)>=4.5,color+' '+bg);}
});
