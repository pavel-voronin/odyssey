import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {recordAreaVisit} from '../actor-atlas.js';
import {setActorMoney} from '../actor-projection.js';
import {buryMoney,takeBuriedMoney,shareMoneyCacheAddresses,moneyCachePlan,moneyCacheAction,npcMoneyCachePlan} from '../modules/money-caches.js';
import {peopleTick} from '../modules/people.js';
const ctx={log:()=>{},route:(_s,a,b)=>a===b?[a]:[],goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['finances','people','npc-control'].includes(m.id));
 const h=s.hero,p=s.people[h.lineage],a=s.areas.a1;h.area=a.id;h.x=42;h.combat=null;h.transit=null;h.hp=h.maxHp;h.energy=100;h.hunger=0;h.money.style='cautious';h.quests=[];recordAreaVisit(s,a.id);setActorMoney(s,p,100);
 const q=Object.values(s.people).find(p=>p.alive&&p.status==='resident'&&p.area===a.id&&p.id!==h.lineage);q.x=44;q.needs.sleeping=false;q.agenda.task=null;q.agenda.due=0;q.agenda.duty=.1;q.needs.energy=100;
 for(const o of a.objects)if(o.person===q.id)o.x=q.x;s.tick=1;return {s,h,p,q,a};
}
const total=f=>f.h.gold+f.q.agenda.wealth+f.a.objects.filter(o=>o.kind==='buriedMoney').reduce((n,o)=>n+o.moneyCache.balance,0);
test('deposit and partial third-party withdrawal conserve wallets plus physical stash with exact restore',()=>{
 const f=fixture(),{s,h,p,q}=f,before=total(f),cache=buryMoney(s,p,30);assert.ok(cache);assert.equal(h.gold,70);assert.equal(cache.moneyCache.balance,30);assert.equal(total(f),before);assert.equal(q.moneyCaches.places[0].source,'witness');assert.equal(q.moneyCaches.places[0].balance,undefined);
 s.tick++;assert.equal(takeBuriedMoney(s,q,cache.id,8),8);assert.equal(cache.moneyCache.balance,22);assert.equal(total(f),before);assert.equal(takeBuriedMoney(s,q,cache.id,8),0);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('forgetting the address loses knowledge, never the coins or ownership; a witness can reveal it again',()=>{
 const f=fixture(),{s,p,q}=f,cache=buryMoney(s,p,30);p.moneyCaches.places=[];s.tick++;assert.equal(takeBuriedMoney(s,p,cache.id,5),0);assert.equal(cache.moneyCache.balance,30);assert.equal(cache.moneyCache.owner,p.id);assert.equal(shareMoneyCacheAddresses(s,q.id,p.id),1);assert.equal(takeBuriedMoney(s,p,cache.id,5),5);assert.equal(cache.moneyCache.balance,25);
});
test('a hidden address cannot be inferred from object ID, wealth, global ownership or distant contact',()=>{
 const f=fixture(),{s,p,q}=f;q.x=90;const cache=buryMoney(s,p,30);assert.equal(q.moneyCaches,undefined);s.tick++;assert.equal(takeBuriedMoney(s,q,cache.id,8),0);assert.equal(shareMoneyCacheAddresses(s,p.id,q.id),0);q.x=44;assert.equal(shareMoneyCacheAddresses(s,p.id,q.id),0,'owner does not volunteer a secret without trust');p.agenda.bonds[q.id]=10;assert.equal(shareMoneyCacheAddresses(s,p.id,q.id),1);assert.equal(takeBuriedMoney(s,q,cache.id,8),8);
});
test('empty and unavailable caches cannot mint payouts; wrong amount and OFF preserve all balances',()=>{
 const f=fixture(),{s,p,q}=f;assert.equal(buryMoney(s,p,101),null);assert.equal(buryMoney(s,p,-1),null);const c=buryMoney(s,p,5);s.tick++;assert.equal(takeBuriedMoney(s,q,c.id,8),5);s.tick++;assert.equal(takeBuriedMoney(s,q,c.id,8),0);s.tick++;setModule(s,'finances',false);const raw=serialize(s);assert.equal(buryMoney(s,p,5),null);assert.equal(takeBuriedMoney(s,p,c.id,1),0);assert.equal(serialize(s),raw);
});
test('a cautious hero plans an actual deposit; ordinary spenders do not, and old current saves are not enriched',()=>{
 const {s,h,p}=fixture(),raw=serialize(s);assert.equal(serialize(restore(raw)),raw);assert.equal(p.moneyCaches,undefined);assert.equal(moneyCachePlan(s,ctx),true);moneyCacheAction(s,ctx);assert.equal(h.gold,81);assert.equal(p.moneyCaches.places.length,1);assert.equal(moneyCachePlan(s,ctx),false);s.tick=242;h.money.style='carefree';assert.equal(moneyCachePlan(s,ctx),false);
});
test('an opportunistic actual resident walks to a witnessed stash and takes a finite amount in its usual phase (two updates)',()=>{
 const {s,p,q}=fixture(),cache=buryMoney(s,p,20);q.x=cache.x;assert.equal(npcMoneyCachePlan(s,q).cache,cache.id);const money=q.agenda.wealth;s.tick=8;peopleTick(s,ctx);assert.equal(q.agenda.wealth,money+8);assert.equal(cache.moneyCache.balance,12);const raw=serialize(s);peopleTick(s,ctx);assert.equal(serialize(s),raw);s.tick=16;peopleTick(s,ctx);assert.equal(q.agenda.wealth,money+8);
});
test('a short isolated engine replay preserves one stash and the same money through loading (four ticks)',()=>{
 const {s,h,p}=fixture();moneyCachePlan(s,ctx);let copy=restore(serialize(s));for(let i=0;i<4;i++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));}assert.equal(p.moneyCaches.places.length,1);assert.ok(h.gold<100);
});
test('a corrupted negative or unbalanced physical cache cannot be restored',()=>{
 const {s,p}=fixture(),c=buryMoney(s,p,10);c.moneyCache.balance++;assert.throws(()=>restore(serialize(s)),/moneyCache/);
});
