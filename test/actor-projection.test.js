import {initializeObservation} from '../observation.js';
import {consumeCarriedSupplies} from '../modules/stores.js';import {setModule} from '../rules.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,step,createNextStory,serialize,restore,observeExistingPerson} from '../engine.js';import {settleLife,meetLegacy} from '../modules/lifecycle.js';import {initializeActorProjections,syncNPCActors,syncActiveActor,actorItems,setActorMoney} from '../actor-projection.js';import {npcController} from '../modules/npc-control.js';
const ctx={log:()=>{},releaseParty:()=>{}};
function afterNewStory(s){assert.equal(createNextStory(s,{allowLiving:true}),true);s.hero.area='a0';s.hero.x=10;s.hero.goal={kind:'routeWait',area:'a0',x:10,remaining:999,started:s.tick};syncActiveActor(s);s.society.nextEvent=100000;s.logistics.nextDispatch=100000;}
function former(){const s=createWorld(5),p=Object.values(s.people).find(p=>p.alive&&p.role!=='герой'&&p.role!=='ребёнок'&&p.area==='a1');assert.ok(p);assert.equal(observeExistingPerson(s,p.id),true);const h=s.hero;setActorMoney(s,p,50);afterNewStory(s);return{s,h,p};}
function formerGift(){const s=createWorld(5),h=s.hero,p=s.people[h.lineage];h.area='a1';h.x=42;setActorMoney(s,p,50);h.life.home='a1';h.life.motive='Дом';h.bag.push({id:'one-gift',name:'Старый клинок',slot:'weapon',stat:'attack',power:2,value:10,modifier:'plain',history:[]});syncActiveActor(s);settleLife(s,ctx);afterNewStory(s);return{s,h,p};}
function same(s){const text=serialize(s);assert.ok(serialize(restore(text))===text,'restore altered the canonical body');}
test('an actual NPC wage goes to the same detailed wallet without a reconstructed former purse',()=>{
 const {s,h,p}=former();p.agenda.job='farmer';p.agenda.task={kind:'farm',target:'a1',x:42,remaining:1};p.needs.hunger=10;p.needs.energy=100;s.tick=7;const treasury=s.areas.a1.civic.treasury,newGold=s.hero.gold,oldGold=h.gold;step(s);assert.equal(p.agenda.wealth,oldGold+3);assert.equal(h.gold,oldGold+3);assert.equal(p.actorLink.wallet,oldGold+3);assert.equal(p.legacy,undefined);assert.equal(s.hero.gold,newGold);assert.equal(s.areas.a1.civic.treasury,treasury-3);assert.equal(npcController(s,p),'personal');same(s);
});
test('NPC wounds, finite treatment, food and actual movement update the existing detailed actor without healing on reload',()=>{
 const {s,h,p}=former();p.health=40;p.roadSupplies={medicine:2,food:1};p.needs.hunger=70;p.needs.energy=80;s.tick=7;step(s);assert.equal(p.health,65);assert.equal(p.roadSupplies.medicine,0);assert.ok(Math.abs(h.hp-h.maxHp*.65)<1e-10);assert.equal(h.energy,p.needs.energy);assert.equal(h.hunger,p.needs.hunger);same(s);s.tick=15;step(s);assert.equal(p.roadSupplies.food,0);assert.ok(h.hunger<24);p.area='a4';p.x=23;syncNPCActors(s);assert.equal(h.area,'a4');assert.equal(h.x,23);assert.equal(h.personPosition.area,'a4');same(s);
});
test('a legacy gift moves one original item and real coins from the former actor without copying it back on restore',()=>{
 const {s,h,p}=formerGift();s.hero.area=p.area;s.people[s.hero.lineage].parents=[p.id];p.legacy.gifts=[];setActorMoney(s,p,20);const item=actorItems(h)[0],before=s.hero.gold;meetLegacy(s,p.id,ctx);assert.equal(s.hero.gold,before+12);assert.equal(h.gold,8);assert.equal(p.agenda.wealth,8);assert.equal(p.legacy.wealth,8);assert.equal(actorItems(h).some(i=>i.id===item.id),false);assert.ok(actorItems(s.hero).some(i=>i===item));assert.equal(p.legacy.keepsakes.some(i=>i.id===item.id),false);const text=serialize(s);meetLegacy(s,p.id,ctx);assert.ok(serialize(s)===text);same(s);const loaded=restore(text);assert.equal(actorItems(loaded.actorStates[p.id]).some(i=>i.id===item.id),false);
});
test('a current detailed person without its wallet link is refused rather than merging unrelated money',()=>{
 const {s,h,p}=former();delete p.actorLink;p.agenda.wealth=7;h.gold=999;const raw=serialize(s);assert.throws(()=>restore(raw),/actorLink/);assert.equal(h.gold,999);assert.equal(p.agenda.wealth,7);
});

test('a detailed NPC opens a real four-unit ration and keeps the other three portions; failed consumption is atomic',()=>{
 const {s,h,p}=former();h.inventory.rations=1;p.roadSupplies={food:0,medicine:0};assert.equal(p.actorLink.inventory,h.inventory);assert.equal(consumeCarriedSupplies(p,null,'food',5),false);assert.equal(h.inventory.rations,1);p.needs.hunger=70;p.health=100;s.tick=7;step(s);assert.equal(h.inventory.rations,0);assert.equal(p.roadSupplies.food,3);assert.ok(p.needs.hunger<24);same(s);const loaded=restore(serialize(s)),old=loaded.actorStates[p.id],person=loaded.people[p.id];assert.equal(person.actorLink.inventory,old.inventory);assert.equal(person.roadSupplies.food,3);setModule(loaded,'supply',false);person.needs.hunger=70;loaded.tick=15;step(loaded);assert.equal(person.roadSupplies.food,3);assert.equal(old.inventory.rations,0);
});

test('an item ownership change cannot silently relabel one detailed body into a second person',()=>{const s=createWorld(4),id=s.hero.lineage;s.hero.lineage='different-person';assert.throws(()=>initializeObservation(s),/Личность/);assert.equal(s.actorStates[id],s.hero);assert.equal(s.actorStates['different-person'],undefined);});

