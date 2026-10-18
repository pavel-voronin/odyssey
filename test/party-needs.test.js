import {recordAreaVisit} from '../actor-atlas.js';
import {foodPrice} from '../modules/prices.js';import {marketNeed} from '../modules/market.js';
import {combatAttack} from '../modules/combat.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route} from '../engine.js';import {setModule} from '../rules.js';
import {recruitPerson,partyRest} from '../modules/social.js';import {partyTick} from '../modules/party.js';
import {partyCare,partyDemand,partyRestReady,partyPrepared,partyAvailable} from '../modules/party-needs.js';
import {eat,buyFood} from '../modules/supply.js';import {preparePlan} from '../modules/preparation.js';
const logs=[];const ctx={route,knownRoute:route,log:(s,text)=>logs.push(text),closest:s=>s.areas.a1,goal:(s,kind,area,x,intent,reason,extra={})=>s.hero.goal={kind,area,x,intent,reason,started:s.tick,...extra}};
function setup(count=1,seed=4){const s=createWorld(seed),h=s.hero;h.area='a1';recordAreaVisit(s,'a1');h.x=68;h.companions=[];h.combat=null;h.transit=null;logs.length=0;
 const people=Object.values(s.people).filter(p=>p.area==='a1'&&p.alive&&p.role!=='ребёнок'&&p.id!==h.lineage);
 assert.ok(people.length>=count);for(const p of people.slice(0,count)){p.health=p.maxHealth||100;p.status='resident';assert.ok(recruitPerson(s,p.id,ctx,true));delete p.personalJourney;p.needs.hunger=70;p.needs.energy=80;p.roadSupplies={food:0,medicine:0};}
 return {s,h,c:h.companions[0],p:s.people[h.companions[0].person],town:s.areas.a1};}

test('one real four-unit meal feeds a hero and three people without creating or repeatedly spending food',()=>{
 const {s,h,town}=setup(3,0);h.inventory.rations=1;h.hunger=80;const stock=town.civic.food;eat(s,ctx);assert.equal(h.inventory.rations,0);assert.equal(town.civic.food,stock);assert.equal(h.hunger,15);for(const c of h.companions){assert.equal(s.people[c.person].needs.hunger,22);assert.equal(s.people[c.person].needs.meals,1);}eat(s,ctx);for(const c of h.companions)assert.equal(s.people[c.person].needs.meals,1);
 const reserve=marketNeed(town,'food').reserve;town.civic.food=reserve+4;h.x=42;h.gold=foodPrice(s);for(const c of h.companions)s.people[c.person].needs.hunger=70;assert.ok(buyFood(s,ctx));assert.equal(town.civic.food,reserve);for(const c of h.companions)assert.equal(s.people[c.person].needs.hunger,22);buyFood(s,ctx);assert.equal(town.civic.food,reserve);
});
test('party upkeep cannot borrow food or medicine from the town below the party, and respects saved duplicate protection',()=>{
 let {s,p}=setup();const food=s.areas.a1.civic.food,med=s.areas.a1.civic.medicine;p.health=30;s.tick=8;partyTick(s,ctx);assert.equal(s.areas.a1.civic.food,food);assert.equal(s.areas.a1.civic.medicine,med);assert.equal(p.needs.hunger,70.4);assert.equal(p.health,30);const save=serialize(s);partyTick(s,ctx);assert.equal(serialize(s),save);s=restore(save);partyTick(s,ctx);assert.equal(serialize(s),save);
 setModule(s,'npc-control',false);const again=serialize(s);partyCare(s,s.hero.companions[0],ctx);assert.equal(serialize(s),again);
});
test('owned care consumes only finite personal supplies and updates the companion health projection',()=>{
 const {s,p,c}=setup();p.health=30;p.roadSupplies={food:1,medicine:2};s.tick=8;partyTick(s,ctx);assert.equal(p.health,55);assert.equal(p.roadSupplies.medicine,0);assert.equal(p.roadSupplies.food,1);assert.equal(c.hp,Math.ceil(c.maxHp*55/(p.maxHealth||100)));s.tick=16;partyTick(s,ctx);assert.equal(p.roadSupplies.food,0);assert.ok(p.needs.hunger<24);s.tick=24;partyTick(s,ctx);assert.equal(p.roadSupplies.food,0);assert.equal(p.health,55);
});
test('a voyage shares one carried ration, not the departure town stock, and sleep can recover during passage',()=>{
 const {s,h,p}=setup(3);h.transit={from:'a1',to:'a2',mode:'sea',remaining:100,total:100};h.inventory.rations=1;h.hunger=80;const food=s.areas.a1.civic.food;p.needs.energy=10;s.tick=8;partyTick(s,ctx);assert.equal(h.inventory.rations,0);assert.equal(h.hunger,15);assert.equal(s.areas.a1.civic.food,food);assert.ok(p.needs.sleeping);assert.ok(p.needs.energy>10);for(const c of h.companions)assert.ok(s.people[c.person].needs.hunger<24);
 for(s.tick=16;s.tick<112;s.tick+=8)partyTick(s,ctx);assert.equal(p.needs.sleeping,false);assert.ok(p.needs.energy>=90);assert.equal(h.transit.remaining,100,'care does not advance the ship a second time');
});
test('starvation removes one human once, leaves one actual grave on land, and cannot be undone by party rest',()=>{
 const {s,h,p,c}=setup();p.health=1;p.needs.hunger=99;s.tick=96;partyTick(s,ctx);assert.equal(p.alive,false);assert.equal(c.hp,0);assert.equal(h.companions.length,0);assert.equal(h.social.lostCompanions,1);assert.equal(s.areas.a1.objects.filter(o=>o.id==='npc-grave-'+p.id).length,1);partyTick(s,ctx);partyRest(s);assert.equal(p.health,0);assert.equal(h.social.lostCompanions,1);assert.equal(logs.filter(x=>x.includes('не переживает')).length,1);
});
test('a transit hunger death stores the actual passage and creates no fictitious grave or public town death',()=>{
 const {s,h,p}=setup();h.transit={from:'a1',to:'a2',mode:'sea',remaining:100};h.inventory.rations=0;p.health=1;p.needs.hunger=99;s.tick=96;const events=s.society.events.length,changes=s.changes.length;partyTick(s,ctx);assert.equal(p.alive,false);assert.equal(p.area,null);assert.deepEqual(p.deathJourney,{from:'a1',to:'a2',mode:'sea',tick:96});assert.equal(Object.values(s.areas).flatMap(a=>a.objects).filter(o=>o.id==='npc-grave-'+p.id).length,0);assert.equal(s.society.events.length,events);assert.equal(s.changes.length,changes);assert.equal(h.companions.length,0);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('group hunger and exhaustion alter a real plan; a camp waits for the humans instead of only the hero',()=>{
 const {s,h,p}=setup();h.inventory.rations=1;h.hunger=0;h.goal={kind:'explore',area:'a2',x:100};step(s);assert.equal(h.inventory.rations,0);assert.ok(p.needs.hunger<30);p.needs.hunger=10;p.needs.energy=10;p.needs.sleeping=true;h.hp=h.maxHp;h.energy=100;h.goal={kind:'explore',area:'a2',x:100};step(s);assert.equal(h.goal?.kind,'rest');assert.equal(partyRestReady(s),false);assert.ok(p.needs.energy>10);for(let i=0;i<12&&!partyRestReady(s);i++)step(s);assert.equal(partyRestReady(s),true);assert.equal(p.needs.sleeping,false);
});
test('the forecast includes human reserves and its preparation uses the existing rest goal',()=>{
 const {s,h,p}=setup();p.needs.hunger=10;p.needs.energy=25;assert.equal(partyPrepared(s,{ticks:80}),false);h.hp=h.maxHp;h.energy=100;h.magic.mana=h.magic.maxMana;h.goal={kind:'hunt',area:'a2',x:100,started:s.tick};assert.equal(preparePlan(s,ctx),true);assert.equal(h.goal.kind,'rest');assert.ok(h.reason.includes('Попутчикам'));p.needs.energy=100;assert.equal(partyPrepared(s,{ticks:80}),true);
});
test('each switch preserves supplies and old care remains available independently when party needs are off',()=>{
 for(const flag of ['npc-party-needs','npc-needs','companions']){const {s,p,c}=setup();s.tick=8;setModule(s,flag,false);const before=JSON.stringify(p);partyCare(s,c,ctx);assert.equal(JSON.stringify(p),before);assert.equal(partyDemand(s),null);assert.equal(partyRestReady(s),true);}
 const {s,p}=setup();setModule(s,'supply',false);p.roadSupplies={food:2,medicine:2};p.health=30;s.tick=8;partyTick(s,ctx);assert.deepEqual(p.roadSupplies,{food:2,medicine:2});assert.equal(p.health,30);
});

test('combat upkeep cannot secretly consume a second care action; a person busy healing or asleep gives no attack bonus',()=>{
 const {s,h,p,c}=setup();p.health=30;p.roadSupplies={food:1,medicine:2};h.combat=s.areas.a2.objects.find(o=>o.kind==='enemy').id;s.tick=8;partyTick(s,ctx);assert.deepEqual(p.roadSupplies,{food:1,medicine:2});assert.equal(p.health,30);assert.equal(partyAvailable(s,c),true);
 h.combat=null;s.tick=16;partyTick(s,ctx);assert.equal(p.roadSupplies.medicine,0);assert.equal(partyAvailable(s,c),false);const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy'),combatCtx={...ctx,random:()=>.99};const busy=combatAttack(s,enemy,10,combatCtx);h.companions=[];assert.equal(combatAttack(s,enemy,10,combatCtx),busy);h.companions=[c];s.tick=17;assert.equal(partyAvailable(s,c),true);p.needs.energy=10;assert.equal(partyAvailable(s,c),false);setModule(s,'npc-party-needs',false);assert.equal(partyAvailable(s,c),true);
});
