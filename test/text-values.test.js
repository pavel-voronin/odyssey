import {consumeTravelMeal,carriedFood} from '../modules/stores.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {serialize,restore,observeExistingPerson,step} from '../engine.js';
import {setModule} from '../rules.js';
import {textValueFixture,familyTextFixture} from '../scripts/text-value-scenarios.mjs';
import {literacyContext as ctx,learnTextBranch} from '../scripts/literacy-scenarios.mjs';
import {textValue,textBuyerPrice} from '../modules/text-values.js';
import {sellTextWithoutReading,askTextReader} from '../modules/literacy.js';
import {literacyNPCTask,literacyPlan} from '../modules/literacy-actions.js';
import {heldTexts} from '../modules/text-state.js';
import {cacheItems,presentItem} from '../modules/item-originals.js';
import {receiveItem,recoverHeirloom,sellBag} from '../modules/inventory.js';
import {readText} from '../modules/texts.js';
import {peopleTick} from '../modules/people.js';
import {sequenceCopies} from '../scripts/sequence-scenarios.mjs';
import {operateGrate} from '../modules/mechanisms.js';
import {textHTML} from '../text-sheet.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
test('the same unread work is kept by a curious holder and offered by a pragmatic holder without revealing its content',()=>{
 const f=textValueFixture(),{s,pupil,buyer,second}=f;assert.equal(textValue(s,pupil,second).kind,'unread');assert.notEqual(literacyNPCTask(s,pupil)?.kind,'literacySell');const raw=serialize(s),copy=restore(raw),p=copy.people[pupil.id];p.agenda.curiosity=.2;assert.equal(textValue(copy,p,heldTexts(copy,p.id)[0]).sell,true);assert.equal(literacyNPCTask(copy,p).kind,'literacySell');s.tick++;assert.equal(sellTextWithoutReading(s,pupil,buyer,second.id),false);assert.equal(pupil.textCraft.readings.length,0);exact(s);
});
test('understood information about the current work is retained, then an unneeded text can be sold without losing knowledge',()=>{
 const f=textValueFixture(),{s,pupil:p,buyer,second,a,work}=f;learnTextBranch(f,'reading');s.tick++;assert.equal(readText(s,p,second.id),true);p.agenda.task={kind:'work',target:a.id,x:42,remaining:2};assert.equal(textValue(s,p,second).kind,'useful');p.agenda.task=null;s.tick++;const money=buyer.agenda.wealth;assert.equal(sellTextWithoutReading(s,p,buyer,second.id),true);assert.equal(buyer.agenda.wealth,money-2);assert.equal(p.textCraft.readings[0].content,work.id);assert.equal(presentItem(s,second.id).id,buyer.id);exact(s);
});
test('a real child keeps the author’s family copy even after reading or when uninterested in study',()=>{
 const f=familyTextFixture(),{s,child,pupil,buyer,second}=f;child.agenda.curiosity=.1;assert.equal(textValue(s,child,second).kind,'family');s.tick++;assert.equal(sellTextWithoutReading(s,child,buyer,second.id),false);assert.equal(presentItem(s,second.id).id,child.id);assert.equal(child.parents.includes(f.teacher.id),true);exact(s);
});
test('actual hunger without food or money permits selling even the family copy for finite cash',()=>{
 const f=familyTextFixture(),{s,child,buyer,second}=f;f.h.gold+=child.agenda.wealth;child.agenda.wealth=0;child.needs.hunger=80;assert.equal(textValue(s,child,second).kind,'need');assert.equal(literacyNPCTask(s,child).kind,'literacySell');const funds=buyer.agenda.wealth;s.tick++;assert.equal(sellTextWithoutReading(s,child,buyer,second.id),true);assert.equal(child.agenda.wealth,2);assert.equal(buyer.agenda.wealth,funds-2);assert.equal(child.textCraft.sales[0].reason,'need');exact(s);
 const f2=textValueFixture(),w=f2.s,h=w.hero,owner=w.people[h.lineage],bag=heldTexts(w,f2.pupil.id);bag.splice(bag.indexOf(f2.second),1);const cache=cacheItems(w,[f2.second],{area:f2.a.id,x:42,leftBy:f2.pupil.id});h.area=f2.a.id;h.x=42;recoverHeirloom(w,cache,ctx);f2.a.civic.treasury+=h.gold;h.gold=0;for(let i=0;i<8&&carriedFood(owner,h.inventory);i++)consumeTravelMeal(owner,h.inventory,4);assert.equal(carriedFood(owner,h.inventory),0);h.hunger=80;step(w);assert.equal(owner.textCraft.sales[0].reason,'need');assert.equal(h.gold,2);exact(w);
});
test('a poor or occupied buyer refuses even a rare copy; no second item can be recovered from an archive',()=>{
 const f=textValueFixture(),{s,pupil:p,buyer,second}=f;p.agenda.curiosity=.1;const price=textBuyerPrice(s,buyer,{...second,rarity:4});assert.equal(price,2);f.h.gold+=buyer.agenda.wealth;buyer.agenda.wealth=0;s.tick++;const energy=p.needs.energy;assert.equal(sellTextWithoutReading(s,p,buyer,second.id),false);assert.equal(p.needs.energy,energy);buyer.agenda.wealth+=4;f.h.gold-=4;buyer.agenda.task={kind:'visit',target:f.a.id,x:42,person:f.teacher.id};assert.equal(sellTextWithoutReading(s,p,buyer,second.id),false);buyer.agenda.task=null;assert.equal(sellTextWithoutReading(s,p,buyer,second.id),true);s.itemArchive ||= {};s.itemArchive[second.id]=JSON.parse(JSON.stringify(second));assert.equal(receiveItem(s,ctx,null,s.itemArchive[second.id]),null);assert.equal(heldTexts(s,buyer.id).filter(i=>i.id===second.id).length,1);exact(s);
});
test('a discovered physical manual is meaningful loot: the same original can be recovered, heard and used to open a real gate',()=>{
 const f=sequenceCopies(),{s,pupil:p,author,second,g,key,a}=f;setModule(s,'text-values',true);const old=heldTexts(s,p.id);old.splice(old.indexOf(second),1);const cache=cacheItems(s,[second],{area:a.id,x:42,leftBy:author.id,name:'Оставленная памятка'});assert.ok(cache);assert.equal(observeExistingPerson(s,p.id),true);s.hero.x=42;recoverHeirloom(s,cache,ctx);assert.equal(s.hero.bag.find(i=>i.id===second.id),second);assert.equal(cache.items.length,0);s.tick++;assert.equal(askTextReader(s,p,author,second.id).status,'reported');p.x=g.lever.x;s.hero.x=g.lever.x;s.tick++;assert.equal(operateGrate(s,p,key,'open'),true);assert.equal(g.state,'open');exact(s);
});
test('two observed NPC phases reserve then sell and replay exactly, pays once and preserves the buyer’s same original',()=>{
 const f=textValueFixture(),{s,pupil:p,buyer,second,a}=f;p.agenda.curiosity=.1;assert.equal(observeExistingPerson(s,p.id),true);p.agenda.task={kind:'literacySell',target:a.id,x:42,buyer:buyer.id,item:second.id,remaining:1,valueReason:textValue(s,p,second).reason};const funds=buyer.agenda.wealth,salary=p.agenda.wealth;let copy=restore(serialize(s));for(let i=0;i<2;i++){for(const w of [s,copy]){w.tick=(Math.floor(w.tick/8)+1)*8;peopleTick(w,ctx);}assert.equal(serialize(s),serialize(copy));copy=restore(serialize(copy));if(i===0){assert.ok(buyer.textPurchase);const off=restore(serialize(s)),r=JSON.stringify(off.people[buyer.id].textPurchase);setModule(off,'text-values',false);off.tick+=8;peopleTick(off,ctx);assert.equal(off.people[buyer.id].agenda.wealth,funds);assert.equal(JSON.stringify(off.people[buyer.id].textPurchase),r);exact(off);const bad=JSON.parse(serialize(s));bad.people[buyer.id].textPurchase.seller='missing';assert.throws(()=>restore(JSON.stringify(bad)),/textPurchase/);}}assert.equal(buyer.agenda.wealth,funds-2);assert.equal(p.agenda.wealth,salary+2);assert.equal(p.textCraft.sales.length,1);assert.equal(presentItem(s,second.id).id,buyer.id);exact(s);
});
test('OFF and current absence preserve books and sales; valuation and sheets are pure, forged payments are rejected',()=>{
 const f=textValueFixture(),{s,pupil:p,buyer,second}=f;assert.equal(observeExistingPerson(s,p.id),true);const raw=serialize(s);textValue(s,p,second);assert.ok(textHTML(s,String).includes('любопытство'));assert.equal(serialize(s),raw);p.agenda.curiosity=.1;s.tick++;assert.equal(sellTextWithoutReading(s,p,buyer,second.id),true);setModule(s,'text-values',false);const off=serialize(s);assert.equal(serialize(restore(off)),off);const bad=JSON.parse(off);bad.people[p.id].textCraft.sales[0].buyerAfter+=1;assert.throws(()=>restore(JSON.stringify(bad)),/sale/);delete p.textCraft.sales;const absent=serialize(s);assert.equal(restore(absent).people[p.id].textCraft.sales,undefined);assert.equal(serialize(s),absent);
});
