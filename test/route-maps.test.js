import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {observeRouteMap,writeRouteMap,routeMapDemand,buyRouteMap,hearRouteMapReport,routeMapPlan} from '../modules/route-maps.js';
import {initializeNPCKnowledge,npcKnownRoute,knownEmployer} from '../modules/npc-knowledge.js';
import {setActorMoney} from '../actor-projection.js';
import {openInheritance} from '../modules/inheritance.js';
import {maySpend} from '../modules/finances.js';
const ctx={route:knownRoute,knownRoute,maySpend,log:()=>{},goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['route-maps','npc-knowledge','finances','lifecycle'].includes(m.id));
 const a=Object.values(s.areas).find(a=>a.civic&&a.links.some(id=>s.areas[id].civic)),b=s.areas[a.links.find(id=>s.areas[id].civic)];assert.ok(a&&b);
 const people=Object.values(s.people).filter(p=>p.alive&&p.status==='resident'&&p.id!==s.hero.lineage),p=people[0],q=people[1];p.agenda.job='scholar';p.area=a.id;p.x=42;p.needs.sleeping=false;p.needs.energy=100;q.area=b.id;q.x=42;q.needs.sleeping=false;q.needs.energy=100;q.agenda.job='artisan';q.agenda.wealth=20;q.navigation={version:1,places:[{area:b.id,name:b.name,seen:0}],roads:[]};a.civic.treasury=100;b.civic.treasury=0;s.tick=1;
 observeRouteMap(s,p);const key=[a.id,b.id].sort().join('|'),d=writeRouteMap(s,p,key);assert.ok(d);p.area=b.id;p.x=42;
 return {s,a,b,p,q,d,key};
}
test('paid dated map creates the missing known road and changes the actual employment choice without changing world links',()=>{
 const {s,a,b,p,q,d}=fixture(),money=p.agenda.wealth+q.agenda.wealth,links=JSON.stringify([a.links,b.links]),energy=p.needs.energy;
 assert.deepEqual(npcKnownRoute(q,b.id,a.id),[]);assert.equal(knownEmployer(s,q),null);s.tick++;assert.equal(routeMapDemand(s,q,d),true);assert.equal(buyRouteMap(s,q,p.id,d.id,ctx),true);assert.deepEqual(npcKnownRoute(q,b.id,a.id),[b.id,a.id]);assert.equal(knownEmployer(s,q).area,a.id);assert.equal(p.agenda.wealth+q.agenda.wealth,money);assert.equal(q.agenda.wealth,17);assert.equal(p.needs.energy,energy);assert.equal(JSON.stringify([a.links,b.links]),links);assert.equal(q.routeMaps.notes[0].at,1);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('same information has no repeat demand, including after reload and a seller title change',()=>{
 const {s,p,q,d}=fixture();s.tick++;assert.equal(buyRouteMap(s,q,p.id,d.id,ctx),true);const raw=serialize(s);assert.equal(buyRouteMap(s,q,p.id,d.id,ctx),false);assert.equal(serialize(s),raw);s.tick++;assert.equal(routeMapDemand(s,q,d),false);p.name='Новый титул';assert.equal(buyRouteMap(s,q,p.id,d.id,ctx),false);
});
test('remote change does not update a map; a real return records closure and its paid news changes the employer plan',()=>{
 const {s,a,b,p,q,d,key}=fixture();s.tick++;buyRouteMap(s,q,p.id,d.id,ctx);a.civic.treasury=0;s.tick++;assert.equal(d.route.employment.available,true);assert.equal(routeMapDemand(s,q,d),false);p.area=a.id;p.x=42;observeRouteMap(s,p);const next=writeRouteMap(s,p,key);assert.ok(next);assert.equal(next.route.employment.available,false);p.area=b.id;s.tick++;assert.equal(buyRouteMap(s,q,p.id,next.id,ctx),true);assert.equal(knownEmployer(s,q),null);assert.equal(q.agenda.wealth,14);s.tick++;assert.equal(routeMapDemand(s,q,d),false,'old positive map cannot resell a stale reversal');assert.equal(buyRouteMap(s,q,p.id,d.id,ctx),false);assert.equal(q.agenda.wealth,14);
});
test('a physically met reporter preserves original witness/date; a distant report cannot create source knowledge',()=>{
 const {s,a,b,p,q,key}=fixture();p.area=a.id;s.tick++;assert.equal(hearRouteMapReport(s,p.id,q.id,key),false);p.area=b.id;assert.equal(hearRouteMapReport(s,p.id,q.id,key),true);assert.equal(q.routeMaps.notes[0].source.origin,p.id);assert.equal(q.routeMaps.notes[0].at,1);assert.equal(q.routeMaps.notes[0].source.kind,'report');
});
test('poor or distant buyers and OFF cannot transfer coins or knowledge',()=>{
 for(const change of [f=>f.q.agenda.wealth=6,f=>f.q.x=95,f=>f.q.needs.sleeping=true,f=>setModule(f.s,'route-maps',false)]){const f=fixture();f.s.tick++;change(f);const raw=serialize(f.s);assert.equal(buyRouteMap(f.s,f.q,f.p.id,f.d.id,ctx),false);assert.equal(serialize(f.s),raw);}
});
test('the hero plans and buys the same map using the ordinary action executor; replay is bounded to two ticks',()=>{
 const {s,a,b,p,d}=fixture(),h=s.hero;h.area=b.id;h.x=42;h.combat=null;h.transit=null;h.career.path='peaceful';h.energy=100;h.hunger=0;h.atlas.known=[b.id];h.atlas.roads=[];h.memory.services={};setActorMoney(s,s.people[h.lineage],20);(b.population ||= []).push(p.id);s.tick++;
 assert.equal(routeMapPlan(s,ctx),true);assert.equal(h.goal.map,d.id);const copy=restore(serialize(s));step(s);step(copy);assert.equal(serialize(s),serialize(copy));assert.deepEqual(knownRoute(s,b.id,a.id),[b.id,a.id]);assert.equal(h.gold,17);
});
test('an authored map keeps its original ID, author and source through one actual inheritance act',()=>{
 const {s,h=s.hero,p,q,d}=fixture();const current=s.people[s.hero.lineage];current.alive=false;h.alive=false;current.died=s.tick;q.parents=[current.id];q.area=h.area;q.x=h.x;d.owner=current.id;current.routeMaps={version:1,serial:0,notes:[],documents:[d],lastActionTick:-1};p.routeMaps.documents=[];const id=d.id;openInheritance(s,h,null,ctx);assert.equal(q.routeMaps.documents[0].id,id);assert.equal(q.routeMaps.documents[0].author,p.id);assert.equal(q.routeMaps.documents[0].route.source.origin,p.id);assert.equal(current.routeMaps.documents.length,0);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
