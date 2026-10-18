import test from 'node:test';import assert from 'node:assert/strict';
import {prostheticFixture,prostheticContext as ctx} from '../scripts/prosthetic-scenarios.mjs';
import {orderPeg,collectPeg,fitPeg,prostheticTurn} from '../modules/prosthetics.js';
import {limbStride,limbLook,limbSummary} from '../modules/limb-state.js';
import {peopleTick} from '../modules/people.js';import {productionSources} from '../modules/goods.js';
import {serialize,restore,step} from '../engine.js';import {setModule} from '../rules.js';
import {presentItem} from '../modules/item-originals.js';import {heroAppearance} from '../appearance.js';
import {startKnife,workKnife} from '../modules/forging.js';import {workshopSite} from '../modules/workshop-place.js';
import {npcAction} from '../modules/npc-control.js';
import {foodWalkingStride} from '../modules/hearth-food.js';
const exact=s=>assert.equal(serialize(restore(serialize(s))),serialize(s));
function finish(f){for(let n=0;n<3;n++){f.s.tick=Math.floor(f.s.tick/8)*8+8;peopleTick(f.s,ctx);}return Object.values(f.master.prostheticCraft.orders)[0];}
function deliver(f){f.s.tick++;assert.equal(collectPeg(f.s,f.master,ctx),true);return f.h.bag.find(i=>i.kind==='prosthesis');}
test('actual missing leg orders two finite blanks and pays the real master once; three distinct ordinary NPC phases make one original',()=>{
 const f=prostheticFixture(),{s,h,p,a,master}=f,raw=productionSources(s,a).materials,before={stock:raw.stock,used:raw.used,gold:h.gold,wallet:master.agenda.wealth,treasury:a.civic.treasury},hp=h.hp;
 assert.ok(p.limbLosses.events.length);const o=orderPeg(s,master,ctx);assert.ok(o);assert.equal(raw.stock,before.stock-2);assert.equal(raw.used,before.used+2);assert.equal(h.gold,before.gold-12);assert.equal(master.agenda.wealth,before.wallet+6);assert.equal(a.civic.treasury,before.treasury+6);assert.equal(orderPeg(s,master,ctx),null);setModule(s,'npc-control',false);assert.equal(npcAction(s,master,'party','attack'),false);setModule(s,'npc-control',true);assert.equal(p.prosthetic,undefined);assert.equal(h.hp,hp);assert.equal(p.anatomy.missing.includes('rightLeg'),true);
 finish(f);assert.equal(o.status,'completed');assert.equal(o.progress,3);assert.equal(master.looseItems.filter(i=>i.kind==='prosthesis').length,1);assert.equal(h.bag.length,0);peopleTick(s,ctx);assert.equal(master.looseItems.length,1);assert.equal(o.progress,3);exact(s);
});
test('seven selected refusals leave money and material untouched: ill, busy, empty stock, poor patient, distant master, ruined bench and unusable hands',()=>{
 for(const change of [f=>{f.master.health=1;},f=>{f.master.agenda.task={kind:'study',target:f.a.id,x:42,remaining:3};},f=>{const r=productionSources(f.s,f.a).materials;r.used+=r.stock;r.stock=0;},f=>{f.h.gold=11;},f=>{f.master.x=90;},f=>{f.o.state='burned';},f=>{f.master.anatomy={missing:['rightArm']};}]){
  const f=prostheticFixture();change(f);const r=productionSources(f.s,f.a).materials,before=[r.stock,r.used,f.h.gold,f.master.agenda.wealth];assert.equal(orderPeg(f.s,f.master,ctx),null);assert.deepEqual([r.stock,r.used,f.h.gold,f.master.agenda.wealth],before);assert.equal(f.master.prostheticCraft,undefined);
 }
});
test('illness pauses an accepted order without another payment or an instant product, and recovery resumes the same three actions',()=>{
 const f=prostheticFixture();const o=orderPeg(f.s,f.master,ctx),gold=f.h.gold;f.master.health=10;f.s.tick=8;peopleTick(f.s,ctx);assert.equal(o.progress,0);assert.equal(f.h.gold,gold);assert.equal(f.h.bag.length,0);f.master.health=f.master.maxHealth||100;finish(f);assert.equal(o.progress,3);assert.equal(o.status,'completed');assert.equal(f.h.gold,gold);exact(f.s);
});
test('handoff moves the same original into the pack, fitting is a separate action after actual stump closure and partially improves movement',()=>{
 const f=prostheticFixture({healed:true}),before=foodWalkingStride(f.s),loss=structuredClone(f.p.limbLosses);assert.equal(f.w.closure,100);assert.ok(f.w.function>=40);const o=orderPeg(f.s,f.master,ctx);finish(f);const i=deliver(f);assert.equal(presentItem(f.s,i.id).item,i);assert.equal(f.master.looseItems.includes(i),false);assert.equal(limbStride(f.p),.55);assert.equal(f.p.prosthetic,undefined);
 f.s.tick++;const hp=f.h.hp,energy=f.h.energy;assert.equal(fitPeg(f.s,ctx),true);assert.equal(f.h.energy,energy-4);assert.equal(f.h.hp,hp);assert.equal(f.h.bag.includes(i),false);assert.equal(f.p.prosthetic.item,i);assert.equal(presentItem(f.s,i.id).item,i);assert.equal(i.physical.holder.container,'prosthesis/'+f.p.id);assert.ok(foodWalkingStride(f.s)>before);assert.ok(limbStride(f.p)<1);assert.deepEqual(f.p.limbLosses,loss);assert.equal(fitPeg(f.s,ctx),false);assert.equal(o.collected<=f.p.prosthetic.installedAt,true);exact(f.s);
});
test('an open stump cannot be fitted, and a practiced maker has better partial fitting after two actual completed knife orders',()=>{
 const f=prostheticFixture();orderPeg(f.s,f.master,ctx);finish(f);deliver(f);assert.equal(fitPeg(f.s,ctx),false);assert.equal(f.p.prosthetic,undefined);
 const skilled=prostheticFixture({healed:true}),site=workshopSite(skilled.s,skilled.a,skilled.o.id);setModule(skilled.s,'equipment',true);skilled.master.agenda.wealth=30;for(let n=0;n<2;n++){skilled.s.tick++;assert.ok(startKnife(skilled.s,skilled.master,site,ctx));for(let j=0;j<6;j++){skilled.s.tick++;assert.equal(workKnife(skilled.s,skilled.master,ctx),true);}}
 skilled.s.tick++;const o=orderPeg(skilled.s,skilled.master,ctx);assert.equal(o.quality,.75);finish(skilled);deliver(skilled);skilled.s.tick++;assert.equal(fitPeg(skilled.s,ctx),true);assert.ok(limbStride(skilled.p)>.73&&limbStride(skilled.p)<1);exact(skilled.s);
});
test('one autonomous order waits at the real master and is delivered and fitted within32 actor steps without a second body action',()=>{
 const f=prostheticFixture({healed:true});f.h.hp=100;f.h.energy=100;assert.equal(prostheticTurn(f.s,ctx),true);const id=f.master.prostheticCraft.active;
 for(let n=0;n<32&&!f.p.prosthetic;n++)step(f.s);assert.ok(f.p.prosthetic);const o=f.master.prostheticCraft.orders[id];assert.equal(o.progress,3);assert.equal(f.master.prostheticCraft.serial,1);assert.equal(f.p.prosthetic.item.prosthesis.order,id);exact(f.s);
});
test('OFF and exact restore keep a physically fitted original, missing anatomy and appearance; four subsequent partial ticks agree',()=>{
 const f=prostheticFixture({healed:true});orderPeg(f.s,f.master,ctx);finish(f);deliver(f);f.s.tick++;fitPeg(f.s,ctx);setModule(f.s,'prosthetics',false);const raw=serialize(f.s),look=heroAppearance(f.s);assert.equal(look.missingLimbs.rightLeg,true);assert.equal(look.prostheticLegs.rightLeg,.5);assert.ok(limbSummary(f.p).includes('Деревянная нога'));assert.equal(serialize(f.s),raw);assert.ok(limbStride(f.p)>.55);const copy=restore(raw);for(let n=0;n<4;n++){step(f.s);step(copy);assert.equal(serialize(f.s),serialize(copy));}exact(f.s);
});
test('OFF prevents crafting and fitting; forged quality and a duplicate pack/worn original fail current-schema restore',()=>{
 const f=prostheticFixture({healed:true});setModule(f.s,'prosthetics',false);assert.equal(orderPeg(f.s,f.master,ctx),null);setModule(f.s,'prosthetics',true);orderPeg(f.s,f.master,ctx);finish(f);deliver(f);setModule(f.s,'prosthetics',false);assert.equal(fitPeg(f.s,ctx),false);setModule(f.s,'prosthetics',true);f.s.tick++;fitPeg(f.s,ctx);const bad=JSON.parse(serialize(f.s));bad.people[f.p.id].prosthetic.item.prosthesis.quality=1;assert.throws(()=>restore(JSON.stringify(bad)),/prosthetic/);const duplicate=JSON.parse(serialize(f.s));duplicate.hero.bag.push(structuredClone(duplicate.people[f.p.id].prosthetic.item));assert.throws(()=>restore(JSON.stringify(duplicate)),/container/);
});
