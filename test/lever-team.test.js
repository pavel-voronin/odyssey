import test from 'node:test';
import assert from 'node:assert/strict';
import {createArea,connectAreas,route,knownRoute,step,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {partyCombatFixture} from '../scripts/party-combat-scenarios.mjs';
import {createGrate,operateGrate,blockedGratePlan} from '../modules/mechanisms.js';
import {beginLeverHold,teamLeverPlan,leverHoldAction,leverTeamTick} from '../modules/lever-team.js';
import {npcAction,npcController} from '../modules/npc-control.js';
import {partyBodySpent} from '../modules/party-combat-policy.js';
import {localContact} from '../modules/npc-contacts.js';
import {recordAreaVisit,observeLocalRoutes} from '../actor-atlas.js';
function fixture(){
 const f=partyCombatFixture({roles:['guard']}),{s,h,members}=f,{person:p,companion:c}=members[0];
 for(const m of MODULES)setModule(s,m.id,['mechanisms','companions','people','npc-control','npc-needs','travel'].includes(m.id));
 h.hp=h.maxHp;h.combat=null;h.energy=100;h.hunger=0;h.personality.curiosity=.9;h.memory.people.push(p.id);h.goal=null;h.relations[p.id]={trust:20,met:s.tick,lastSeen:s.tick,helped:0};
 const from=h.area,bypass='a1',to=createArea(s,'dungeon','Зал за решёткой',2);
 connectAreas(s,from,to,{mode:'stairs',duration:2});connectAreas(s,to,bypass,{mode:'stairs',duration:2});connectAreas(s,from,bypass,{mode:'stairs',duration:2});
 const g=createGrate(s,from,to,bypass,{hold:true}),key=[from,to].sort().join('|');h.x=g.lever.x;p.x=h.x-4;
 for(const id of [from,to,bypass]){recordAreaVisit(s,id);for(const o of s.areas[id].objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}}
 observeLocalRoutes(s);h.atlas.roads=[...new Set([...h.atlas.roads,...[[from,to],[from,bypass],[to,bypass]].map(pair=>pair.sort().join('|'))])];
 const ctx={...f.ctx,goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
 const tick=()=>{s.tick++;leverTeamTick(s,ctx);};return {...f,p,c,g,key,from,to,bypass,ctx,tick};
}
test('a known willing companion actually stays at one lever, spending one bodily action; restore retains the assignment exactly',()=>{
 const {s,h,p,c,g,key,from,to,ctx,tick}=fixture(),count=Object.keys(s.people).length,energy=p.needs.energy;
 h.goal={kind:'explore',area:to,x:5};assert.equal(teamLeverPlan(s,to,ctx),true);assert.equal(h.goal.helper,p.id);leverHoldAction(s,ctx);
 assert.equal(g.state,'open');assert.equal(g.holding.person,p.id);assert.equal(p.area,from);assert.equal(p.x,g.lever.x);assert.equal(h.companions.includes(c),false);assert.equal(p.mechanismDuty.member.person,p.id);assert.equal(npcController(s,p),'mechanism');assert.equal(partyBodySpent(s,p),true);assert.equal(npcAction(s,p,'party','combat'),false);assert.equal(p.needs.energy,energy-2);assert.equal(Object.keys(s.people).length,count);assert.equal(serialize(restore(serialize(s))),serialize(s));
 const raw=serialize(s);leverTeamTick(s,ctx);assert.equal(serialize(s),raw);tick();assert.equal(p.needs.energy,energy-2.5);h.area=to;assert.equal(localContact(s,p.id,from).x,g.lever.x);assert.equal(localContact(s,p.id,to),null);assert.equal(s.areas[from].objects.filter(o=>o.kind==='resident'&&o.person===p.id).length,1);
});
test('a solo or incomplete/refusing/tired/unknown/distant/urgent party cannot activate the holding door',()=>{
 for(const reason of ['absent','refuse','tired','unknown','distant','urgent','busy']){
  const {s,h,p,c,g,key,ctx}=fixture();if(reason==='absent')h.companions=[];if(reason==='refuse')c.loyalty=10;if(reason==='tired')p.needs.energy=20;if(reason==='unknown')h.memory.people=h.memory.people.filter(id=>id!==p.id);if(reason==='distant')h.x=0;if(reason==='urgent')p.personalJourney={status:'active',due:s.tick+1};if(reason==='busy')p.pairPractice={lastActionTick:s.tick};const energy=p.needs.energy,count=Object.keys(s.people).length;
  assert.equal(beginLeverHold(s,key,p.id,ctx),false,reason);assert.equal(g.state,'closed');assert.equal(p.needs.energy,energy);assert.equal(g.holding.person,null);assert.equal(Object.keys(s.people).length,count);
  if(reason==='urgent'){assert.equal(teamLeverPlan(s,g.to,ctx),false);blockedGratePlan(s,g.to,ctx);assert.deepEqual(knownRoute(s,g.from,g.to),[g.from,g.bypass,g.to]);}
 }
 const {s,h,key,g}=fixture();assert.equal(operateGrate(s,s.people[h.lineage],key,'open'),false);assert.equal(g.state,'closed');
});
test('danger or lost consent releases the real holder without removing the entrant; the bypass remains traversable',()=>{
 for(const reason of ['danger','separation']){
  const {s,h,p,g,key,from,to,bypass,ctx,tick,e}=fixture();assert.equal(beginLeverHold(s,key,p.id,ctx),true);h.area=to;h.x=5;
  if(reason==='danger'){e.alive=true;e.resolved=false;e.x=g.lever.x;}else h.relations[p.id].trust=-30;
  tick();assert.equal(g.state,'closed');assert.equal(g.holding.person,null);assert.equal(h.area,to);assert.deepEqual(route(s,to,from),[to,bypass,from]);assert.equal(p.area,from);assert.notEqual(p.status,'withHero');assert.equal(serialize(restore(serialize(s))),serialize(s));
 }
});
test('a passed hero is joined only after the same person walks the real bypass with elapsed time and accumulated needs',()=>{
 const {s,h,p,g,key,from,to,ctx,tick}=fixture();beginLeverHold(s,key,p.id,ctx);const energy=p.needs.energy,hunger=p.needs.hunger;h.area=to;h.x=5;
 tick();assert.equal(g.state,'closed');assert.equal(p.mechanismDuty.stage,'returning');assert.equal(p.area,from);let ticks=1;
 while(p.mechanismDuty.stage==='returning'&&ticks++<80)tick();assert.ok(ticks<=80);assert.equal(p.mechanismDuty.stage,'joined');assert.equal(p.area,to);assert.equal(h.companions.filter(c=>c.person===p.id).length,1);assert.ok(p.needs.energy<energy);assert.ok(p.needs.hunger>hunger);assert.equal(s.areas[to].objects.filter(o=>o.kind==='resident'&&o.person===p.id).length,0);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a short actual engine crossing keeps the holder behind during transit; exact replay and OFF release preserve facts',()=>{
 let {s,h,p,g,key,to,ctx}=fixture();h.goal={kind:'explore',area:to,x:5};teamLeverPlan(s,to,ctx);leverHoldAction(s,ctx);const id=p.id;
 const loaded=restore(serialize(s));for(let i=0;i<8;i++){step(s);step(loaded);}assert.equal(serialize(s),serialize(loaded));assert.equal(h.area,to);assert.equal(g.state,'closed');assert.equal(p.mechanismDuty.stage,'returning');
 const off=restore(serialize(s));setModule(off,'companions',false);const before=off.people[id].needs.energy;step(off);assert.equal(off.people[id].mechanismDuty.stage,'left');assert.equal(off.people[id].needs.energy,before);assert.equal(off.edges[key].mechanism.state,'closed');assert.equal(serialize(restore(serialize(off))),serialize(off));
});
