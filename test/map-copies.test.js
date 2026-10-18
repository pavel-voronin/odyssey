import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {observeRouteMap,writeRouteMap} from '../modules/route-maps.js';
import {buryMoney} from '../modules/money-caches.js';
import {productionSources} from '../modules/goods.js';
import {buyMapPaper,copyTreasureMap,buyTreasureMap,inspectTreasureMap,pickupMapCopy,mapCopyPlan} from '../modules/map-copies.js';
import {openInheritance} from '../modules/inheritance.js';
import {maySpend} from '../modules/finances.js';
import {npcAction} from '../modules/npc-control.js';
const ctx={log:()=>{},maySpend,goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['route-maps','finances','lifecycle','goods-cycle','npc-knowledge','npc-control'].includes(m.id));
 const a=Object.values(s.areas).find(a=>a.civic&&a.links.some(id=>s.areas[id].civic)),b=s.areas[a.links.find(id=>s.areas[id].civic)],people=Object.values(s.people).filter(p=>p.alive&&p.status==='resident'&&p.id!==s.hero.lineage),[p,q,r,supplier]=people;
 for(const person of [p,q,r,supplier]){person.needs.energy=100;person.needs.sleeping=false;person.agenda.wealth=30;person.agenda.task=null;person.status='resident';}
 p.agenda.job='scholar';p.area=a.id;p.x=42;q.area=r.area=b.id;q.x=r.x=42;q.agenda.duty=r.agenda.duty=.1;supplier.area=a.id;supplier.x=42;supplier.agenda.job='merchant';
 for(const area of Object.values(s.areas))if(area.population)area.population=area.population.filter(id=>![p,q,r,supplier].some(person=>person.id===id));a.population ||= [];b.population ||= [];a.population.push(p.id,supplier.id);b.population.push(q.id,r.id);a.civic.treasury=100;
 const raw=productionSources(s,a).materials;s.tick=1;observeRouteMap(s,p);const document=writeRouteMap(s,p,[a.id,b.id].sort().join('|'));assert.ok(document);s.tick++;const cache=buryMoney(s,p,8);assert.ok(cache);
 const copies=[];for(let i=0;i<2;i++){s.tick++;assert.ok(buyMapPaper(s,p));s.tick++;const copy=copyTreasureMap(s,p,document.id,cache.id);assert.ok(copy);copies.push(copy);}p.area=b.id;p.x=42;
 return {s,a,b,p,q,r,supplier,raw,cache,document,copies};
}
test('two distinct physical maps consume two finite sheets and work actions while naming one existing treasure',()=>{
 const {s,p,raw,cache,document,copies}=fixture();assert.equal(raw.used,2);assert.equal(raw.stock,raw.initial+raw.delivered-2);assert.equal(p.mapCopies.paper.length,0);assert.notEqual(copies[0].id,copies[1].id);assert.notEqual(copies[0].material.id,copies[1].material.id);assert.deepEqual(copies.map(c=>c.treasure.id),[cache.id,cache.id]);assert.ok(copies.every(c=>c.sourceMap===document.id&&c.author===p.id));assert.equal(copyTreasureMap(s,p,document.id,cache.id),null);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('two paid explorers follow separate copies: the first removes the finite eight coins, the second finds the same empty stash',()=>{
 const {s,a,p,q,r,cache,copies}=fixture();const money=p.agenda.wealth+q.agenda.wealth+r.agenda.wealth+cache.moneyCache.balance;s.tick++;assert.equal(buyTreasureMap(s,q,p.id,copies[0].id,ctx),true);assert.equal(buyTreasureMap(s,r,p.id,copies[1].id,ctx),true);assert.equal(p.mapCopies.copies.length,0);
 q.area=r.area=a.id;q.x=r.x=cache.x;s.tick++;assert.deepEqual(inspectTreasureMap(s,q,copies[0].id),{tick:s.tick,kind:'found',amount:8});assert.deepEqual(inspectTreasureMap(s,r,copies[1].id),{tick:s.tick,kind:'empty',amount:0});assert.equal(cache.moneyCache.balance,0);assert.equal(p.agenda.wealth+q.agenda.wealth+r.agenda.wealth+cache.moneyCache.balance,money);assert.equal(q.mapCopies.copies[0].sourceMap,r.mapCopies.copies[0].sourceMap);assert.equal(serialize(restore(serialize(s))),serialize(s));
 const raw=serialize(s);assert.equal(inspectTreasureMap(s,r,copies[1].id),null);assert.equal(serialize(s),raw);s.tick++;assert.equal(inspectTreasureMap(s,r,copies[1].id),null);
});
test('an actually wrong received address differs from a dated but emptied correct stash and never creates replacement loot',()=>{
 const {s,a,p,q,cache,copies}=fixture();s.tick++;buyTreasureMap(s,q,p.id,copies[0].id,ctx);const copy=q.mapCopies.copies[0];copy.treasure.x=80;const amount=cache.moneyCache.balance;q.area=a.id;q.x=80;s.tick++;assert.equal(inspectTreasureMap(s,q,copy.id).kind,'wrong-report');assert.equal(cache.moneyCache.balance,amount);assert.equal(a.objects.filter(o=>o.kind==='buriedMoney').length,1);
});
test('material shortage, no paper, repeated actions and OFF cannot manufacture another copy',()=>{
 const {s,a,p,raw,cache,document}=fixture();p.area=a.id;s.tick++;raw.stock=0;const before=p.agenda.wealth;assert.equal(buyMapPaper(s,p),null);assert.equal(copyTreasureMap(s,p,document.id,cache.id),null);assert.equal(p.agenda.wealth,before);setModule(s,'route-maps',false);const save=serialize(s);assert.equal(buyMapPaper(s,p),null);assert.equal(serialize(s),save);
});
test('an inherited physical copy keeps its ID and source on the ground until an actual pickup, not a remote inventory teleport',()=>{
 const {s,p,q,copies}=fixture(),h=s.hero,current=s.people[h.lineage],copy=copies[0],id=copy.id;current.mapCopies={version:1,serial:0,paper:[],copies:[copy],lastActionTick:-1};p.mapCopies.copies=p.mapCopies.copies.filter(c=>c!==copy);copy.owner=current.id;copy.holder={kind:'person',person:current.id};q.parents=[current.id];q.area=h.area;q.x=h.x;current.alive=false;h.alive=false;current.died=s.tick;openInheritance(s,h,null,ctx);const inherited=q.mapCopies.copies[0];assert.equal(inherited.id,id);assert.equal(inherited.holder.kind,'ground');assert.equal(inherited.holder.area,h.area);assert.equal(inherited.author,p.id);s.tick++;assert.equal(pickupMapCopy(s,q,id),true);assert.equal(inherited.holder.person,q.id);assert.equal(npcAction(s,q,'personal','another-action'),false);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('an ordinary hero action checks the map and exact replay repeats it once (two ticks)',()=>{
 const {s,a,p,copies,cache}=fixture(),h=s.hero,reader=s.people[h.lineage];h.personality.curiosity=1;h.area=p.area;h.x=p.x;h.combat=null;h.transit=null;h.gold=20;h.energy=100;h.hunger=0;s.tick++;assert.equal(buyTreasureMap(s,reader,p.id,copies[0].id,ctx),true);h.area=a.id;h.x=cache.x;s.tick++;assert.equal(mapCopyPlan(s,ctx),true);const other=restore(serialize(s));step(s);step(other);assert.equal(serialize(s),serialize(other));assert.equal(reader.mapCopies.copies[0].check.kind,'found');
});
test('one physical sheet cannot appear in two saved copies',()=>{
 const {s,copies}=fixture();copies[1].material={...copies[0].material};assert.throws(()=>restore(serialize(s)),/mapCopies/);
});
