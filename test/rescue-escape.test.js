import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,restore,serialize} from '../engine.js';import {setModule} from '../rules.js';
import {peopleTick} from '../modules/people.js';import {commonContext as ctx} from '../scripts/common-life-scenarios.mjs';
import {beginRescueEscape,dungeonRescueReady,rescueGuardPass} from '../modules/rescue-escape.js';
function fixture(){
 const s=createWorld(0),h=s.hero;for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['people','npc-control','npc-needs','dungeon-rescue'])setModule(s,id,true);
 const a=s.areas.a2,source=s.areas.a1,p=Object.values(s.people).find(p=>p.alive&&p.area==='a1'&&p.id!==h.lineage&&p.agenda&&p.role!=='ребёнок');
 Object.assign(h,{area:a.id,x:22,goal:null,combat:null,transit:null});h.quests=[];h.companions=[];Object.assign(p,{area:a.id,x:22,status:'captive',health:100});p.needs.energy=100;p.needs.hunger=0;p.agenda.task=null;p.agenda.wealth=7;p.agenda.work=0;
 source.population=source.population.filter(id=>id!==p.id);a.population=[];a.dungeon={root:a.id,floor:1,cleared:false};
 const guard={id:'escape-guard',kind:'enemy',alive:true,resolved:false,x:15,hp:20,maxHp:20,attack:4,rescueGuard:{version:1,room:a.id,cageX:22,agreement:{permits:[h.lineage,p.id]}}},boss={id:'untouched-boss',kind:'enemy',alive:true,resolved:false,x:71,hp:120,maxHp:120,attack:25,boss:true},cage={id:'actual-cage',kind:'captive',person:p.id,name:p.name,x:22,resolved:false};a.objects=[guard,boss,cage];
 const q={id:'escape-quest',kind:'rescue',status:'active',target:a.id,source:source.id,person:p.id,object:cage.id,reward:0,dungeonRescue:{version:1,guard:guard.id,stage:'captive'}};h.quests.push(q);return {s,h,a,source,p,q,guard,boss,cage};
}
test('unlocking begins a real NPC task, never teleports the person or immediately satisfies the rescue',()=>{
 const f=fixture(),{s,p,q,cage}=f;assert.ok(beginRescueEscape(s,p,q));assert.equal(p.area,'a2');assert.equal(p.x,22);assert.equal(p.status,'wandering');assert.equal(p.agenda.task.kind,'rescueEscape');assert.ok(cage.resolved);assert.equal(q.dungeonRescue.stage,'escorting');assert.equal(dungeonRescueReady(s,q),false);const raw=serialize(s);assert.equal(beginRescueEscape(s,p,q),false);assert.equal(serialize(s),raw);
});
test('the same person walks out under the personal eight-tick controller, leaves the boss alive and earns no parallel salary',()=>{
 const f=fixture();assert.ok(beginRescueEscape(f.s,f.p,f.q));const id=f.p.id,wallet=f.p.agenda.wealth;f.h.area=f.source.id;f.h.x=42;f.s.tick=8;peopleTick(f.s,ctx);assert.equal(f.p.x,16);assert.equal(f.p.area,f.a.id);assert.equal(dungeonRescueReady(f.s,f.q),false);
 for(let t=16;t<=200&&f.p.rescueFlight.status!=='arrived';t+=8){f.s.tick=t;peopleTick(f.s,ctx);}assert.equal(f.p.rescueFlight.status,'arrived');assert.equal(f.p.area,f.source.id);assert.ok(Math.abs(f.p.x-42)<=1);assert.equal(f.p.id,id);assert.equal(f.p.agenda.wealth,wallet);assert.equal(f.p.agenda.work,0);assert.ok(f.p.needs.energy<100);assert.ok(f.p.needs.hunger>0);assert.ok(dungeonRescueReady(f.s,f.q));assert.ok(f.boss.alive);assert.equal(f.a.dungeon.cleared,false);assert.equal(f.h.companions.length,0);
});
test('unpaid live guard, distant or dead rescuer/prisoner, transit and a noncanonical quest cannot unlock remotely',()=>{
 for(const mode of ['unpaid','far','deadHero','deadPrisoner','transit','shadow']){const f=fixture();if(mode==='unpaid')f.guard.rescueGuard.agreement=null;if(mode==='far')f.h.x=90;if(mode==='deadHero')f.h.alive=false;if(mode==='deadPrisoner')f.p.alive=false;if(mode==='transit')f.h.transit={from:'a1',to:'a2'};const q=mode==='shadow'?structuredClone(f.q):f.q;if(mode==='shadow')f.h.quests=[];assert.equal(beginRescueEscape(f.s,f.p,q),false,mode);assert.equal(f.p.status,'captive');assert.equal(f.p.rescueFlight,undefined);assert.equal(f.cage.resolved,false);}
});
test('a paid passage belongs to the actual parties and cage corridor, not everyone or the entire treasure room',()=>{
 const f=fixture();assert.ok(rescueGuardPass(f.s,f.guard,f.h.lineage,22));assert.ok(rescueGuardPass(f.s,f.guard,f.p.id,0));assert.equal(rescueGuardPass(f.s,f.guard,'another-person',22),false);assert.equal(rescueGuardPass(f.s,f.guard,f.h.lineage,84),false);
});
test('a real new obstacle stops the escape and remains known without moving, paying or granting a remote success',()=>{
 const f=fixture();beginRescueEscape(f.s,f.p,f.q);f.a.objects.push({id:'actual-new-blocker',kind:'enemy',alive:true,x:5,hp:90,attack:8});f.s.tick=8;peopleTick(f.s,ctx);assert.equal(f.p.x,22);assert.equal(f.p.rescueFlight.blocked.enemy,'actual-new-blocker');assert.equal(f.p.rescueFlight.status,'walking');assert.equal(f.p.agenda.wealth,7);assert.equal(dungeonRescueReady(f.s,f.q),false);
});
test('partial physical escape reloads exactly and a missing exit cannot teleport through an invented route',()=>{
 const f=fixture();beginRescueEscape(f.s,f.p,f.q);f.s.tick=8;peopleTick(f.s,ctx);const raw=serialize(f.s),copy=restore(raw);assert.equal(serialize(copy),raw);for(let t=16;t<=64;t+=8){f.s.tick=t;copy.tick=t;peopleTick(f.s,ctx);peopleTick(copy,ctx);assert.equal(serialize(copy),serialize(f.s));}
 const b=fixture();beginRescueEscape(b.s,b.p,b.q);b.a.links=b.a.links.filter(id=>id!==b.source.id);b.s.tick=8;peopleTick(b.s,ctx);assert.equal(b.p.area,b.a.id);assert.equal(b.p.x,22);assert.equal(b.p.rescueFlight.blocked.kind,'exit');assert.equal(dungeonRescueReady(b.s,b.q),false);
});
