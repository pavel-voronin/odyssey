import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {actorView} from '../actor-view.js';
import {initializeLife} from '../modules/lifecycle.js';
import {setModule} from '../rules.js';
import {receiveItem,sellBag} from '../modules/inventory.js';
import {finishLootTick} from '../modules/loot-results.js';
import {semanticEvent} from '../event-text.js';
import {createLootNotice,lootNotice,lootEventKey} from '../loot-notice.js';
import {startsInGame} from '../input-region.js';
import {createClock,catchUp,hasDue} from '../clock.js';
import {resultsFixture,resultsContext,resultItem} from '../scripts/loot-results-scenarios.mjs';
import {assertSameSave} from '../scripts/life-save-compare.mjs';
const receipts=s=>s.hero.timeline.filter(e=>e.meaning?.action==='loot-result');
const last=s=>receipts(s).at(-1).meaning;
const withoutResults=s=>JSON.stringify(JSON.parse(serialize(s)),(key,value)=>key==='loot-results'||key==='meaning'&&['loot-result','loot-sale'].includes(value?.action)?undefined:value);
test('actual positive, negative and collector drops keep the same rolls, one source and one owned item',()=>{
 for(const [options,count]of [[{},1],[{positive:false},0],[{positive:false,collector:true},1]]){const {s,h}=resultsFixture('victory',options),off=restore(serialize(s));setModule(off,'loot-results',false);step(s);step(off);assert.equal(receipts(s).length,count);assert.equal(withoutResults(s),withoutResults(off));if(count){const m=last(s);assert.equal(m.result.fate,'equipped');assert.equal(Object.values(h.equipment).filter(i=>i?.id===m.item.id).length,1);}}
});
test('a floor completion can replace speech but cannot hide the actual receipt notice',()=>{
 const {s,area}=resultsFixture('floor'),memory=createLootNotice();assert.equal(lootNotice(memory,s,0),null);step(s);assert.equal(area.dungeon.cleared,true);assert.ok(s.journal.some(e=>e.text.includes('очищен')));assert.equal(s.hero.speech,s.journal[0].text);assert.notEqual(s.hero.speech,receipts(s).at(-1).text);const notice=lootNotice(memory,s,1);assert.equal(notice.count,1);assert.equal(notice.entries[0].meaning.item.id,last(s).item.id);assert.ok(semanticEvent(s,notice.entries[0]).includes('→'));assert.equal(lootEventKey(notice.entries[0]),lootEventKey(s.journal.find(e=>e.meaning?.action==='loot-result')));
});
test('same-tick overflow never promises the generated original is still in the bag',()=>{
 const {s,h}=resultsFixture('victory',{full:true}),off=restore(serialize(s));setModule(off,'loot-results',false);step(s);step(off);const m=last(s);assert.equal(m.result.fate,'left');assert.ok(m.result.left.some(i=>i.id===m.item.id));assert.ok(!h.bag.some(i=>i.id===m.item.id));assert.ok(!Object.values(h.equipment).some(i=>i?.id===m.item.id));assert.equal(withoutResults(s),withoutResults(off));assert.ok(!semanticEvent(s,receipts(s).at(-1)).includes('убрал в сумку'));
});
test('replacement records the actual old gear disposition after its own overflow',()=>{
 const {s,h}=resultsFixture(),old=resultItem('old',{power:1,value:1});h.equipment.weapon=old;h.bag=Array.from({length:24},(_,i)=>resultItem('bag-'+i,{value:100,power:100}));const item=resultItem('new',{power:3,value:30});receiveItem(s,resultsContext,null,item);const m=last(s);assert.equal(h.equipment.weapon,item);assert.equal(m.result.fate,'equipped');assert.equal(m.result.replaced.item.id,old.id);assert.equal(m.result.replaced.fate,'left');assert.ok(!h.bag.includes(old));assert.equal(h.bag.length,24);
});
test('multiple existing originals in one heirloom settle earlier receipts after all replacements without rerolls',()=>{
 const {s,h,object}=resultsFixture('heirloom'),first=resultItem('first',{power:2}),second=resultItem('second',{power:3});object.items=[first,second];const next=h.nextItem;step(s);const rows=receipts(s);assert.equal(rows.length,2);assert.equal(rows[0].meaning.item.id,'first');assert.equal(rows[0].meaning.result.fate,'bag');assert.equal(rows[1].meaning.result.fate,'equipped');assert.equal(rows[1].meaning.result.replaced.fate,'bag');assert.equal(h.nextItem,next);assert.equal(object.items.length,0);assert.equal(h.equipment.weapon.id,'second');assert.equal(h.bag.filter(i=>i.id==='first').length,1);assertSameSave(serialize(s),serialize(restore(serialize(s))));
});
test('a same-tick sale is a separate event with actual money; a receipt follows the real final fate',()=>{
 const {s,h}=resultsFixture();h.equipment.weapon=resultItem('better',{power:100});h.habits=[];const item=resultItem('sold',{power:1});receiveItem(s,resultsContext,null,item);const gold=h.gold;sellBag(s,resultsContext);finishLootTick(s);const sale=h.timeline.find(e=>e.meaning?.action==='loot-sale').meaning;assert.equal(last(s).result.fate,'sold');assert.equal(sale.amount,h.gold-gold);assert.equal(sale.result.items[0].id,item.id);assert.equal(s.itemArchive[item.id],item);assert.equal(h.bag.length,0);const after=h.gold;sellBag(s,resultsContext);assert.equal(h.gold,after);assert.ok(semanticEvent(s,{meaning:sale},{details:true}).includes('sold'));
});
test('a later sale does not rewrite an already completed historical receipt or create another copy',()=>{
 const {s,h}=resultsFixture();h.equipment.weapon=resultItem('better',{power:100});h.habits=[];receiveItem(s,resultsContext,null,resultItem('later'));finishLootTick(s);const original=JSON.stringify(last(s));h.combat=null;h.goal={kind:'routeWait',area:h.area,x:h.x,until:9999};step(s);sellBag(s,resultsContext);finishLootTick(s);assert.equal(JSON.stringify(last(s)),original);assert.equal(h.timeline.filter(e=>e.meaning?.action==='loot-sale').length,1);assert.equal(h.bag.length,0);
});
test('snapshots contain public stat/name only, no hidden modifier, item history or fresh live-world lookup',()=>{
 const {s}=resultsFixture(),item=resultItem('secret',{name:'<Клинок>'});item.modifier='unlearned-secret';item.enchantment={uses:0,resonance:0,owners:[],counts:{},memory:[{text:'Скрытая история'}]};receiveItem(s,resultsContext,null,item);const m=last(s),text=JSON.stringify(m);assert.ok(!text.includes('unlearned-secret'));assert.ok(!text.includes('Скрытая история'));item.name='Изменённое тайное имя';const html=semanticEvent(s,receipts(s).at(-1));assert.ok(html.includes('&lt;Клинок&gt;'));assert.ok(!html.includes('Изменённое'));const malformed=structuredClone(receipts(s).at(-1));malformed.meaning.item.stat='constructor';malformed.meaning.result.fate='__proto__';malformed.meaning.result.left='invalid';malformed.meaning.result.replaced=true;assert.ok(!semanticEvent(s,malformed,{details:true}).includes('native code'));
});
test('disabling either presentation dependency preserves normal inventory effects and produces no new loot facts',()=>{
 for(const id of ['loot-results','event-meaning']){const {s,h}=resultsFixture();setModule(s,id,false);receiveItem(s,resultsContext,null,resultItem(id));assert.equal(h.equipment.weapon.id,id);assert.equal(receipts(s).length,0);finishLootTick(s);assert.equal(receipts(s).length,0);}
});
test('normal notice survives other messages for three ticks and its view state never mutates the save',()=>{
 const {s,h}=resultsFixture('floor'),m=createLootNotice();lootNotice(m,s,0);step(s);const before=serialize(s),notice=lootNotice(m,s,1);assert.equal(notice.batch,false);assert.equal(serialize(s),before);h.combat=null;h.goal={kind:'routeWait',area:h.area,x:h.x,until:9999};step(s);assert.equal(lootNotice(m,s,2),notice);step(s);assert.equal(lootNotice(m,s,3),notice);step(s);assert.equal(lootNotice(m,s,4),null);
});
test('fast/offline packet has a bounded three-detail summary, known count and four-second presentation window',()=>{
 const {s,h}=resultsFixture();s.areas[h.area].objects=s.areas[h.area].objects.filter(o=>o.kind!=='enemy');h.combat=null;h.goal={kind:'routeWait',area:h.area,x:h.x,until:9999};const m=createLootNotice();lootNotice(m,s,0);for(let i=0;i<8;i++){step(s);if(i%2===0)receiveItem(s,resultsContext,null,resultItem('packet-'+i,{power:i+1}));}finishLootTick(s);const notice=lootNotice(m,s,10);assert.equal(notice.batch,true);assert.equal(notice.count,4);assert.equal(notice.entries.length,3);assert.ok(lootNotice(m,s,4009));assert.equal(lootNotice(m,s,4011),null);assertSameSave(serialize(s),serialize(restore(serialize(s))));
});
test('truncated saved history is counted honestly and importing another identity clears a pending summary',()=>{
 const {s,h}=resultsFixture();const m=createLootNotice();lootNotice(m,s,0);h.combat=null;h.goal={kind:'routeWait',area:h.area,x:h.x,until:9999};for(let i=0;i<4;i++){step(s);receiveItem(s,resultsContext,null,resultItem('kept-'+i,{power:i+1}));}h.timeline=h.timeline.filter(e=>e.tick>=3);h.timelineDropped+=3;const note=lootNotice(m,s,5);assert.equal(note.truncated,true);assert.equal(note.count,2);h.born--;assert.equal(lootNotice(m,s,6)?.count,1);
});
test('expanding a native summary never starts a game pointer gesture',()=>{
 const target={closest:selector=>selector.includes('summary')?{tagName:'SUMMARY'}:null},root={contains:()=>true,getBoundingClientRect:()=>({left:0,top:0,right:390,bottom:844})};assert.equal(startsInGame(root,{target,clientX:100,clientY:500}),false);
});
test('another continuing actor owns its actual receipt; relaying or rebuilding a legacy timeline never awards the observer a notice',()=>{
 const {s,h:old}=resultsFixture();assert.equal(createNextStory(s,{allowLiving:true}),true);s.hero.area=old.area;s.hero.x=old.x;const view=actorView(s,old),item=resultItem('other-owner');receiveItem(view,resultsContext,null,item);finishLootTick(s);const event=s.journal.find(e=>e.meaning?.item?.id===item.id);assert.ok(event);assert.equal(old.equipment.weapon.id,item.id);assert.ok(!Object.values(s.hero.equipment).some(i=>i?.id===item.id));delete s.hero.timeline;initializeLife(s,s.hero);assert.equal(lootNotice(createLootNotice(),s,0),null);assert.ok(semanticEvent(s,event).includes(`data-entity="${old.lineage}"`));
});
test('actual clock catch-up sliced to one tick per frame explicitly keeps the packet notice through later world ticks',()=>{
 const {s,h}=resultsFixture('floor'),m=createLootNotice(),clock=createClock(0);lootNotice(m,s,0);assert.equal(catchUp(clock,5000,()=>step(s),250,()=>true),1);const notice=lootNotice(m,s,1,{batching:hasDue(clock,5000)});assert.equal(notice.batch,true);h.combat=null;h.goal={kind:'routeWait',area:h.area,x:h.x,until:9999};while(hasDue(clock,5000)){assert.equal(catchUp(clock,5000,()=>step(s),250,()=>true),1);assert.equal(lootNotice(m,s,2,{batching:hasDue(clock,5000)}),notice);}assert.equal(s.tick,5);assert.equal(lootNotice(m,s,4002),null);
});
