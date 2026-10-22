import {enemyPersonFixture} from '../scripts/enemy-person-scenarios.mjs';
import {ensureNutrition} from '../modules/nutrition-state.js';
import {step,serialize,restore} from '../engine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {npcDeedFixture,npcDeedContext} from '../scripts/npc-deed-scenarios.mjs';
import {npcDeedsTick} from '../modules/npc-deeds.js';
import {currencyFixture} from '../scripts/currency-scenarios.mjs';
import {exchangeCurrency,observeCurrencyOffice} from '../modules/currency-actions.js';
import {coinBalance} from '../modules/currency-state.js';
import {npcAction} from '../modules/npc-control.js';
import {setActorMoney} from '../actor-projection.js';
import {ruinsFixture,emptyDays} from '../scripts/building-ruins-scenarios.mjs';
import {hobbyFixture} from '../scripts/hobby-scenarios.mjs';
import {rawSite} from '../modules/goods.js';
import {hobbyAction} from '../modules/hobby-supply.js';
// Four isolated actions that failed in the actual full prehistory. No simulated years here.
const unobserve=s=>{s.hero=null;s.observation=null;s.actorStates={};};
test('unobserved worker retains the actual family plan and personal explanation',()=>{
 const {s,p}=npcDeedFixture();unobserve(s);let logs=0;
 npcDeedsTick(s,p,{...npcDeedContext,log(){logs++;}});
 assert.equal(p.npcIntentions.current.domain,'family');assert.equal(p.agenda.task.kind,'familyAid');
 assert.ok(p.agenda.knowledge.length);assert.equal(logs,0);assert.equal(s.hero,null);
});
test('unobserved exchange moves finite gold and coins and records both personal accounts',()=>{
 const f=currencyFixture(),{s,m,o,a}=f,p=Object.values(s.people).find(q=>q.id!==m.id&&q.id!==f.p.id&&q.alive&&q.agenda&&q.role!=='ребёнок');
 unobserve(s);Object.assign(p,{area:a.id,x:o.x,status:'resident',health:100,ailment:null});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});p.agenda.task=null;setActorMoney(s,p,30);s.tick=8;observeCurrencyOffice(s,p);
 assert.equal(npcAction(s,p,'personal'),true);const stock=coinBalance(s,m),money=m.agenda.wealth;let logs=0;
 const r=exchangeCurrency(s,p,'buy',2,{inTurn:true,ctx:{log(){logs++;}}});assert.ok(r);
 assert.equal(coinBalance(s,p),2);assert.equal(coinBalance(s,m),stock-2);assert.equal(m.agenda.wealth,money+r.gold);
 assert.match(p.agenda.knowledge.at(-1).text,/получает/);assert.match(m.agenda.knowledge.at(-1).text,/получает/);assert.equal(logs,0);
});
test('unobserved daily neglect still damages the same roof and walls',()=>{
 const f=ruinsFixture();unobserve(f.s);emptyDays(f,24);assert.equal(f.profile.structure.roof,0);assert.equal(f.profile.structure.walls,1);assert.equal(f.o.state,'burned');
});
test('unobserved artisan spends actual raw material and finishes three real sheets',()=>{
 const f=hobbyFixture(),{s,paper:p}=f,a=Object.values(s.areas).find(a=>a.type==='forest'&&a.forage?.localFood);unobserve(s);
 // Declared current spring and arrived artisan; survey/travel are outside this logging regression.
 a.refugeSite={id:a.id+'/refuge-site',x:a.forage.x,water:{kind:'spring'}};p.area=a.id;p.x=a.refugeSite.x;rawSite(s,a);p.agenda.job='artisan';p.agenda.task=null;p.needs.energy=100;p.needs.hunger=0;s.tick=Math.floor(s.tick/8+1)*8;
 assert.equal(npcAction(s,p,'personal'),true);const raw=a.goodsRaw.remaining;let logs=0,ctx={log(){logs++;}};
 assert.equal(hobbyAction(s,p,{kind:'hobbyPaperStart'},{inTurn:true,ctx}),true);assert.equal(a.goodsRaw.remaining,raw-1);
 s.tick+=8;assert.equal(npcAction(s,p,'personal'),true);assert.equal(hobbyAction(s,p,{kind:'hobbyPaperWork'},{inTurn:true,ctx}),true);
 assert.equal(p.hobbyPaperWork.quantity,3);assert.equal(p.hobbyStock.paper.made,3);assert.match(p.agenda.knowledge.at(-1).text,/три настоящих листа/);assert.equal(logs,0);
});

test('one native upkeep death stops the same hostile plan before its own phase and the observed save restores exactly',()=>{
 const {s,p,enemy}=enemyPersonFixture({life:true}),q=p.hostileLife;const balance=ensureNutrition(s,p);balance.balance=-3;balance.spent=5;balance.starvationTicks=8;p.health=enemy.hp=p.maxHealth/160;p.needs.hunger=100;s.tick=7;
 const history=JSON.stringify(q.history),camp=JSON.stringify(q.camp),supplies=JSON.stringify(q.supplies);step(s);
 assert.equal(p.alive,false);assert.equal(p.enemyBody.stage,'dead');assert.equal(q.stage,'dead');assert.equal(q.action,'dead');assert.equal(q.goal,null);
 assert.equal(JSON.stringify(q.history),history);assert.equal(JSON.stringify(q.camp),camp);assert.equal(JSON.stringify(q.supplies),supplies);
 const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);
});
