import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createNextStory} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {meaningFixture} from '../scripts/event-meaning-scenarios.mjs';
import {deathFixture} from '../scripts/death-record-scenarios.mjs';
import {setActorMoney} from '../actor-projection.js';
import {openInheritance} from '../modules/inheritance.js';
import {buryMoney} from '../modules/money-caches.js';
import {receiveItem} from '../modules/inventory.js';
import {meetLegacy,settleLife} from '../modules/lifecycle.js';
const ctx={log:()=>{},random:()=>.2,gainXp:()=>{},releaseParty:()=>{}};
function fixture(){
 const {s,h,enemy}=meaningFixture('death');for(const m of MODULES)setModule(s,m.id,['finances','lifecycle','item-originals'].includes(m.id));
 const p=s.people[h.lineage],q=Object.values(s.people).find(q=>q.id!==p.id&&q.alive&&q.status==='resident');q.parents=[p.id];q.area=h.area;q.x=h.x;q.needs.sleeping=false;q.status='resident';q.agenda.task=null;for(const a of Object.values(s.areas))if(a.population)a.population=a.population.filter(id=>id!==q.id);(s.areas[h.area].population ||= []).push(q.id);setActorMoney(s,p,100);
 const property={id:'actual-estate-workshop',kind:'workshop',name:'Мастерская владельца',x:42,state:'intact',owner:p.id,history:[{tick:0,kind:'origin',owner:p.id}],offer:null,rent:2};s.areas[h.area].objects.push(property);
 return {s,h,p,q,enemy,property};
}
test('one actual death transfers seventy real coins, preserves the physical thirty and changes the same property ID',()=>{
 const {s,h,p,q,property}=fixture(),before=q.agenda.wealth;step(s);assert.equal(h.alive,false);assert.equal(p.estate.heir,q.id);assert.equal(p.estate.paid,70);assert.equal(q.agenda.wealth,before+70);assert.equal(h.gold,0);const cache=s.areas[h.area].objects.find(o=>o.kind==='heirloom');assert.equal(cache.gold,30);assert.equal(q.agenda.wealth-before+cache.gold+p.estate.cash,100);assert.equal(property.owner,q.id);assert.equal(p.estate.assets.find(a=>a.kind==='property').id,property.id);
 const raw=serialize(s);assert.equal(openInheritance(s,h,cache,ctx),null);assert.equal(serialize(s),raw);const loaded=restore(raw);assert.equal(serialize(loaded),raw);assert.equal(openInheritance(loaded,loaded.hero,cache,ctx),null);assert.equal(serialize(loaded),raw);
});
test('the original book stays in the single physical death cache with the same ID and holder',()=>{
 const {s,h,p,q}=fixture();setModule(s,'equipment',true);const book=receiveItem(s,ctx,2);book.name='Путевая книга владельца';const id=book.id;step(s);const cache=s.areas[h.area].objects.find(o=>o.kind==='heirloom');assert.equal(cache.items.find(i=>i.id===id),book);assert.deepEqual(book.inheritance,{estate:p.estate.id,owner:q.id});assert.equal(book.physical.holder.object,cache.id);assert.equal(h.bag.length,0);assert.ok(p.estate.assets.some(a=>a.kind==='item'&&a.id===id));assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('unknown hidden money remains outside the heir act; known hidden money transfers its existing title without moving coins',()=>{
 for(const known of [false,true]){const f=fixture(),{s,h,p,q,enemy}=f;enemy.alive=false;q.x=known?h.x:0;const cache=buryMoney(s,p,20);assert.ok(cache);enemy.alive=true;q.x=h.x;step(s);assert.equal(cache.moneyCache.balance,20);assert.equal(p.estate.assets.some(a=>a.id===cache.id),known);assert.equal(cache.moneyCache.owner,known?q.id:p.id);assert.equal(serialize(restore(serialize(s))),serialize(s));}
});
test('a distant heir receives a claim rather than teleported cash',()=>{
 const {s,h,p,q}=fixture();q.area='a1';const before=q.agenda.wealth;step(s);assert.equal(p.estate.heir,q.id);assert.equal(p.estate.status,'pending');assert.equal(p.estate.cash,70);assert.equal(p.estate.paid,0);assert.equal(q.agenda.wealth,before);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a real death during a sea crossing does not pay a relative at the departure port (one tick)',()=>{
 const {s,h}=deathFixture('storm');setModule(s,'finances',true);setModule(s,'lifecycle',true);const p=s.people[h.lineage],q=Object.values(s.people).find(q=>q.alive&&q.status==='resident'&&q.id!==p.id);q.parents=[p.id];q.area=h.area;q.x=h.x;q.needs.sleeping=false;const before=q.agenda.wealth;setActorMoney(s,p,100);step(s);assert.equal(h.alive,false);assert.equal(p.estate.status,'pending');assert.equal(p.estate.cash,70);assert.equal(q.agenda.wealth,before);
});
test('living settlement and legacy gifts never open a death estate or pay from its snapshot',()=>{
 const {s,h,p,q}=fixture();h.combat=null;h.goal=null;h.area='a1';h.life.home='a1';settleLife(s,ctx);assert.equal(p.estate,undefined);assert.equal(openInheritance(s,h,null,ctx),null);assert.equal(h.alive,true);
 // A deceased actor is no longer a living gift source, even if an old view remains.
 p.alive=false;h.alive=false;p.died=s.tick;const estate=openInheritance(s,h,null,ctx);assert.ok(estate);const before=serialize(s);meetLegacy(s,p.id,ctx);assert.equal(serialize(s),before);
});
test('an explicit next story cannot extract another payment from the archived wealth (two world ticks maximum)',()=>{
 const {s,h,p,q}=fixture();step(s);const paid=q.agenda.wealth,estateId=p.estate.id;assert.equal(createNextStory(s),true);step(s);assert.equal(q.agenda.wealth,paid);assert.equal(p.estate.id,estateId);assert.equal(p.estate.paid,70);assert.equal(s.lives.filter(l=>l.lineage===h.lineage).length,1);
});
test('finances OFF retains the prior death path without creating an estate; invalid distribution is rejected',()=>{
 const off=fixture();setModule(off.s,'finances',false);step(off.s);assert.equal(off.p.estate,undefined);const f=fixture();step(f.s);f.p.estate.cash=1;assert.throws(()=>restore(serialize(f.s)),/estate/);
});
test('missing recipients preserve the finite estate, and enabling later never reconstructs a historical death',()=>{
 const {s,h,p,q}=fixture();p.parents=[];q.parents=[];step(s);assert.equal(p.estate.heir,null);assert.equal(p.estate.cash,70);assert.equal(p.estate.paid,0);assert.equal(p.estate.status,'pending');assert.equal(serialize(restore(serialize(s))),serialize(s));
 const old=fixture();setModule(old.s,'finances',false);step(old.s);old.s.tick++;setModule(old.s,'finances',true);assert.equal(openInheritance(old.s,old.h,null,ctx),null);assert.equal(old.p.estate,undefined);
});
