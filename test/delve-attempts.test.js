import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {delveRecord,startDelve,pauseDelve,contactDelve,finishDelve,reentryReason,reconsiderDelve,delvePassage,prepareDelveEntry,delveEntryReason} from '../modules/delve-attempts.js';
import {delvePlan} from '../modules/delves.js';
import {areaAvoided} from '../modules/route-memory.js';
import {combatFixture} from '../scripts/combat-judgment-scenarios.mjs';
function startUntracked(s,d){setModule(s,'delve-attempts',false);startDelve(s,d,'curiosity');setModule(s,'delve-attempts',true);}
function fixture({middle=false}={}){
 const s=createWorld(43),h=s.hero,a=s.areas[h.area];s.tick=200;h.born=0;h.hp=h.maxHp;h.energy=95;h.personality.courage=.2;h.personality.curiosity=.4;h.personality.generosity=.3;h.memory.rejected={};
 const e={id:'controlled-dungeon-guard',kind:'enemy',name:'Страж проверки',hp:100,maxHp:100,attack:30,alive:true,x:35};a.dungeon={root:middle?Object.keys(s.areas).find(id=>id!==a.id):a.id,floor:1,cleared:false};a.objects=[e];
 h.delve={root:a.id,room:a.id,started:159,floors:3,cleared:0};startUntracked(s,h.delve);return {s,h,a,e};
}
const ctx={log:()=>{},expeditionReady:()=>true};
test('a new optional expedition requires personal interest, an unfulfilled purpose or an actual related promise; urgent other rescue may take priority',()=>{
 const {s,h,a}=fixture();h.personality.courage=.5;h.personality.curiosity=.1;h.destiny.completed=true;
 assert.equal(delveEntryReason(s,a),null);h.personality.curiosity=.7;assert.equal(delveEntryReason(s,a),'curiosity');
 h.personality.curiosity=.1;h.destiny={id:'hoard',completed:false};h.gold=10;assert.equal(delveEntryReason(s,a),'hoard');h.gold=100;assert.equal(delveEntryReason(s,a),null);
 h.destiny={id:'relics',completed:false};h.personality.curiosity=.3;assert.equal(delveEntryReason(s,a),'relics');h.destiny.completed=true;
 h.quests.push({id:'real-promise',kind:'rescue',status:'active',target:a.id,deadline:s.tick+30});assert.equal(delveEntryReason(s,a),'promise:rescue');h.quests[0].target='some-other-known-place';h.personality.curiosity=.8;h.personality.generosity=.9;assert.equal(delveEntryReason(s,a),null);
});
test('ordinary navigation without a dungeon attempt has no special passage and no exception',()=>{
 const s=createWorld(0);assert.equal(delvePassage(s,s.hero.area),false);assert.equal(typeof areaAvoided(s,s.hero.area),'boolean');step(s);assert.equal(s.tick,1);
});
test('the actual blocked-flee action remains a contact; actual successful escape pauses the same expedition',()=>{
 for(const blocked of [true,false]){const {s,h,enemy}=combatFixture({hp:8,attack:44,potions:1,mana:20,spells:['borrow'],blocked});setModule(s,'delves',true);setModule(s,'delve-attempts',true);const a=s.areas[h.area];a.dungeon={root:a.id,floor:1};h.delve={root:a.id,room:a.id,started:s.tick,floors:3,cleared:0};startUntracked(s,h.delve);const r=delveRecord(s),id=r.id;step(s);assert.equal(h.delve.attemptId,id);assert.equal(r.contacts,1);assert.equal(r.actions,1);assert.equal(r.status,blocked?'active':'paused');assert.equal(r.resumes,0);assert.equal(h.delveMemory.starts,0);if(blocked)assert.equal(h.combatJudgment.last.retreatBlocked,true);else assert.equal(r.last.outcome,'escaped');}
});
test('a real fatal response ends the attempt once while later world ticks never start a successor or body contact',()=>{
 const {s,h}=combatFixture({hp:8,attack:44,potions:0,mana:0,spells:[],blocked:true});setModule(s,'delves',true);setModule(s,'delve-attempts',true);const a=s.areas[h.area];a.dungeon={root:a.id,floor:1};h.delve={root:a.id,room:a.id,started:s.tick,floors:3,cleared:0};startUntracked(s,h.delve);const r=delveRecord(s),person=h.lineage;step(s);assert.equal(h.alive,false);assert.equal(r.status,'ended');assert.equal(r.outcome,'death');const actions=r.actions,tick=s.tick;step(s);assert.equal(s.tick,tick+1);assert.equal(s.hero.lineage,person);assert.equal(r.actions,actions);
});
test('enabling notes on an actual current OFF start records one incomplete attempt without inventing earlier contacts',()=>{
 const {s,h}=fixture(),r=delveRecord(s),id=h.delve.attemptId;
 assert.equal(r.started,159);assert.equal(r.incomplete,true);assert.equal(h.delveMemory.starts,0);assert.equal(h.delveMemory.adoptions,1);assert.equal(r.contacts,0);
 s.tick=402;h.goal={kind:'hunt',started:402,delve:true};delveRecord(s);s.tick=420;h.goal={kind:'hunt',started:420,delve:true};delveRecord(s);
 assert.equal(h.delve.attemptId,id);assert.equal(r.contacts,0);assert.equal(r.started,159);
});
test('actual combat actions and a blocked retreat retain one contact; successful retreat closes it but not its attempt',()=>{
 const {s,h,e}=fixture();contactDelve(s,e);const id=h.delve.attemptId,r=delveRecord(s),contact=r.contact.id;
 contactDelve(s,e);assert.equal(r.actions,1);s.tick++;contactDelve(s,e);assert.equal(r.contacts,1);assert.equal(r.contact.id,contact);assert.equal(r.actions,2);
 pauseDelve(s,e,'escaped');assert.equal(r.status,'paused');assert.equal(r.contact,null);assert.equal(h.delve.attemptId,id);assert.equal(h.delveMemory.starts,0);
 s.tick+=600;assert.equal(reconsiderDelve(s,ctx),false);assert.equal(r.status,'paused');
});
test('timers and repeated rejected goals do not create a meaningful reason to return',()=>{
 const {s,h,e}=fixture();pauseDelve(s,e);s.tick+=5000;h.goal=null;assert.equal(reentryReason(s,delveRecord(s)),null);assert.equal(reconsiderDelve(s,ctx),false);assert.equal(h.delveMemory.resumes,0);
});
test('cosmetic replacement and a shorter remaining ailment timer are not new capacity',()=>{
 const {s,h,e}=fixture();h.conditions=[{id:'poison',since:100,until:1000}];h.equipment.weapon={id:'old-knife',stat:'attack',power:2};pauseDelve(s,e);h.equipment.weapon={id:'new-knife-same-capacity',stat:'attack',power:2};s.tick+=50;assert.equal(reentryReason(s,delveRecord(s)),null);
});
test('losing a blessing or inspiration is not recovering from an ailment',()=>{
 for(const id of ['blessing','inspiration']){const {s,h,e}=fixture();h.conditions=[{id,since:100,until:1000}];pauseDelve(s,e);h.conditions=[];assert.equal(reentryReason(s,delveRecord(s)),null);}
});
test('place memory stays bounded with monotonic IDs, without granting experience, gold or items',()=>{
 const {s,h,a}=fixture(),gold=h.gold,xp=h.xp,items=JSON.stringify(h.inventory);let serial=0;
 for(let i=0;i<40;i++){const id=`controlled-root-${i}`;s.areas[id]={...a,id,dungeon:{root:id,floor:1}};h.delve={root:id,room:id,started:s.tick,floors:3,cleared:0};startDelve(s,h.delve,'curiosity');assert.ok(h.delveMemory.serial>serial);serial=h.delveMemory.serial;finishDelve(s,'left');s.tick++;}
 assert.equal(Object.keys(h.delveMemory.places).length,24);assert.equal(h.delveMemory.starts,40);assert.equal(h.gold,gold);assert.equal(h.xp,xp);assert.equal(JSON.stringify(h.inventory),items);
});
test('healing, cure, actual equipment, remedy, method, ready companion or a new relevant promise each permit reconsideration',()=>{
 const changes=[['recovered',f=>{f.h.hp-=20;},f=>{f.h.hp+=20;}],['rested',f=>{f.h.energy=65;},f=>{f.h.energy=95;}],['condition-ended',f=>{f.h.conditions=[{id:'poison',until:500}];},f=>{f.h.conditions=[];}],['better-equipment',()=>{},f=>{f.h.weapon++;}],['remedy',()=>{},f=>{f.h.inventory.potions++;}],['known-method',()=>{},f=>{f.h.magic.spells.push('controlled-known-method');}],['companion',()=>{},f=>{f.h.companions.push({id:'controlled-helper',hp:10,attack:2});}],['new-promise',()=>{},f=>{f.h.quests.push({id:'controlled-promise',kind:'rescue',status:'active',target:f.a.id});}]];
 for(const [reason,before,after]of changes){const f=fixture();before(f);pauseDelve(f.s,f.e);after(f);assert.equal(reentryReason(f.s,delveRecord(f.s)),reason);assert.ok(reconsiderDelve(f.s,ctx));assert.equal(delveRecord(f.s).reason,reason);assert.equal(f.h.delveMemory.starts,0);assert.equal(f.h.delveMemory.resumes,1);}
});
test('remote actual enemy damage is unknown; only a later personal sighting or local clearance is a reason',()=>{
 const {s,h,a,e}=fixture();pauseDelve(s,e);const r=delveRecord(s);h.area=Object.keys(s.areas).find(id=>id!==a.id);e.hp=20;s.tick++;
 assert.equal(reentryReason(s,r),null);h.memory.rejected[a.id]={enemy:e.id,hp:20,seen:s.tick};assert.equal(reentryReason(s,r),'observed-progress');delete h.memory.rejected[a.id];e.alive=false;assert.equal(reentryReason(s,r),null);h.area=a.id;assert.equal(reentryReason(s,r),'observed-clearance');
});
test('a deliberate risk is specific, once per capacity and purpose; a second timer is not a second consent',()=>{
 const {s,h,a,e}=fixture();h.personality.courage=.9;h.personality.curiosity=.9;pauseDelve(s,e);const r=delveRecord(s);
 assert.equal(reentryReason(s,r),'accepted-risk');assert.ok(reconsiderDelve(s,ctx));assert.ok(delvePassage(s,a.id,e.id));assert.equal(delvePassage(s,a.id,'other-enemy'),false);
 h.memory.rejected[a.id]={enemy:e.id,hp:100,attack:100,seen:s.tick};assert.equal(areaAvoided(s,a.id),false);
 s.tick++;pauseDelve(s,e);s.tick+=600;assert.equal(reentryReason(s,r),null);assert.equal(areaAvoided(s,a.id),true);
});
test('an insufficient expedition budget does not spend consent, resume, create a reward or fabricate recovery',()=>{
 const {s,h,e}=fixture();h.personality.courage=.9;h.personality.curiosity=.9;pauseDelve(s,e);const r=delveRecord(s),gold=h.gold,hp=h.hp;
 assert.equal(reconsiderDelve(s,{...ctx,expeditionReady:()=>false}),false);assert.equal(r.status,'paused');assert.equal(r.acceptedRisk,undefined);assert.equal(h.delveMemory.resumes,0);assert.equal(h.gold,gold);assert.equal(h.hp,hp);
 assert.ok(reconsiderDelve(s,ctx));
});
test('a justified later expedition can estimate its known passage without committing a fake attempt or erasing the former outcome',()=>{
 const {s,h,a,e}=fixture();h.hp-=20;pauseDelve(s,e);const r=delveRecord(s);finishDelve(s,'left');h.delve=null;h.hp=h.maxHp;h.memory.rejected[a.id]={enemy:e.id,hp:100,attack:100,seen:s.tick};const saved=serialize(s);
 assert.equal(areaAvoided(s,a.id),true);assert.equal(reentryReason(s,r),'recovered');
 const result=prepareDelveEntry(s,a,r,{expeditionReady:(world)=>!areaAvoided(world,a.id)});assert.deepEqual(result,{ready:true,preparing:false});assert.equal(serialize(s),saved);
 assert.throws(()=>prepareDelveEntry(s,a,r,{expeditionReady:()=>{throw new Error('budget rejected');}}));assert.equal(serialize(s),saved);
});
test('reload preserves one paused attempt and the accepted-risk barrier, while a new observer owns no borrowed attempt',()=>{
 const {s,h,e}=fixture();h.personality.courage=.9;h.personality.curiosity=.9;pauseDelve(s,e);reconsiderDelve(s,ctx);s.tick++;pauseDelve(s,e);
 const copy=restore(serialize(s));assert.equal(serialize(copy),serialize(s));assert.equal(reentryReason(copy,delveRecord(copy)),null);const id=h.delve.attemptId;createNextStory(copy,{allowLiving:true});assert.equal(copy.hero.delveMemory,undefined);assert.equal(s.hero.delve.attemptId,id);
});
test('disabled attempt policy leaves physical delve and memory untouched and exposes no risk passage',()=>{
 const {s,h,e}=fixture();pauseDelve(s,e);setModule(s,'delve-attempts',false);const saved=serialize(s);contactDelve(s,e);pauseDelve(s,e);finishDelve(s,'test');assert.equal(delveRecord(s),null);assert.equal(delvePassage(s,h.area,e.id),false);assert.equal(serialize(s),saved);
});
test('an unchanged cleared room cannot reward duplicate consideration; changing hall retains the same attempt',()=>{
 const {s,h,a}=fixture();a.dungeon.cleared=true;a.objects=[];const b=s.areas[Object.keys(s.areas).find(id=>id!==a.id)];b.dungeon={root:a.id,floor:2,cleared:false};b.objects=[{id:'second-guard',kind:'enemy',name:'Другой страж',hp:20,alive:true,x:40}];a.dungeon.next=b.id;
 const r=delveRecord(s),id=r.id,gold=h.gold;let rewards=0;const planner={...ctx,goal:(s,kind,area,x,intent,reason,extra)=>{s.hero.goal={kind,area,x,...extra};},gainXp:()=>{rewards++;}};
 delvePlan(s,planner);delvePlan(s,planner);assert.equal(h.delve.attemptId,id);assert.equal(h.delve.room,b.id);assert.equal(h.goal.attemptId,id);assert.equal(h.gold,gold);assert.equal(rewards,0);
});
test('an OFF-started middle hall retains the root known at entry after tracking is enabled',()=>{
 const {s,h,a}=fixture({middle:true}),root=a.dungeon.root,b=s.areas[root];a.dungeon={root,floor:1,cleared:true,next:b.id};a.objects=[];b.dungeon={root:a.id,floor:2,cleared:false};b.objects=[{id:'legacy-later-guard',kind:'enemy',name:'Страж',alive:true,hp:20,x:40}];const r=delveRecord(s),id=r.id;
 delvePlan(s,{...ctx,goal:(world,kind,area,x,intent,reason,extra)=>{world.hero.goal={kind,area,x,...extra};}});
 assert.equal(h.delve.room,b.id);assert.equal(h.delve.attemptId,id);assert.equal(h.delve.attemptRoot,root);assert.equal(delveRecord(s).id,id);assert.equal(h.delveMemory.adoptions,1);assert.equal(Object.keys(h.delveMemory.places).length,1);
});
