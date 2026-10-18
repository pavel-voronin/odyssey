import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,route} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {sendGuards,ordersTick} from '../modules/orders.js';
import {npcAction,canStartNPCActivity} from '../modules/npc-control.js';
import {peopleTick} from '../modules/people.js';

const ctx={route,log:()=>{},npcVictory:(_s,_a,e)=>{e.alive=false;e.resolved=true;}};
function fixture({relief=false}={}){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['orders','people','npc-watch-needs','npc-needs','npc-control','supply'].includes(m.id));
 const source=s.areas.a1,e=s.areas.a2.objects.find(o=>o.kind==='enemy');e.hp=e.maxHp=500;e.attack=1;e.x=45;
 sendGuards(s,source,{enemy:e.id,area:'a2'},ctx);const o=s.society.orders[0],p=s.people[o.person];
 o.stage='fighting';p.area=o.to;p.x=40;p.status='guarding';p.health=p.maxHealth=100;p.needs.energy=100;p.needs.hunger=10;p.needs.sleeping=false;p.agenda.duty=.5;
 const q=Object.values(s.people).find(q=>q.id!==p.id&&q.agenda?.job==='guard'&&q.status==='resident');assert.ok(q);
 if(relief){q.area=p.area;q.x=42;q.health=q.maxHealth||100;q.needs.energy=100;q.needs.hunger=10;q.needs.sleeping=false;q.agenda.task=null;q.agenda.duty=.8;p.agenda.bonds[q.id]=1;}
 s.tick=1;return {s,p,q,o,e,source};
}
test('service consumes real energy once per action, including with the arbiter OFF and exact restore',()=>{
 for(const control of [true,false]){const {s,p,e}=fixture();setModule(s,'npc-control',control);const energy=p.needs.energy,hp=e.hp;ordersTick(s,ctx);assert.equal(p.needs.energy,energy-2);assert.ok(e.hp<hp);const raw=serialize(s);ordersTick(s,ctx);assert.equal(serialize(s),raw);const copy=restore(raw);ordersTick(copy,ctx);assert.equal(serialize(copy),raw);assert.equal(npcAction(s,p,'orders','second-attack'),false);}
});
test('a tired guard without relief retreats and the unresolved enemy is no longer attacked',()=>{
 const {s,p,o,e}=fixture();p.needs.energy=20;const hp=e.hp;ordersTick(s,ctx);assert.equal(o.stage,'returning');assert.equal(e.hp,hp);assert.equal(p.watchDuty.kind,'retreat');assert.equal(p.needs.energy,19);s.tick++;ordersTick(s,ctx);assert.equal(e.hp,hp);assert.equal(p.watchDuty.kind,'march');
});
test('a known present rested guard takes the same order with no extra person, kit, pay or immediate attack',()=>{
 const {s,p,q,o,e,source}=fixture({relief:true});p.needs.energy=20;const n=s.nextPerson,hp=e.hp,food=source.civic.food,medicine=source.civic.medicine,money=q.agenda.wealth;
 ordersTick(s,ctx);assert.equal(o.person,q.id);assert.equal(p.status,'resident');assert.equal(q.status,'guarding');assert.equal(p.watchDuty.kind,'relieved');assert.equal(q.watchDuty.kind,'relief');assert.equal(q.needs.energy,99);assert.equal(e.hp,hp);assert.equal(s.nextPerson,n);assert.equal(source.civic.food,food);assert.equal(source.civic.medicine,medicine);assert.equal(q.agenda.wealth,money);assert.equal(canStartNPCActivity(s,p),false);assert.equal(canStartNPCActivity(s,q),false);
 s.tick++;ordersTick(s,ctx);assert.ok(e.hp<hp);assert.equal(q.watchDuty.kind,'fight');assert.equal(p.watchDuty.tick,s.tick-1);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('unknown, distant, sleeping, injured or already busy guard cannot become a magical relief',()=>{
 for(const change of [f=>f.p.agenda.bonds={},f=>f.q.x=75,f=>f.q.needs.sleeping=true,f=>f.q.health=10,f=>f.q.agenda.task={kind:'patrol'},f=>npcAction(f.s,f.q,'personal')]){
  const f=fixture({relief:true});f.p.needs.energy=20;change(f);ordersTick(f.s,ctx);assert.equal(f.o.person,f.p.id);assert.equal(f.o.stage,'returning');assert.equal(f.q.watchDuty,undefined);
 }
});
test('a willing healthy guard can briefly hold a locally seen tolerable threat, then must leave',()=>{
 const {s,p,o,e}=fixture();p.agenda.duty=.95;p.needs.energy=17;ordersTick(s,ctx);assert.equal(o.stage,'fighting');assert.equal(p.watchDuty.kind,'hold');assert.equal(p.needs.energy,14);const hp=e.hp;s.tick++;ordersTick(s,ctx);assert.equal(o.stage,'returning');assert.equal(e.hp,hp);
});
test('critical wounds or a visibly overwhelming enemy prevent tired duty from forcing a last stand',()=>{
 for(const change of [f=>f.p.health=20,f=>f.e.attack=50]){const f=fixture();f.p.agenda.duty=.99;f.p.needs.energy=20;change(f);const hp=f.e.hp;ordersTick(f.s,ctx);assert.equal(f.o.stage,'returning');assert.equal(f.e.hp,hp);}
});
test('normal free patrol pays only at completion and its work uses real energy; sleep pauses it',()=>{
 const {s,q,source}=fixture();s.society.orders=[];q.area=source.id;q.x=80;q.status='resident';q.agenda.task={kind:'patrol',target:source.id,x:80,remaining:2};q.needs.energy=80;q.needs.hunger=0;q.needs.loneliness=0;q.health=q.maxHealth||100;source.civic.treasury=100;source.civic.safety=50;s.tick=8;
 const money=q.agenda.wealth;peopleTick(s,ctx);assert.ok(Math.abs(q.needs.energy-77.2)<.001);assert.equal(q.agenda.wealth,money);assert.equal(source.civic.safety,50);
 q.needs.energy=20;s.tick=16;peopleTick(s,ctx);assert.equal(q.needs.sleeping,true);assert.equal(q.agenda.task.remaining,1);assert.equal(source.civic.safety,50);
 q.needs.sleeping=false;q.needs.energy=100;s.tick=24;peopleTick(s,ctx);assert.equal(q.agenda.wealth,money+3);assert.ok(source.civic.safety>=52);
});
test('needs OFF keeps old order costs, but never refunds a receipt from a previously paid turn',()=>{
 const {s,p}=fixture();setModule(s,'npc-watch-needs',false);ordersTick(s,ctx);assert.equal(p.needs.energy,100);assert.equal(p.watchDuty,undefined);s.tick++;setModule(s,'npc-watch-needs',true);ordersTick(s,ctx);setModule(s,'npc-watch-needs',false);const raw=serialize(s);ordersTick(s,ctx);assert.equal(serialize(s),raw);
});
