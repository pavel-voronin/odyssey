import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEM_BASES} from '../content.js';
import {serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {makeItem,receiveItem,itemBonus} from '../modules/inventory.js';
import {itemWorking,itemWorth,wearOwnedItem,wearWeaponHit,wearArmorHit} from '../modules/item-condition.js';
import {combatAttack} from '../modules/combat.js';
import {armorExtra,armorWalkExtra,legacyArmorDefense,armorEffect} from '../modules/armor.js';
import {enchantmentStrength} from '../modules/enchantments.js';
import {castInCombat,teachSpell} from '../modules/magic.js';
import {localFoodChoice,localFoodWork,foodCapability} from '../modules/local-food.js';
import {foodFixture} from '../scripts/local-food-scenarios.mjs';
import {forgingFixture,forgingContext} from '../scripts/forging-scenarios.mjs';
const ctx={...forgingContext,random:()=>.1};
function fixture({armor=false}={}){const f=forgingFixture(),{s,h}=f;setModule(s,'item-wear',true);setModule(s,'equipment',true);if(armor)setModule(s,'armor-balance',true);const item=makeItem(s,{...ctx,random:()=>armor?(ITEM_BASES.findIndex(i=>i.id==='mail')+.1)/ITEM_BASES.length:.1},1);item.modifier='plain';receiveItem(s,ctx,null,item);return {...f,item};}
function fragile(i,n=2){Object.assign(i.durability,{max:n,initial:n,current:n,used:0,restored:0,repairs:0,lastTick:-1,lastUse:null});}
function enemyFor(f){const a=f.s.areas.a2,e=a.objects.find(o=>o.kind==='enemy');Object.assign(f.h,{area:a.id,x:e.x,combat:e.id,lastAction:'attack'});e.alive=true;e.hp=e.maxHp=10000;return e;}

test('only new tracked equipment has a ledger; old actual items stay untracked through ON and exact restore',()=>{
 const f=fixture(),{s,h,item}=f;assert.equal(item.durability.current,240);assert.equal(item.durability.used,0);assert.equal(item.durability.born,s.tick);setModule(s,'item-wear',false);const old=makeItem(s,ctx,1);receiveItem(s,ctx,null,old);assert.equal(old.durability,undefined);setModule(s,'item-wear',true);const before=structuredClone(old);s.tick++;assert.equal(wearOwnedItem(s,old,h.lineage,'attack','test',ctx),false);assert.deepEqual(old,before);syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);assert.ok(itemWorking(old));
});
test('actual positive physical hits wear once, preserve the original, and zero-damage cancellation/windup cannot wear',()=>{
 const f=fixture(),{s,h,item}=f,e=enemyFor(f);fragile(item,2);s.tick++;const before=e.hp;e.hp-=4;assert.ok(wearWeaponHit(s,e,4,before,ctx));assert.equal(item.durability.current,1);assert.equal(wearWeaponHit(s,e,4,before,ctx),false);s.tick++;assert.equal(wearWeaponHit(s,e,0,e.hp,ctx),false);h.lastAction='windup';assert.equal(wearWeaponHit(s,e,4,e.hp+4,ctx),false);h.lastAction='attack';e.hp-=4;assert.ok(wearWeaponHit(s,e,4,e.hp+4,ctx));assert.equal(item.durability.current,0);assert.equal(item.durability.used,2);assert.equal(itemWorking(item),false);assert.equal(itemBonus(h,'attack'),0);assert.equal(h.equipment.weapon,item);assert.equal(itemWorth(item),Math.floor(item.value*.25));
});
test('the real temporal avoidance result does not wear the held blade',()=>{
 const f=fixture(),e=enemyFor(f);f.h.profession='smith';setModule(f.s,'enemies',true);e.powers=['temporal'];const before=e.hp,condition=structuredClone(f.item.durability),damage=combatAttack(f.s,e,5,ctx);assert.equal(damage,0);assert.equal(wearWeaponHit(f.s,e,damage,before,ctx),false);assert.deepEqual(f.item.durability,condition);
});
test('a real incoming hit breaks defense and its rune after the last valid use, with physical mass and basic leather fallback retained',()=>{
 const f=fixture({armor:true}),{s,h,item}=f,e=enemyFor(f);assert.equal(item.slot,'armor');item.modifier='blessing';h.armor=1;setModule(s,'enchantments',true);fragile(item,1);assert.ok(itemBonus(h,'defense')>0);assert.ok(enchantmentStrength(h,'blessing')>0);s.tick++;const before=h.hp;h.hp-=3;assert.ok(wearArmorHit(s,e,3,before,ctx));assert.equal(itemBonus(h,'defense'),0);assert.equal(armorExtra(h),0);assert.equal(enchantmentStrength(h,'blessing'),0);assert.equal(legacyArmorDefense(h),2);assert.equal(armorWalkExtra(s),.4);assert.equal(armorEffect(s,item).defense,0);assert.equal(h.equipment.armor,item);
});
test('OFF, pure inspection, rest and an exact same-tick restore do not spend another use or heal a broken original',()=>{
 const f=fixture(),{s,h,item}=f;fragile(item,2);s.tick++;assert.ok(wearOwnedItem(s,item,h.lineage,'gather','actual-step',ctx));syncActiveActor(s);let raw=serialize(s);assert.equal(itemWorth(item),Math.floor(item.value*.625));itemWorking(item);assert.equal(serialize(s),raw);const copy=restore(raw),ci=copy.hero.equipment.weapon;assert.equal(wearOwnedItem(copy,ci,h.lineage,'gather','actual-step',ctx),false);setModule(copy,'item-wear',false);copy.tick++;assert.equal(wearOwnedItem(copy,ci,h.lineage,'gather','actual-step',ctx),false);assert.equal(ci.durability.current,1);h.energy=20;h.x=68;h.goal={kind:'rest',area:h.area,x:68};const d=structuredClone(item.durability);for(let i=0;i<5;i++)step(s);assert.deepEqual(item.durability,d);
});
test('a committed last-charge focus casts with its captured power before kill loot can replace the equipped original',()=>{
 const f=fixture(),{s,h,item}=f,e=enemyFor(f);setModule(s,'magic',true);item.base='staff';item.stat='magic';item.power=2;fragile(item,1);teachSpell(s,'spark',ctx,'Настоящее обучение');h.magic.mana=20;e.hp=1;const replacement=makeItem(s,ctx,4);Object.assign(replacement,{base:'staff',stat:'magic',power:9});const castCtx={...ctx,defeatEnemy(world,target){target.alive=false;receiveItem(world,ctx,null,replacement);}};const originalId=item.id;assert.ok(castInCombat(s,e,castCtx,'spark'));assert.equal(item.durability.current,0);assert.equal(item.durability.used,1);assert.equal(h.equipment.weapon,replacement);assert.equal(replacement.durability.used,0);assert.ok(h.bag.some(i=>i.id===originalId));const d=structuredClone(replacement.durability);assert.equal(castInCombat(s,e,castCtx,'not-a-spell'),false);assert.deepEqual(replacement.durability,d);
});
test('the last real knife work step can finish finite harvesting before the knife breaks; another step gains nothing',()=>{
 const f=foodFixture(),{s,h,p,a}=f;setModule(s,'equipment',true);setModule(s,'item-wear',true);const knife=makeItem(s,ctx,1);knife.toolKind='knife';knife.modifier='plain';receiveItem(s,ctx,null,knife);fragile(knife,3);p.localFood.tools.knife.state='broken';const choice=localFoodChoice(s,p,h,a),task={foodSource:choice.id,remaining:choice.remaining},stock=a.forage.stock;for(let i=0;i<3;i++){s.tick++;const r=localFoodWork(s,p,a,task,h,ctx);assert.equal(r.finished,i===2);if(r.receipt)assert.equal(r.receipt.tool,knife.id);}assert.equal(p.localFood.stock.mushroom,3);assert.equal(a.forage.stock,stock-3);assert.equal(knife.durability.current,0);assert.equal(knife.durability.used,3);assert.equal(foodCapability(s,p,'mushroom',h).allowed,false);s.tick++;assert.equal(localFoodWork(s,p,a,task,h,ctx).finished,true);assert.equal(a.forage.stock,stock-3);
});
test('a working weaker original can replace a broken stronger weapon without copying either one',()=>{
 const f=fixture(),{s,h,item}=f;fragile(item,1);item.power=9;s.tick++;wearOwnedItem(s,item,h.lineage,'attack','actual-hit',ctx);const next=makeItem(s,ctx,1);next.modifier='plain';assert.equal(next.power,1);receiveItem(s,ctx,null,next);assert.equal(h.equipment.weapon,next);assert.equal(h.bag.filter(i=>i===item).length,1);assert.equal(item.durability.current,0);
});
