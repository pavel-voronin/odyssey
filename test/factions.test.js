import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route} from '../engine.js';
import {setModule} from '../rules.js';
import {factionPathPlan,factionPathTick,factionDuty} from '../modules/faction-paths.js';
import {opportunity} from '../modules/opportunities.js';
import {repute} from '../modules/common.js';
import {changeFactionRelation} from '../modules/diplomacy.js';
import {advanceCareer,changeProfession} from '../modules/identity.js';
import {launchConvoy,supplyTick} from '../modules/supply.js';
import {caravanPlan,caravanRaid} from '../modules/caravans.js';
import {civicArea} from '../modules/society.js';
import {peopleArea} from '../modules/people.js';
const ctx={log(){},gainXp(){},route,goal(s,kind,area,x,intent,reason,extra){s.hero.goal={kind,area,x,intent,reason,...extra};},die(s){s.hero.alive=false;}};
test('a faction branch grants distinct rights, advances through service and suspends a broken oath',()=>{
  const s=createWorld(1),h=s.hero,a=s.areas.a1;h.area=a.id;a.faction='lantern';h.profession='alchemist';h.reputation.lantern=15;h.alignment=20;s.tick=200;h.inventory.herbs=1;
  assert.ok(factionPathPlan(s,ctx));assert.equal(h.affiliation.paths.lantern.branch,'hospice');assert.ok(opportunity(s,'clinic').allowed);assert.ok(!opportunity(s,'raid').allowed);
  const medicine=a.civic.medicine,treasury=a.civic.treasury;for(let i=0;i<4;i++)factionDuty(s,ctx);
  assert.equal(h.inventory.herbs,0);assert.equal(a.civic.medicine,medicine+10);assert.equal(a.civic.treasury,treasury-2);
  h.reputation.lantern=60;s.tick=240;factionPathTick(s,ctx);assert.equal(h.affiliation.paths.lantern.rank,3);assert.ok(h.affiliation.paths.lantern.office);
  h.alignment=-30;s.tick=264;factionPathTick(s,ctx);assert.ok(!opportunity(s,'clinic').allowed);
  const saved=serialize(s);assert.equal(serialize(restore(saved)),saved);
});
test('service to an enemy affects another faction, while a treaty changes the consequence',()=>{
  const s=createWorld(1);repute(s,'crown',9);assert.equal(s.hero.reputation.tide,-3);
  changeFactionRelation(s,'crown','tide',100,'Окончание войны');repute(s,'crown',9);assert.equal(s.hero.reputation.tide,-1);
  setModule(s,'diplomacy',false);const tide=s.hero.reputation.tide;repute(s,'crown',9);assert.equal(s.hero.reputation.tide,tide);
});
test('switching profession retains separate mastery records and does not reset learned attributes',()=>{
  const s=createWorld(1),h=s.hero,first=h.profession,next=first==='merchant'?'alchemist':'merchant';
  advanceCareer(s,24,ctx);const saved={xp:h.career.xp,rank:h.career.rank},stats=JSON.stringify(h.stats);
  assert.ok(changeProfession(s,next,ctx,'Новая работа'));assert.equal(h.career.rank,1);assert.equal(JSON.stringify(h.stats),stats);advanceCareer(s,4,ctx);
  assert.ok(changeProfession(s,first,ctx,'Возвращение'));assert.equal(h.career.rank,saved.rank);assert.equal(h.career.xp,saved.xp);assert.equal(h.career.records[next].xp,4);
});
function convoy(){
  const s=createWorld(1);setModule(s,'npc-logistics',false);s.hero.area='a1';s.hero.x=42;s.areas.a1.civic.food=80;
  const to=s.areas.a4;to.type='village';civicArea(s,to);peopleArea(s,to);to.civic.food=10;s.logistics.nextDispatch=100000;
  const c=launchConvoy(s,s.areas.a1,to,ctx);return{s,c,to};
}
test('a physical escort must reach and clear the next real segment before the finite cargo advances',()=>{
  const{s,c,to}=convoy();s.hero.profession='soldier';assert.ok(caravanPlan(s,ctx));assert.equal(c.escort,s.hero.lineage);
  c.remaining=1;s.tick++;supplyTick(s,ctx);assert.equal(c.index,0);
  s.hero.area='a2';for(const o of s.areas.a2.objects)if(o.kind==='enemy'){o.alive=false;o.hp=0;}s.tick++;supplyTick(s,ctx);assert.equal(c.index,1);
  c.remaining=1;s.hero.area=to.id;s.tick++;supplyTick(s,ctx);assert.equal(s.logistics.convoys.length,0);assert.equal(to.civic.food,22);
  const treasury=to.civic.treasury,gold=s.hero.gold;caravanPlan(s,ctx);assert.equal(s.hero.gold,gold+8);assert.equal(to.civic.treasury,treasury-8);assert.equal(s.hero.caravanJob,null);
});
test('robbery transfers a real convoy cargo, leaves the recipient hungry and records a persistent loss',()=>{
  const{s,c,to}=convoy(),h=s.hero;h.profession='thief';h.alignment=-30;assert.ok(caravanPlan(s,ctx));assert.equal(h.goal.kind,'caravanRaid');
  const rations=h.inventory.rations;for(let i=0;i<3;i++)caravanRaid(s,ctx);
  assert.equal(h.inventory.rations,rations+3);assert.equal(to.civic.food,10);assert.equal(s.logistics.convoys.length,0);assert.equal(s.logistics.history.at(-1).outcome,'robbed');assert.equal(s.people[c.person].health,75);assert.ok(h.alignment<-30);
});
test('only the primary service grants rights, and disabling its module preserves all branch history',()=>{
  const s=createWorld(1),h=s.hero;h.affiliation.paths={lantern:{rank:2,privileges:['care'],branchName:'Лекари'},tide:{rank:2,privileges:['raid'],branchName:'Корсары'}};h.affiliation.primary='lantern';
  assert.ok(opportunity(s,'clinic').allowed);assert.ok(!opportunity(s,'raid').allowed);h.affiliation.primary='tide';assert.ok(opportunity(s,'raid').allowed);assert.ok(!opportunity(s,'clinic').allowed);
  setModule(s,'faction-paths',false);const saved=serialize(s);assert.ok(!opportunity(s,'raid').allowed);assert.equal(factionPathPlan(s,ctx),false);assert.equal(serialize(s),saved);
});
test('a ready unrelated promise does not restart a three-action robbery or teleport the stopped cargo away',()=>{
  const{s,c}=convoy(),h=s.hero;h.profession='thief';h.alignment=-30;h.inventory.herbs=1;
  h.quests.push({id:'ready',kind:'herbs',source:'a1',target:'a2',required:1,reward:12,status:'active',accepted:0});
  assert.ok(caravanPlan(s,ctx));c.remaining=1;
  step(s);assert.ok(s.logistics.convoys.includes(c));assert.equal(h.goal.remaining,2);
  const loaded=restore(serialize(s));step(loaded);step(loaded);
  assert.equal(loaded.hero.counters.caravanRaids,1);assert.equal(loaded.hero.quests[0].status,'active');assert.equal(loaded.logistics.convoys.length,0);
});
