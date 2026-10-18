import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createArea,connectAreas,route,knownRoute,step,serialize,restore} from '../engine.js';
import {delvePlan} from '../modules/delves.js';
import {startDelve} from '../modules/delve-attempts.js';
import {MODULES,setModule} from '../rules.js';
import {addRoute,beginTransit,transitTick} from '../modules/travel.js';
import {createGrate,observeGrate,operateGrate,blockedGratePlan} from '../modules/mechanisms.js';
import {campPassage} from '../geometry.js';
import {recordAreaVisit,observeLocalRoutes} from '../actor-atlas.js';
import {walkCampOrder} from '../modules/camp-route.js';
import {partyBodySpent} from '../modules/party-combat-policy.js';
import {drawMechanisms} from '../mechanism-view.js';
const ctx={log:()=>{},goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['mechanisms','travel'].includes(m.id));
 const [from,to,bypass]=['a1','a2','a3'];
 function link(a,b){if(!s.areas[a].links.includes(b))s.areas[a].links.push(b);if(!s.areas[b].links.includes(a))s.areas[b].links.push(a);addRoute(s,a,b,{mode:'stairs',duration:2});s.graphRevision=(s.graphRevision||0)+1;}
 link(from,to);link(from,bypass);link(to,bypass);
 const g=createGrate(s,from,to,bypass),h=s.hero,p=s.people[h.lineage];h.area=from;h.x=g.lever.x;h.energy=100;h.hp=h.maxHp;h.hunger=0;h.goal=null;h.combat=null;h.personality.curiosity=.9;
 for(const id of [from,to,bypass]){recordAreaVisit(s,id);for(const o of s.areas[id].objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}}
 observeLocalRoutes(s);h.atlas.roads=[...new Set([...h.atlas.roads,...[[from,to],[from,bypass],[to,bypass]].map(pair=>pair.sort().join('|'))])];
 const q=Object.values(s.people).find(q=>q.alive&&q.status==='resident'&&q.id!==p.id);q.area=from;q.x=g.lever.x;q.needs.sleeping=false;q.needs.energy=100;
 return {s,h,p,q,g,from,to,bypass,key:[from,to].sort().join('|')};
}
test('one actual edge and lever; closed route uses a safe existing bypass and open route uses the stair',()=>{
 const {s,p,g,from,to,bypass,key}=fixture();assert.deepEqual(route(s,from,to),[from,bypass,to]);assert.equal(campPassage(s,from,to).allowed,false);const energy=s.hero.energy;assert.equal(operateGrate(s,p,key,'open'),true);assert.equal(s.hero.energy,energy-2);assert.equal(g.state,'open');assert.deepEqual(route(s,from,to),[from,to]);assert.equal(campPassage(s,from,to),null);assert.equal(createGrate(s,from,to,bypass),null);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('remote, wrong side, asleep, absent lever and repeated same-tick operation cannot change state or spend energy',()=>{
 const {s,h,p,g,from,to,key}=fixture(),raw=serialize(s);h.x=0;assert.equal(operateGrate(s,p,key),false);h.x=g.lever.x;h.area=to;assert.equal(operateGrate(s,p,key),false);h.area=from;p.needs.sleeping=true;assert.equal(operateGrate(s,p,key),false);p.needs.sleeping=false;
 const a=s.areas[from],lever=a.objects.find(o=>o.id===g.lever.id);a.objects=a.objects.filter(o=>o!==lever);assert.equal(operateGrate(s,p,key),false);a.objects.push(lever);assert.equal(h.energy,100);assert.equal(g.state,'closed');assert.equal(p.mechanisms,undefined);
 assert.equal(operateGrate(s,p,key,'open'),true);assert.equal(partyBodySpent(s,p),true);assert.equal(operateGrate(s,p,key,'close'),false);assert.equal(h.energy,98);assert.equal(g.state,'open');assert.ok(raw);
});
test('dated personal knowledge can be stale after another real body closes the gate; hidden state cannot refresh it',()=>{
 const {s,h,p,q,g,from,to,key,bypass}=fixture();operateGrate(s,p,key,'open');s.tick++;h.area=bypass;const at=p.mechanisms.known[0].at;assert.equal(operateGrate(s,q,key,'close'),true);assert.equal(q.needs.energy,98);assert.equal(p.mechanisms.known[0].state,'open');assert.equal(observeGrate(s,p,from,to),null);assert.equal(p.mechanisms.known[0].at,at);assert.equal(g.state,'closed');h.area=to;h.x=0;observeGrate(s,p,from,to);assert.equal(p.mechanisms.known[0].state,'closed');assert.deepEqual(knownRoute(s,to,from),[to,bypass,from]);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a physical NPC crossing and direct transit cannot pass the closed edge; an admitted transit finishes safely after closing',()=>{
 const {s,h,p,q,g,from,to,key}=fixture();q.x=100;const blocked=walkCampOrder(s,q,to,40,{route:()=>[from,to]},{});assert.equal(blocked,'blocked');assert.equal(q.area,from);assert.equal(beginTransit(s,to,5,ctx),true);assert.equal(h.transit,null);operateGrate(s,p,key,'open');s.tick++;assert.equal(beginTransit(s,to,5,ctx),true);assert.ok(h.transit);q.x=g.lever.x;assert.equal(operateGrate(s,q,key,'close'),true);const travel={...ctx,enter:(s,id)=>s.hero.area=id};transitTick(s,travel);transitTick(s,travel);assert.equal(h.area,to);assert.equal(h.transit,null);assert.deepEqual(route(s,to,from),[to,'a3',from]);assert.equal(g.state,'closed');
});
test('inspection and opening are separate ordinary actions after a real approach, with no new XP or payout',()=>{
 const {s,h,p,g,from,to,key}=fixture();h.x=50;const xp=h.xp,gold=h.gold;h.goal={kind:'explore',area:to,x:50};assert.equal(blockedGratePlan(s,to,ctx),false);
 // At most32 isolated ticks; the final operation is reached through the engine movement path.
 h.x=70;assert.equal(blockedGratePlan(s,to,ctx),true);assert.equal(h.goal.operation,'inspect');let ticks=0;while(h.goal&&ticks++<32)step(s);assert.ok(ticks<=32);assert.equal(p.mechanisms.known[0].understood,true);assert.equal(g.state,'closed');assert.equal(blockedGratePlan(s,to,ctx),true);assert.equal(h.goal.operation,'open');while(h.goal&&ticks++<32)step(s);assert.ok(ticks<=32);assert.equal(g.state,'open');assert.equal(h.xp,xp);assert.equal(h.gold,gold);assert.equal(g.operations.length,1);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('four bounded toggles cost energy and never reward; OFF/restore and read-only drawing preserve exact facts',()=>{
 const {s,h,p,g,from,to,key}=fixture(),xp=h.xp,gold=h.gold;for(let i=0;i<4;i++){s.tick++;assert.equal(operateGrate(s,p,key,i%2?'close':'open'),true);}assert.equal(h.energy,92);assert.equal(h.xp,xp);assert.equal(h.gold,gold);const raw=serialize(s),ops=[],c=new Proxy({},{get:(_,name)=>(...args)=>ops.push([name,...args]),set:()=>true});drawMechanisms(c,s,s.areas[from],x=>x,100);assert.ok(ops.some(o=>o[0]==='fillRect'));assert.equal(serialize(s),raw);setModule(s,'mechanisms',false);const off=serialize(s);assert.equal(campPassage(s,from,to),null);assert.equal(operateGrate(s,p,key),false);assert.equal(serialize(s),off);assert.equal(serialize(restore(off)),off);setModule(s,'mechanisms',true);assert.equal(campPassage(s,from,to).allowed,false);
});
test('restore rejects a forged reference and never reconstructs a missing lever',()=>{
 const {s,g,from,key}=fixture();s.areas[from].objects=s.areas[from].objects.filter(o=>o.id!==g.lever.id);const raw=serialize(s),loaded=restore(raw);assert.equal(serialize(loaded),raw);assert.equal(operateGrate(loaded,loaded.people[loaded.hero.lineage],key),false);const bad=JSON.parse(raw);bad.edges[key].mechanism.lever.area='a3';assert.throws(()=>restore(JSON.stringify(bad)),/mechanism/);
});
test('one real delve expansion constructs the first grate and reciprocal bypass without manufacturing another room or reward',()=>{
 const {s,h,from}=fixture();setModule(s,'delves',true);const root=createArea(s,'dungeon','Пробный спуск',1);connectAreas(s,from,root,{mode:'stairs',duration:2});const room=s.areas[root];room.dungeon={root,floor:1,cleared:true};room.objects=[];h.area=root;h.delve={root,room:root,started:s.tick,floors:3,cleared:1};const count=Object.keys(s.areas).length,xp=h.xp,gold=h.gold;
 startDelve(s,h.delve,'curiosity');assert.equal(delvePlan(s,{...ctx,addArea:createArea,connect:connectAreas}),true);const to=room.dungeon.next,g=s.edges[[root,to].sort().join('|')].mechanism;assert.ok(g);assert.equal(g.bypass,from);assert.equal(Object.keys(s.areas).length,count+1);assert.ok(s.areas[to].links.includes(from));assert.ok(s.areas[from].links.includes(to));assert.deepEqual(route(s,root,to),[root,from,to]);assert.equal(h.xp,xp);assert.equal(h.gold,gold);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
