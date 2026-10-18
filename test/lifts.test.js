import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,connectAreas,createArea,route,knownRoute,step,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createLift,workLift,observeLift,blockedLiftPlan,liftAction} from '../modules/lifts.js';
import {beginTransit,transitTick} from '../modules/travel.js';
import {timedLiftPassage} from '../modules/lift-policy.js';
import {walkCampOrder} from '../modules/camp-route.js';
import {presentItem} from '../modules/item-originals.js';
import {campPassage} from '../geometry.js';
import {recordAreaVisit,observeLocalRoutes} from '../actor-atlas.js';
import {forgingFixture,placeAtBench,forgingContext} from '../scripts/forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {productionSources} from '../modules/goods.js';
import {delvePlan} from '../modules/delves.js';
import {startDelve} from '../modules/delve-attempts.js';
import {drawLifts} from '../mechanism-view.js';
const ctx={route,log:()=>{},goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra},enter:(s,id)=>s.hero.area=id};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['mechanisms','travel'].includes(m.id));
 const [from,to,bypass]=['a1','a2','a3'];for(const [a,b]of [[from,to],[from,bypass],[to,bypass]])connectAreas(s,a,b);
 const n=createLift(s,from,to,bypass),h=s.hero,p=s.people[h.lineage];h.area=from;h.x=n.console.x;h.energy=100;h.hp=h.maxHp;h.hunger=0;h.gold=20;h.goal=null;h.combat=null;h.personality.curiosity=.9;h.inventory.relics=2;h.quests=[];
 for(const id of [from,to,bypass]){recordAreaVisit(s,id);for(const o of s.areas[id].objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}}
 observeLocalRoutes(s);h.atlas.roads=[...new Set([...h.atlas.roads,...[[from,to],[from,bypass],[to,bypass]].map(pair=>pair.sort().join('|'))])];
 const key=[from,to].sort().join('|'),q=Object.values(s.people).find(q=>q.alive&&q.status==='resident'&&q.id!==p.id);q.area=from;q.x=100;q.needs.sleeping=false;q.needs.energy=100;
 const work=action=>{s.tick++;return workLift(s,p,key,action,ctx);};const ready=()=>{for(let i=0;i<3;i++)assert.equal(work('repair'),true);assert.equal(work('fuel'),true);};return {s,h,p,q,n,key,from,to,bypass,work,ready};
}
test('actual node construction never duplicates parts; repair and one real relic give only three shared trips',()=>{
 const {s,h,p,n,key,from,to,bypass,work,ready}=fixture(),xp=h.career.xp,gold=h.gold;assert.deepEqual(route(s,from,to),[from,bypass,to]);assert.equal(createLift(s,from,to,bypass),null);for(const id of n.issued)assert.equal(presentItem(s,id).kind,'mechanism');
 ready();assert.equal(n.status,'ready');assert.equal(h.inventory.relics,1);assert.deepEqual(n.charge,{fed:3,remaining:3,spent:0,discarded:0,loads:1,source:{person:p.id,tick:s.tick,resource:'relic',quantity:1,before:2,after:1}});assert.deepEqual(route(s,from,to),[from,to]);assert.equal(work('fuel'),false);assert.equal(h.inventory.relics,1);assert.equal(h.career.xp,xp);assert.equal(h.gold,gold);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('one charge is paid at admission, repeats cannot spend it twice, and an exhausted/broken node cannot stop the already admitted ride',()=>{
 const {s,h,n,from,to,ready}=fixture();ready();const ride=()=>{h.x=h.area===from?100:0;const next=h.area===from?to:from;s.tick++;assert.equal(beginTransit(s,next,next===to?5:95,ctx),true);const spent=n.charge.spent;beginTransit(s,next,5,ctx);assert.equal(n.charge.spent,spent);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);for(let i=0;i<2;i++){s.tick++;transitTick(s,ctx);}assert.equal(h.area,next);};ride();ride();
 h.x=100;s.tick++;beginTransit(s,to,5,ctx);assert.equal(n.charge.remaining,0);assert.equal(n.status,'broken');assert.equal(n.rides,3);assert.ok(h.transit);transitTick(s,ctx);assert.equal(h.transit.remaining,2);assert.equal(campPassage(s,from,to).allowed,false);const copy=restore(serialize(s));for(let i=0;i<2;i++){s.tick++;copy.tick++;transitTick(s,ctx);transitTick(copy,ctx);}assert.equal(h.area,to);assert.equal(serialize(s),serialize(copy));assert.deepEqual(route(s,to,from),[to,'a3',from]);
});
test('a real NPC pays from the same charge supply and finishes a saved two-tick phase after dismantling; next travellers use the bypass',()=>{
 const {s,h,p,q,n,key,from,to,bypass,ready,work}=fixture();ready();assert.equal(walkCampOrder(s,q,to,5,{route:()=>[from,to]},{}),'walking');assert.ok(q.liftTransit);assert.equal(q.area,from);assert.equal(n.charge.remaining,2);assert.equal(serialize(restore(serialize(s))),serialize(s));
 assert.equal(work('dismantle'),true);assert.equal(n.status,'dismantled');assert.equal(n.charge.discarded,2);assert.equal(n.parts.length,0);assert.equal(h.bag.filter(i=>i.mechanismPart).length,2);assert.equal(q.area,from);assert.equal(walkCampOrder(s,q,to,5,{route:()=>[from,to]},{}),'walking');s.tick++;walkCampOrder(s,q,to,5,{route:()=>[from,to]},{});assert.equal(q.area,to);assert.equal(q.liftTransit,undefined);assert.equal(n.charge.spent,1);assert.deepEqual(route(s,from,to),[from,bypass,to]);assert.equal(work('dismantle'),false);assert.equal(work('repair'),false);assert.equal(h.bag.filter(i=>i.mechanismPart).length,2);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('remote, absent-console, sleeping and already-spent actions cannot manufacture repairs, fuel or parts',()=>{
 const {s,h,p,n,key,from,work}=fixture();h.x=0;assert.equal(work('fuel'),false);h.x=n.console.x;p.needs.sleeping=true;assert.equal(work('repair'),false);p.needs.sleeping=false;const console=s.areas[from].objects.find(o=>o.id===n.console.id);s.areas[from].objects=s.areas[from].objects.filter(o=>o!==console);assert.equal(work('repair'),false);s.areas[from].objects.push(console);s.tick++;assert.equal(workLift(s,p,key,'repair'),true);assert.equal(workLift(s,p,key,'fuel'),false);assert.equal(n.repair,1);assert.equal(n.charge.remaining,0);assert.equal(h.inventory.relics,2);assert.equal(h.bag.filter(i=>i.mechanismPart).length,0);
});
test('another traveller can make observed fuel stale; OFF and entry never refill or repair the shared node',()=>{
 const {s,h,p,q,n,from,to,ready}=fixture();ready();observeLift(s,p,from,to);const old=p.liftMemory.known[0].remaining;for(let i=0;i<3;i++){q.area=from;q.x=100;s.tick++;assert.equal(timedLiftPassage(s,q,to,5).status,'crossing');for(let j=0;j<2;j++){s.tick++;timedLiftPassage(s,q,to,5);}}assert.equal(n.charge.remaining,0);assert.equal(p.liftMemory.known[0].remaining,old);assert.equal(n.status,'broken');setModule(s,'mechanisms',false);const raw=serialize(s);assert.equal(campPassage(s,from,to),null);assert.equal(serialize(restore(raw)),raw);setModule(s,'mechanisms',true);assert.equal(n.charge.remaining,0);assert.equal(n.status,'broken');assert.equal(h.inventory.relics,1);
});
test('an autonomous local repair/fuel decision uses ordinary engine actions, while the last promised relic chooses a known bypass',()=>{
 const {s,h,p,n,key,from,to,bypass}=fixture();h.goal={kind:'explore',area:to,x:5};assert.equal(blockedLiftPlan(s,to,ctx),true);assert.equal(h.goal.operation,'repair');for(let i=0;i<3;i++)step(s);assert.equal(n.status,'ready');assert.equal(blockedLiftPlan(s,to,ctx),true);assert.equal(h.goal.operation,'fuel');step(s);assert.equal(n.charge.remaining,3);assert.equal(h.inventory.relics,1);
 const f=fixture();f.ready();f.s.tick++;for(let i=0;i<3;i++){f.q.area=f.from;f.q.x=100;timedLiftPassage(f.s,f.q,f.to,5);for(let j=0;j<2;j++){f.s.tick++;timedLiftPassage(f.s,f.q,f.to,5);}f.s.tick++;}for(let i=0;i<3;i++)f.work('repair');f.h.quests=[{status:'active',kind:'relic'}];f.h.goal={kind:'explore',area:f.to,x:5};blockedLiftPlan(f.s,f.to,ctx);assert.equal(f.h.goal,null);assert.equal(f.h.inventory.relics,1);assert.deepEqual(knownRoute(f.s,f.from,f.to),[f.from,f.bypass,f.to]);
});
test('dismantled original metal becomes the same reserved forge material, replacing one finite blank without recreating parts',()=>{
 const f=forgingFixture(),{s,h,worker:p,site,a}=f;setModule(s,'mechanisms',true);const ids=[createArea(s,'dungeon','Рама',1),createArea(s,'dungeon','Выход',1)];for(const [x,y]of [[a.id,ids[0]],[a.id,ids[1]],[ids[0],ids[1]]])connectAreas(s,x,y);const n=createLift(s,a.id,ids[0],ids[1]),key=[a.id,ids[0]].sort().join('|');h.area=a.id;h.x=n.console.x;assert.equal(workLift(s,p,key,'dismantle'),true);const original=h.bag.find(i=>i.mechanismPart),before=productionSources(s,a).materials.stock,gold=h.gold;h.x=42;s.tick++;
 const order=startKnife(s,p,site,forgingContext);assert.ok(order);assert.equal(order.materials[0].kind,'reclaimed-metal');assert.equal(order.materials[0].original.id,original.id);assert.equal(h.bag.some(i=>i.id===original.id),false);assert.equal(productionSources(s,a).materials.stock,before-1);assert.equal(h.gold,gold-3);assert.equal(serialize(restore(serialize(s))),serialize(s));placeAtBench(f);for(let i=0;i<6;i++){s.tick++;assert.equal(workKnife(s,p,forgingContext),true);}assert.equal(s.itemDisposals[original.id].reason,'working-knife-material');assert.equal(presentItem(s,original.id),null);assert.equal(h.bag.filter(i=>i.mechanismPart).length,1);assert.equal(n.status,'dismantled');assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a real second-floor expansion creates one unfuelled broken lift and a reciprocal exit, without issuing an old expedition reward',()=>{
 const {s,h,from}=fixture();setModule(s,'delves',true);const root=createArea(s,'dungeon','Глубокий зал',1);connectAreas(s,from,root);const room=s.areas[root];room.dungeon={root,floor:2,cleared:true};room.objects=[];h.area=root;h.delve={root,room:root,started:s.tick,floors:3,cleared:2};startDelve(s,h.delve,'curiosity');const relics=h.inventory.relics,count=Object.keys(s.areas).length;delvePlan(s,{...ctx,addArea:createArea,connect:connectAreas});const n=s.edges[[root,room.dungeon.next].sort().join('|')].lift;assert.ok(n);assert.equal(n.charge.remaining,0);assert.equal(n.status,'broken');assert.equal(h.inventory.relics,relics);assert.equal(Object.keys(s.areas).length,count+1);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('drawing and current restore are read-only; forged charge conservation or duplicated original parts are rejected',()=>{
 const {s,h,n,from,ready}=fixture();ready();const raw=serialize(s),ops=[],c=new Proxy({},{get:(_,name)=>(...args)=>ops.push([name,...args]),set:()=>true});drawLifts(c,s,s.areas[from],x=>x,100);assert.ok(ops.some(o=>o[0]==='strokeRect'));assert.equal(serialize(s),raw);const bad=JSON.parse(raw),key=[n.from,n.to].sort().join('|');bad.edges[key].lift.charge.remaining++;assert.throws(()=>restore(JSON.stringify(bad)),/lift/);const duplicate=JSON.parse(raw);duplicate.hero.bag.push({...duplicate.edges[key].lift.parts[0],physical:{version:1,holder:{kind:'person',id:h.lineage},movedAt:s.tick}});assert.throws(()=>restore(JSON.stringify(duplicate)),/item/);
});
test('the ordinary world orders controller completes an admitted NPC ride after the hero dismantles its node, in three engine ticks',()=>{
 const {s,h,q,n,key,from,to,ready}=fixture();ready();setModule(s,'orders',true);setModule(s,'npc-control',true);q.status='marching';q.area=from;q.x=100;h.goal={kind:'routeWait',area:from,x:h.x,until:1e6};const enemy=s.areas[to].objects.find(o=>o.kind==='enemy');s.society.orders.push({person:q.id,owner:h.lineage,from,to,enemy:enemy.id,stage:'marching',remaining:4,mechanismWalk:true});
 step(s);assert.ok(q.liftTransit);assert.equal(n.charge.spent,1);h.goal={kind:'liftWork',area:from,x:n.console.x,key,operation:'dismantle',resume:null};const copy=restore(serialize(s));for(let i=0;i<2;i++){step(s);step(copy);}assert.equal(q.area,to);assert.equal(q.liftTransit,undefined);assert.equal(n.status,'dismantled');assert.equal(n.charge.spent,1);assert.equal(serialize(s),serialize(copy));
});
