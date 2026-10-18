import test from 'node:test';import assert from 'node:assert/strict';
import {step,serialize,restore,observeExistingPerson,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {collectionFixture} from '../scripts/collection-scenarios.mjs';
import {collectionStatus,observeOwnCollection,refreshCollection,collectionKeep} from '../modules/collection-state.js';
import {collectionPlan,collectionAction,collectionTarget} from '../modules/collections.js';
import {sellBag} from '../modules/inventory.js';
import {presentItem,cacheItems,actorItemLocation} from '../modules/item-originals.js';
import {syncActiveActor} from '../actor-projection.js';
import {npcAction} from '../modules/npc-control.js';
import {invalidateNPCControl} from '../modules/npc-control.js';
import {actorView} from '../actor-view.js';
import {collectionHTML} from '../collection-sheet.js';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

test('a real owned work by a known maker starts one limited interest, without rarity, coins, XP or rewritten weapon commitment',()=>{
 const f=collectionFixture(),{s,h,p,receive}=f,old={kind:'weapon',status:'active',target:3,cause:'earlier-retreat'};h.commitments.personal=old;const gold=h.gold,xp=h.xp,rng=s.rng,item=receive('ring');const c=p.id&&s.people[h.lineage].collection;
 assert.equal(c.master,p.id);assert.equal(c.source.item,item.id);assert.equal(c.source.kind,'owned-item');assert.equal(c.target,2);assert.equal(collectionStatus(s).count,1);assert.equal(h.gold,gold);assert.equal(h.xp,xp);assert.equal(s.rng,rng);assert.equal(h.commitments.personal,old);assert.equal(item.rarity,1);
});
test('ordinary traders, unknown signatures, unfinished parts and disabled identity do not acquire a fabricated interest',()=>{
 for(const mode of ['ordinary','unknown','part','identity']){const {s,h,p,receive}=collectionFixture();if(mode==='ordinary')h.habits=[];if(mode==='unknown'){h.memory.people=[];h.relations={};}if(mode==='identity')setModule(s,'identity',false);receive('ring',mode==='part'?{kind:'workPart'}:{});assert.equal(s.people[h.lineage].collection,undefined,mode);assert.equal(p.collection,undefined);}
});
test('the collector and ordinary trader make different sales for the same common signed and unrelated rare finds',()=>{
 for(const collector of [true,false]){const {s,h,p,receive,ctx}=collectionFixture();if(!collector)h.habits=[];const own=receive('ring'),other=receive('idol',{creator:null,rarity:4});sellBag(s,ctx);assert.equal(h.bag.includes(own),collector);assert.equal(h.bag.includes(other),false);assert.equal(s.merchant.items.includes(own),!collector);assert.equal(p.looseItems,undefined);}
});
test('completion counts distinct actual variants and originals once, and loss removes the full set without erasing its memory',()=>{
 const {s,h,receive,ctx}=collectionFixture();const first=receive('ring'),duplicate=receive('ring');assert.equal(collectionStatus(s).count,1);const second=receive('compass');assert.equal(collectionStatus(s).complete,true);assert.equal(h.mind.stress,18);const c=s.people[h.lineage].collection;assert.equal(c.satisfied,true);assert.equal(c.showWish,true);
 const i=h.bag.indexOf(second);h.bag.splice(i,1);cacheItems(s,[second]);refreshCollection(s,ctx);assert.equal(collectionStatus(s).complete,false);assert.equal(collectionStatus(s).count,1);assert.equal(c.status,'seeking');assert.equal(c.satisfied,true);assert.equal(collectionKeep(s).has(duplicate.id),false);assert.equal(presentItem(s,first.id).id,h.lineage);
 const archive=s.itemArchive ||= {};archive.second=structuredClone(second);assert.equal(collectionStatus(s).count,1);assert.ok(collectionHTML(s,escape).includes('1/2'));
});
test('three wanted works are an individual interest, not a universal rule for every collector',()=>{
 const {s,h,receive}=collectionFixture();h.personality.curiosity=.9;receive('ring');receive('compass');assert.equal(collectionStatus(s).complete,false);receive('watch');assert.equal(collectionStatus(s).target,3);assert.equal(collectionStatus(s).complete,true);
});
test('two actual collectors exchange surplus originals, fill missing variants and pay no invented reward',()=>{
 const f=collectionFixture(),{s,h,p,receive,giveNPC,item,ctx}=f;const source=receive('ring'),extra=receive('ring');const a=giveNPC(item('compass')),b=giveNPC(item('compass')),third=giveNPC(item('watch'));const money=h.gold+p.agenda.wealth,stock=(s.merchant.items||[]).length;
 assert.ok(collectionPlan(s,ctx));assert.equal(h.goal.item,extra.id);assert.ok(collectionAction(s,ctx));assert.equal(presentItem(s,extra.id).id,p.id);assert.equal(presentItem(s,b.id).id,h.lineage);assert.equal(presentItem(s,a.id).id,p.id);assert.equal(presentItem(s,source.id).id,h.lineage);assert.equal(h.gold+p.agenda.wealth,money);assert.equal((s.merchant.items||[]).length,stock);assert.equal(collectionStatus(s).complete,true);assert.equal(collectionStatus(s,p.id).complete,true);assert.equal(p.actionControl.owner,'personal');assert.ok(extra.enchantment.owners.includes(p.id));assert.ok(b.enchantment.owners.includes(h.lineage));const save=serialize(s);assert.equal(collectionAction(s,ctx),false);assert.equal(serialize(s),save);
});
test('a real poor buyer can want the memory and still refuse, keeping both wallets and the original',()=>{
 const {s,h,p,receive,ctx}=collectionFixture(),item=receive('ring');setModule(s,'body',true);h.hunger=80;h.inventory.rations=0;p.roadSupplies={food:0};s.people[h.lineage].roadSupplies={food:0};p.agenda.wealth=0;
 assert.ok(collectionPlan(s,ctx,{urgentOnly:true}));assert.ok(collectionAction(s,ctx));assert.equal(h.gold,0);assert.equal(p.agenda.wealth,0);assert.equal(presentItem(s,item.id).id,h.lineage);assert.match(s.people[h.lineage].collection.lastOffer.reason,/монет/);assert.equal(p.looseItems,undefined);
});
test('hunger can sell even the first remembered original, transferring finite money rather than preserving a phantom collection',()=>{
 const {s,h,p,receive,ctx}=collectionFixture(),item=receive('ring');setModule(s,'body',true);h.hunger=80;h.inventory.rations=0;s.people[h.lineage].roadSupplies={food:0};const total=h.gold+p.agenda.wealth;
 assert.ok(collectionPlan(s,ctx,{urgentOnly:true}));assert.ok(collectionAction(s,ctx));assert.equal(presentItem(s,item.id).id,p.id);assert.equal(h.gold,14);assert.equal(h.gold+p.agenda.wealth,total);assert.equal(collectionStatus(s).count,0);assert.equal(s.people[h.lineage].collection.source.item,item.id);assert.equal(s.people[h.lineage].collection.lastOffer.outcome,'sold-for-food');
});
test('sleep, another controller, used action, absence and a changed original cannot create a remote or second deal',()=>{
 for(const reason of ['sleep','used','caravan','dead','absent','missing','stock']){const {s,h,p,receive,ctx}=collectionFixture();receive('ring');receive('ring');assert.ok(collectionPlan(s,ctx));const gold=h.gold+p.agenda.wealth;if(reason==='sleep')p.needs.sleeping=true;if(reason==='used')assert.ok(npcAction(s,p,'personal'));if(reason==='caravan'){p.status='caravan';s.logistics.convoys.push({id:'existing-controller',person:p.id});invalidateNPCControl(s);}if(reason==='dead')p.alive=false;if(reason==='absent')p.area='a0';if(reason==='missing')h.bag=[];if(reason==='stock')s.people[h.lineage].collection=null;collectionAction(s,ctx);assert.equal(h.gold+p.agenda.wealth,gold);assert.equal(p.looseItems,undefined);}
});
test('OFF and old v1 loading retain data without inventing past interests or copies',()=>{
 const {s,h,receive,ctx}=collectionFixture();receive('ring');receive('ring');const c=JSON.stringify(s.people[h.lineage].collection);setModule(s,'collections',false);const save=serialize(s);observeOwnCollection(s,ctx);assert.equal(collectionPlan(s,ctx),false);assert.equal(serialize(s),save);assert.equal(JSON.stringify(s.people[h.lineage].collection),c);assert.equal(serialize(restore(save)),save);
 const old=collectionFixture();delete old.s.people[old.h.lineage].collection;const raw=serialize(old.s);assert.equal(restore(raw).people[old.h.lineage].collection,undefined);
});
test('pure collection and sheet reads never count an archive twice or alter simulation state',()=>{
 const {s,h,receive}=collectionFixture();receive('ring',{name:'<b>подпись</b>'});receive('compass');const raw=serialize(s);for(let i=0;i<100;i++){assert.equal(collectionStatus(s).count,2);const html=collectionHTML(s,escape);assert.ok(html.includes('&lt;b&gt;'));assert.ok(!html.includes('<b>подпись</b>'));}assert.equal(serialize(s),raw);
});
test('the actual autonomous tick walks to a local person, talks, and preserves the same finite result through reload',()=>{
 const {s,h,p,receive,giveNPC,item}=collectionFixture();receive('ring');receive('ring');giveNPC(item('compass'));giveNPC(item('compass'));giveNPC(item('watch'));p.x=h.x+12;h.goal=null;syncActiveActor(s);const copy=restore(serialize(s)),start=h.x;
 for(let i=0;i<8;i++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));}
 assert.notEqual(h.x,start);assert.equal(s.people[h.lineage].collection.lastOffer.outcome,'exchanged');assert.equal(collectionStatus(s).complete,true);assert.equal(s.hero.lineage,h.lineage);
});
test('barter differences are transferred both ways and an unfunded difference never moves either original',()=>{
 for(const mode of ['hero-pays','buyer-pays','buyer-poor']){const {s,h,p,receive,giveNPC,item,ctx}=collectionFixture();const incoming=mode==='hero-pays'?20:40,counter=mode==='hero-pays'?30:20;receive('ring');const offer=receive('ring',{value:incoming});giveNPC(item('compass'));const returned=giveNPC(item('compass',{value:counter}));giveNPC(item('watch'));h.gold=50;if(mode==='buyer-poor')p.agenda.wealth=0;const total=h.gold+p.agenda.wealth;assert.ok(collectionPlan(s,ctx));collectionAction(s,ctx);assert.equal(h.gold+p.agenda.wealth,total);if(mode==='buyer-poor'){assert.equal(presentItem(s,offer.id).id,h.lineage);assert.equal(presentItem(s,returned.id).id,p.id);assert.match(s.people[h.lineage].collection.lastOffer.reason,/монет/);}else{assert.equal(h.gold,mode==='hero-pays'?43:64);assert.equal(presentItem(s,offer.id).id,p.id);assert.equal(presentItem(s,returned.id).id,h.lineage);}}
});
test('a food gift or lost need cancels a planned emergency sale before it spends either persons action',()=>{
 const {s,h,p,receive,ctx}=collectionFixture(),original=receive('ring');setModule(s,'body',true);h.hunger=80;h.inventory.rations=0;s.people[h.lineage].roadSupplies={food:0};assert.ok(collectionPlan(s,ctx,{urgentOnly:true}));h.inventory.rations=1;assert.equal(collectionTarget(s),false);assert.equal(h.goal,null);assert.equal(presentItem(s,original.id).id,h.lineage);assert.equal(p.agenda.wealth,200);assert.equal(p.actionControl?.tick===s.tick,false);
});
test('actual urgent sale is followed by an ordinary finite food purchase, not free healing or a new item',()=>{
 const {s,h,p,receive}=collectionFixture(),original=receive('ring'),a=s.areas[h.area];setModule(s,'body',true);setModule(s,'supply',true);h.hunger=80;h.inventory.rations=0;s.people[h.lineage].roadSupplies={food:0};h.goal=null;const food=a.civic.food,count=s.nextPerson;syncActiveActor(s);
 step(s);assert.equal(presentItem(s,original.id).id,p.id);assert.equal(h.gold,14);assert.equal(p.agenda.wealth,186);assert.equal(collectionStatus(s).count,0);
 for(let i=0;i<6&&h.hunger>=75;i++)step(s);assert.ok(h.hunger<75||h.inventory.rations>0);assert.ok(a.civic.food<food);assert.equal(s.nextPerson,count);assert.equal(presentItem(s,original.id).id,p.id);
});
test('observing the actual buyer reuses its same wallet, collection and originals without changing the trade',()=>{
 const {s,h,p,receive,giveNPC,item,ctx}=collectionFixture();receive('ring');const duplicate=receive('ring');giveNPC(item('compass'));const counter=giveNPC(item('compass'));giveNPC(item('watch'));assert.ok(collectionPlan(s,ctx));syncActiveActor(s);const tick=s.tick,money=h.gold+p.agenda.wealth;assert.ok(observeExistingPerson(s,p.id));assert.equal(s.tick,tick);const view=actorView(s,h);assert.ok(collectionAction(view,ctx));assert.equal(presentItem(s,duplicate.id).id,p.id);assert.equal(presentItem(s,counter.id).id,h.lineage);assert.equal(h.gold+p.agenda.wealth,money);assert.equal(collectionStatus(s,h.lineage).complete,true);assert.equal(collectionStatus(s,p.id).complete,true);assert.equal(s.hero.lineage,p.id);
});
test('two autonomous owners cannot make the same NPC trade twice on one world tick',()=>{
 const f=collectionFixture(),{s,h:first,p,receive,giveNPC,item,ctx}=f;receive('ring');receive('ring');giveNPC(item('compass'));giveNPC(item('compass'));giveNPC(item('watch'));assert.ok(collectionPlan(s,ctx));syncActiveActor(s);
 assert.ok(createNextStory(s,{allowLiving:true}));const second=s.hero;second.area=first.area;second.x=first.x;second.habits=['collector'];second.hp=second.maxHp;second.energy=80;second.hunger=0;second.gold=0;second.goal=null;second.quests=[];second.memory.people.push(p.id);second.personality.curiosity=.7;receive('ring');receive('ring');assert.ok(collectionPlan(s,ctx));syncActiveActor(s);invalidateNPCControl(s);const money=first.gold+second.gold+p.agenda.wealth,tick=s.tick;
 step(s);assert.equal(s.tick,tick+1);assert.equal(Number(collectionStatus(s,first.lineage).complete)+Number(collectionStatus(s,second.lineage).complete),1);assert.equal(first.gold+second.gold+p.agenda.wealth,money);assert.equal(p.actionControl.owner,'personal');assert.deepEqual(p.actionControl.phases,['act']);assert.equal(second.lastAction,'wait');
});
test('a full bag keeps a newly noticed common work over profitable unrelated loot, while an ordinary trader leaves it physically',()=>{
 for(const collector of [true,false]){const {s,h,item,receive}=collectionFixture();if(!collector)h.habits=[];h.bag=Array.from({length:24},()=>item('idol',{creator:null,value:100,rarity:4}));for(const i of h.bag)actorItemLocation(s,i);const common=receive('ring',{value:1,rarity:1}),place=presentItem(s,common.id);assert.equal(h.bag.length,24);assert.equal(place.kind,collector?'person':'cache');if(collector){assert.equal(place.id,h.lineage);assert.equal(collectionStatus(s).collection.source.item,common.id);}else assert.equal(s.people[h.lineage].collection,undefined);assert.equal(s.hero.gold,0);}
});
